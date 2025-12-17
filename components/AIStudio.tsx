import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DEFAULT_AI_PROMPT, TRYON_MODES, GARMENT_CATEGORIES } from '../constants';
import { generateTryOn as generateTryOnGemini } from '../services/geminiService';
import { saveGeneratedImage } from '../services/supabaseService';
import { Wand2, Image as ImageIcon, Zap, Star, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { Customer, Garment } from '../types';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type TryOnMode = 'normal' | 'pro';
type SelectionMode = 'single' | 'category';

export default function AIStudio() {
  const [tryOnMode, setTryOnMode] = useState<TryOnMode>('normal');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single');
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [garments, setGarments] = useState<Garment[]>([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_AI_PROMPT);
  
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultImages, setResultImages] = useState<{garment: Garment, image: string}[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [batchProgress, setBatchProgress] = useState<{current: number, total: number} | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    fetchSystemPrompt();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: cData } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    const { data: gData } = await supabase
      .from('garments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (cData) setCustomers(cData);
    if (gData) setGarments(gData);
  };

  const fetchSystemPrompt = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'ai_system_prompt').single();
    if (data) setSystemPrompt(data.value);
  };

  // Get garments filtered by selected category
  const categoryGarments = selectedCategory 
    ? garments.filter(g => g.category === selectedCategory)
    : [];

  const handleGenerateTryOn = async () => {
    if (!selectedCustomer) return;
    
    if (selectionMode === 'single' && !selectedGarment) return;
    if (selectionMode === 'category' && !selectedCategory) return;
    if (selectionMode === 'category' && categoryGarments.length === 0) {
      setError('No garments found in this category');
      return;
    }

    setLoading(true);
    setError(null);
    setResultImage(null);
    setResultImages([]);
    setCurrentResultIndex(0);
    setBatchProgress(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (selectionMode === 'single' && selectedGarment) {
        // Single garment try-on via Edge Function
        // Single garment try-on via Gemini
        const result = await generateTryOnGemini(
          selectedCustomer.image_url,
          selectedGarment.image_url,
          systemPrompt,
          tryOnMode
        );

        // Upload to Supabase to get a persistent URL
        const publicUrl = await saveGeneratedImage(result.base64, selectedCustomer.id);
        
        if (!publicUrl) {
            throw new Error("Failed to save generated image");
        }

        setResultImage(publicUrl);

        // Log the try-on history
        if (user) {
          try {
            await supabase.from('tryon_history').insert({
              user_id: user.id,
              customer_id: selectedCustomer.id,
              garment_id: selectedGarment.id,
              output_image_url: publicUrl,
              prompt_used: `${TRYON_MODES[tryOnMode].label}`,
              created_at: new Date().toISOString()
            });
          } catch (historyErr) {
            console.warn('Local history insert skipped:', historyErr);
          }
        }
      } else if (selectionMode === 'category') {
        // Batch category try-on via Edge Function
        const results: {garment: Garment, image: string}[] = [];
        setBatchProgress({ current: 0, total: categoryGarments.length });

        for (let i = 0; i < categoryGarments.length; i++) {
          const garment = categoryGarments[i];
          setBatchProgress({ current: i + 1, total: categoryGarments.length });

          try {
            const result = await generateTryOnGemini(
              selectedCustomer.image_url,
              garment.image_url,
              systemPrompt,
              tryOnMode
            );

            const publicUrl = await saveGeneratedImage(result.base64, selectedCustomer.id);

            if (publicUrl) {
                results.push({ garment, image: publicUrl });

                // Log the try-on history
                if (user) {
                  try {
                    await supabase.from('tryon_history').insert({
                      user_id: user.id,
                      customer_id: selectedCustomer.id,
                      garment_id: garment.id,
                      output_image_url: publicUrl,
                      prompt_used: `${TRYON_MODES[tryOnMode].label} - Category: ${selectedCategory}`,
                      created_at: new Date().toISOString()
                    });
                  } catch (historyErr) {
                    console.warn('Local history insert skipped:', historyErr);
                  }
                }
            }
          } catch (err) {
            console.error(`Failed to generate for garment ${garment.name}:`, err);
          }
        }

        setResultImages(results);
        if (results.length > 0) {
          setResultImage(results[0].image);
        }
      }

    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
      setBatchProgress(null);
    }
  };

  const navigateResults = (direction: 'prev' | 'next') => {
    if (resultImages.length === 0) return;
    let newIndex = currentResultIndex;
    if (direction === 'prev') {
      newIndex = currentResultIndex > 0 ? currentResultIndex - 1 : resultImages.length - 1;
    } else {
      newIndex = currentResultIndex < resultImages.length - 1 ? currentResultIndex + 1 : 0;
    }
    setCurrentResultIndex(newIndex);
    setResultImage(resultImages[newIndex].image);
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brand-900">Virtual Try-On</h2>
          <p className="text-brand-600 text-sm">Powered by AI</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-brand-800">Generation Quality</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTryOnMode('normal')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  tryOnMode === 'normal' 
                    ? 'border-brand-600 bg-brand-50 text-brand-900' 
                    : 'border-brand-200 bg-white text-brand-500 hover:border-brand-300'
                }`}
              >
                <Zap size={24} className={`mb-1 ${tryOnMode === 'normal' ? 'text-brand-600' : 'text-brand-400'}`} />
                <span className="font-bold text-sm">Fast</span>
                <span className="text-xs opacity-70">Quick preview</span>
              </button>

              <button
                onClick={() => setTryOnMode('pro')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  tryOnMode === 'pro' 
                    ? 'border-brand-600 bg-brand-50 text-brand-900' 
                    : 'border-brand-200 bg-white text-brand-500 hover:border-brand-300'
                }`}
              >
                <Star size={24} className={`mb-1 ${tryOnMode === 'pro' ? 'text-brand-600' : 'text-brand-400'}`} />
                <span className="font-bold text-sm">Pro</span>
                <span className="text-xs opacity-70">Better quality</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-brand-800 mb-2">1. Select Client</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {customers.map(c => (
                <div 
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${selectedCustomer?.id === c.id ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-brand-200 hover:border-brand-400'}`}
                >
                  <img src={c.image_url} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-200" />
                  <span className="text-sm font-medium truncate">{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-brand-800 mb-2">2. Selection Mode</label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => { setSelectionMode('single'); setSelectedCategory(null); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  selectionMode === 'single' 
                    ? 'border-brand-600 bg-brand-50 text-brand-900' 
                    : 'border-brand-200 bg-white text-brand-500 hover:border-brand-300'
                }`}
              >
                <ImageIcon size={20} className={`mb-1 ${selectionMode === 'single' ? 'text-brand-600' : 'text-brand-400'}`} />
                <span className="font-bold text-sm">Single</span>
                <span className="text-xs opacity-70">One garment</span>
              </button>

              <button
                onClick={() => { setSelectionMode('category'); setSelectedGarment(null); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  selectionMode === 'category' 
                    ? 'border-brand-600 bg-brand-50 text-brand-900' 
                    : 'border-brand-200 bg-white text-brand-500 hover:border-brand-300'
                }`}
              >
                <Layers size={20} className={`mb-1 ${selectionMode === 'category' ? 'text-brand-600' : 'text-brand-400'}`} />
                <span className="font-bold text-sm">Category</span>
                <span className="text-xs opacity-70">All in category</span>
              </button>
            </div>

            {selectionMode === 'single' ? (
              <>
                <label className="block text-sm font-bold text-brand-800 mb-2">3. Select Garment</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {garments.map(g => (
                    <div 
                      key={g.id}
                      onClick={() => setSelectedGarment(g)}
                      className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${selectedGarment?.id === g.id ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-brand-200 hover:border-brand-400'}`}
                    >
                      <img src={g.image_url} alt="" className="w-10 h-10 rounded object-cover bg-gray-200" />
                      <span className="text-sm font-medium truncate">{g.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <label className="block text-sm font-bold text-brand-800 mb-2">3. Select Category</label>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="w-full px-4 py-3 border border-brand-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none mb-2"
                >
                  <option value="">-- Select Category --</option>
                  {GARMENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {selectedCategory && (
                  <div className="bg-brand-50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-brand-800">
                      {categoryGarments.length} garment{categoryGarments.length !== 1 ? 's' : ''} in "{selectedCategory}"
                    </p>
                    {categoryGarments.length > 0 && (
                      <p className="text-brand-600 text-xs mt-1">
                        Will generate {categoryGarments.length} try-on{categoryGarments.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <button
            onClick={handleGenerateTryOn}
            disabled={!selectedCustomer || (selectionMode === 'single' ? !selectedGarment : !selectedCategory || categoryGarments.length === 0) || loading}
            className={`w-full text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg ${
              tryOnMode === 'pro' ? 'bg-gradient-to-r from-brand-800 to-brand-600 hover:from-brand-900 hover:to-brand-700' : 'bg-brand-800 hover:bg-brand-900'
            }`}
          >
            {loading ? (
              batchProgress ? (
                <>Generating {batchProgress.current}/{batchProgress.total}...</>
              ) : (
                <>Generating...</>
              )
            ) : (
              <>
                <Wand2 size={20} />
                {selectionMode === 'category' 
                  ? `Generate All ${selectedCategory || 'Category'} Try-Ons`
                  : `Generate ${tryOnMode === 'pro' ? 'Pro ' : ''}Try-On`
                }
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-brand-200 p-6 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
        {loading && (
          <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-600 mb-4"></div>
            <p className="text-brand-800 font-medium animate-pulse">
              {tryOnMode === 'pro' ? 'Crafting high-fidelity fit...' : 'Tailoring the outfit...'}
            </p>
          </div>
        )}

        {error && (
          <div className="text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-200 mb-4">
            {error}
          </div>
        )}

        {resultImage ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <img src={resultImage} alt="Result" className="max-w-full max-h-[400px] rounded-lg shadow-2xl object-contain" />
            
            {/* Navigation for batch results */}
            {resultImages.length > 1 && (
              <div className="mt-4 flex items-center gap-4">
                <button
                  onClick={() => navigateResults('prev')}
                  className="p-2 bg-brand-100 hover:bg-brand-200 rounded-full transition-colors"
                >
                  <ChevronLeft size={24} className="text-brand-700" />
                </button>
                
                <div className="text-center">
                  <p className="font-bold text-brand-800">
                    {resultImages[currentResultIndex]?.garment?.name || 'Unknown'}
                  </p>
                  <p className="text-sm text-brand-500">
                    {currentResultIndex + 1} of {resultImages.length}
                  </p>
                </div>
                
                <button
                  onClick={() => navigateResults('next')}
                  className="p-2 bg-brand-100 hover:bg-brand-200 rounded-full transition-colors"
                >
                  <ChevronRight size={24} className="text-brand-700" />
                </button>
              </div>
            )}
            
            {/* Thumbnail strip for batch results */}
            {resultImages.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto max-w-full pb-2">
                {resultImages.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => { setCurrentResultIndex(index); setResultImage(result.image); }}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentResultIndex ? 'border-brand-600 ring-2 ring-brand-300' : 'border-brand-200 hover:border-brand-400'
                    }`}
                  >
                    <img src={result.image} alt={result.garment.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-brand-400">
            <ImageIcon size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">Select a client and garment to generate preview</p>
          </div>
        )}
      </div>
    </div>
  );
}
