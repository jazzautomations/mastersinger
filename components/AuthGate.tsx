import { useState } from 'react';
import { useStore } from '../store/store';

// ──────────────────────────────────────────────────────────────────────────
// AuthGate — login/signup screen shown when entering the app.
// Jornada: Landing → AuthGate → Onboarding → Dashboard
// ──────────────────────────────────────────────────────────────────────────

export function AuthGate({ onDone }: { onDone: () => void }) {
  const { signIn, signUp, authUser } = useStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, skip
  if (authUser) { onDone(); return null; }

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const res = await fn(email.trim(), password);
    setBusy(false);
    if (!res.ok) { setError(res.error || 'Falha na autenticação'); return; }
    onDone();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <span className="text-4xl">🎤</span>
          <h1 className="text-2xl font-black display neon-text">MasterSinger</h1>
          <p className="text-sm text-slate-400">
            {mode === 'signup'
              ? 'Crie sua conta gratuita e comece a cantar melhor.'
              : 'Entre na sua conta pra continuar treinando.'}
          </p>
        </div>

        {/* Form */}
        <div className="card p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-3">{error}</div>
          )}

          <div className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Senha (mín. 6 caracteres)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={busy || !email || password.length < 6}
            className="btn-primary w-full text-sm py-3 disabled:opacity-40"
          >
            {busy ? 'Aguarde...' : mode === 'signup' ? 'Criar conta e começar' : 'Entrar'}
          </button>

          <button
            onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null); }}
            className="w-full text-xs text-slate-400 hover:text-violet-300 transition-all"
          >
            {mode === 'signup' ? 'Já tem conta? Entrar' : 'Não tem conta? Criar agora'}
          </button>
        </div>

        {/* Skip (free tier, local only) */}
        <div className="text-center">
          <button
            onClick={onDone}
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
