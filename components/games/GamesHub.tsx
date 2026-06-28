/**
 * GamesHub — central dos mini-jogos de treino. Mostra cards e roteia para
 * cada jogo. Inspirado no Theta Music Trainer, recriado para o MasterSinger.
 */

import { useState } from 'react';
import { useStore } from '../../store/store';
import { GAMES, type GameId } from '../../data/games';
import { VocalMatchGame } from './VocalMatchGame';
import { ScaleDegreesGame } from './ScaleDegreesGame';
import { SightSingGame } from './SightSingGame';
import { EarBlitzGame } from './EarBlitzGame';

const TITLES: Record<GameId, [string, string]> = {
  'vocal-match': ['Vocal Match', 'Vocal Match'],
  'scale-degrees': ['Graus da Escala', 'Scale Degrees'],
  'sight-sing': ['Leitura Cantada', 'Sight-Singing'],
  'ear-blitz': ['Ear Blitz', 'Ear Blitz'],
};
const DESCS: Record<GameId, [string, string]> = {
  'vocal-match': ['Ouça a frase e cante nota por nota com precisão.', 'Hear a phrase, sing it back in tune.'],
  'scale-degrees': ['Cante os graus da escala / solfejo móvel.', 'Sing scale degrees / movable solfège.'],
  'sight-sing': ['Leia a pauta e cante — treino de leitura à primeira vista.', 'Read the staff and sing it — sight-singing.'],
  'ear-blitz': ['Treino de ouvido relâmpago: 60s, faça combo.', 'Rapid ear training: 60s, build a combo.'],
};

export function GamesHub() {
  const { profile } = useStore();
  const en = profile.settings.language === 'en';
  const [active, setActive] = useState<GameId | null>(null);

  const exit = () => setActive(null);

  if (active === 'vocal-match') return <VocalMatchGame onExit={exit} />;
  if (active === 'scale-degrees') return <ScaleDegreesGame onExit={exit} />;
  if (active === 'sight-sing') return <SightSingGame onExit={exit} />;
  if (active === 'ear-blitz') return <EarBlitzGame onExit={exit} />;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-4xl mb-1">🎮</div>
        <h1 className="text-2xl font-black display neon-text">{en ? 'Games' : 'Jogos'}</h1>
        <p className="text-xs text-slate-400 mt-1">
          {en ? 'Train your voice and ear, one round at a time.' : 'Treine voz e ouvido, uma rodada de cada vez.'}
        </p>
      </div>

      <div className="grid gap-3">
        {GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => setActive(g.id)}
            className={`card p-5 text-left bg-gradient-to-r ${g.accent} hover:scale-[1.01] transition-all`}
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">{g.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-black display">{TITLES[g.id][en ? 1 : 0]}</h3>
                  {g.usesMic && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">🎙️ MIC</span>}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{DESCS[g.id][en ? 1 : 0]}</p>
              </div>
              <div className="text-slate-500"><i className="fas fa-chevron-right"></i></div>
            </div>
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] text-slate-500">
        {en ? '🎧 Headphones recommended for mic games (avoids echo).' : '🎧 Use fones nos jogos de microfone (evita eco).'}
      </p>
    </div>
  );
}
