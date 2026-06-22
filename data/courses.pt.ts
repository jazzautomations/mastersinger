// Portuguese (pt-BR) translations of the five English-authored courses.
// Kept in a separate map so data/courses.ts stays the bilingual source of
// truth: the Academy picks the pt field when the user's language is pt-BR
// and falls back to the original (English) text otherwise. The three newer
// courses (vocal-anatomy, vocal-health, singing-technique) are already
// authored in pt-BR, so they need no entry here.

export interface CoursePtBlock {
  pt?: string;
  itemsPt?: string[];
  labelPt?: string;
}
export interface CoursePtLesson {
  title: string;
  summary: string;
  blocks: Record<number, CoursePtBlock>;
}
export interface CoursePt {
  title: string;
  description: string;
  lessons: Record<string, CoursePtLesson>;
}

export const COURSE_PT: Record<string, CoursePt> = {
  "warmup": {
    title: "Aquecimento Vocal",
    description: "Prepare sua voz em 8 aulas. Respiração, ressonância e alongamentos suaves.",
    lessons: {
      "warmup-1": {
        title: "Por que aquecer?",
        summary: "Entenda o que o aquecimento realmente faz com suas cordas vocais.",
        blocks: {
          0: { pt: "Suas cordas vocais são músculos" },
          1: { pt: "Assim como um atleta nunca correria a frio, um cantor nunca deve cantar em potência a frio. O aquecimento aumenta o fluxo sanguíneo para as cordas vocais, as alonga e encurta com segurança, e prepara seu sistema respiratório para um fluxo de ar controlado." },
          2: { pt: "Um bom aquecimento tem três fases: relaxamento (liberar a tensão do pescoço e da mandíbula), onset suave (humming e vibrações labiais em notas confortáveis) e extensão gradual da tessitura (subindo e descendo por semitons)." },
          3: { pt: "Mire em 5–10 minutos. Mais que isso arrisca fadiga antes mesmo de você começar a cantar." },
          4: { itemsPt: ["Beba água 30 minutos antes — cordas hidratadas vibram com mais liberdade", "Fique em pé ou sentado ereto — postura curvada esmaga seu diafragma", "Comece com um onset suave — nunca comece com um ataque glotal"] },
        },
      },
      "warmup-2": {
        title: "A Vibração Labial",
        summary: "O exercício de aquecimento mais útil que existe. Aprenda uma vez, use para sempre.",
        blocks: {
          0: { pt: "Por que funciona" },
          1: { pt: "A vibração labial (também chamada de \"lip buzz\") cria uma contrapressão nas cordas vocais, o que impede que elas se fechem com força demais. É a forma mais segura de fonar por toda a sua tessitura quando sua voz ainda está fria." },
          2: { pt: "Para produzi-la: junte levemente os lábios, expire com ar suficiente para fazê-los vibrar, então adicione voz (um \"uh\" grave). Comece numa nota confortável e deslize para baixo, depois para cima." },
          3: { pt: "Se seus lábios se recusarem a vibrar, pressione os dedos indicadores nas bochechas, perto dos cantos da boca, para sustentá-los." },
          4: { labelPt: "Experimente este deslize" },
        },
      },
      "warmup-3": {
        title: "Aquecimento com Humming",
        summary: "Humming suave numa escala de 5 notas para despertar sua ressonância.",
        blocks: {
          0: { pt: "Colocação frontal" },
          1: { pt: "O humming com lábios fechados naturalmente coloca a vibração na sua \"máscara\" — a parte da frente do rosto. Essa ressonância frontal é o que dá aos cantores projeção sem esforço." },
          2: { pt: "Cante (humming) um padrão simples de 5 notas (dó-ré-mi-fá-sol-fá-mi-ré-dó) começando numa nota grave confortável. Suba por semitons até sentir qualquer tensão, então pare." },
          3: { pt: "Você deve sentir uma vibração nos lábios e no alto do nariz. Se sentir na garganta, está forçando — alivie." },
        },
      },
      "warmup-4": {
        title: "Fundamentos do Apoio Respiratório",
        summary: "Respiração diafragmática: o motor de cada som que você produz.",
        blocks: {
          0: { pt: "Diafragma, não peito" },
          1: { pt: "Ao inspirar, sua barriga deve expandir — não os ombros. O diafragma é um músculo em forma de cúpula sob seus pulmões; quando contrai, desce e puxa o ar para dentro. Quando relaxa de forma controlada, o ar sai na velocidade que você escolher." },
          2: { pt: "Coloque uma mão na barriga e outra no peito. Inspire lentamente pelo nariz por 4 tempos. A mão da barriga deve se mover para fora; a mão do peito quase não deve se mover." },
          3: { itemsPt: ["Inspire 4 tempos, sibile 8 — controle a expiração", "Inspire 4, sibile 16 — estenda gradualmente", "Inspire 1 (rápido), sibile 8 — apoia o canto staccato"] },
        },
      },
      "warmup-5": {
        title: "Mapeamento da Tessitura",
        summary: "Encontre sua tessitura confortável atual. O MasterSinger vai acompanhar sua evolução ao longo do tempo.",
        blocks: {
          0: { pt: "Cante sua nota mais grave confortável" },
          1: { pt: "Abra o Afinador, cante a nota mais grave que você consegue sustentar confortavelmente (não um vocal fry). Anote a nota — esse é seu limite inferior atual." },
          2: { pt: "Depois suba por semitons até atingir a nota mais aguda que você consegue cantar sem esforço ou sopro. Esse é seu limite superior atual." },
          3: { pt: "O MasterSinger acompanha sua tessitura automaticamente — visite a aba Progresso para vê-la se expandir ao longo do tempo conforme você treina." },
          4: { pt: "Tessitura NÃO equivale a habilidade. Uma tessitura de 2 oitavas cantada com beleza supera uma de 4 oitavas cantada mal." },
        },
      },
      "warmup-6": {
        title: "Exercícios de Onset",
        summary: "Como uma nota começa determina como ela soa. Domine o onset limpo.",
        blocks: {
          0: { pt: "Três onsets" },
          1: { pt: "Um onset glotal (ataque duro) acontece quando suas cordas vocais se fecham antes de o ar começar a fluir — áspero e cansativo. Um onset soproso acontece quando o ar flui antes de as cordas se fecharem — fraco e desperdiçador. Um onset equilibrado é quando o ar e o fechamento das cordas acontecem simultaneamente — limpo e eficiente." },
          2: { pt: "Pratique: diga \"uh-oh\". O primeiro \"uh\" é glotal. Agora tente começar a mesma vogal suavemente, como se estivesse suspirando. Isso é um onset equilibrado." },
          3: { pt: "Imagine o som nascendo de um lugar de quietude, não de um empurrão." },
        },
      },
      "warmup-7": {
        title: "Afinação das Vogais",
        summary: "As vogais são a forma do seu som. Afine-as como um instrumento.",
        blocks: {
          0: { pt: "As vogais carregam ressonância" },
          1: { pt: "Cada vogal (AH, EH, EE, OH, OO) tem uma forma ressoante diferente na sua boca. Cantores habilidosos ajustam a forma levemente à medida que sobem na altura para manter o timbre uniforme — isso se chama modificação vocálica." },
          2: { pt: "Exercício: cante uma escala de 5 notas em \"AH\", depois em \"OO\", depois em \"EE\". Note como cada vogal parece diferente na sua boca. Ao subir, deixe o \"AH\" tender levemente para o \"OH\" e o \"EE\" tender levemente para o \"IH\"." },
          3: { pt: "Se uma nota aguda parecer apertada, tente modificar a vogal para algo um pouco mais aberto. Muitas vezes destrava." },
        },
      },
      "warmup-8": {
        title: "Juntando Tudo",
        summary: "Uma sequência de aquecimento de 5 minutos que você pode usar todos os dias.",
        blocks: {
          0: { pt: "Sua receita diária de aquecimento" },
          1: { pt: "Você agora tem todas as peças. Aqui está uma sequência que leva 5 minutos e cobre tudo: relaxamento, respiração, onset, tessitura e ressonância." },
          2: { itemsPt: ["1 min — Rotações de pescoço, liberação de mandíbula, relaxar ombros", "1 min — Inspiração 4 tempos / sibilo 8 tempos × 5", "1 min — Deslizamentos de vibração labial grave → agudo → grave", "1 min — Escalas de 5 notas em humming, subindo por semitons", "1 min — Deslizamentos de vogais em \"AH\", \"OO\", \"EE\""] },
          3: { pt: "Faça isso antes de cada sessão de prática e antes de cada apresentação. Constância vence intensidade." },
        },
      },
    },
  },
  "pitch-accuracy": {
    title: "Precisão de Afinação",
    description: "Treine seu ouvido e sua voz para acertar em cheio cada nota.",
    lessons: {
      "pitch-1": {
        title: "O que é \"afinado\"?",
        summary: "Entenda cents, temperamento igual e por que ouvido absoluto é um mito.",
        blocks: {
          0: { pt: "O cent é a unidade de afinação" },
          1: { pt: "Um semitom (a distância entre duas teclas adjacentes do piano) é dividido em 100 cents. Assim, uma oitava tem 1200 cents. O ouvido humano normalmente detecta desvios de 5–10 cents; músicos treinados percebem 2–3 cents." },
          2: { pt: "O MasterSinger mede sua afinação em tempo real e diz, em cents, a que distância você está da nota mais próxima. Dentro de ±10 cents é \"verde\". Entre ±10 e ±25 é \"amarelo\". Além de ±25 é \"vermelho\"." },
          3: { pt: "Não persiga o zero absoluto. Uma afinação levemente animada (vibrato) é mais musical do que uma nota congelada e morta no centro." },
        },
      },
      "pitch-2": {
        title: "Prática com Drone",
        summary: "O exercício mais poderoso: cante contra um tom de referência sustentado.",
        blocks: {
          0: { pt: "Trave no drone" },
          1: { pt: "Quando você canta contra um tom de referência sustentado (um drone), você consegue ouvir o \"batimento\" — uma oscilação no som — quando sua afinação não coincide. Conforme você se aproxima da afinação correta, o batimento desacelera; quando você está exatamente afinado, o batimento desaparece." },
          2: { pt: "Abra o Afinador, ouça o tom de referência por alguns segundos, depois tente cantá-lo. Observe a exibição em cents. Ajuste devagar. O objetivo é sentir como \"zero cents\" soa." },
          3: { labelPt: "A4 = 440 Hz de referência" },
          4: { pt: "Quando o batimento desaparece, seu corpo sentirá uma sensação de \"trava\". Memorize essa sensação." },
        },
      },
      "pitch-3": {
        title: "Sustentação de Afinação",
        summary: "Sustentar uma nota afinada é mais difícil do que acertá-la. Treine estabilidade.",
        blocks: {
          0: { pt: "Sustente com firmeza" },
          1: { pt: "Muitos cantores conseguem acertar uma nota alvo brevemente, mas descaem (ou sobem) conforme a sustentam. Isso acontece porque o apoio respiratório se desfaz, ou porque a laringe sobe lentamente conforme o ar se esgota." },
          2: { pt: "Na Prática, escolha um exercício de Sustentação de Afinação. Cante a nota alvo por toda a duração. O medidor de precisão mostra seu desvio médio; o medidor de estabilidade mostra o quanto você oscilou durante a sustentação." },
          3: { pt: "Se você tender a descer, ative mais apoio respiratório na metade da nota — não no início." },
        },
      },
      "pitch-4": {
        title: "Precisão de Intervalos",
        summary: "Acerte intervalos em cheio. A habilidade por trás de cada melodia.",
        blocks: {
          0: { pt: "Intervalos são melodias em miniatura" },
          1: { pt: "Toda melodia é uma sequência de intervalos. Se você consegue cantar com segurança uma terça maior, uma quinta justa, uma oitava — você consegue cantar qualquer coisa com segurança. O truque é internalizar o tamanho de cada intervalo." },
          2: { pt: "Na Prática → Salto de Intervalo, o exercício toca a primeira nota, depois a nota alvo. Cante a primeira, depois salte para o alvo sem deslizar. A pontuação premia a precisão do salto, não o deslize." },
          3: { pt: "Use referências de canções: a \"Marcha Nupcial\" abre com uma quarta justa. \"Brilha Brilha Estrelinha\" abre com uma quinta justa." },
        },
      },
      "pitch-5": {
        title: "Autocorreção",
        summary: "Perceba que você está fora — e corrija na hora.",
        blocks: {
          0: { pt: "O ciclo de feedback" },
          1: { pt: "Um cantor habilidoso ouve sua própria afinação em tempo real e corrige em milissegundos. Isso não é mágica — é um reflexo treinado. O MasterSinger dá a você o feedback visual necessário para treiná-lo." },
          2: { pt: "Em qualquer exercício de prática, observe o medidor de cents. No momento em que você vir amarelo ou vermelho, empurre sua afinação suavemente em direção ao zero. Não corrija demais — ajustes pequenos e suaves." },
          3: { pt: "O objetivo não é nunca estar fora. O objetivo é se recuperar rápido quando estiver." },
        },
      },
    },
  },
  "intervals": {
    title: "Mergulho Profundo nos Intervalos",
    description: "Aprenda cada intervalo pelo nome, pelo som e pela sensação.",
    lessons: {
      "int-1": {
        title: "Nomeando os Intervalos",
        summary: "A gramática da distância melódica.",
        blocks: {
          0: { pt: "Qualidade + número" },
          1: { pt: "Todo intervalo tem um número (2ª, 3ª, 4ª, 5ª, 6ª, 7ª, 8ª/oitava) e uma qualidade (maior, menor, justo, aumentado, diminuto). O número conta as letras; a qualidade conta os semitons." },
          2: { pt: "Exemplo: de C a E é uma 3ª (conte C-D-E = 3 letras). Ela abrange 4 semitons, então é uma terça maior. De C a Eb também é uma 3ª (3 letras), mas abrange 3 semitons, então é uma terça menor." },
          3: { pt: "Intervalos justos (4ª, 5ª, oitava) não podem ser maiores ou menores — apenas justos, aumentados ou diminutos." },
        },
      },
      "int-2": {
        title: "Consonância vs Dissonância",
        summary: "Por que alguns intervalos soam \"repousantes\" e outros \"tensos\".",
        blocks: {
          0: { pt: "A série harmônica decide" },
          1: { pt: "Intervalos consonantes (oitava, 5ª, 4ª, 3ª e 6ª maiores/menores) aparecem cedo na série harmônica — são razões matematicamente simples. Intervalos dissonantes (2ª, 7ª, trítono) são razões complexas; o ouvido os percebe como uma tensão que pede resolução." },
          2: { pt: "A música ocidental usa a dissonância intencionalmente — para criar movimento. Uma melodia que usasse apenas intervalos consonantes pareceria estática. A arte está no equilíbrio." },
          3: { pt: "O trítono (3 tons inteiros) foi historicamente chamado de \"o diabo na música\" — proibido na música sacra medieval por sua tensão." },
        },
      },
      "int-3": {
        title: "Memorizando Intervalos com Músicas",
        summary: "Ancore cada intervalo a uma melodia que você já conhece.",
        blocks: {
          0: { pt: "Músicas de referência" },
          1: { pt: "A forma mais rápida de internalizar os tamanhos dos intervalos é associar uma melodia famosa a cada um. Quando você precisar cantar uma quinta justa, lembre-se da abertura de \"Twinkle Twinkle\" — esse é o som de uma quinta." },
          2: { itemsPt: ["2ª menor — tema de \"Tubarão\"", "2ª maior — \"Happy Birthday\" (primeiras 2 notas)", "3ª menor — \"Greensleeves\"", "3ª maior — \"When the Saints Go Marching In\"", "4ª justa — \"Here Comes the Bride\"", "Trítono — tema de \"Os Simpsons\"", "5ª justa — \"Twinkle Twinkle Little Star\"", "6ª menor — \"The Entertainer\"", "6ª maior — \"My Bonnie Lies Over the Ocean\"", "7ª menor — tema de \"Star Trek\"", "7ª maior — \"Take On Me\" (refrão)", "Oitava — \"Somewhere Over the Rainbow\""] },
          3: { pt: "Use essas referências até que não precise mais delas. O intervalo se torna instintivo." },
        },
      },
      "int-4": {
        title: "Cantando Intervalos com Precisão",
        summary: "Do reconhecimento à reprodução.",
        blocks: {
          0: { pt: "Pré-ouça o alvo" },
          1: { pt: "Antes de cantar a nota alvo, você precisa ouvi-la na sua cabeça. Isso se chama \"audiação\". Se você não consegue ouvi-la internamente, não vai cantá-la com precisão." },
          2: { pt: "Exercício: na prática de saltos intervalares, depois que a primeira nota soar, mas antes de o alvo soar, tente cantar o alvo. Depois, compare. Se você errou, identifique a direção (muito alto? muito baixo?) e tente de novo." },
          3: { pt: "Se você errar consistentemente um intervalo subindo, mas acertar descendo (ou vice-versa), pratique a direção mais difícil o dobro de vezes." },
        },
      },
    },
  },
  "scales": {
    title: "Escalas e Modos",
    description: "Maior, menor, modos, pentatônica — o que são e como cantá-las.",
    lessons: {
      "scl-1": {
        title: "A Escala Maior",
        summary: "A base da tonalidade ocidental.",
        blocks: {
          0: { pt: "Dó-ré-mi-fá-sol-lá-si-dó" },
          1: { pt: "A escala maior é uma sequência de 7 notas com um padrão específico de tons e semitons: T-T-ST-T-T-T-ST. Soa \"feliz\" ou \"brilhante\" aos ouvidos ocidentais. Todas as outras escalas são descritas por como diferem desta." },
          2: { pt: "Pratique cantar a escala maior em diferentes tonalidades. Use o Scale Runner em Practice. Comece com C maior (todas as teclas brancas do piano), depois passe para G, D, A, E — adicionando um sustenido a cada vez." },
          3: { pt: "Os semitons de uma escala maior estão entre os graus 3-4 e 7-8. Escute-os — são as notas \"magnéticas\" que puxam para a resolução." },
        },
      },
      "scl-2": {
        title: "As Três Menores",
        summary: "Natural, harmônica, melódica — três tipos de menor.",
        blocks: {
          0: { pt: "Por que três menores?" },
          1: { pt: "A menor natural (T-ST-T-T-ST-T-T) é a relativa menor de uma escala maior. A menor harmônica eleva o 7º grau para criar uma sensível forte (e uma cadência V-i). A menor melódica eleva o 6º e o 7º graus na subida (para uma melodia mais suave) e reverte na descida." },
          2: { pt: "Cada menor tem uma coloração emocional diferente: a menor natural é melancólica, a menor harmônica é dramática (com um som levemente oriental), a menor melódica é suave e jazzy." },
          3: { pt: "A menor harmônica tem uma 2ª aumentada entre o 6º e o 7º graus — aquele salto \"exótico\" de três semitons." },
        },
      },
      "scl-3": {
        title: "Os Modos",
        summary: "Sete escalas escondidas dentro de cada escala maior.",
        blocks: {
          0: { pt: "Mesmas notas, tônica diferente" },
          1: { pt: "Se você tocar as teclas brancas de um piano de C a C, você obtém C maior. De D a D, você obtém D Dórico. De E a E, E Frígio. E assim por diante: F Lídio, G Mixolídio, A Eólio (= menor natural), B Lócrio." },
          2: { pt: "Cada modo tem um sabor emocional distinto. Dórico é \"menor com 6ª maior\" — usado no folk e no jazz. Frígio é \"menor com 2ª bemol\" — espanhol, exótico. Lídio é \"maior com 4ª sustenida\" — sonhador, flutuante. Mixolídio é \"maior com 7ª bemol\" — bluesy." },
          3: { pt: "Decore este mnemônico em inglês: \"I Don't Particularly Like Modes A Lot\" — Ionian (Jônio), Dorian (Dórico), Phrygian (Frígio), Lydian (Lídio), Mixolydian (Mixolídio), Aeolian (Eólio), Locrian (Lócrio)." },
        },
      },
      "scl-4": {
        title: "Escalas Pentatônicas",
        summary: "Cinco notas que nunca soam errado.",
        blocks: {
          0: { pt: "A escala \"sem notas erradas\"" },
          1: { pt: "A pentatônica maior (1-2-3-5-6) e a pentatônica menor (1-3-4-5-7) omitem os intervalos de semitom que criam tensão. Isso significa que quase qualquer nota da escala soa consonante sobre qualquer acorde da tonalidade — elas são a base das melodias de folk, blues, rock e pop." },
          2: { pt: "Tente cantar uma melodia usando apenas as 5 notas da pentatônica maior de C (C-D-E-G-A) sobre um acorde de C maior. Perceba como cada nota se encaixa. É por isso que a pentatônica é a escala perfeita para iniciantes em improvisação." },
          3: { pt: "As teclas pretas de um piano formam uma pentatônica maior de F#. Toque qualquer uma delas em qualquer ordem — sempre funciona." },
        },
      },
    },
  },
  "harmony": {
    title: "Harmonia Funcional",
    description: "Como os acordes trabalham juntos para sustentar sua melodia.",
    lessons: {
      "harm-1": {
        title: "Tríades: Os Blocos de Construção",
        summary: "Maior, menor, aumentado, diminuto — como soam.",
        blocks: {
          0: { pt: "Empilhando terças" },
          1: { pt: "Uma tríade são três notas empilhadas em terças: fundamental, terça, quinta. A qualidade da terça e da quinta determina o acorde: terça maior + quinta justa = tríade maior. Terça menor + quinta justa = tríade menor. Terça maior + quinta aumentada = aumentada. Terça menor + quinta diminuta = diminuta." },
          2: { pt: "Maior soa \"feliz\". Menor soa \"triste\". Aumentado soa \"suspenso/sonhador\". Diminuto soa \"tenso/instável\"." },
          3: { pt: "No Treino Auditivo, pratique identificar essas quatro qualidades até que sejam instantâneas." },
        },
      },
      "harm-2": {
        title: "Acordes Diatônicos",
        summary: "Os 7 acordes que ocorrem naturalmente em qualquer tonalidade maior.",
        blocks: {
          0: { pt: "Numerais romanos" },
          1: { pt: "Em uma tonalidade maior, cada grau da escala recebe um acorde construído sobre ele. Eles são rotulados com numerais romanos: I (maior), ii (menor), iii (menor), IV (maior), V (maior), vi (menor), vii° (diminuto). Maiúscula = maior, minúscula = menor, ° = diminuto." },
          2: { pt: "Em C maior: I=C, ii=Dm, iii=Em, IV=F, V=G, vi=Am, vii°=B°. Quase todas as canções pop já escritas usam algum subconjunto desses sete acordes." },
          3: { pt: "O acorde vi (relativo menor) é o destino mais comum após I — ele compartilha duas notas com I, então a passagem é suave." },
        },
      },
      "harm-3": {
        title: "O ii-V-I",
        summary: "A progressão mais importante no jazz e além.",
        blocks: {
          0: { pt: "Por que o ii-V-I funciona" },
          1: { pt: "A progressão ii-V-I é a pedra angular da harmonia do jazz. Ela funciona porque cada acorde compartilha duas notas com o próximo, criando um encadeamento suave de vozes, e porque o acorde V cria tensão (com sua nota de sensível) que resolve em I." },
          2: { pt: "Em C maior: Dm → G → C. Note como a 7ª de Dm (C) se torna a 4ª de G (C) se torna a 3ª de C (E se torna... espere, C é a fundamental). O ponto é: as notas resolvem por semitom, a resolução mais forte." },
          3: { pt: "Se você consegue cantar a fundamental de cada acorde em um ii-V-I enquanto ele toca, você consegue navegar pelas músicas de jazz. Pratique em Harmonia → Cante a Quinta." },
        },
      },
      "harm-4": {
        title: "Cantando Partes de Harmonia",
        summary: "Cante uma terça ou quinta acima da melodia — o coração dos vocais de apoio.",
        blocks: {
          0: { pt: "A terça e a quinta" },
          1: { pt: "Quando você canta harmonia, geralmente está cantando uma nota do acorde que não é a melodia. As duas partes de harmonia mais comuns são a terça (que dá ao acorde sua qualidade maior/menor) e a quinta (que adiciona plenitude sem mudar a qualidade)." },
          2: { pt: "Exercício: em Harmonia → Cante a Terça, o aplicativo toca uma nota de melodia. Seu trabalho é cantar a terça maior ou menor acima dela. O detector de afinação diz se você está preciso. Comece devagar — esta é uma habilidade que leva tempo." },
          3: { pt: "Se a melodia está na fundamental do acorde, cante a terça. Se a melodia está na terça, cante a quinta. Evite harmonizar com a quinta — a fundamental funciona melhor." },
        },
      },
    },
  },
};
