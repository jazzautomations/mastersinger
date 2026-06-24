import { useState, useRef } from 'react';
import { useStore } from '../store/store';
import { t } from '../i18n/strings';
import type { Language, StudentLevel } from '../types';
import { downloadBlob } from '../services/midiService';

export function Settings() {
  const { profile, updateSettings, resetProfile, exportProfile, importProfile, syncStatus, syncMessage, connectSupabase, disconnectSupabase, forceSyncToSupabase } = useStore();
  const lang = profile.settings.language;
  const [resetOpen, setResetOpen] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = exportProfile();
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `mastersinger-backup-${Date.now()}.json`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importProfile(reader.result as string);
      setImportMsg(ok ? (lang === 'pt-BR' ? 'Importado com sucesso!' : 'Imported successfully!') : (lang === 'pt-BR' ? 'Falha ao importar' : 'Import failed'));
      setTimeout(() => setImportMsg(null), 3000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-black display tracking-tight">{t(lang, 'settings.title')}</h1>
      </div>

      <div className="card p-5 space-y-3">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{lang === 'pt-BR' ? 'Supabase' : 'Supabase'}</div>
        <div className="text-[11px] text-slate-500 leading-relaxed">
          {lang === 'pt-BR'
            ? 'Se conectado, seu perfil e melodias ficam sincronizados na nuvem. Se não, o app continua funcionando localmente.'
            : 'When connected, your profile and melodies sync to the cloud. If not, the app still works locally.'}
        </div>
        <div className="flex items-center justify-between gap-3 text-xs font-mono">
          <span className={`px-2 py-1 rounded-full ${syncStatus === 'connected' ? 'bg-green-500/20 text-green-300' : syncStatus === 'error' ? 'bg-red-500/20 text-red-300' : syncStatus === 'syncing' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-slate-300'}`}>
            {syncStatus}
          </span>
          <span className="text-slate-400">{syncMessage ?? (lang === 'pt-BR' ? 'Sem mensagem.' : 'No message.')}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={async () => { setBusy(true); try { await connectSupabase(); } finally { setBusy(false); } }} disabled={busy} className="btn-primary">
            {lang === 'pt-BR' ? 'Conectar' : 'Connect'}
          </button>
          <button onClick={async () => { setBusy(true); try { await forceSyncToSupabase(); } finally { setBusy(false); } }} disabled={busy || syncStatus === 'local'} className="btn-ghost">
            {lang === 'pt-BR' ? 'Sincronizar agora' : 'Sync now'}
          </button>
          <button onClick={disconnectSupabase} className="btn-ghost col-span-2">
            {lang === 'pt-BR' ? 'Desconectar' : 'Disconnect'}
          </button>
        </div>
      </div>

      {/* Language */}
      <div className="card p-5 space-y-3">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'settings.language')}</div>
        <div className="grid grid-cols-2 gap-2">
          {(['pt-BR', 'en'] as Language[]).map(l => (
            <button
              key={l}
              onClick={() => updateSettings({ language: l })}
              className={`p-3 rounded-lg text-sm font-bold transition-all ${profile.settings.language === l ? 'bg-violet-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
            >
              {l === 'pt-BR' ? '🇧🇷 Português' : '🇺🇸 English'}
            </button>
          ))}
        </div>
      </div>

      {/* A4 reference */}
      <div className="card p-5 space-y-3">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'settings.a4')}</div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={415}
            max={466}
            step={1}
            value={profile.settings.a4}
            onChange={e => updateSettings({ a4: +e.target.value })}
            className="flex-1"
          />
          <span className="text-sm font-mono w-16 text-right">{profile.settings.a4} Hz</span>
        </div>
        <div className="text-[11px] text-slate-500">
          {lang === 'pt-BR'
            ? 'Padrão: 440 Hz. Barroco: 415 Hz. Algumas orquestras: 442-445 Hz.'
            : 'Standard: 440 Hz. Baroque: 415 Hz. Some orchestras: 442-445 Hz.'}
        </div>
      </div>

      {/* Student level */}
      <div className="card p-5 space-y-3">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'settings.level')}</div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: 'beginner',     label: t(lang, 'settings.level.beginner'),     icon: '🌱' },
            { v: 'intermediate', label: t(lang, 'settings.level.intermediate'), icon: '🔥' },
            { v: 'advanced',     label: t(lang, 'settings.level.advanced'),     icon: '💎' },
          ] as { v: StudentLevel; label: string; icon: string }[]).map(opt => (
            <button
              key={opt.v}
              onClick={() => updateSettings({ level: opt.v })}
              className={`p-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 ${profile.settings.level === opt.v ? 'bg-cyan-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
            >
              <span className="text-xl">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Data management */}
      <div className="card p-5 space-y-3">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{lang === 'pt-BR' ? 'Seus dados' : 'Your data'}</div>
        <div className="text-[11px] text-slate-500">
          {lang === 'pt-BR'
            ? 'Tudo é salvo localmente no seu navegador. Nada é enviado para servidores. Faça backup antes de limpar o navegador.'
            : 'Everything is stored locally in your browser. Nothing is sent to servers. Back up before clearing your browser.'}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleExport} className="btn-ghost">
            <i className="fas fa-download mr-2"></i>{t(lang, 'settings.exportData')}
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-ghost">
            <i className="fas fa-upload mr-2"></i>{t(lang, 'settings.importData')}
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
        {importMsg && <div className="text-xs text-center text-cyan-400">{importMsg}</div>}
      </div>

      {/* Reset */}
      <div className="card p-5 space-y-3 border-red-500/20">
        <div className="text-xs text-red-400 uppercase tracking-wider font-mono">{t(lang, 'settings.resetData')}</div>
        {!resetOpen ? (
          <button onClick={() => setResetOpen(true)} className="btn-ghost !text-red-400 !border-red-500/30 w-full">
            {t(lang, 'settings.resetData')}
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 text-center">{t(lang, 'settings.resetConfirm')}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { resetProfile(); setResetOpen(false); }} className="btn-primary !bg-gradient-to-r !from-red-500 !to-orange-500">
                {lang === 'pt-BR' ? 'Resetar' : 'Reset'}
              </button>
              <button onClick={() => setResetOpen(false)} className="btn-ghost">
                {t(lang, 'common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-slate-500 font-mono pt-4">
        MasterSinger v0.1 · {lang === 'pt-BR' ? 'feito com 🎤' : 'made with 🎤'}
      </div>
    </div>
  );
}
