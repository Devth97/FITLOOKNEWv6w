import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { User, Lock, ArrowRight, Shield } from 'lucide-react';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface AuthProps {
  onSwitchToAdmin?: () => void;
}

export default function Auth({ onSwitchToAdmin }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col justify-center items-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-serif font-bold text-brand-900 mb-2">FitLook</h1>
        <p className="text-brand-600 tracking-widest uppercase text-xs">Boutique AI Solution</p>
      </div>

      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-brand-100">
        <h2 className="text-2xl font-bold text-brand-800 mb-6">Welcome Back</h2>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1">Email</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-brand-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                placeholder="boutique@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-brand-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-800 text-white py-3 rounded-lg font-bold hover:bg-brand-900 transition-all flex items-center justify-center gap-2 group"
          >
            {loading ? 'Processing...' : 'Sign In'}
            {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        {onSwitchToAdmin && (
          <div className="mt-6 pt-6 border-t border-brand-100 text-center">
            <button
              onClick={onSwitchToAdmin}
              className="text-sm text-brand-500 hover:text-brand-700 flex items-center justify-center gap-2 mx-auto"
            >
              <Shield size={16} />
              Admin Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}