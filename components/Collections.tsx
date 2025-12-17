import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { Garment } from '../types';
import { Search } from 'lucide-react';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Collections() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchGarments();
  }, []);

  const fetchGarments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('garments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGarments(data || []);
    } catch (error) {
      console.error('Error fetching garments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGarments = garments.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brand-900">Collections</h2>
          <p className="text-brand-600">Browse available boutique items</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-400" size={20} />
          <input 
            type="text" 
            placeholder="Search collections..." 
            className="pl-10 pr-4 py-2 border border-brand-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-full md:w-64 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      ) : filteredGarments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-brand-200">
          <p className="text-brand-500">No garments found in the collection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGarments.map((garment) => (
            <div key={garment.id} className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-[3/4] overflow-hidden bg-brand-50 relative">
                <img 
                  src={garment.image_url} 
                  alt={garment.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-semibold text-brand-800 uppercase tracking-wide">
                  {garment.category}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-serif font-bold text-lg text-brand-900 truncate">{garment.name}</h3>
                {garment.description && <p className="text-sm text-brand-500 mt-1 line-clamp-2">{garment.description}</p>}
                <div className="mt-4 pt-4 border-t border-brand-100 flex justify-between items-center text-sm">
                  <span className="text-brand-400">Size Options</span>
                  <span className="font-medium text-brand-700">{garment.size_options || 'Standard'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}