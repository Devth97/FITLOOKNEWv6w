import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { Sparkles, IndianRupee, BarChart3 } from 'lucide-react';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEFAULT_FREE_TRIES = 50;
const COST_PER_GENERATION = 3;

interface DailyCount {
  day: string;
  count: number;
}

export default function Dashboard() {
  const [totalGenerations, setTotalGenerations] = useState(0);
  const [freeTriesLimit, setFreeTriesLimit] = useState(DEFAULT_FREE_TRIES);
  const [weeklyData, setWeeklyData] = useState<DailyCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('free_tries')
        .eq('id', user.id)
        .single();

      if (profileData?.free_tries !== undefined && profileData?.free_tries !== null) {
        setFreeTriesLimit(profileData.free_tries);
      }

      const { data: historyData, error } = await supabase
        .from('tryon_history')
        .select('created_at')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching history:', error);
        return;
      }

      const total = historyData?.length || 0;
      setTotalGenerations(total);

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const weekData: DailyCount[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
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
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const freeTriesLeft = Math.max(0, freeTriesLimit - totalGenerations);
  const paidGenerations = Math.max(0, totalGenerations - freeTriesLimit);
  const totalCost = paidGenerations * COST_PER_GENERATION;
  const maxCount = Math.max(...weeklyData.map(d => d.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-brand-900">Dashboard</h2>
        <p className="text-brand-600">Overview of your usage and credits</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-brand-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Sparkles className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-brand-500">Free Tries Left</p>
              <p className="text-3xl font-bold text-brand-900">{freeTriesLeft}</p>
            </div>
          </div>
          <div className="w-full bg-brand-100 rounded-full h-3">
            <div 
              className="bg-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(freeTriesLeft / freeTriesLimit) * 100}%` }}
            />
          </div>
          <p className="text-xs text-brand-400 mt-2">{freeTriesLeft} of {freeTriesLimit} free generations remaining</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-brand-100 rounded-lg">
              <BarChart3 className="text-brand-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-brand-500">Total Generations</p>
              <p className="text-3xl font-bold text-brand-900">{totalGenerations}</p>
            </div>
          </div>
          <p className="text-xs text-brand-400">Lifetime image generations</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-brand-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <IndianRupee className="text-amber-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-brand-500">Charges (After Free Tier)</p>
              <p className="text-3xl font-bold text-brand-900">{totalCost > 0 ? `Rs. ${totalCost}` : 'Rs. 0'}</p>
            </div>
          </div>
          <p className="text-xs text-brand-400">Rs. {COST_PER_GENERATION} per generation after {freeTriesLimit} free tries</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-brand-200 p-6">
        <h3 className="text-lg font-bold text-brand-900 mb-6">Images Generated This Week</h3>
        <div className="flex items-end justify-between gap-4 h-48">
          {weeklyData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center justify-end h-36">
                <span className="text-sm font-bold text-brand-700 mb-1">{data.count}</span>
                <div 
                  className="w-full bg-gradient-to-t from-brand-600 to-brand-400 rounded-t-lg transition-all duration-500"
                  style={{ 
                    height: data.count > 0 ? `${(data.count / maxCount) * 100}%` : '4px',
                    minHeight: '4px'
                  }}
                />
              </div>
              <span className="text-xs font-medium text-brand-500">{data.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
