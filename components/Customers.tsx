import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { uploadImage } from '../services/supabaseService';
import { Upload, Plus, User, X, Save, Trash2 } from 'lucide-react';
import { Customer } from '../types';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setCustomers(data);
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
    if (!imageFile) return alert('Please upload a customer photo for try-ons');

    setLoading(true);
    try {
      const imageUrl = await uploadImage(imageFile, 'customers');
      
      if (!imageUrl) {
         throw new Error("Image upload failed. Please ensure the 'public' storage bucket exists in your Supabase project.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from('customers').insert({
        user_id: user.id,
        name,
        image_url: imageUrl,
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      setIsAdding(false);
      setName('');
      setImageFile(null);
      setImagePreview(null);
      fetchCustomers();

    } catch (error: any) {
      console.error('Error adding customer:', error);
      alert(error.message || 'Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete client');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brand-900">Client Profiles</h2>
          <p className="text-brand-600">Manage clients and their measurements photos</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition-colors"
        >
          {isAdding ? <X size={20} /> : <Plus size={20} />}
          <span>{isAdding ? 'Cancel' : 'Add Client'}</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-brand-200 shadow-sm animate-fade-in">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" size={18} />
                  <input 
                    required
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-brand-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                    placeholder="Client Name"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-brand-700 mb-1">Reference Photo (Full Body)</label>
              <div className="border-2 border-dashed border-brand-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-brand-50 transition-colors cursor-pointer relative h-64 bg-brand-50/50">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-full object-contain rounded-lg shadow-sm" />
                ) : (
                  <>
                    <Upload className="text-brand-400 mb-2" size={48} />
                    <p className="text-brand-600 font-medium">Upload Full Body Shot</p>
                    <p className="text-brand-400 text-xs mt-1">Ensure good lighting</p>
                  </>
                )}
              </div>
              <div className="flex justify-end pt-4">
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
                      Save Client
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((customer) => (
          <div key={customer.id} className="bg-white rounded-xl shadow-sm border border-brand-200 overflow-hidden flex flex-row h-32 group relative">
             <div className="w-32 bg-brand-50">
                <img src={customer.image_url} alt={customer.name} className="w-full h-full object-cover" />
             </div>
             <div className="p-4 flex-1 flex flex-col justify-center">
                <h3 className="font-bold text-brand-900">{customer.name}</h3>
             </div>
             <button
               onClick={() => handleDelete(customer.id)}
               className="absolute top-2 right-2 p-2 bg-white/90 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
               title="Delete"
             >
               <Trash2 size={16} />
             </button>
          </div>
        ))}
      </div>
    </div>
  );
}