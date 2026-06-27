// ─────────────────────────────────────────────────────────────────────────
// Lesson "deep dive" — the substance layer. Each lesson gets the deeper WHY,
// the common MISTAKES singers make, a step-by-step PRACTICE routine, and a
// CHECKPOINT for "you've got it". Bilingual, keyed by lesson id so it never
// touches the index-based pt translation map in courses.pt.ts.
// Rendered by the Academy as an expandable "🔬 Aprofundar / Deep dive" panel.
// ─────────────────────────────────────────────────────────────────────────

export interface Bi { en: string; pt: string; }
export interface LessonDeepDive {
  why: Bi;
  mistakes: Bi[];
  practice: Bi[];
  checkpoint: Bi;
}

export const LESSON_DEEP_DIVE: Record<string, LessonDeepDive> = {
  // ═══════════════ 🔥 WARMUP ═══════════════
  'warmup-1': {
    why: {
      en: 'The vocal folds are layered tissue — muscle, ligament and a delicate mucosa — sitting in the larynx and vibrating 100–1000+ times per second. Cold, they are stiffer and less hydrated, so they collide harder and tire faster. A warm-up raises local blood flow and tissue temperature, thins the mucus layer, and "wakes up" the fine coordination between breath pressure and fold closure. You are not making sound louder; you are making it easier and safer.',
      pt: 'As pregas vocais são tecido em camadas — músculo, ligamento e uma mucosa delicada — alojadas na laringe, vibrando de 100 a 1000+ vezes por segundo. Frias, ficam mais rígidas e menos hidratadas, então colidem com mais força e cansam mais rápido. O aquecimento aumenta o fluxo sanguíneo local e a temperatura do tecido, afina a camada de muco e "acorda" a coordenação fina entre pressão do ar e fechamento das pregas. Você não está deixando o som mais alto; está deixando-o mais fácil e seguro.',
    },
    mistakes: [
      { en: 'Belting high notes in the first minute — the cold voice is least able to handle pressure.', pt: 'Soltar agudos com potência no primeiro minuto — a voz fria é a menos capaz de lidar com pressão.' },
      { en: 'Warming up for 20+ minutes and arriving tired before the real singing.', pt: 'Aquecer por 20+ minutos e chegar cansado antes de cantar de verdade.' },
      { en: 'Skipping breath/posture and only doing pitch slides.', pt: 'Pular respiração/postura e só fazer deslizes de altura.' },
    ],
    practice: [
      { en: 'Stand tall, roll the shoulders back and down, unclench the jaw.', pt: 'Fique ereto, gire os ombros pra trás e pra baixo, solte a mandíbula.' },
      { en: 'Hum gently on a comfortable mid note for 30 seconds.', pt: 'Cantarole suave numa nota média confortável por 30 segundos.' },
      { en: 'Glide up and down a 5-note range on "ng" or a lip trill.', pt: 'Deslize pra cima e pra baixo num âmbito de 5 notas em "ng" ou lip trill.' },
      { en: 'Only then extend toward your highs and lows.', pt: 'Só então estenda em direção aos agudos e graves.' },
    ],
    checkpoint: { en: 'After 5–8 minutes your voice feels "free and ready", not strained — and you never pushed through pain.', pt: 'Depois de 5–8 min sua voz parece "livre e pronta", sem esforço — e você nunca forçou com dor.' },
  },
  'warmup-2': {
    why: {
      en: 'The lip trill is a semi-occluded vocal tract (SOVT) exercise: partly closing the airway at the lips raises pressure just above the folds, which "back-pressures" them into vibrating with less effort and less collision force. It is one of the safest, most efficient ways to balance airflow and fold closure — the core skill behind an easy, resonant tone.',
      pt: 'O lip trill é um exercício de trato vocal semi-ocluído (SOVT): fechar parcialmente a via aérea nos lábios eleva a pressão logo acima das pregas, que "recebem essa contrapressão" e vibram com menos esforço e menos força de colisão. É uma das formas mais seguras e eficientes de equilibrar fluxo de ar e fechamento das pregas — a habilidade central por trás de um som fácil e ressonante.',
    },
    mistakes: [
      { en: 'Too much air — the trill sputters and dies. Use steady, gentle pressure.', pt: 'Ar demais — o trill engasga e morre. Use pressão suave e constante.' },
      { en: 'Tense lips/jaw forcing the buzz instead of letting air do the work.', pt: 'Lábios/mandíbula tensos forçando o zumbido em vez de deixar o ar trabalhar.' },
    ],
    practice: [
      { en: 'Relax the lips, blow a gentle "brrr" with no pitch.', pt: 'Relaxe os lábios, sopre um "brrr" suave sem altura.' },
      { en: 'Add a comfortable pitch and keep the trill even.', pt: 'Acrescente uma nota confortável e mantenha o trill regular.' },
      { en: 'Glide a 5-1 slide (sol→do) keeping the buzz unbroken.', pt: 'Faça um deslize 5-1 (sol→dó) mantendo o zumbido sem quebrar.' },
    ],
    checkpoint: { en: 'You can trill smoothly across an octave without the buzz breaking or air running out.', pt: 'Você faz o trill liso por uma oitava sem quebrar o zumbido nem ficar sem ar.' },
  },
  'warmup-3': {
    why: {
      en: 'Humming is another SOVT: the closed mouth keeps energy in the vocal tract and channels resonance into the bones of the face ("mask"). It encourages a soft onset and forward placement with almost no risk, which is why it is the ideal first sound of the day.',
      pt: 'O humming é outro SOVT: a boca fechada mantém a energia no trato vocal e direciona a ressonância para os ossos da face ("máscara"). Favorece um onset suave e a colocação frontal quase sem risco, por isso é o som ideal pra começar o dia.',
    },
    mistakes: [
      { en: 'Humming with clenched teeth — keep the back teeth slightly apart.', pt: 'Cantarolar com os dentes cerrados — mantenha os molares levemente afastados.' },
      { en: 'Pushing for volume; the hum should be easy and buzzy, not loud.', pt: 'Forçar volume; o hum deve ser fácil e vibrante, não alto.' },
    ],
    practice: [
      { en: 'Hum on "mmm", feel the lips and nose tingle.', pt: 'Cantarole em "mmm", sinta lábios e nariz formigarem.' },
      { en: 'Keep the tingle as you move up/down a few notes.', pt: 'Mantenha o formigamento ao subir/descer algumas notas.' },
      { en: 'Open to "mah" keeping the same forward buzz.', pt: 'Abra pra "mah" mantendo o mesmo zumbido frontal.' },
    ],
    checkpoint: { en: 'The buzz stays in the front of the face even when you open to a vowel.', pt: 'O zumbido permanece na frente do rosto mesmo ao abrir numa vogal.' },
  },
  'warmup-4': {
    why: {
      en: 'Support is not "pushing"; it is regulating a slow, even release of air so the folds get steady pressure without being blown apart. The diaphragm descends to inhale; on the exhale, the abdominal and intercostal muscles manage the recoil so the airstream stays constant — the foundation of long phrases and stable pitch.',
      pt: 'Apoio não é "empurrar"; é regular uma saída de ar lenta e uniforme para que as pregas recebam pressão estável sem serem sopradas à força. O diafragma desce na inspiração; na expiração, a musculatura abdominal e intercostal gerencia o recuo para o fluxo permanecer constante — a base das frases longas e da afinação estável.',
    },
    mistakes: [
      { en: 'Raising the shoulders/chest to breathe (clavicular breathing).', pt: 'Levantar ombros/peito pra respirar (respiração clavicular).' },
      { en: 'Dumping all the air at the start of the phrase.', pt: 'Despejar todo o ar no início da frase.' },
      { en: 'Holding the breath rigidly — support is flexible, not locked.', pt: 'Travar a respiração com rigidez — apoio é flexível, não travado.' },
    ],
    practice: [
      { en: 'Hand on belly: inhale and feel it expand outward, not up.', pt: 'Mão na barriga: inspire e sinta-a expandir pra fora, não pra cima.' },
      { en: 'Exhale on a steady "sss" for 10–15s, even from start to end.', pt: 'Expire num "sss" constante por 10–15s, uniforme do começo ao fim.' },
      { en: 'Sing one sustained note keeping that same even airflow.', pt: 'Cante uma nota sustentada mantendo esse mesmo fluxo uniforme.' },
    ],
    checkpoint: { en: 'You can sustain a comfortable note 12+ seconds with steady tone and no pushing.', pt: 'Você sustenta uma nota confortável 12+ segundos com som estável e sem empurrar.' },
  },
  'warmup-5': {
    why: {
      en: 'Knowing your range lets you choose songs and exercises in the right zone, and tracks growth over time. Your comfortable range (where you sound easy) is usually narrower than your absolute range (the extremes you can barely hit) — train mostly in the comfortable zone and expand the edges gradually.',
      pt: 'Conhecer sua extensão permite escolher músicas e exercícios na zona certa e acompanhar a evolução. Sua extensão confortável (onde soa fácil) costuma ser mais estreita que a absoluta (os extremos que você mal alcança) — treine principalmente na zona confortável e amplie as bordas aos poucos.',
    },
    mistakes: [
      { en: 'Counting strained, ugly extreme notes as part of your usable range.', pt: 'Contar notas extremas forçadas e feias como parte da extensão útil.' },
      { en: 'Forcing the bottom — pressing down on low notes adds tension.', pt: 'Forçar o grave — pressionar as notas baixas adiciona tensão.' },
    ],
    practice: [
      { en: 'From a mid note, descend by half steps until the tone gets weak.', pt: 'De uma nota média, desça por semitons até o som enfraquecer.' },
      { en: 'Return to the mid note and ascend by half steps until it strains.', pt: 'Volte à nota média e suba por semitons até começar a forçar.' },
      { en: 'Note the lowest/highest EASY notes — that is your working range.', pt: 'Anote as notas mais grave/aguda FÁCEIS — essa é sua extensão de trabalho.' },
    ],
    checkpoint: { en: 'You can name your comfortable lowest and highest notes and revisit them weekly.', pt: 'Você sabe nomear sua nota mais grave e mais aguda confortáveis e revisita semanalmente.' },
  },
  'warmup-6': {
    why: {
      en: 'The onset is how the tone begins. A balanced (coordinated) onset starts air and fold closure together. A hard/glottal onset slams the folds shut first (a little "click") — harsh and tiring. A breathy onset leaks air before tone — weak and unfocused. Aim for the clean middle.',
      pt: 'O onset é como o som começa. Um onset equilibrado (coordenado) inicia ar e fechamento das pregas juntos. Um onset duro/glotal fecha as pregas de golpe primeiro (um "clique") — áspero e cansativo. Um onset soproso vaza ar antes do som — fraco e sem foco. Mire no meio limpo.',
    },
    mistakes: [
      { en: 'A hard glottal "click" before vowels (especially "ah").', pt: 'Um "clique" glotal duro antes das vogais (especialmente "ah").' },
      { en: 'Leaking breath so the note fades in instead of speaking clearly.', pt: 'Vazar ar e a nota "entra desbotada" em vez de falar com clareza.' },
    ],
    practice: [
      { en: 'Start a note on "h-ah" (slightly breathy) to feel airflow lead.', pt: 'Comece uma nota em "h-ah" (levemente soprosa) pra sentir o ar liderar.' },
      { en: 'Then on a clean "ah", aiming for air and tone at the same instant.', pt: 'Depois num "ah" limpo, mirando ar e som no mesmo instante.' },
      { en: 'Repeat on several pitches until the start is consistently clean.', pt: 'Repita em várias notas até o início ficar consistentemente limpo.' },
    ],
    checkpoint: { en: 'Notes start instantly and cleanly with no click and no breathy fade-in.', pt: 'As notas começam na hora e limpas, sem clique e sem entrada soprosa.' },
  },
  'warmup-7': {
    why: {
      en: 'Each vowel shapes the vocal tract differently, creating "formants" — resonant peaks that define the vowel and color the tone. Untrained, vowels can scatter the tone and pull pitch around. Vowel tuning means subtly modifying vowel shape so resonance stays consistent and the pitch stays centered across your range.',
      pt: 'Cada vogal molda o trato vocal de um jeito, criando "formantes" — picos de ressonância que definem a vogal e colorem o timbre. Sem treino, as vogais espalham o som e puxam a afinação. Afinar vogais é modificar sutilmente a forma da vogal para a ressonância ficar consistente e a afinação centrada por toda a extensão.',
    },
    mistakes: [
      { en: 'Spreading "ee"/"ay" into a thin, bright shout as you go higher.', pt: 'Espalhar "i"/"ê" num grito fino e estridente ao subir.' },
      { en: 'Letting the jaw/tongue collapse the vowel into mush.', pt: 'Deixar mandíbula/língua desmancharem a vogal numa papa.' },
    ],
    practice: [
      { en: 'Sustain one pitch through A-E-I-O-U keeping equal resonance.', pt: 'Sustente uma nota por A-E-I-O-U mantendo a ressonância igual.' },
      { en: 'On high notes, slightly round "ee" toward "ih" to keep space.', pt: 'Nos agudos, arredonde "i" levemente em direção a "ê" pra manter espaço.' },
    ],
    checkpoint: { en: 'All five vowels on one pitch sound equally full and stay in tune.', pt: 'As cinco vogais numa mesma nota soam igualmente cheias e afinadas.' },
  },
  'warmup-8': {
    why: {
      en: 'A routine works because it sequences from least to most demanding: relax → gentle SOVT onset → range extension → agility. Skipping stages or going out of order is what causes most "my voice felt bad today". Consistency of sequence trains the body to find its setup fast.',
      pt: 'Uma rotina funciona porque sequencia do menos ao mais exigente: relaxar → onset suave em SOVT → extensão de tessitura → agilidade. Pular etapas ou inverter a ordem é o que causa a maioria dos "minha voz tava ruim hoje". A consistência da sequência treina o corpo a encontrar o ajuste rápido.',
    },
    mistakes: [
      { en: 'Random exercises with no progression.', pt: 'Exercícios aleatórios sem progressão.' },
      { en: 'Going straight to agility/runs before the voice is open.', pt: 'Ir direto pra agilidade/escalas rápidas antes da voz abrir.' },
    ],
    practice: [
      { en: '1) Posture + breath. 2) Hum/lip trill. 3) 5-note slides.', pt: '1) Postura + respiração. 2) Hum/lip trill. 3) Deslizes de 5 notas.' },
      { en: '4) Extend range by half steps. 5) Light agility pattern.', pt: '4) Estenda a tessitura por semitons. 5) Padrão leve de agilidade.' },
    ],
    checkpoint: { en: 'You can run the same 5-step sequence from memory and feel ready in under 10 min.', pt: 'Você roda a mesma sequência de 5 passos de memória e se sente pronto em menos de 10 min.' },
  },

  // ═══════════════ 🎯 PITCH ACCURACY ═══════════════
  'pitch-1': {
    why: {
      en: '"In tune" means your fundamental frequency matches the target within a small tolerance — trained ears notice ~5–10 cents (a cent is 1/100 of a semitone). Pitch is a skill of the ear first and the voice second: you must hear the target, predict it, and let the voice match. The tuner makes the invisible visible so you can calibrate.',
      pt: '"Afinado" significa que sua frequência fundamental bate com o alvo dentro de uma pequena tolerância — ouvidos treinados percebem ~5–10 cents (um cent é 1/100 de semitom). Afinação é uma habilidade do ouvido primeiro e da voz depois: você precisa ouvir o alvo, prevê-lo e deixar a voz igualar. O afinador torna o invisível visível pra você se calibrar.',
    },
    mistakes: [
      { en: 'Watching the meter instead of listening — train the ear, verify with eyes.', pt: 'Olhar o medidor em vez de ouvir — treine o ouvido, confira com os olhos.' },
      { en: 'Chasing the needle and overshooting back and forth.', pt: 'Perseguir o ponteiro e ultrapassar de um lado pro outro.' },
    ],
    practice: [
      { en: 'Play a reference note, sing it, then check the tuner.', pt: 'Toque uma nota de referência, cante, depois confira no afinador.' },
      { en: 'Aim to land within ±10 cents and hold it.', pt: 'Mire em cair dentro de ±10 cents e segure.' },
    ],
    checkpoint: { en: 'You can match a played note within ±10 cents on the first try, most of the time.', pt: 'Você iguala uma nota tocada dentro de ±10 cents na primeira tentativa, na maioria das vezes.' },
  },
  'pitch-2': {
    why: {
      en: 'A drone is a constant reference tone. Singing against it trains "relative pitch" — hearing how your note sits versus a fixed anchor. Beats (a wobbling pulse) appear when you are slightly off; they slow and vanish as you lock in. It is the fastest feedback loop for intonation.',
      pt: 'Um drone é um tom de referência constante. Cantar contra ele treina o "ouvido relativo" — perceber como sua nota se posiciona versus uma âncora fixa. Os batimentos (uma pulsação trêmula) aparecem quando você está levemente fora; eles desaceleram e somem quando você trava. É o ciclo de feedback mais rápido pra afinação.',
    },
    mistakes: [
      { en: 'Singing too loud to hear the drone — keep volumes balanced.', pt: 'Cantar alto demais e não ouvir o drone — equilibre os volumes.' },
      { en: 'Ignoring the beats instead of using them to fine-tune.', pt: 'Ignorar os batimentos em vez de usá-los pra afinar fino.' },
    ],
    practice: [
      { en: 'Hold the drone note; tune until the beats disappear.', pt: 'Segure a nota do drone; afine até os batimentos sumirem.' },
      { en: 'Sing a 5th and a 3rd above the drone and lock each.', pt: 'Cante uma 5ª e uma 3ª acima do drone e trave cada uma.' },
    ],
    checkpoint: { en: 'You can sing a unison and a 5th over a drone with no audible beating.', pt: 'Você canta um uníssono e uma 5ª sobre o drone sem batimento audível.' },
  },
  'pitch-3': {
    why: {
      en: 'Holding a steady pitch reveals everything: breath control, fold stability, and ear-monitoring. Drift usually traces back to fading airflow (goes flat) or rising tension (goes sharp). Pitch holds train the micro-corrections that keep a note centered.',
      pt: 'Sustentar uma altura estável revela tudo: controle de ar, estabilidade das pregas e o monitoramento do ouvido. O desvio normalmente vem de fluxo de ar caindo (desce/abemola) ou tensão subindo (sobe/sustenido). As sustentações treinam as microcorreções que mantêm a nota centrada.',
    },
    mistakes: [
      { en: 'Going flat at the end as breath support fades.', pt: 'Abemolar no final quando o apoio cai.' },
      { en: 'Adding a wide wobble to "fill" the note — keep it pure first.', pt: 'Acrescentar um tremor largo pra "preencher" a nota — mantenha pura primeiro.' },
    ],
    practice: [
      { en: 'Hold a comfortable note 8s, watching the cents stay near 0.', pt: 'Segure uma nota confortável por 8s, vendo os cents perto de 0.' },
      { en: 'If it sags at the end, renew support before the air runs low.', pt: 'Se cair no fim, renove o apoio antes do ar acabar.' },
    ],
    checkpoint: { en: 'You hold a note 8+ seconds within ±5 cents, steady start to finish.', pt: 'Você segura uma nota 8+ segundos dentro de ±5 cents, estável do começo ao fim.' },
  },
  'pitch-4': {
    why: {
      en: 'Most "out of tune" singing is not random — it is interval error: the jumps between notes land too wide or too narrow. Training specific intervals teaches your voice the exact muscular "distance" of each leap, so melodies stay in tune even fast.',
      pt: 'A maior parte do canto "desafinado" não é aleatória — é erro de intervalo: os saltos entre notas caem largos ou estreitos demais. Treinar intervalos específicos ensina à sua voz a "distância" muscular exata de cada salto, então as melodias ficam afinadas mesmo rápido.',
    },
    mistakes: [
      { en: 'Scooping up to the target note instead of landing on it.', pt: 'Escorregar (scoop) até a nota alvo em vez de cair direto nela.' },
      { en: 'Under-shooting big leaps (octaves, 6ths) — they need more intention.', pt: 'Cair curto em saltos grandes (oitavas, 6ªs) — exigem mais intenção.' },
    ],
    practice: [
      { en: 'Hear the target note in your head BEFORE singing it.', pt: 'Ouça a nota alvo na cabeça ANTES de cantá-la.' },
      { en: 'Sing root → interval → root, checking each lands clean.', pt: 'Cante fundamental → intervalo → fundamental, conferindo cada chegada limpa.' },
    ],
    checkpoint: { en: 'You hit 5ths, 3rds and octaves cleanly with no scoop.', pt: 'Você acerta 5ªs, 3ªs e oitavas limpas, sem scoop.' },
  },
  'pitch-5': {
    why: {
      en: 'Pros are not always perfectly in tune — they correct fast. Self-correction is a closed loop: hear the error, know which way it is off, nudge, confirm. The speed of that loop is what separates "shaky" from "solid". You train it by always listening, never coasting.',
      pt: 'Profissionais nem sempre estão perfeitamente afinados — eles corrigem rápido. A autocorreção é um ciclo fechado: ouvir o erro, saber pra que lado está fora, ajustar, confirmar. A velocidade desse ciclo é o que separa "trêmulo" de "sólido". Você treina sempre ouvindo, nunca no automático.',
    },
    mistakes: [
      { en: 'Pushing harder when flat (adds tension) instead of supporting more.', pt: 'Empurrar mais quando está abemolado (gera tensão) em vez de apoiar mais.' },
      { en: 'Not knowing the DIRECTION of the error, so corrections overshoot.', pt: 'Não saber a DIREÇÃO do erro, então as correções ultrapassam.' },
    ],
    practice: [
      { en: 'Sing slightly sharp on purpose, then ease down to center.', pt: 'Cante levemente sustenido de propósito, depois desça até o centro.' },
      { en: 'Repeat going flat→center. Learn the feel of each correction.', pt: 'Repita indo abemolado→centro. Aprenda a sensação de cada correção.' },
    ],
    checkpoint: { en: 'When you drift, you correct within a beat without thinking about it.', pt: 'Quando desvia, você corrige em um tempo sem precisar pensar.' },
  },

  // ═══════════════ 📏 INTERVALS ═══════════════
  'int-1': {
    why: {
      en: 'An interval has a NUMBER (counting letter names: C→E is a third) and a QUALITY (major, minor, perfect, augmented, diminished) set by the exact semitone count. Naming them precisely is what lets you read, transpose, and harmonize on purpose instead of by luck.',
      pt: 'Um intervalo tem um NÚMERO (contando os nomes das notas: Dó→Mi é uma terça) e uma QUALIDADE (maior, menor, justa, aumentada, diminuta) definida pela contagem exata de semitons. Nomeá-los com precisão é o que permite ler, transpor e harmonizar de propósito, não por sorte.',
    },
    mistakes: [
      { en: 'Counting semitones but forgetting the letter-name number.', pt: 'Contar semitons mas esquecer o número pelo nome das notas.' },
      { en: 'Confusing enharmonics (aug 4th vs dim 5th sound same, named different).', pt: 'Confundir enarmonias (4ª aum. e 5ª dim. soam igual, nomes diferentes).' },
    ],
    practice: [
      { en: 'Name 2nds–octaves on a keyboard by number, then add quality.', pt: 'Nomeie de 2ªs a oitavas no teclado pelo número, depois a qualidade.' },
      { en: 'Sing each named interval to connect label to sound.', pt: 'Cante cada intervalo nomeado pra ligar o rótulo ao som.' },
    ],
    checkpoint: { en: 'You can name any interval (number + quality) and sing it.', pt: 'Você nomeia qualquer intervalo (número + qualidade) e o canta.' },
  },
  'int-2': {
    why: {
      en: 'Consonance and dissonance come from how simple the frequency ratio is. An octave (2:1) and fifth (3:2) are very consonant — restful. A tritone or minor 2nd has complex ratios — tense, restless, "wants" to move. Music breathes by alternating the two; you sing more expressively when you feel that pull.',
      pt: 'Consonância e dissonância vêm de quão simples é a razão de frequências. Oitava (2:1) e quinta (3:2) são muito consonantes — repouso. Trítono ou 2ª menor têm razões complexas — tensão, inquietude, "querem" se mover. A música respira alternando os dois; você canta com mais expressão quando sente esse puxão.',
    },
    mistakes: [
      { en: 'Treating dissonant notes as "wrong" and avoiding them.', pt: 'Tratar notas dissonantes como "erradas" e evitá-las.' },
      { en: 'Not resolving tension, leaving phrases hanging unintentionally.', pt: 'Não resolver a tensão, deixando frases penduradas sem querer.' },
    ],
    practice: [
      { en: 'Sing a tritone over a drone, then resolve it to a 3rd/5th.', pt: 'Cante um trítono sobre um drone, depois resolva numa 3ª/5ª.' },
      { en: 'Feel the relief of the resolution — that is musical tension at work.', pt: 'Sinta o alívio da resolução — é a tensão musical em ação.' },
    ],
    checkpoint: { en: 'You can hear and sing tension, then resolve it on purpose.', pt: 'Você ouve e canta a tensão, e a resolve de propósito.' },
  },
  'int-3': {
    why: {
      en: 'Your brain stores intervals best by anchoring them to melodies you already know. "Twinkle Twinkle" / "Parabéns" opens with a perfect fifth; the Jaws theme is a minor second. These song-hooks turn an abstract distance into an instant, reliable recall.',
      pt: 'Seu cérebro guarda intervalos melhor ancorando-os a melodias que você já conhece. "Parabéns pra você" abre com uma quinta justa; o tema de Tubarão é uma segunda menor. Esses ganchos de música transformam uma distância abstrata em uma lembrança instantânea e confiável.',
    },
    mistakes: [
      { en: 'Memorizing only ascending — descending intervals feel different.', pt: 'Decorar só ascendente — os intervalos descendentes têm outra sensação.' },
      { en: 'Relying on one song that only fits one key/feel.', pt: 'Depender de uma música que só serve pra um tom/clima.' },
    ],
    practice: [
      { en: 'Pick a reference song for each interval, ascending and descending.', pt: 'Escolha uma música de referência pra cada intervalo, subindo e descendo.' },
      { en: 'Quiz yourself: hear an interval, name it via its song.', pt: 'Teste-se: ouça um intervalo, nomeie pela música dele.' },
    ],
    checkpoint: { en: 'You can identify common intervals by ear in under a second.', pt: 'Você identifica intervalos comuns de ouvido em menos de um segundo.' },
  },
  'int-4': {
    why: {
      en: 'Singing an interval accurately = audiation (hearing it internally) + a clean leap with no scoop. Big leaps need more breath energy and a clear mental target; small steps need restraint so you do not overshoot. The skill is pre-hearing, then trusting the jump.',
      pt: 'Cantar um intervalo com precisão = audiation (ouvi-lo internamente) + um salto limpo sem scoop. Saltos grandes pedem mais energia de ar e um alvo mental claro; passos pequenos pedem contenção pra não ultrapassar. A habilidade é pré-ouvir e então confiar no salto.',
    },
    mistakes: [
      { en: 'Sliding/scooping into the note instead of landing precisely.', pt: 'Escorregar/scoop até a nota em vez de cair com precisão.' },
      { en: 'Letting big leaps go breathy or under-energized.', pt: 'Deixar os saltos grandes soprosos ou sem energia.' },
    ],
    practice: [
      { en: 'Pre-hear the target, sing root→target→root cleanly.', pt: 'Pré-ouça o alvo, cante fundamental→alvo→fundamental limpo.' },
      { en: 'Practice the same interval descending too.', pt: 'Pratique o mesmo intervalo descendo também.' },
    ],
    checkpoint: { en: 'You leap to target notes accurately, up and down, with no scoop.', pt: 'Você salta pras notas alvo com precisão, subindo e descendo, sem scoop.' },
  },

  // ═══════════════ 🪜 SCALES ═══════════════
  'scl-1': {
    why: {
      en: 'The major scale (W-W-H-W-W-W-H) is the reference grid for Western melody and harmony. Every key is the same pattern transposed. Internalizing it — by sound, not just theory — gives you the map that intervals, chords and modes are built on.',
      pt: 'A escala maior (T-T-S-T-T-T-S) é a grade de referência da melodia e harmonia ocidentais. Todo tom é o mesmo padrão transposto. Internalizá-la — pelo som, não só pela teoria — te dá o mapa sobre o qual intervalos, acordes e modos são construídos.',
    },
    mistakes: [
      { en: 'Singing the 3rd and 7th flat — these "leading" degrees need height.', pt: 'Cantar a 3ª e a 7ª abemoladas — esses graus "condutores" pedem altura.' },
      { en: 'Rushing the half steps (3→4 and 7→8) out of tune.', pt: 'Apressar os semitons (3→4 e 7→8) e desafiná-los.' },
    ],
    practice: [
      { en: 'Sing do-re-mi-fa-sol-la-ti-do slowly with a drone on "do".', pt: 'Cante dó-ré-mi-fá-sol-lá-si-dó devagar com um drone no "dó".' },
      { en: 'Then descend; keep the 7→8 and 4→3 half steps precise.', pt: 'Depois desça; mantenha os semitons 7→8 e 4→3 precisos.' },
    ],
    checkpoint: { en: 'You can sing a major scale up and down in tune, a cappella.', pt: 'Você canta uma escala maior subindo e descendo afinada, a cappella.' },
  },
  'scl-2': {
    why: {
      en: 'Minor has three forms because melody and harmony want different things. Natural minor is the pure mode; harmonic minor raises the 7th to create a strong pull to the tonic (that "exotic" leap from b6 to 7); melodic minor raises 6 and 7 ascending for a smoother line, reverting descending. Knowing which is which lets you sing minor songs convincingly.',
      pt: 'O menor tem três formas porque melodia e harmonia querem coisas diferentes. O menor natural é o modo puro; o harmônico eleva a 7ª pra criar um forte puxão à tônica (aquele salto "exótico" de b6 pra 7); o melódico eleva 6 e 7 na subida pra uma linha mais lisa, voltando ao natural na descida. Saber qual é qual te deixa cantar músicas em menor com convicção.',
    },
    mistakes: [
      { en: 'Using natural minor where the song needs the raised-7 leading tone.', pt: 'Usar o menor natural onde a música pede a sensível (7 elevada).' },
      { en: 'Singing the harmonic-minor b6→7 leap out of tune (it is wide).', pt: 'Desafinar o salto b6→7 do menor harmônico (ele é largo).' },
    ],
    practice: [
      { en: 'Sing natural, then harmonic, then melodic minor over a drone.', pt: 'Cante o menor natural, depois o harmônico, depois o melódico sobre um drone.' },
      { en: 'Isolate and tune the harmonic-minor b6→7 step.', pt: 'Isole e afine o passo b6→7 do menor harmônico.' },
    ],
    checkpoint: { en: 'You can sing all three minors and hear what each one changes.', pt: 'Você canta os três menores e ouve o que cada um muda.' },
  },
  'scl-3': {
    why: {
      en: 'A mode is the major scale started on a different degree, which shifts where the half steps fall and gives each mode its flavor: Dorian (minor but bright b3/♮6), Phrygian (dark b2), Mixolydian (major with b7), etc. Modes are how you get color beyond plain major/minor — essential for pop, rock, jazz and folk.',
      pt: 'Um modo é a escala maior começada em outro grau, o que desloca onde caem os semitons e dá a cada modo seu sabor: dórico (menor mas brilhante, b3/♮6), frígio (sombrio, b2), mixolídio (maior com b7), etc. Os modos são como você consegue cor além do maior/menor puro — essencial pra pop, rock, jazz e folk.',
    },
    mistakes: [
      { en: 'Thinking of a mode as "just a scale" and ignoring its characteristic note.', pt: 'Pensar no modo como "só uma escala" e ignorar a nota característica.' },
      { en: 'Defaulting back to major/minor ear and losing the modal color.', pt: 'Voltar ao ouvido maior/menor e perder a cor modal.' },
    ],
    practice: [
      { en: 'Over a single drone, sing Dorian, then Phrygian, then Mixolydian.', pt: 'Sobre um único drone, cante dórico, depois frígio, depois mixolídio.' },
      { en: 'Lean on each mode\'s characteristic note (b2, ♮6, b7).', pt: 'Apoie-se na nota característica de cada modo (b2, ♮6, b7).' },
    ],
    checkpoint: { en: 'You can sing and recognize at least Dorian and Mixolydian by their color.', pt: 'Você canta e reconhece pelo menos dórico e mixolídio pela cor.' },
  },
  'scl-4': {
    why: {
      en: 'The pentatonic drops the two half-step tensions of the major scale (the 4th and 7th), leaving five notes that never clash. That is why it is the safest scale for improvising and the backbone of blues, rock, folk and countless vocal riffs — you almost cannot hit a "wrong" note.',
      pt: 'A pentatônica remove as duas tensões de semitom da escala maior (a 4ª e a 7ª), deixando cinco notas que nunca colidem. Por isso é a escala mais segura pra improvisar e a espinha dorsal do blues, rock, folk e de incontáveis riffs vocais — você quase não consegue errar a nota.',
    },
    mistakes: [
      { en: 'Adding the 4th/7th and reintroducing the tensions you removed.', pt: 'Acrescentar a 4ª/7ª e reintroduzir as tensões que você tirou.' },
      { en: 'Running it mechanically instead of making melodic shapes.', pt: 'Tocá-la mecanicamente em vez de fazer desenhos melódicos.' },
    ],
    practice: [
      { en: 'Improvise short phrases using only the 5 pentatonic notes over a drone.', pt: 'Improvise frases curtas usando só as 5 notas pentatônicas sobre um drone.' },
      { en: 'Add a blue note (b5) for blues flavor once it feels easy.', pt: 'Acrescente a blue note (b5) pra sabor de blues quando ficar fácil.' },
    ],
    checkpoint: { en: 'You can improvise a pleasing pentatonic riff that stays in tune.', pt: 'Você improvisa um riff pentatônico agradável que se mantém afinado.' },
  },

  // ═══════════════ 🎼 HARMONY ═══════════════
  'harm-1': {
    why: {
      en: 'A triad stacks two thirds: root, third, fifth. The quality of the lower third (major or minor) sets the chord\'s mood. Triads are the atoms of harmony — once you can hear and sing root/3rd/5th, you can find harmony parts and understand any chord chart.',
      pt: 'Uma tríade empilha duas terças: fundamental, terça, quinta. A qualidade da terça inferior (maior ou menor) define o humor do acorde. As tríades são os átomos da harmonia — quando você ouve e canta fundamental/3ª/5ª, consegue achar vozes de harmonia e entender qualquer cifra.',
    },
    mistakes: [
      { en: 'Singing the 3rd flat and blurring major vs minor.', pt: 'Cantar a 3ª abemolada e borrar maior vs menor.' },
      { en: 'Losing the root reference when you sing the 5th.', pt: 'Perder a referência da fundamental ao cantar a 5ª.' },
    ],
    practice: [
      { en: 'Arpeggiate root-3-5-3-root over a held root.', pt: 'Arpeje fundamental-3-5-3-fundamental sobre a fundamental segurada.' },
      { en: 'Swap major↔minor 3rd and hear the mood flip.', pt: 'Troque a 3ª maior↔menor e ouça o humor virar.' },
    ],
    checkpoint: { en: 'You can sing major and minor triads cleanly and tell them apart by ear.', pt: 'Você canta tríades maiores e menores limpas e as distingue de ouvido.' },
  },
  'harm-2': {
    why: {
      en: 'Diatonic chords are the triads built on each degree of the key — in major: I ii iii IV V vi vii°. They are the chords that "belong" together, which is why most songs draw from them. Knowing them lets you predict chord changes and pick harmony notes that fit.',
      pt: 'Acordes diatônicos são as tríades construídas sobre cada grau do tom — no maior: I ii iii IV V vi vii°. São os acordes que "pertencem" juntos, por isso a maioria das músicas sai deles. Conhecê-los te deixa prever as mudanças de acorde e escolher notas de harmonia que encaixam.',
    },
    mistakes: [
      { en: 'Forgetting which degrees are minor (ii, iii, vi) vs major.', pt: 'Esquecer quais graus são menores (ii, iii, vi) vs maiores.' },
      { en: 'Picking harmony notes outside the key by accident.', pt: 'Escolher notas de harmonia fora do tom sem querer.' },
    ],
    practice: [
      { en: 'In one key, sing the root of I–ii–iii–IV–V–vi in order.', pt: 'Num tom, cante a fundamental de I–ii–iii–IV–V–vi em ordem.' },
      { en: 'Then sing a 3rd above each, staying diatonic.', pt: 'Depois cante uma 3ª acima de cada, permanecendo diatônico.' },
    ],
    checkpoint: { en: 'You can name and sing the diatonic chords of at least one major key.', pt: 'Você nomeia e canta os acordes diatônicos de pelo menos um tom maior.' },
  },
  'harm-3': {
    why: {
      en: 'ii–V–I is the strongest cadence in tonal music: ii sets up the key, V (dominant) builds maximum tension via its tritone and leading tone, and I resolves it. Hearing this motion lets you anticipate where a song is going and land harmony parts confidently on the resolution.',
      pt: 'ii–V–I é a cadência mais forte da música tonal: ii prepara o tom, V (dominante) cria tensão máxima via seu trítono e sensível, e I resolve. Ouvir esse movimento te deixa antecipar pra onde a música vai e pousar as vozes de harmonia com segurança na resolução.',
    },
    mistakes: [
      { en: 'Not feeling the V→I pull and resolving weakly.', pt: 'Não sentir o puxão V→I e resolver de forma fraca.' },
      { en: 'Missing the leading tone (3rd of V) that drives the resolution.', pt: 'Perder a sensível (3ª do V) que conduz a resolução.' },
    ],
    practice: [
      { en: 'Sing the roots ii–V–I, then the 3rds, then the 7ths.', pt: 'Cante as fundamentais ii–V–I, depois as 3ªs, depois as 7ªs.' },
      { en: 'Lean into the leading tone resolving up to the tonic.', pt: 'Apoie-se na sensível resolvendo pra cima na tônica.' },
    ],
    checkpoint: { en: 'You can hear a ii–V–I coming and sing a part that resolves cleanly.', pt: 'Você ouve um ii–V–I chegando e canta uma voz que resolve limpa.' },
  },
  'harm-4': {
    why: {
      en: 'Singing harmony means holding your own line a fixed interval from the melody while it moves — usually diatonic 3rds or 6ths above/below. The hard part is independence: hearing the melody without being pulled onto it. Master this and you can harmonize any song live.',
      pt: 'Cantar harmonia é manter sua própria linha a um intervalo fixo da melodia enquanto ela se move — geralmente 3ªs ou 6ªs diatônicas acima/abaixo. O difícil é a independência: ouvir a melodia sem ser puxado pra cima dela. Domine isso e você harmoniza qualquer música ao vivo.',
    },
    mistakes: [
      { en: 'Drifting onto the melody (losing your harmony line).', pt: 'Escorregar pra melodia (perdendo sua linha de harmonia).' },
      { en: 'Using a fixed interval that leaves the key — keep it diatonic.', pt: 'Usar um intervalo fixo que sai do tom — mantenha diatônico.' },
    ],
    practice: [
      { en: 'Play/sing a simple melody; sing a diatonic 3rd above it.', pt: 'Toque/cante uma melodia simples; cante uma 3ª diatônica acima.' },
      { en: 'Record the melody and sing harmony against the playback.', pt: 'Grave a melodia e cante a harmonia contra a reprodução.' },
    ],
    checkpoint: { en: 'You can hold a 3rd-above harmony through a full phrase without slipping.', pt: 'Você mantém uma harmonia em 3ª acima por uma frase inteira sem escorregar.' },
  },

  // ═══════════════ 🫁 VOCAL ANATOMY ═══════════════
  'anat-1': {
    why: {
      en: 'Your voice is one instrument with three coupled systems: the power source (lungs + breathing muscles), the vibrator (vocal folds in the larynx), and the resonators/articulators (throat, mouth, nose, tongue, lips). Sound is generated at the folds and then SHAPED by the rest. Almost every vocal problem is really one of these three out of balance.',
      pt: 'Sua voz é um instrumento com três sistemas acoplados: a fonte de energia (pulmões + músculos respiratórios), o vibrador (pregas vocais na laringe) e os ressonadores/articuladores (garganta, boca, nariz, língua, lábios). O som é gerado nas pregas e depois MOLDADO pelo resto. Quase todo problema vocal é, na real, um desses três fora de equilíbrio.',
    },
    mistakes: [
      { en: 'Treating the throat as the "source of volume" and squeezing it.', pt: 'Tratar a garganta como "fonte de volume" e apertá-la.' },
      { en: 'Ignoring breath and articulation, blaming only the "voice".', pt: 'Ignorar respiração e articulação, culpando só a "voz".' },
    ],
    practice: [
      { en: 'Speak a sentence and notice: where is the air? where is the buzz? where is the shape?', pt: 'Fale uma frase e perceba: onde está o ar? onde está o zumbido? onde está a forma?' },
      { en: 'Sing one note and consciously relax the throat while keeping tone.', pt: 'Cante uma nota e relaxe a garganta de propósito mantendo o som.' },
    ],
    checkpoint: { en: 'You can describe what each of the three systems is doing while you sing.', pt: 'Você sabe descrever o que cada um dos três sistemas faz enquanto canta.' },
  },
  'anat-2': {
    why: {
      en: 'Efficient breathing for singing is low and wide: the diaphragm descends, the lower ribs swing out, and the belly releases — drawing air in with no shoulder lift. On the exhale you meter that air slowly. High, shallow chest breathing gives little air and invites neck tension.',
      pt: 'A respiração eficiente pro canto é baixa e larga: o diafragma desce, as costelas inferiores se abrem e a barriga libera — puxando ar sem levantar os ombros. Na expiração você dosa esse ar devagar. A respiração alta e rasa do peito dá pouco ar e convida tensão no pescoço.',
    },
    mistakes: [
      { en: 'Sucking the belly IN to inhale (reverse breathing).', pt: 'Puxar a barriga PRA DENTRO ao inspirar (respiração invertida).' },
      { en: 'Lifting the shoulders and collapsing after the first words.', pt: 'Levantar os ombros e desabar depois das primeiras palavras.' },
    ],
    practice: [
      { en: 'Lie down, book on belly; breathe so the book rises, not the chest.', pt: 'Deite, livro na barriga; respire pro livro subir, não o peito.' },
      { en: 'Stand and reproduce that same low expansion before each phrase.', pt: 'Em pé, reproduza essa mesma expansão baixa antes de cada frase.' },
    ],
    checkpoint: { en: 'Your inhale expands the lower ribs/belly with relaxed shoulders.', pt: 'Sua inspiração expande costelas/barriga com ombros relaxados.' },
  },
  'anat-3': {
    why: {
      en: 'The larynx houses the vocal folds; airflow makes them oscillate, chopping the air into pulses we hear as pitch. Faster, thinner fold vibration = higher notes; slower, thicker = lower. The larynx should ride relatively stable and low-ish, not jam upward on high notes — that squeeze is the main cause of strain.',
      pt: 'A laringe abriga as pregas vocais; o fluxo de ar as faz oscilar, picotando o ar em pulsos que ouvimos como altura. Vibração mais rápida e fina = notas mais agudas; mais lenta e grossa = mais graves. A laringe deve permanecer relativamente estável e baixa, não travar pra cima nos agudos — esse aperto é a principal causa de esforço.',
    },
    mistakes: [
      { en: 'Letting the larynx jam up to reach high notes (strain + thin tone).', pt: 'Deixar a laringe travar pra cima pra alcançar agudos (esforço + som fino).' },
      { en: 'Pressing the folds together too hard ("pressed" phonation).', pt: 'Comprimir as pregas com força demais (fonação "prensada").' },
    ],
    practice: [
      { en: 'Light fingers on the larynx; on a gentle siren, keep it from rising sharply.', pt: 'Dedos leves na laringe; numa sirene suave, evite que ela suba bruscamente.' },
      { en: 'Use a yawn-sigh to feel the larynx settle and the throat open.', pt: 'Use um bocejo-suspiro pra sentir a laringe assentar e a garganta abrir.' },
    ],
    checkpoint: { en: 'You can ascend without the larynx jamming up or the throat squeezing.', pt: 'Você sobe sem a laringe travar nem a garganta apertar.' },
  },
  'anat-4': {
    why: {
      en: 'The folds make a thin, buzzy source sound; the resonators (pharynx, mouth, nose) amplify some frequencies and damp others, turning that buzz into a full, projecting voice. The famous "singer\'s formant" (ring around 2.8–3.4 kHz) is pure resonance — it lets a voice carry over a band with zero extra effort.',
      pt: 'As pregas geram um som-fonte fino e zumbido; os ressonadores (faringe, boca, nariz) amplificam algumas frequências e abafam outras, transformando esse zumbido numa voz cheia e que projeta. O famoso "formante do cantor" (brilho em torno de 2,8–3,4 kHz) é pura ressonância — faz a voz passar por cima de uma banda sem esforço extra.',
    },
    mistakes: [
      { en: 'Pushing harder for volume instead of finding resonance.', pt: 'Empurrar mais por volume em vez de encontrar ressonância.' },
      { en: 'Collapsing the space inside the mouth/throat.', pt: 'Fechar o espaço dentro da boca/garganta.' },
    ],
    practice: [
      { en: 'Find a forward "ng" ring, then open to a vowel keeping the ring.', pt: 'Ache o brilho frontal do "ng", depois abra numa vogal mantendo o brilho.' },
      { en: 'Experiment with mouth/jaw space to make one note louder with no extra push.', pt: 'Experimente o espaço da boca/mandíbula pra deixar uma nota mais alta sem empurrar.' },
    ],
    checkpoint: { en: 'You can make a note louder/brighter by shaping resonance, not by pushing.', pt: 'Você deixa uma nota mais alta/brilhante moldando a ressonância, não empurrando.' },
  },
  'anat-5': {
    why: {
      en: 'A mirror is honest feedback. Visible tension — a rising chin, a jutting jaw, lifting shoulders, neck cords standing out — almost always means inefficient effort. Training yourself to sing with a calm, aligned exterior usually fixes the interior too.',
      pt: 'O espelho é feedback honesto. Tensão visível — queixo subindo, mandíbula projetada, ombros levantando, cordas do pescoço saltando — quase sempre indica esforço ineficiente. Treinar-se pra cantar com um exterior calmo e alinhado costuma consertar o interior também.',
    },
    mistakes: [
      { en: 'Raising the chin/eyebrows to reach high notes.', pt: 'Levantar o queixo/sobrancelhas pra alcançar agudos.' },
      { en: 'Tensing the neck and jaw without noticing.', pt: 'Tensionar pescoço e mandíbula sem perceber.' },
    ],
    practice: [
      { en: 'Sing a scale watching the mirror; freeze any visible tension.', pt: 'Cante uma escala olhando o espelho; congele qualquer tensão visível.' },
      { en: 'Repeat the same scale keeping a calm face and level chin.', pt: 'Repita a mesma escala mantendo o rosto calmo e o queixo nivelado.' },
    ],
    checkpoint: { en: 'You can sing your range with a relaxed face, level chin, still shoulders.', pt: 'Você canta sua extensão com rosto relaxado, queixo nivelado, ombros parados.' },
  },

  // ═══════════════ 💧 VOCAL HEALTH ═══════════════
  'health-1': {
    why: {
      en: 'Vocal folds vibrate best when their mucosa is well hydrated — systemic water (drunk hours earlier) thins secretions and keeps the tissue pliable. Hydration is preventive, not instant: you cannot "drink your way" to a fixed voice mid-show. Add sleep, because tired tissue swells and loses flexibility.',
      pt: 'As pregas vocais vibram melhor com a mucosa bem hidratada — a água sistêmica (bebida horas antes) afina as secreções e mantém o tecido flexível. Hidratação é preventiva, não instantânea: você não "bebe" pra consertar a voz no meio do show. Some sono, porque tecido cansado incha e perde flexibilidade.',
    },
    mistakes: [
      { en: 'Relying on a sip of water mid-song to fix a dry, tired voice.', pt: 'Contar com um gole no meio da música pra consertar voz seca e cansada.' },
      { en: 'Too much caffeine/alcohol (drying) before singing.', pt: 'Cafeína/álcool demais (ressecam) antes de cantar.' },
    ],
    practice: [
      { en: 'Drink water steadily through the day, especially before practice.', pt: 'Beba água ao longo do dia, principalmente antes de praticar.' },
      { en: 'Try steam inhalation before a demanding session.', pt: 'Tente inalação de vapor antes de uma sessão exigente.' },
    ],
    checkpoint: { en: 'Your voice feels pliable and clear at the start of practice, not gravelly.', pt: 'Sua voz parece flexível e clara no início da prática, não rascante.' },
  },
  'health-2': {
    why: {
      en: 'Warm-up prepares the voice; cool-down brings it back to rest. After demanding singing the folds are slightly swollen and the muscles set in "singing mode". Gentle hums, slides and lip trills at low volume restore normal blood flow and length, reducing next-day fatigue — the same logic as stretching after a workout.',
      pt: 'O aquecimento prepara a voz; o desaquecimento a traz de volta ao repouso. Depois de cantar muito, as pregas ficam levemente inchadas e a musculatura "presa" no modo canto. Hums, deslizes e lip trills suaves em volume baixo restauram o fluxo sanguíneo e o comprimento normais, reduzindo a fadiga do dia seguinte — a mesma lógica de alongar após o treino.',
    },
    mistakes: [
      { en: 'Stopping abruptly after belting, with no cool-down.', pt: 'Parar de repente depois de cantar forte, sem desaquecimento.' },
      { en: 'Talking loudly right after a heavy session.', pt: 'Falar alto logo após uma sessão pesada.' },
    ],
    practice: [
      { en: 'Descend through gentle "ooo" sirens from mid to low for 2–3 min.', pt: 'Desça em sirenes suaves de "uuu" do médio ao grave por 2–3 min.' },
      { en: 'Finish with quiet humming and a few easy breaths.', pt: 'Termine com humming baixinho e algumas respirações fáceis.' },
    ],
    checkpoint: { en: 'After cool-down your speaking voice feels normal, not tired or rough.', pt: 'Após o desaquecimento sua voz falada parece normal, não cansada ou áspera.' },
  },
  'health-3': {
    why: {
      en: 'Your body warns you before damage. Persistent hoarseness, pain or effort, losing the top of your range, a voice that "tires" fast, or frequent throat-clearing are red flags. Occasional tiredness is normal; symptoms lasting more than ~2 weeks warrant rest and, if they persist, an ENT/laryngologist. Catching this early prevents nodules and serious injury.',
      pt: 'Seu corpo avisa antes do dano. Rouquidão persistente, dor ou esforço, perder o topo da extensão, uma voz que "cansa" rápido ou pigarro frequente são sinais de alerta. Cansaço ocasional é normal; sintomas que duram mais de ~2 semanas pedem repouso e, se persistirem, um otorrino/laringologista. Pegar cedo previne nódulos e lesões sérias.',
    },
    mistakes: [
      { en: 'Singing through pain ("pushing past it").', pt: 'Cantar com dor ("forçar pra passar").' },
      { en: 'Frequent forceful throat-clearing (slams the folds together).', pt: 'Pigarrear com força com frequência (bate as pregas uma na outra).' },
    ],
    practice: [
      { en: 'Do a quick daily self-check: any hoarseness, pain, or lost high notes?', pt: 'Faça um autocheck diário rápido: tem rouquidão, dor ou agudos perdidos?' },
      { en: 'On warning signs, rest the voice 24–48h before resuming.', pt: 'Nos sinais de alerta, descanse a voz 24–48h antes de retomar.' },
    ],
    checkpoint: { en: 'You recognize your personal warning signs and rest instead of pushing.', pt: 'Você reconhece seus sinais de alerta e descansa em vez de forçar.' },
  },
  'health-4': {
    why: {
      en: 'Voice longevity is built by daily habits more than by any single technique: enough sleep, hydration, not yelling or whispering harshly, avoiding smoke, managing reflux, and warming up. Small consistent care keeps the instrument reliable for decades; abuse compounds quietly until it does not.',
      pt: 'A longevidade vocal se constrói por hábitos diários mais do que por qualquer técnica isolada: sono suficiente, hidratação, não gritar nem sussurrar com força, evitar fumaça, controlar refluxo e aquecer. Pequenos cuidados consistentes mantêm o instrumento confiável por décadas; o abuso acumula em silêncio até não manter mais.',
    },
    mistakes: [
      { en: 'Yelling at events/sports, then wondering why the voice is wrecked.', pt: 'Gritar em eventos/esportes e depois estranhar a voz destruída.' },
      { en: 'Harsh whispering, which can strain the folds as much as yelling.', pt: 'Sussurro forçado, que pode forçar as pregas tanto quanto gritar.' },
    ],
    practice: [
      { en: 'Pick one habit to fix this week (sleep, water, or no yelling).', pt: 'Escolha um hábito pra ajustar nesta semana (sono, água ou não gritar).' },
      { en: 'Warm up before, cool down after — every singing day.', pt: 'Aqueça antes, desaqueça depois — todo dia de canto.' },
    ],
    checkpoint: { en: 'You have a simple daily routine that protects your voice without thinking.', pt: 'Você tem uma rotina diária simples que protege sua voz no automático.' },
  },

  // ═══════════════ 🎤 SINGING TECHNIQUE ═══════════════
  'tech-1': {
    why: {
      en: 'Posture is the platform for everything else. A tall, balanced stance — feet grounded, spine long, sternum gently lifted, head floating level — lets the diaphragm move freely and keeps the larynx unsquashed. Collapse the posture and you instantly lose breath capacity and add neck tension.',
      pt: 'A postura é a plataforma de todo o resto. Uma posição ereta e equilibrada — pés firmes, coluna longa, esterno levemente elevado, cabeça flutuando nivelada — deixa o diafragma se mover livre e mantém a laringe sem esmagamento. Desabe a postura e você perde capacidade de ar na hora e ganha tensão no pescoço.',
    },
    mistakes: [
      { en: 'Locking the knees or stiffening into "military" rigidity.', pt: 'Travar os joelhos ou enrijecer numa rigidez "militar".' },
      { en: 'Looking down at a phone/lyrics, collapsing the throat.', pt: 'Olhar pra baixo no celular/letra, fechando a garganta.' },
    ],
    practice: [
      { en: 'Stand tall, soft knees, lengthen the spine, level the chin.', pt: 'Fique ereto, joelhos soltos, alongue a coluna, nivele o queixo.' },
      { en: 'Sing a phrase, then deliberately slouch — hear the loss.', pt: 'Cante uma frase, depois desabe de propósito — ouça a perda.' },
    ],
    checkpoint: { en: 'You set a tall, relaxed posture automatically before you sing.', pt: 'Você assume uma postura ereta e relaxada no automático antes de cantar.' },
  },
  'tech-2': {
    why: {
      en: 'Appoggio ("to lean") is the engine of pro singing: you keep the ribs/inhale posture expanded slightly LONGER on the exhale, so the breath releases slowly and evenly against steady fold closure. The result is consistent subglottal pressure — the secret to even tone, long phrases and effortless dynamics.',
      pt: 'O appoggio ("apoiar/recostar") é o motor do canto profissional: você mantém a postura de inspiração (costelas) expandida um pouco MAIS na expiração, pra o ar sair devagar e uniforme contra um fechamento estável das pregas. O resultado é uma pressão subglótica constante — o segredo do timbre parelho, frases longas e dinâmica sem esforço.',
    },
    mistakes: [
      { en: 'Collapsing the ribs immediately on the exhale.', pt: 'Desabar as costelas logo na expiração.' },
      { en: 'Confusing support with tension/squeezing the abdomen rigidly.', pt: 'Confundir apoio com tensão/contrair o abdômen com rigidez.' },
    ],
    practice: [
      { en: 'Inhale low; sustain "sss" keeping the ribs open as long as possible.', pt: 'Inspire baixo; sustente "sss" mantendo as costelas abertas o máximo possível.' },
      { en: 'Apply the same "lean" to a long sung note.', pt: 'Aplique o mesmo "recostar" numa nota cantada longa.' },
    ],
    checkpoint: { en: 'Your sustained notes stay even in volume and pitch from start to end.', pt: 'Suas notas sustentadas ficam parelhas em volume e altura do começo ao fim.' },
  },
  'tech-3': {
    why: {
      en: 'Placement is a sensation that guides resonance. Aiming the tone "into the mask" (the front of the face) usually engages efficient, ringing resonance that projects without throat effort. It is not literally moving the voice — it is a mental image that reliably finds the bright, carrying part of the tone.',
      pt: 'A colocação é uma sensação que guia a ressonância. Mirar o som "na máscara" (a frente do rosto) normalmente ativa uma ressonância eficiente e brilhante que projeta sem esforço de garganta. Não é literalmente mover a voz — é uma imagem mental que encontra de forma confiável a parte brilhante e que carrega do som.',
    },
    mistakes: [
      { en: 'Pushing the tone back into the throat (dark and stuck).', pt: 'Empurrar o som pra trás na garganta (escuro e preso).' },
      { en: 'Going fully nasal instead of forward-and-ringing.', pt: 'Ficar totalmente nasal em vez de frontal-e-brilhante.' },
    ],
    practice: [
      { en: 'Buzz "nyah-nyah" to find the forward ring, then sing on it.', pt: 'Faça "nhã-nhã" pra achar o brilho frontal, depois cante nele.' },
      { en: 'Alternate dark/back vs forward placement to feel the difference.', pt: 'Alterne colocação escura/atrás vs frontal pra sentir a diferença.' },
    ],
    checkpoint: { en: 'You can find a forward, ringing tone that projects with low effort.', pt: 'Você acha um som frontal e brilhante que projeta com pouco esforço.' },
  },
  'tech-4': {
    why: {
      en: 'Registers come from how the folds vibrate: chest (thick, heavy, speech-like) and head (thin, light) — with a transition zone (passaggio) between. Mixed voice blends the two so you can ascend without a jarring "flip" or strained belt. Learning to coordinate the mix is the single biggest unlock for a connected range.',
      pt: 'Os registros vêm de como as pregas vibram: peito (grosso, pesado, parecido com a fala) e cabeça (fino, leve) — com uma zona de transição (passaggio) entre eles. A voz mista mistura os dois pra você subir sem um "quebra" brusco nem belt forçado. Aprender a coordenar o mix é a maior virada de chave pra uma extensão conectada.',
    },
    mistakes: [
      { en: 'Carrying heavy chest too high until it cracks or strains.', pt: 'Levar peito pesado alto demais até quebrar ou forçar.' },
      { en: 'Flipping abruptly into a weak, disconnected falsetto.', pt: 'Quebrar de repente num falsete fraco e desconectado.' },
    ],
    practice: [
      { en: 'Siren gently on "ng" or "wee" through the passaggio, no break.', pt: 'Faça sirene suave em "ng" ou "ui" atravessando o passaggio, sem quebra.' },
      { en: 'Lighten slightly as you ascend to invite the mix.', pt: 'Alivie um pouco ao subir pra convidar o mix.' },
    ],
    checkpoint: { en: 'You can ascend through your break smoothly with no obvious flip.', pt: 'Você sobe pela passagem de forma lisa, sem quebra óbvia.' },
  },
  'tech-5': {
    why: {
      en: 'How a note starts (onset) and ends (release) frames its quality. A clean onset coordinates air and closure instantly; a clean release relaxes the note while air still flows, instead of cutting it with a glottal clamp. Sloppy onsets/releases sound amateur and fatigue the voice; clean ones sound finished and protect the folds.',
      pt: 'Como uma nota começa (onset) e termina (release) emoldura sua qualidade. Um onset limpo coordena ar e fechamento na hora; um release limpo relaxa a nota com o ar ainda fluindo, em vez de cortá-la com um aperto glotal. Onsets/releases desleixados soam amadores e cansam a voz; os limpos soam acabados e protegem as pregas.',
    },
    mistakes: [
      { en: 'Ending notes with a glottal "uh" clamp.', pt: 'Terminar notas com um aperto glotal "âh".' },
      { en: 'Letting notes trail into breathiness or fade unintentionally.', pt: 'Deixar as notas escorrerem pra um sopro ou sumirem sem querer.' },
    ],
    practice: [
      { en: 'Sing short notes with clean starts and gentle, airy releases.', pt: 'Cante notas curtas com inícios limpos e finais suaves e arejados.' },
      { en: 'Avoid any click at the start or clamp at the end.', pt: 'Evite qualquer clique no início ou aperto no fim.' },
    ],
    checkpoint: { en: 'Your notes begin and end cleanly, with no click or clamp.', pt: 'Suas notas começam e terminam limpas, sem clique nem aperto.' },
  },
  'tech-6': {
    why: {
      en: 'Vibrato is a natural, regular pitch oscillation (~5–7 Hz) that emerges when support and freedom are balanced — it is a sign of a relaxed, well-coordinated voice, not an effect you force with the throat or jaw. Dynamics (controlled loud/soft) come from breath energy and resonance, not just pushing. Together they make singing expressive.',
      pt: 'O vibrato é uma oscilação natural e regular da altura (~5–7 Hz) que surge quando apoio e liberdade se equilibram — é sinal de uma voz relaxada e bem coordenada, não um efeito que você força com a garganta ou mandíbula. A dinâmica (forte/suave controlados) vem da energia do ar e da ressonância, não só de empurrar. Juntos, deixam o canto expressivo.',
    },
    mistakes: [
      { en: 'Manufacturing vibrato by wobbling the jaw or throat.', pt: 'Fabricar vibrato balançando a mandíbula ou a garganta.' },
      { en: 'Only ever singing at one volume (no dynamics).', pt: 'Cantar sempre num volume só (sem dinâmica).' },
    ],
    practice: [
      { en: 'Sustain a relaxed note and let vibrato appear; do not force it.', pt: 'Sustente uma nota relaxada e deixe o vibrato aparecer; não force.' },
      { en: 'Sing one note crescendo→decrescendo keeping it in tune.', pt: 'Cante uma nota crescendo→decrescendo mantendo-a afinada.' },
    ],
    checkpoint: { en: 'A free vibrato appears on sustained notes and you can swell/soften at will.', pt: 'Um vibrato livre aparece nas notas sustentadas e você cresce/suaviza à vontade.' },
  },
  'tech-7': {
    why: {
      en: 'Interpretation is where technique becomes music. Once breath, pitch and registers are reliable, you spend them on meaning: phrasing (where to breathe and lean), dynamics (build and release), tone color, and timing. The goal is not to show off range but to make the listener feel the song. Technique serves the story.',
      pt: 'A interpretação é onde a técnica vira música. Quando respiração, afinação e registros são confiáveis, você os gasta em significado: fraseado (onde respirar e apoiar), dinâmica (construir e soltar), cor do timbre e tempo. O objetivo não é exibir extensão, mas fazer o ouvinte sentir a música. A técnica serve à história.',
    },
    mistakes: [
      { en: 'Over-singing/riffing everywhere instead of serving the lyric.', pt: 'Cantar/riffar demais em tudo em vez de servir à letra.' },
      { en: 'Flat, uniform dynamics that make the song feel lifeless.', pt: 'Dinâmica plana e uniforme que deixa a música sem vida.' },
    ],
    practice: [
      { en: 'Speak the lyric as a real sentence; mark the key words.', pt: 'Fale a letra como uma frase real; marque as palavras-chave.' },
      { en: 'Sing it shaping dynamics around those words; breathe at the punctuation.', pt: 'Cante moldando a dinâmica em torno dessas palavras; respire na pontuação.' },
    ],
    checkpoint: { en: 'Your performance has clear dynamics and phrasing that follow the meaning.', pt: 'Sua performance tem dinâmica e fraseado claros que seguem o significado.' },
  },
};

export function deepDiveForLesson(lessonId: string): LessonDeepDive | undefined {
  return LESSON_DEEP_DIVE[lessonId];
}
