import { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import { getSupabaseClient } from '../services/supabase';

export function AuthGate({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const { signIn, signUp, authUser } = useStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (authUser) onDone();
  }, [authUser, onDone]);

  if (authUser) return null;

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    // Explicit mode: signin logs in, signup creates. On signup collision we
    // fall back to signin so a returning user isn't blocked by the default tab.
    if (mode === 'signin') {
      const res = await signIn(email.trim(), password);
      setBusy(false);
      if (!res.ok) { setError(res.error || 'E-mail ou senha incorretos.'); return; }
      onDone();
      return;
    }
    const res = await signUp(email.trim(), password);
    if (!res.ok) {
      if (res.error?.includes('already') || res.error?.includes('registered') || res.error?.includes('exists')) {
        const signInRes = await signIn(email.trim(), password);
        setBusy(false);
        if (!signInRes.ok) { setError('Esse e-mail já tem conta. Tente entrar com sua senha.'); return; }
        onDone();
        return;
      }
      setBusy(false);
      setError(res.error || 'Falha no cadastro.');
      return;
    }
    setBusy(false);
    onDone();
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleBusy(true);
    try {
      const sb = getSupabaseClient();
      if (!sb) { setError('Backend não configurado'); setGoogleBusy(false); return; }
      const { data, error: authError } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (authError) {
        setError(authError.message);
        setGoogleBusy(false);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      setError(e.message || 'Falha ao conectar com Google');
      setGoogleBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <span className="text-4xl">🎤</span>
          <h1 className="text-2xl font-black display neon-text">MasterSinger</h1>
          <p className="text-sm text-slate-400">
            {mode === 'signup' ? 'Crie sua conta gratuita e salve seu progresso na nuvem.' : 'Bem-vindo de volta! Entre na sua conta.'}
          </p>
        </div>

        <div className="card p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-3">{error}</div>
          )}

          <button
            onClick={handleGoogle}
            disabled={googleBusy}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 rounded-xl py-3 text-sm font-bold hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleBusy ? 'Aguarde...' : 'Continuar com Google'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">ou</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <div className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              aria-label="Email"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Senha (mín. 6 caracteres)"
              aria-label="Senha"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={busy || !email || password.length < 6}
            className="btn-primary w-full text-sm py-3 disabled:opacity-40"
          >
            {busy ? 'Aguarde...' : mode === 'signup' ? 'Criar conta' : 'Entrar'}
          </button>
          <button
            onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null); }}
            className="w-full text-xs text-slate-400 hover:text-violet-300 transition-all"
          >
            {mode === 'signup' ? 'Já tem conta? Entrar' : 'Não tem conta? Criar agora'}
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={onSkip}
            className="text-xs text-slate-500 hover:text-slate-300 transition-all"
          >
            Pular por enquanto (só local)
          </button>
          <p className="text-[10px] text-slate-600 mt-1 font-mono">
            Sem login, dados ficam só neste dispositivo
          </p>
        </div>
      </div>
    </div>
  );
}
