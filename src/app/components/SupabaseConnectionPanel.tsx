/**
 * Optional in-app Supabase connection (saves to localStorage).
 * Use when you prefer not to edit .env.local — same anon key as in the Supabase dashboard.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Database, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  getSupabaseConfigHint,
  saveSupabaseConfigToStorage,
  clearSupabaseConfigFromStorage,
  SUPABASE_STORAGE_URL,
  SUPABASE_STORAGE_ANON_KEY,
} from '@/lib/supabaseClient';

export function SupabaseConnectionPanel() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      setUrl(localStorage.getItem(SUPABASE_STORAGE_URL) ?? '');
      setAnonKey(localStorage.getItem(SUPABASE_STORAGE_ANON_KEY) ?? '');
    } catch {
      /* ignore */
    }
  }, []);

  const hint = getSupabaseConfigHint();
  const usingEnv = hint.urlSource === 'env' || hint.keySource === 'env';

  const handleSave = () => {
    saveSupabaseConfigToStorage(url, anonKey);
    setSavedMsg(
      getSupabaseConfigHint().isComplete
        ? 'Saved. Refresh the page, then sign in with your Supabase user.'
        : 'Fill both fields, or clear and use .env.local instead.',
    );
    setTimeout(() => setSavedMsg(null), 6000);
  };

  const handleClear = () => {
    clearSupabaseConfigFromStorage();
    setUrl('');
    setAnonKey('');
    setSavedMsg('Browser-stored Supabase settings cleared.');
    setTimeout(() => setSavedMsg(null), 4000);
  };

  return (
    <div className="mt-6 text-left">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
      >
        <span className="flex items-center gap-2">
          <Database className="size-4 text-cyan-400/80" />
          Connect Supabase (optional)
        </span>
        <ChevronDown className={`size-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-black/40 p-4 text-xs text-slate-400">
              <p className="leading-relaxed">
                Paste your project URL and <strong className="text-slate-300">anon public</strong> key from
                Supabase → <span className="font-mono text-slate-300">Settings → API</span>. Do not paste the{' '}
                <code className="text-amber-200/90">service_role</code> key here.
              </p>

              {usingEnv && (
                <p className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5 text-emerald-200/90">
                  Using values from <code className="font-mono">.env.local</code>. Form below only applies if those
                  env vars are empty.
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="sb-url" className="text-slate-400">
                  Project URL
                </Label>
                <Input
                  id="sb-url"
                  type="url"
                  autoComplete="off"
                  placeholder="https://xxxx.supabase.co"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="border-white/10 bg-black/50 font-mono text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sb-key" className="text-slate-400">
                  Anon public key
                </Label>
                <Input
                  id="sb-key"
                  type="password"
                  autoComplete="off"
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  value={anonKey}
                  onChange={e => setAnonKey(e.target.value)}
                  className="border-white/10 bg-black/50 font-mono text-xs text-slate-200"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                  onClick={handleSave}
                >
                  Save to this browser
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-xs text-slate-400"
                  onClick={handleClear}
                >
                  <Trash2 className="mr-1 size-3" />
                  Clear saved
                </Button>
              </div>

              {savedMsg && <p className="text-[11px] text-cyan-300/90">{savedMsg}</p>}

              <p className="border-t border-white/5 pt-2 text-[11px] text-slate-500">
                Alternative: set <code className="font-mono text-slate-400">VITE_SUPABASE_URL</code> and{' '}
                <code className="font-mono text-slate-400">VITE_SUPABASE_ANON_KEY</code> in{' '}
                <code className="font-mono text-slate-400">.env.local</code> and restart{' '}
                <code className="font-mono text-slate-400">npm run dev</code>.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
