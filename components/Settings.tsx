import { useState, useRef } from 'react';
import { useStore } from '../store/store';
import { t } from '../i18n/strings';
import type { Language, StudentLevel, VoiceType } from '../types';
import { downloadBlob } from '../services/midiService';
import { isSubscriptionActive } from '../services/entitlements';
import { VoiceRangeTest } from './VoiceRangeTest';
import { midiToNoteName } from '../services/theoryService';

export function Settings() {
  const { profile, updateSettings, resetProfile, exportProfile, importProfile, authUser, subscription, isPro, signOut, openUpgrade } = useStore();
  const lang = profile.settings.language;
  const [resetOpen, setResetOpen] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [showVoiceTest, setShowVoiceTest] = useState(false);
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

  // handleChangePassword REMOVIDO — login agora é só Google (0 fricção, 0 account takeover)

  const handleSignOut = async () => {
    await signOut();
  };

  const subLabel = () => {
    if (!subscription) return lang === 'pt-BR' ? 'Gratuito' : 'Free';
    if (!isSubscriptionActive(subscription)) return lang === 'pt-BR' ? 'Expirado' : 'Expired';
    const p = subscription.plan;
    if (p === 'pro-monthly') return lang === 'pt-BR' ? 'Pro Mensal' : 'Pro Monthly';
    if (p === 'pro-yearly') return lang === 'pt-BR' ? 'Pro Anual' : 'Pro Yearly';
    if (p === 'lifetime') return lang === 'pt-BR' ? 'Vitalício' : 'Lifetime';
    return 'Pro';
  };

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-black display tracking-tight">{t(lang, 'settings.title')}</h1>
      </div>

      {/* ── Account ── */}
      <div className="card p-5 space-y-4">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{lang === 'pt-BR' ? 'Conta' : 'Account'}</div>
        {authUser ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                {(authUser.email ?? '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-100 truncate">{authUser.email}</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {subLabel()}
                  {isPro && <span className="ml-1.5 text-amber-400">{'\u{1F451}'}</span>}
                </div>
              </div>
            </div>

            {isPro ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                {lang === 'pt-BR' ? 'Seu plano Pro está ativo.' : 'Your Pro plan is active.'}
              </div>
            ) : (
              <button onClick={() => openUpgrade()} className="w-full btn-primary text-xs py-3">
                {lang === 'pt-BR' ? 'Fazer upgrade para Pro' : 'Upgrade to Pro'}
              </button>
            )}

            {/* Bloco "alterar senha" removido — Google-only auth */}

            <button onClick={handleSignOut} className="w-full btn-ghost !text-red-400 !border-red-500/30 text-xs">
              <i className="fas fa-sign-out-alt mr-2"></i>{lang === 'pt-BR' ? 'Sair da conta' : 'Sign out'}
            </button>
          </>
        ) : (
          <div className="text-center text-sm text-slate-400 py-2">
            {lang === 'pt-BR' ? 'Faça login com Google para acessar sua conta e sincronizar dados.' : 'Sign in with Google to access your account and sync data.'}
          </div>
        )}
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

      {/* ── Audio & Tuning ── */}
      <div className="card p-5 space-y-4">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">
          {lang === 'pt-BR' ? 'Áudio e Afinação' : 'Audio & Tuning'}
        </div>

        {/* Mic Sensitivity */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">{lang === 'pt-BR' ? 'Sensibilidade do Microfone' : 'Microphone Sensitivity'}</span>
            <span className="text-xs font-mono text-violet-400">
              {Math.round((profile.settings.micSensitivity ?? 0.5) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.05}
            value={profile.settings.micSensitivity ?? 0.5}
            onChange={e => updateSettings({ micSensitivity: +e.target.value })}
            className="w-full"
          />
          <div className="text-[11px] text-slate-500">
            {lang === 'pt-BR'
              ? 'Aumente se o afinador não detecta sua voz. Reduza se detecta ruído de fundo.'
              : 'Increase if tuner doesn\'t detect your voice. Decrease if it picks up background noise.'}
          </div>
        </div>

        {/* Noise Gate */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">{lang === 'pt-BR' ? 'Noise Gate' : 'Noise Gate'}</span>
            <span className="text-xs font-mono text-violet-400">
              {((profile.settings.noiseGate ?? 0.02) * 100).toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min={0.005}
            max={0.1}
            step={0.005}
            value={profile.settings.noiseGate ?? 0.02}
            onChange={e => updateSettings({ noiseGate: +e.target.value })}
            className="w-full"
          />
          <div className="text-[11px] text-slate-500">
            {lang === 'pt-BR'
              ? 'Filtro de ruído. Aumente em ambientes barulhentos.'
              : 'Noise filter. Increase in noisy environments.'}
          </div>
        </div>

        {/* Tuning Precision */}
        <div className="space-y-2">
          <span className="text-sm text-slate-300">{lang === 'pt-BR' ? 'Precisão da Afinação' : 'Tuning Precision'}</span>
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: 'fast',      label: lang === 'pt-BR' ? 'Rápido' : 'Fast',      desc: lang === 'pt-BR' ? 'Menos latência' : 'Lower latency', icon: '⚡' },
              { v: 'balanced',  label: lang === 'pt-BR' ? 'Balanceado' : 'Balanced', desc: lang === 'pt-BR' ? 'Recomendado' : 'Recommended', icon: '⚖️' },
              { v: 'precise',   label: lang === 'pt-BR' ? 'Preciso' : 'Precise',   desc: lang === 'pt-BR' ? 'Máxima precisão' : 'Highest accuracy', icon: '🎯' },
            ] as const).map(opt => (
              <button
                key={opt.v}
                onClick={() => updateSettings({ tuningPrecision: opt.v })}
                className={`p-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 ${(profile.settings.tuningPrecision ?? 'balanced') === opt.v ? 'bg-violet-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
              >
                <span className="text-xl">{opt.icon}</span>
                <span>{opt.label}</span>
                <span className="text-[9px] opacity-70">{opt.desc}</span>
              </button>
            ))}
          </div>
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

      {/* ── Voice Range / Tessitura ── */}
      <div className="card p-5 space-y-4">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">
          {lang === 'pt-BR' ? 'Tessitura Vocal' : 'Voice Range'}
        </div>
        {showVoiceTest ? (
          <VoiceRangeTest mode="settings" onComplete={() => setShowVoiceTest(false)} onSkip={() => setShowVoiceTest(false)} />
        ) : (
          <>
            {profile.range?.voiceType && profile.range.voiceType !== 'unknown' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-xl">
                    {profile.range.voiceType === 'soprano' ? '🎵' :
                     profile.range.voiceType === 'mezzo' ? '🎶' :
                     profile.range.voiceType === 'alto' ? '🎼' :
                     profile.range.voiceType === 'tenor' ? '🎤' :
                     profile.range.voiceType === 'baritone' ? '🔊' : '🔈'}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{lang === 'pt-BR' ? profile.range.voiceType.charAt(0).toUpperCase() + profile.range.voiceType.slice(1) : profile.range.voiceType}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {profile.range.lowestMidi != null && profile.range.highestMidi != null
                        ? `${midiToNoteName(profile.range.lowestMidi)} → ${midiToNoteName(profile.range.highestMidi)}`
                        : ''}
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowVoiceTest(true)} className="btn-ghost w-full text-xs">
                  <i className="fas fa-redo mr-2"></i>{lang === 'pt-BR' ? 'Refazer teste' : 'Retake test'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-slate-300">
                  {lang === 'pt-BR'
                    ? 'Descubra sua faixa vocal para que os exercícios se ajustem automaticamente.'
                    : 'Discover your vocal range so exercises adapt automatically.'}
                </div>
                <button onClick={() => setShowVoiceTest(true)} className="btn-primary w-full">
                  <i className="fas fa-microphone mr-2"></i>{lang === 'pt-BR' ? 'Testar Tessitura' : 'Test Voice Range'}
                </button>
              </div>
            )}
          </>
        )}
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
