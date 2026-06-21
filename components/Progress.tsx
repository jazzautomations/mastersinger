import { useStore, getLevelTitle, getLeague, xpForLevel } from '../store/store';
import { t } from '../i18n/strings';
import { BADGES, getEarnedBadges } from '../data/badges';
import { midiToNoteName, weekStartISO } from '../services/theoryService';

export function Progress() {
  const { profile } = useStore();
  const lang = profile.settings.language;

  const weeklyXp = profile.weeklyXp.find(w => w.weekStart === weekStartISO())?.xp ?? 0;
  const league = getLeague(weeklyXp);
  const levelTitle = getLevelTitle(profile.level);
  const xpForNext = xpForLevel(profile.level);
  const levelProgress = Math.round((profile.xp / xpForNext) * 100);

  const earnedBadges = getEarnedBadges(profile.badges);
  const recentResults = profile.results.slice(0, 10);

  // ── Range display ──
  const lowMidi = profile.range.lowestMidi;
  const highMidi = profile.range.highestMidi;
  const rangeSpan = (lowMidi && highMidi) ? (highMidi - lowMidi) : 0;
  const rangeOctaves = rangeSpan / 12;

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-black display tracking-tight">{t(lang, 'progress.title')}</h1>
      </div>

      {/* Stats overview */}
      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-3xl font-black font-mono neon-text">{profile.level}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{t(lang, 'common.level')}</div>
            <div className="text-xs text-violet-300 font-mono">{levelTitle}</div>
          </div>
          <div>
            <div className="text-3xl font-black font-mono neon-text">{profile.xp}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{t(lang, 'common.xp')}</div>
            <div className="text-xs text-slate-400 font-mono">{profile.xp}/{xpForNext}</div>
          </div>
        </div>
        <div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full" style={{ width: `${levelProgress}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center pt-2">
          <div>
            <div className="text-xl font-black font-mono">🔥 {profile.streak.current}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{t(lang, 'common.streak')}</div>
          </div>
          <div>
            <div className="text-xl font-black font-mono">⭐ {profile.streak.longest}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{lang === 'pt-BR' ? 'Recorde' : 'Best'}</div>
          </div>
          <div>
            <div className="text-xl font-black font-mono">{league}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{t(lang, 'home.league')}</div>
          </div>
        </div>
      </div>

      {/* Vocal range */}
      <div className="card p-5 space-y-3">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'progress.range')}</div>
        {lowMidi && highMidi ? (
          <>
            <div className="flex justify-between items-end">
              <div className="text-center">
                <div className="text-2xl font-black font-mono text-cyan-400">{midiToNoteName(lowMidi)}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t(lang, 'progress.rangeLow')}</div>
              </div>
              <div className="text-3xl">↔</div>
              <div className="text-center">
                <div className="text-2xl font-black font-mono text-violet-400">{midiToNoteName(highMidi)}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t(lang, 'progress.rangeHigh')}</div>
              </div>
            </div>
            <div className="text-center text-sm font-mono text-slate-300">
              {rangeOctaves.toFixed(1)} {lang === 'pt-BR' ? 'oitavas' : 'octaves'} · {rangeSpan} {lang === 'pt-BR' ? 'semitons' : 'semitones'}
            </div>
          </>
        ) : (
          <div className="text-center text-sm text-slate-400 py-4">{t(lang, 'progress.rangeUnknown')}</div>
        )}
      </div>

      {/* Recent results */}
      <div className="space-y-3">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'progress.recentResults')}</div>
        {recentResults.length === 0 ? (
          <div className="card p-5 text-center text-sm text-slate-400">{t(lang, 'progress.noResults')}</div>
        ) : (
          <div className="space-y-2">
            {recentResults.map((r, i) => (
              <div key={i} className="card p-3 flex items-center justify-between">
                <div className="text-sm font-mono text-slate-300">{r.exerciseId}</div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-green-400">{r.accuracyPct}%</span>
                  <span className="text-violet-400">{r.stabilityPct}%</span>
                  <span className={`font-black ${r.score >= 90 ? 'text-green-400' : r.score >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{r.score}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'progress.badges')}</div>
          <div className="text-xs text-slate-500 font-mono">{earnedBadges.length}/{BADGES.length}</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {BADGES.map(badge => {
            const earned = profile.badges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`card p-3 text-center transition-all ${earned ? 'opacity-100' : 'opacity-30 grayscale'}`}
                title={badge.description}
              >
                <div className="text-2xl mb-1">{badge.icon}</div>
                <div className="text-[10px] font-bold leading-tight">{badge.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
