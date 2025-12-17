import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DEFAULT_AI_PROMPT } from '../constants';
import { Save, Lock } from 'lucide-react';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface SettingsProps {
  session: any;
}

export default function Settings({ session }: SettingsProps) {
  const [prompt, setPrompt] = useState(DEFAULT_AI_PROMPT);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Check if admin (Mock check based on schema role, in real app role is in JWT)
  // For this demo we'll assume the logged in user can edit if they have a role in profiles.
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkRole();
    fetchSettings();
  }, [session]);

  const checkRole = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (data && data.role === 'admin') {
      setIsAdmin(true);
    } else {
        // Fallback for demo: Allow everyone to edit if no profile exists, or restricted?
        // Let's assume restricted. But to make the app usable in this generated context,
        // we might auto-create a profile or just allow it.
        // STRICT MODE: Only Admin.
        // RELAXED MODE FOR DEMO: Allow.
        // I will follow the prompt rules: "Only users with role='admin' may update".
        // If the table is empty, we might be stuck. I'll show the UI but it might fail on save if RLS blocks.
        setIsAdmin(data?.role === 'admin');
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'ai_system_prompt').single();
    if (data) setPrompt(data.value);
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      // Upsert logic
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
            user_id: session.user.id, // technically the owner
            key: 'ai_system_prompt', 
            value: prompt,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      setMessage('System prompt updated successfully.');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings. You may not have admin privileges.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-brand-900">System Settings</h2>
        <p className="text-brand-600">Configure AI behavior and prompts</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-brand-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-brand-800 font-semibold">
            <Lock size={18} />
            <h3>AI System Prompt</h3>
        </div>
        
        <p className="text-sm text-brand-500 mb-4">
            This prompt instructs the Gemini model on how to blend the garment and customer images. 
            Only modify this if you need to adjust the output style or quality constraints.
        </p>

        <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={20}
            disabled={!isAdmin}
            className="w-full p-4 border border-brand-300 rounded-lg focus:ring-2 focus:ring-brand-500 font-mono text-sm leading-relaxed"
        />

        {message && (
            <div className={`mt-4 text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {message}
            </div>
        )}

        <div className="mt-6 flex justify-end">
            <button
                onClick={handleSave}
                disabled={loading || !isAdmin}
                className="bg-brand-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-900 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
                <Save size={18} />
                Save Configuration
            </button>
        </div>
        
        {!isAdmin && (
            <p className="mt-4 text-xs text-red-500 text-center">
                You do not have admin privileges to edit these settings.
            </p>
        )}
      </div>
    </div>
  );
}