/**
 * Staff — pauta simples em SVG (clave de sol) com cabeças de nota posicionadas
 * por grau diatônico. Mostra acidente (♯) para teclas pretas e linhas
 * suplementares para notas fora da pauta. Suficiente para sight-singing.
 */

// pitch class → [índice da letra natural (C=0..B=6), é sustenido?]
const PC_TO_LETTER: [number, boolean][] = [
  [0, false], // C
  [0, true],  // C#
  [1, false], // D
  [1, true],  // D#
  [2, false], // E
  [3, false], // F
  [3, true],  // F#
  [4, false], // G
  [4, true],  // G#
  [5, false], // A
  [5, true],  // A#
  [6, false], // B
];

const BOTTOM_LINE_STEP = 30; // E4 = oitava 4 * 7 + letra 2
const TOP_LINE_STEP = 38;    // F5
const STEP_PX = 7;           // px por meio-passo (linha→espaço)

function midiToStaff(midi: number): { step: number; sharp: boolean } {
  const pc = ((midi % 12) + 12) % 12;
  const [letter, sharp] = PC_TO_LETTER[pc];
  const octave = Math.floor(midi / 12) - 1;
  return { step: octave * 7 + letter, sharp };
}

interface StaffProps {
  notes: number[];
  /** índice da nota atual (destacada) */
  currentIdx: number;
  /** índices já acertados */
  doneCount: number;
}

export function Staff({ notes, currentIdx, doneCount }: StaffProps) {
  const padX = 56;
  const stepX = 42;
  const width = Math.max(280, padX + notes.length * stepX + 24);
  const height = 150;
  const baseY = 95; // y da linha de baixo (E4)

  const yForStep = (step: number) => baseY - (step - BOTTOM_LINE_STEP) * STEP_PX;

  // 5 linhas: steps 30,32,34,36,38
  const lineSteps = [30, 32, 34, 36, 38];

  return (
    <div className="card p-4 overflow-x-auto">
      <svg width={width} height={height} className="block mx-auto" role="img" aria-label="pauta">
        {/* linhas da pauta */}
        {lineSteps.map((s) => (
          <line key={s} x1={16} y1={yForStep(s)} x2={width - 12} y2={yForStep(s)} stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
        ))}
        {/* clave de sol */}
        <text x={20} y={baseY + 9} fontSize={56} fill="rgba(255,255,255,0.7)" style={{ fontFamily: 'serif' }}>𝄞</text>

        {notes.map((midi, i) => {
          const { step, sharp } = midiToStaff(midi);
          const cx = padX + i * stepX;
          const cy = yForStep(step);
          const done = i < doneCount;
          const current = i === currentIdx;
          const color = done ? '#34d399' : current ? '#fbbf24' : 'rgba(255,255,255,0.85)';

          // linhas suplementares (steps pares fora da pauta)
          const ledgers: number[] = [];
          for (let s = TOP_LINE_STEP + 2; s <= step; s += 2) ledgers.push(s);
          for (let s = BOTTOM_LINE_STEP - 2; s >= step; s -= 2) ledgers.push(s);

          return (
            <g key={i}>
              {ledgers.map((s) => (
                <line key={s} x1={cx - 11} y1={yForStep(s)} x2={cx + 11} y2={yForStep(s)} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
              ))}
              {sharp && (
                <text x={cx - 22} y={cy + 4} fontSize={16} fill={color} style={{ fontFamily: 'serif' }}>♯</text>
              )}
              <ellipse cx={cx} cy={cy} rx={7.5} ry={5.5} fill={color} transform={`rotate(-20 ${cx} ${cy})`} />
              {current && (
                <circle cx={cx} cy={cy} r={13} fill="none" stroke="#fbbf24" strokeWidth={1.5} className="animate-ping" opacity={0.5} />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
