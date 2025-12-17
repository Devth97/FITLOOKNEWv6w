import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { TryonHistory } from '../types';
import { Download, Calendar, Trash2, Loader2 } from 'lucide-react';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const PAGE_SIZE = 12;

function LazyImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {inView ? (
        <>
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-brand-100">
              <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
            </div>
          )}
          <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover transition-all duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
          />
        </>
      ) : (
        <div className="w-full h-full bg-brand-100" />
      )}
    </div>
  );
}

export default function Gallery() {
  const [history, setHistory] = useState<(TryonHistory & { customers: { name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchHistory(0);
  }, []);

  const fetchHistory = async (pageNum: number) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('tryon_history')
      .select('*, customers(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching history:', error);
    } else {
      const newData = data as any || [];
      if (pageNum === 0) {
        setHistory(newData);
      } else {
        setHistory(prev => [...prev, ...newData]);
      }
      setHasMore(newData.length === PAGE_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistory(nextPage);
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `fitlook-tryon-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      const { error } = await supabase.from('tryon_history').delete().eq('id', id);
      if (error) throw error;
      fetchHistory();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  if (loading) return <div className="p-8 text-center text-brand-500">Loading gallery...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-brand-900">Gallery</h2>
        <p className="text-brand-600">History of generated fittings</p>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-brand-200">
           <p className="text-brand-400">No images generated yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {history.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-brand-200 overflow-hidden group">
              <div className="relative aspect-[3/4] overflow-hidden bg-brand-100">
                <LazyImage 
                  src={item.output_image_url} 
                  alt="Try-on result" 
                  className="absolute inset-0 w-full h-full" 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button 
                    onClick={() => handleDownload(item.output_image_url)}
                    className="p-3 bg-white rounded-full text-brand-900 hover:bg-brand-50 shadow-lg"
                    title="Download"
                  >
                    <Download size={20} />
                  </button>
                  <a 
                    href={item.output_image_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-3 bg-white rounded-full text-brand-900 hover:bg-brand-50 shadow-lg"
                    title="View Full"
                  >
                    <Calendar size={20} />
                  </a>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-3 bg-white rounded-full text-red-500 hover:bg-red-50 shadow-lg"
                    title="Delete"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-brand-900 truncate">{item.customers?.name || 'Unknown Client'}</h3>
                <p className="text-xs text-brand-400 mt-1">
                  {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && history.length > 0 && (
        <div className="flex justify-center pt-6">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-3 bg-brand-800 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  );
}