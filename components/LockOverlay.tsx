import { useStore } from '../store/store';

interface LockOverlayProps {
  label?: string;
}

export function LockOverlay({ label }: LockOverlayProps) {
  const { openUpgrade } = useStore();
  return (
    <button
      onClick={() => openUpgrade()}
      className="w-full card p-8 text-center space-y-3 border-amber-500/30 hover:border-amber-500/50 transition-all cursor-pointer"
    >
      <div className="text-4xl">🔒</div>
      <div className="text-sm font-bold text-amber-200">{label || 'Recurso Pro'}</div>
      <div className="text-xs text-slate-400">Assine o plano Pro para acessar este conteúdo</div>
      <div className="btn-primary text-xs py-2 px-4 inline-block">Ver planos</div>
    </button>
  );
}
