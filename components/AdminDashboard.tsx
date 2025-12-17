import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { 
  Shield, Store, Image, CreditCard, Activity, 
  Plus, Search, Edit, RotateCcw, Eye, X, Save,
  LogOut, Users, BarChart3
} from 'lucide-react';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Shop {
  id: string;
  full_name: string;
  shop_name?: string;
  email?: string;
  role: string;
  free_tries?: number;
  plan_type?: string;
  created_at?: string;
}

interface ShopStats {
  id: string;
  total_generations: number;
  last_activity: string | null;
}

interface AdminDashboardProps {
  session: any;
  onLogout: () => void;
}

export default function AdminDashboard({ session, onLogout }: AdminDashboardProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopStats, setShopStats] = useState<Record<string, ShopStats>>({});
  const [totalStats, setTotalStats] = useState({
    totalShops: 0,
    totalImages: 0,
    activeToday: 0
  });
  const [weeklyData, setWeeklyData] = useState<{day: string, count: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  const [newShop, setNewShop] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    password: '',
    freeTries: 50,
    planType: 'Free Trial'
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, shop_name, role, created_at')
        .eq('role', 'shop');

      if (profilesError) {
        throw new Error('Failed to load shop owners. Please try again.');
      }

      const shopList = profilesData || [];
      setShops(shopList);
      setTotalStats(prev => ({ ...prev, totalShops: shopList.length }));

      const { data: historyData, error: historyError } = await supabase
        .from('tryon_history')
        .select('id, user_id, created_at');

      if (historyError) {
        console.error('Error fetching history:', historyError);
      }

      const totalImages = historyData?.length || 0;
      setTotalStats(prev => ({ ...prev, totalImages }));

      const today = new Date().toISOString().split('T')[0];
      const todayCount = historyData?.filter(h => 
        new Date(h.created_at).toISOString().split('T')[0] === today
      ).length || 0;
      setTotalStats(prev => ({ ...prev, activeToday: todayCount }));

      const statsMap: Record<string, ShopStats> = {};
      shopList.forEach(shop => {
        const shopHistory = historyData?.filter(h => h.user_id === shop.id) || [];
        const lastGen = shopHistory.length > 0 
          ? shopHistory.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
          : null;
        statsMap[shop.id] = {
          id: shop.id,
          total_generations: shopHistory.length,
          last_activity: lastGen
        };
      });
      setShopStats(statsMap);

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const todayDate = new Date();
      const weekData: {day: string, count: number}[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(todayDate);
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];
        const dateStr = date.toISOString().split('T')[0];
        
        const count = historyData?.filter(item => {
          const itemDate = new Date(item.created_at).toISOString().split('T')[0];
          return itemDate === dateStr;
        }).length || 0;

        weekData.push({ day: dayName, count });
      }
      setWeeklyData(weekData);

    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load shop owners. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShop = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newShop.email,
        password: newShop.password,
        options: {
          data: {
            full_name: newShop.ownerName,
            shop_name: newShop.shopName,
            role: 'shop'
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: newShop.ownerName,
          shop_name: newShop.shopName,
          role: 'shop',
          free_tries: newShop.freeTries,
          plan_type: newShop.planType,
          created_at: new Date().toISOString()
        });
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw new Error('User created but profile creation failed: ' + profileError.message);
        }
      }

      alert(`Shop created successfully!\nEmail: ${newShop.email}\nPassword: ${newShop.password}`);
      setShowCreateModal(false);
      setNewShop({ shopName: '', ownerName: '', email: '', password: '', freeTries: 50, planType: 'Free Trial' });
      fetchData();
    } catch (error: any) {
      alert('Error creating shop: ' + error.message);
    }
  };

  const handleUpdateShop = async () => {
    if (!selectedShop) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: selectedShop.full_name,
          shop_name: selectedShop.shop_name,
          free_tries: selectedShop.free_tries,
          plan_type: selectedShop.plan_type
        })
        .eq('id', selectedShop.id);

      if (error) throw error;

      alert('Shop updated successfully!');
      setShowEditModal(false);
      setSelectedShop(null);
      fetchData();
    } catch (error: any) {
      alert('Error updating shop: ' + error.message);
    }
  };

  const filteredShops = shops.filter(shop => 
    shop.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.shop_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const maxCount = Math.max(...weeklyData.map(d => d.count), 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-200 max-w-md text-center">
          <div className="text-red-500 mb-4">
            <Shield size={48} className="mx-auto" />
          </div>
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="text-amber-400" size={28} />
          <span className="text-xl font-bold">FitLook Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-300 text-sm">{session?.user?.email}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </nav>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Store className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Shops</p>
                <p className="text-2xl font-bold text-slate-900">{totalStats.totalShops}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Image className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Images Generated</p>
                <p className="text-2xl font-bold text-slate-900">{totalStats.totalImages}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <CreditCard className="text-amber-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Active Paid Shops</p>
                <p className="text-2xl font-bold text-slate-900">{shops.filter(s => (shopStats[s.id]?.total_generations || 0) > 50).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Activity className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Images Today</p>
                <p className="text-2xl font-bold text-slate-900">{totalStats.activeToday}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart3 size={20} />
            Images Generated Per Day (All Shops)
          </h3>
          <div className="flex items-end justify-between gap-4 h-48">
            {weeklyData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center justify-end h-36">
                  <span className="text-sm font-bold text-slate-700 mb-1">{data.count}</span>
                  <div 
                    className="w-full bg-gradient-to-t from-slate-700 to-slate-500 rounded-t-lg transition-all duration-500"
                    style={{ 
                      height: data.count > 0 ? `${(data.count / maxCount) * 100}%` : '4px',
                      minHeight: '4px'
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-500">{data.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users size={20} />
                Shop Owners Management
              </h3>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search shops..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  <Plus size={18} />
                  Create Shop
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Shop Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Free Tries</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Total Images</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Last Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredShops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {shop.shop_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {shop.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const totalImages = shopStats[shop.id]?.total_generations || 0;
                        const derivedPlan = totalImages > 50 ? 'Pay Per Use (₹3/image)' : 'Free Trial';
                        return (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            totalImages > 50
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {derivedPlan}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {(() => {
                        const totalImages = shopStats[shop.id]?.total_generations || 0;
                        return Math.max(0, 50 - totalImages);
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {shopStats[shop.id]?.total_generations || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {shopStats[shop.id]?.last_activity 
                        ? new Date(shopStats[shop.id].last_activity!).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelectedShop(shop); setShowEditModal(true); }}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Create New Shop</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name</label>
                <input
                  type="text"
                  value={newShop.shopName}
                  onChange={(e) => setNewShop({...newShop, shopName: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Wedding Boutique"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Owner Name</label>
                <input
                  type="text"
                  value={newShop.ownerName}
                  onChange={(e) => setNewShop({...newShop, ownerName: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newShop.email}
                  onChange={(e) => setNewShop({...newShop, email: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="shop@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="text"
                  value={newShop.password}
                  onChange={(e) => setNewShop({...newShop, password: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Initial password"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Free Tries</label>
                  <input
                    type="number"
                    value={newShop.freeTries}
                    onChange={(e) => setNewShop({...newShop, freeTries: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Plan Type</label>
                  <select
                    value={newShop.planType}
                    onChange={(e) => setNewShop({...newShop, planType: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  >
                    <option>Free Trial</option>
                    <option>Pay-Per-Use</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleCreateShop}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Create Shop Account
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedShop && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Edit Shop</h3>
              <button onClick={() => { setShowEditModal(false); setSelectedShop(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name</label>
                <input
                  type="text"
                  value={selectedShop.shop_name || ''}
                  onChange={(e) => setSelectedShop({...selectedShop, shop_name: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Owner Name</label>
                <input
                  type="text"
                  value={selectedShop.full_name || ''}
                  onChange={(e) => setSelectedShop({...selectedShop, full_name: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Free Tries</label>
                  <input
                    type="number"
                    value={selectedShop.free_tries ?? 50}
                    onChange={(e) => setSelectedShop({...selectedShop, free_tries: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Plan Type</label>
                  <select
                    value={selectedShop.plan_type || 'Free Trial'}
                    onChange={(e) => setSelectedShop({...selectedShop, plan_type: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  >
                    <option>Free Trial</option>
                    <option>Pay-Per-Use</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleUpdateShop}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
