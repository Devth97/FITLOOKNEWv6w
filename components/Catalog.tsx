import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, GARMENT_CATEGORIES } from '../constants';
import { uploadImage } from '../services/supabaseService';
import { Upload, Plus, X, Save, Trash2 } from 'lucide-react';
import { Garment } from '../types';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Catalog() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState(GARMENT_CATEGORIES[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchGarments();
  }, []);

  const fetchGarments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from('garments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setGarments(data);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return alert('Please select an image');
    
    setLoading(true);
    try {
      const imageUrl = await uploadImage(imageFile, 'garments');
      
      if (!imageUrl) throw new Error("Image upload failed");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from('garments').insert({
        user_id: user.id,
        name,
        category,
        image_url: imageUrl,
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      setIsAdding(false);
      setName('');
      setCategory(GARMENT_CATEGORIES[0]);
      setImageFile(null);
      setImagePreview(null);
      fetchGarments();

    } catch (error) {
      console.error('Error adding garment:', error);
      alert('Failed to add garment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const { error } = await supabase.from('garments').delete().eq('id', id);
      if (error) throw error;
      fetchGarments();
    } catch (error) {
      console.error('Error deleting garment:', error);
      alert('Failed to delete item');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brand-900">Catalog Manager</h2>
          <p className="text-brand-600">Add and manage your boutique inventory</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition-colors"
        >
          {isAdding ? <X size={20} /> : <Plus size={20} />}
          <span>{isAdding ? 'Cancel' : 'Add Item'}</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-brand-200 shadow-sm animate-fade-in">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-brand-700 mb-1">Garment Name</label>
                 <input 
                    required
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-brand-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="e.g. Royal Blue Sherwani"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-brand-700 mb-1">Category</label>
                 <select 
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-brand-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                 >
                   {GARMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-brand-700 mb-1">Garment Image</label>
              <div className="border-2 border-dashed border-brand-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-brand-50 transition-colors cursor-pointer relative bg-brand-50/50">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-64 object-contain rounded-lg shadow-sm" />
                ) : (
                  <>
                    <Upload className="text-brand-400 mb-2" size={48} />
                    <p className="text-brand-600 font-medium">Click to upload photo</p>
                    <p className="text-brand-400 text-xs mt-1">PNG, JPG up to 10MB</p>
                  </>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-brand-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-900 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Item
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-brand-200 overflow-hidden">
        <table className="min-w-full divide-y divide-brand-200">
          <thead className="bg-brand-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-brand-500 uppercase tracking-wider">Image</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-brand-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-brand-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-brand-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-brand-100">
            {garments.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <img src={item.image_url} alt="" className="h-12 w-12 rounded object-cover border border-brand-100" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-900">{item.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-500">{item.category}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
