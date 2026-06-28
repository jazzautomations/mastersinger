/**
 * GameShell — moldura visual compartilhada pelos mini-jogos.
 * Header com voltar + HUD (score / streak / melhor) + slot de conteúdo.
 */

import type { ReactNode } from 'react';

interface GameShellProps {
  emoji: string;
  title: string;
  subtitle?: string;
  onExit: () => void;
  score: number;
  streak: number;
  best: number;
  /** linha extra no HUD (ex.: "Nível 3/12") */
  badge?: string;
  children: ReactNode;
}

export function GameShell({ emoji, title, subtitle, onExit, score, streak, best, badge, children }: GameShellProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="text-xs font-mono text-slate-400 hover:text-violet-300 transition-all flex items-center gap-1">
          <i className="fas fa-arrow-left"></i> Jogos
        </button>
        {badge && <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-white/5 text-slate-300">{badge}</span>}
      </div>

      <div className="text-center">
        <div className="text-4xl mb-1">{emoji}</div>
        <h1 className="text-xl font-black display neon-text">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Score" value={score} color="text-white" />
        <Stat label="Sequência" value={streak} color="text-emerald-400" />
        <Stat label="Recorde" value={best} color="text-amber-400" />
      </div>

      {children}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-2xl font-black tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

/** Medidor de afinação ao vivo (cents do alvo atual, com equivalência de oitava). */
export function TuneMeter({ cents, level }: { cents: number | null; level: number }) {
  // cents: 0 = perfeito; null = silêncio. Mapeia 0..100 cents → barra centralizada.
  const has = cents !== null;
  const clamped = has ? Math.min(100, cents!) : 0;
  const good = has && cents! <= 80;
  const perfect = has && cents! <= 40;
  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Sua afinação</span>
        <span className={`text-xs font-mono ${perfect ? 'text-emerald-400' : good ? 'text-amber-400' : 'text-slate-500'}`}>
          {has ? `${Math.round(cents!)}¢` : '— cante —'}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-white/5 overflow-hidden relative">
        {has && (
          <div
            className={`h-full rounded-full transition-all duration-75 ${perfect ? 'bg-emerald-400' : good ? 'bg-amber-400' : 'bg-rose-500'}`}
            style={{ width: `${Math.max(6, 100 - clamped)}%` }}
          />
        )}
      </div>
      {/* medidor de volume do mic */}
      <div className="h-1 rounded-full bg-white/5 overflow-hidden mt-2">
        <div className="h-full bg-violet-500/60 transition-all duration-75" style={{ width: `${Math.min(100, level * 180)}%` }} />
      </div>
    </div>
  );
}

/** Overlay grande de feedback (PERFEITO! / BOM!). */
export function FeedbackBurst({ quality }: { quality: 'perfect' | 'good' | null }) {
  if (!quality) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div
        className={`text-5xl font-black display ${quality === 'perfect' ? 'text-emerald-400' : 'text-amber-400'}`}
        style={{ textShadow: '0 0 24px currentColor' }}
      >
        {quality === 'perfect' ? 'PERFEITO!' : 'BOM!'}
      </div>
    </div>
  );
}
