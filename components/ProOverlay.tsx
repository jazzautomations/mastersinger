import { useStore } from '../store/store';

interface ProOverlayProps {
  children: React.ReactNode;
  viewName: string;
}

export function ProOverlay({ children, viewName }: ProOverlayProps) {
  const { isPro, openUpgrade } = useStore();

  if (isPro) return <>{children}</>;

  return (
    <div className="relative">
      {/* Content visible but locked */}
      <div className="pointer-events-none select-none opacity-40 blur-[1px]">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <button
          onClick={() => openUpgrade()}
          className="bg-slate-900/90 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-6 text-center space-y-3 max-w-xs mx-4 hover:border-amber-500/50 transition-all cursor-pointer"
        >
          <div className="text-4xl">🔒</div>
          <div className="text-sm font-bold text-amber-200">{viewName} — Pro</div>
          <div className="text-xs text-slate-400">Assine para desbloquear este conteúdo</div>
          <div className="btn-primary text-xs py-2 px-4 inline-block">Ver planos</div>
        </button>
      </div>
    </div>
  );
}
