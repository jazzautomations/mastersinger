// 365-day vocal training journey — 12 monthly modules
// Month 1-3: Fundamentos → Registros → Extensão
// Month 4-6: Expressão → Intervalos → Harmonia
// Month 7-9: Improvisação → Estilos → Performance
// Month 10-12: Estúdio → Saúde → Maestria

import type { View } from '../types';
import { COURSES } from './courses';
import { EXERCISES, getExercisesByLevel } from './exercises';

export type JourneyStepKind = 'warmup' | 'lesson' | 'practice' | 'ear' | 'theory' | 'review';

export interface JourneyStep {
  kind: JourneyStepKind;
  title: string;
  view: View;
  viewOpts?: any;
  xp: number;
}

export interface JourneyDay {
  day: number;     // 1..365
  month: number;   // 1..12
  title: string;
  blurb: string;
  steps: JourneyStep[];
  totalXp: number;
}

// ── Month metadata ──
export const MONTH_NAMES = [
  'Fundamentos Vocais', 'Os Registros', 'Extensão e Agilidade',
  'Expressão e Dinâmicas', 'Intervalos e Melodia', 'Harmonia Vocal',
  'Improvisação', 'Estilos Musicais', 'Performance ao Vivo',
  'Estúdio e Gravação', 'Saúde e Longevidade', 'Maestria',
];

// Month 12 has 35 days (331-365); all others have 30
const MONTH_STARTS = [1,31,61,91,121,151,181,211,241,271,301,331];
const MONTH_ENDS   = [30,60,90,120,150,180,210,240,270,300,330,365];

export function getMonth(day: number): number {
  const d = Math.max(1, Math.min(day, 365));
  for (let m = 0; m < 12; m++) {
    if (d >= MONTH_STARTS[m] && d <= MONTH_ENDS[m]) return m + 1;
  }
  return 12;
}

export function getMonthProgress(day: number): { done: number; total: number; start: number; end: number } {
  const m = getMonth(day) - 1;
  const start = MONTH_STARTS[m];
  const end   = MONTH_ENDS[m];
  return { done: Math.min(day - start, end - start + 1), total: end - start + 1, start, end };
}

// ── Pool helpers ──
function allLessons() {
  return COURSES.flatMap(c => c.lessons.map(l => ({ course: c, lesson: l })));
}
function pickExercise(level: 'beginner' | 'intermediate' | 'advanced', n: number) {
  const pool = getExercisesByLevel(level);
  return pool[n % pool.length] ?? EXERCISES[0];
}
function pick<T>(arr: T[], n: number): T {
  if (arr.length === 0) throw new Error('empty pool');
  return arr[((n % arr.length) + arr.length) % arr.length];
}

// ── 365-day content ──
// prettier-ignore
const TITLES: string[] = [
  // Month 1 — Fundamentos Vocais (1-30)
  'Sua primeira nota','Respiração e apoio','Colocação frontal','O vibrato natural',
  'Extremo grave','Extremo agudo','Primeira revisão','A oitava',
  'A terça maior','A quinta justa','Escala maior','Escala menor',
  'Modos (Dórico)','Modos (Frígio)','Pentatônica','Blues',
  'Arpejos maiores','Arpejos menores','Acordes com 7','Sustentar nota',
  'Saltos grandes','Agilidade','Messa di voce','Belting básico',
  'Mix voice','Falsete controlado','Estilo e fraseado','Performance',
  'Afinação cirúrgica','Mês 1 concluído 🎉',
  // Month 2 — Os Registros (31-60)
  'Registro de peito','Peito nos agudos','Peito com projeção','Peito em dinâmicas',
  'Revisão — Peito','Registro de cabeça','Cabeça com corpo','Cabeça nos graves',
  'Mistura de cabeça','Revisão — Cabeça','O passaggio','Encontrando o passaggio',
  'Trabalhando o passaggio','Passaggio acima e abaixo','Revisão — Passaggio',
  'Mix voice — introdução','Gradiente de mix','Mix nos agudos','Mix nos graves',
  'Revisão — Mix','Full voice — potência','Sustentar em pleno registro',
  'Registro em músicas reais','Transição entre registros','Revisão parcial',
  'Integrando os registros','Voz contínua','Sem quebras',
  'Registro como ferramenta artística','Mês 2 concluído 🎯',
  // Month 3 — Extensão e Agilidade (61-90)
  'Agudo — explorando o teto','Agudo — técnica de abertura','Agudo — sem tensão',
  'Agudo — volume vs altura','Revisão — Agudos','Grave — explorando o chão',
  'Grave com corpo','Grave com projeção','Grave em música','Revisão — Graves',
  'Agilidade — escalas rápidas','Agilidade — ornamentos','Agilidade — melismas',
  'Agilidade — vocalize italiano','Revisão — Agilidade','Saltos — de 3ª',
  'Saltos — de 5ª','Saltos — de oitava','Saltos compostos','Revisão — Saltos',
  'Range completo','Range contínuo','Range em música','Tessitura vocal',
  'Revisão parcial','Desafio de extensão','Canta agora — todo o range',
  'Liberdade vocal','A voz que você construiu','Mês 3 concluído 🏆',
  // Month 4 — Expressão e Dinâmicas (91-120)
  'Piano e forte','Pianissimo','Forte','Crescendo','Decrescendo',
  'Messa di voce completo','Revisão — Dinâmicas','Timbre — o que é',
  'Timbre brilhante','Timbre escuro','Timbre nasal','Timbre aberto vs fechado',
  'Revisão — Timbre','Vogais limpas','Consoantes cantadas','Dicção em português',
  'Sílabas e ritmo','Dicção em contexto','Revisão — Dicção',
  'Fraseo — arco melódico','Fraseo — respiração musical','Fraseo — clímax',
  'Intenção','Emoção genuína','Storytelling vocal','Revisão parcial',
  'Vibrato como expressão','Agógica','A personalidade da voz','Mês 4 concluído 🎤',
  // Month 5 — Intervalos e Melodia (121-150)
  'Revisão de intervalos','2ª menor','2ª maior','3ª menor','3ª maior','4ª justa',
  'Revisão 2ªs, 3ªs e 4ª','Trítono','5ª justa','6ª menor','6ª maior',
  '7ª menor','7ª maior','Revisão 5ª à 7ª','Oitava',
  'Intervalos compostos','Identificar por ouvido','Cantar de memória',
  'Intervalos em contexto','Revisão — Intervalos',
  'O que faz uma melodia','Direção melódica','Saltos vs graus conjuntos',
  'Repetição e variação','Clímax melódico','Cadência melódica',
  'Revisão — Melodia','Memorização melódica','Improvisar uma melodia',
  'Mês 5 concluído 🎵',
  // Month 6 — Harmonia Vocal (151-180)
  'O que é harmonia vocal','Terças abaixo','Terças acima','Manter a harmonia',
  'Ouvir a melodia enquanto harmoniza','Revisão — Terças',
  'Sextas','Oitava dobrada','Contramelodias','Background vocals',
  'Gospel harmony','Revisão — Sextas e gospel',
  'Harmonia de 3 vozes','Movimento de vozes','Movimento contrário',
  'Vozes internas','Resolver dissonâncias','Revisão — 3 vozes',
  'Close harmony','Barbershop','Ouvido harmônico','Afinação em conjunto',
  'Blend — mistura de timbres','Revisão — Conjunto',
  'Cânones','Round em 2 vozes','Round em 3 vozes',
  'Improvisar segunda voz','A arte de apoiar','Mês 6 concluído 🎼',
  // Month 7 — Improvisação (181-210)
  'O que é improvisar','Improv na tônica','Pentatônica no improv',
  'Improv sobre progressão','Responder à melodia','Revisão — Primeiros passos',
  'Blues vocal — a escala','Blue notes','Call and response',
  'Improv blues básico','Bending vocal','Revisão — Blues',
  'Jazz vocal — swing','Scat singing — introdução','Scat — ritmo e articulação',
  'Scat — imitando o instrumento','Scat sobre standards','Revisão — Jazz e scat',
  'Improv modal','Improv sobre ii-V-I','Ornamentos improvisados',
  'Riffs vocais','Runs melódicos','Revisão — Riffs e runs',
  'Tempo livre no improv','Improv livre','Criatividade vocal pura',
  'Grave e agudo no improv','Construindo vocabulário','Mês 7 concluído 🎹',
  // Month 8 — Estilos Musicais (211-240)
  'Por que estudar estilos','MPB — o que é','Bossa nova — o balanço',
  'Samba — a síncope','Forró — o nordeste cantado','Revisão — Estilos br. I',
  'Sertanejo raiz','Sertanejo universitário','Pagode','Axé — a festa cantada',
  'Funk brasileiro','Revisão — Estilos br. II',
  'Gospel — a fé que soa','Soul — sentimento primeiro','R&B — groove vocal',
  'Melismas do gospel','Riffs de soul avançados','Revisão — Gospel e soul',
  'Pop — clareza e acesso','Rock — garra e grito','Indie — a voz crua',
  'Eletrônica — voz como timbre','Metal vocal — técnica','Revisão — Pop e rock',
  'Cantar em espanhol','Cantar em inglês','Cantar em italiano',
  'Cantar em francês','Incorporar um estilo sem perder você','Mês 8 concluído 🌎',
  // Month 9 — Performance ao Vivo (241-270)
  'O que é presença de palco','Postura e abertura','O olhar',
  'Movimento no palco','Gesto e expressão corporal','Revisão — Presença',
  'Comunicação sem palavras','Conectar com músicos','Lidar com erros',
  'Improvisar ao vivo','A mentalidade do performer','Revisão — Mentalidade',
  'Microfone estático','Microfone de mão','Headset e in-ear',
  'Monitoramento','Feedback — como evitar','Revisão — Microfone',
  'Projeção sem microfone','Cantar com eco','Cantar ao ar livre',
  'Projeção sustentável','A voz que chega','Revisão — Projeção',
  'Aquecimento pré-show','Rotina do dia do show','Depois do show',
  'Gestão em turnê','Gerenciar nervosismo','Mês 9 concluído 🎬',
  // Month 10 — Estúdio e Gravação (271-300)
  'Palco vs estúdio','Preparação para sessão','O fone no estúdio',
  'Cantar no click track','Afinação na gravação','Revisão — Fundamentos',
  'Comping — melhores takes','Punch-in','Double tracking',
  'Harmonias em camadas','Adlibs e extras','Revisão — Técnicas',
  'O produtor e o cantor','Comunicar o que você quer','Receber direção criativa',
  'Session singer','Sync e trilha sonora','Revisão — Carreira de estúdio',
  'Compressão vocal','Reverb e delay','EQ na voz',
  'Autotune como ferramenta','Stem e bounce','Revisão — Pós-produção',
  'Home studio básico','Acústica do ambiente','Microfonação em casa',
  'Gravar, editar, exportar','Enviar demos profissionais','Mês 10 concluído 🎙️',
  // Month 11 — Saúde e Longevidade (301-330)
  'A voz como instrumento físico','Hidratação','O que prejudica a voz',
  'Álcool e voz','Refluxo e voz','Revisão — Higiene vocal',
  'Aquecimento completo','Desaquecimento vocal','Cantar doente — quando não',
  'Rouquidão — diagnóstico','Nódulos vocais — prevenção','Revisão — Saúde vocal',
  'Sono e a voz','Alimentação e voz','Exercício físico e voz',
  'Postura e voz','Tensão muscular e voz','Revisão — Corpo e voz',
  'Estresse e a voz','Ansiedade de performance','Mindfulness para cantores',
  'Meditação antes de cantar','Respiração consciente','Revisão — Mente e voz',
  'Rotina vocal sustentável','Prática deliberada','Quanto praticar',
  'O longo prazo','Ensinar é aprender duas vezes','Mês 11 concluído 💚',
  // Month 12 — Maestria (331-365, 35 days)
  'O que é maestria','Afinação cirúrgica avançada','Consistência de show a show',
  'Reproduzir qualquer nota','Agilidade avançada','Revisão — Maestria técnica',
  'Improv sobre qualquer progressão','Compor vocalmente','Escrever melodias',
  'Arranjar para vozes','Citações e referências','Revisão — Criatividade',
  'Identidade vocal — o que é','Encontrar seu som','Repertório como identidade',
  'Artista vs intérprete','O timbre que é só seu','Revisão — Identidade',
  'Ensinar canto','Dar e receber feedback','Mentoria',
  'Comunidade de cantores','Colaboração criativa','Revisão — Comunidade',
  'Preparação para performance final','Ensaio geral','A mentalidade do artista',
  'O dia da performance','Depois da performance','Revisão do ano inteiro',
  'O que ficou','O que ainda há para aprender','A jornada que não termina',
  'Ensine alguém','365 dias. Você é um cantor. 🏆',
];

// prettier-ignore
const BLURBS: string[] = [
  // Month 1
  'Comece pelo começo: uma nota, no tempo.',
  'O motor de toda voz é a respiração.',
  'Aprenda a mandar o som pra frente.',
  'O que dá vida à nota sustentada.',
  'Ache e fortaleça seu registro grave.',
  'Suba com segurança, sem gritar.',
  'Recapitule tudo que praticou.',
  'A oitava é o intervalo mais poderoso.',
  'A terça que define maior vs menor.',
  'A quinta que sustenta toda harmonia.',
  'A base de toda música tonal.',
  'O lado mais melancólico.',
  'Som folk e jazz, com alma.',
  'Exótico e dramático.',
  'As cinco notas que nunca erram.',
  'A alma do blues e do rock.',
  'Quebre o acorde em melodias.',
  'Arpejos menores, mais tensos.',
  'Acordes com cor jazzística.',
  'Estabilidade é metade do afinado.',
  'Pule intervalos sem deslizar.',
  'Corra pela escala com clareza.',
  'Crescer e decrescer numa nota.',
  'Projeção potente e segura.',
  'Una grave e agudo sem quebrar.',
  'Controle fino do registro leve.',
  'Dê personalidade à melodia.',
  'Cante como se alguém ouvisse.',
  '±2 cents por segundos seguidos.',
  '30 dias. Sua voz já é outra.',
  // Month 2
  'O peito é sua base. Fortaleça sem forçar.',
  'O peito nos agudos é risco calculado.',
  'Peito projetado soa cheio sem soar gritado.',
  'Dinâmicas no registro de peito — do p ao f.',
  'Você conhece o peito. Hora de afinar o controle.',
  'A cabeça é o registro do céu — leveza e altitude.',
  'Cabeça com corpo: leveza que não é vazia.',
  'Cabeça nos graves — o falsete abaixo do passaggio.',
  'Mix começa com cabeça que aceita peito.',
  'Revisão de cabeça antes de unir os dois.',
  'O ponto onde grave encontra agudo. O desafio de todo cantor.',
  'Identificar o passaggio é o primeiro passo para cruzá-lo.',
  'Trabalhar o passaggio diariamente é o que o suaviza.',
  'Passaggio acima e abaixo: a zona de transição ampla.',
  'Revisão do passaggio — você já cruza sem quebrar?',
  'O mix não é um registro — é uma mistura. Gradiente, não botão.',
  'Mais peito = mais peso. Mais cabeça = mais leveza.',
  'Mix nos agudos: a diferença entre gritar e voar.',
  'Mix nos graves: mais corpo no falsete, mais leveza no peito.',
  'O mix revisado: você controla o gradiente?',
  'Full voice — o registro onde tudo se integra com potência.',
  'Sustentar notas longas em pleno registro exige apoio total.',
  'Levar o registro para a música real — não só para exercícios.',
  'Transição fluida entre registros sem o ouvinte perceber.',
  'Revisão de todos os registros em sequência.',
  'Voz integrada: grave, mix, cabeça — tudo conectado.',
  'Uma frase sem quebra de registro é uma declaração de domínio.',
  'Registros sem interrupção: o legato de registro.',
  'O registro não é técnica — é ferramenta artística.',
  'Dois meses. Seus registros agora obedecem.',
  // Month 3
  'Cada meio-tom acima é território conquistado.',
  'Abrir a laringe para cima sem forçar o pescoço.',
  'Agudo sem tensão: a prova de que você evoluiu.',
  'Volume e altura são variáveis independentes. Controle as duas.',
  'Você sabe onde está o seu teto. Agora empurre com técnica.',
  'Cada meio-tom abaixo é solo sólido.',
  'Grave com corpo não é murmurar — é projetar fundo.',
  'O grave projetado chega ao público sem esforço.',
  'Gravar bem os graves é o que separa voz de vocalista.',
  'Graves revisados. Onde está o seu chão?',
  'Velocidade é resultado de precisão repetida — não de pressa.',
  'Ornamento limpo: a nota extra que enriquece, não polui.',
  'Melisma é a voz correndo — mas ela sabe onde está.',
  'O vocalize italiano treina uniformidade de vogal a toda velocidade.',
  'Agilidade revisada. Você corre limpo?',
  'A terça cantada em salto — o menor dos grandes intervalos.',
  'A quinta em salto: o intervalo que define o herói.',
  'A oitava em salto: o teste de registro e confiança.',
  'Saltos compostos: mais de uma oitava. O extremo do range.',
  'Revisão de saltos — você aterra em toda nota?',
  'Grave ao agudo sem parar. A voz como um instrumento de sopro.',
  'Continuidade vocal: a linha que não quebra.',
  'Range em contexto: cantar música real com o range completo.',
  'Tessitura é o seu range confortável. Conhecê-la é poder.',
  'Revisão do range — quanto você cresceu desde o dia 1?',
  'Desafio: cante o exercício mais difícil que você conhece.',
  'Você tem range. Agora cante com ele, não sobre ele.',
  'Liberdade vocal: quando a técnica some e a música aparece.',
  'A voz que você tem hoje é fruto de 89 dias de trabalho.',
  'Três meses. Você tem uma voz que você controla.',
  // Month 4
  'A voz tem volume. Toque o dial do pianissimo ao fortissimo.',
  'A voz pequena, controlada. Difícil de fazer soar intencional.',
  'Potência com controle — não é gritar, é projetar.',
  'Crescer gradualmente numa frase. A tensão que o ouvinte sente.',
  'Diminuir sem perder o suporte. A nota que some.',
  'Crescer e decrescer numa nota. A técnica do bel canto.',
  'Consolide o controle de volume antes de continuar.',
  'O timbre é a sua assinatura. Ninguém soa igual a você.',
  'Mais presença de harmônicos agudos. Soa claro e penetrante.',
  'Menos agudos, mais graves. Soa quente e redondo.',
  'O nasal ajuda na projeção mas exige controle.',
  'Vogais abertas ou fechadas mudam o timbre radicalmente.',
  'Explore sua paleta de timbres — cada um serve a um estilo.',
  'A vogal que você canta muda a percepção da nota.',
  'Consoantes definem a dicção — e podem atrapalhar a música.',
  'O português cantado tem desafios únicos. A letra precisa ser ouvida.',
  'A sílaba tônica cai no tempo forte. Isso muda tudo.',
  'O legato e a dicção vivem em tensão. Aprenda a equilibrar.',
  'A mensagem da música começa com o texto claro.',
  'Toda frase tem começo, meio e fim. Respeite o arco.',
  'Respire onde a frase pede, não onde o pulmão manda.',
  'O ponto mais alto da frase merece mais peso, mais brilho.',
  'A nota correta sem intenção não comunica nada.',
  'Emoção não dispensa técnica. Técnica serve à emoção.',
  'Cantar uma história: o ouvinte precisa sentir, não só ouvir.',
  'Expressão + dicção + fraseo: os três pilares do intérprete.',
  'O vibrato não é enfeite — é forma de encher a nota de vida.',
  'Acelerar e desacelerar dentro de uma frase. Elasticidade do tempo.',
  'Sua voz conta quem você é antes de você dizer uma palavra.',
  'Expressão musical: a técnica que transforma notas em arte.',
  // Month 5
  'Os intervalos são o alfabeto da música. Você conhece as letras?',
  '1 semitom. O mais tenso de todos. A sirene, o cromatismo.',
  '2 semitons. O passo da escala. Dó-Ré, Sol-Lá.',
  '3 semitons. O sad interval. Começo do arpejo menor.',
  '4 semitons. O happy interval. Começo do arpejo maior.',
  '5 semitons. Estável e forte. O Hino Nacional começa com uma 4ª.',
  'Os intervalos pequenos constroem escadas. Consolide os menores.',
  '6 semitons. O diabolus in musica. Tensão máxima.',
  '7 semitons. A pedra angular de todo acorde. Aberta e poderosa.',
  '8 semitons. Melancólica e ampla.',
  '9 semitons. Aberta e afirmativa.',
  '10 semitons. Tensão jazz. A dominante que quer resolver.',
  '11 semitons. Suspenso e sofisticado. A um semitom da oitava.',
  'Intervalos médios e grandes: o vocabulário do salto melódico.',
  '12 semitons. A mesma nota em outra altura. Perfeita e estável.',
  'Além da oitava — a extensão do vocabulário melódico.',
  'Ouvir um intervalo e nomear — a fundação do treino de ouvido.',
  'Solfejo prático: ouvir e reproduzir sem referência externa.',
  'O mesmo intervalo soa diferente em maior vs menor.',
  'Você conhece todos os 12 intervalos. Agora cante-os.',
  'Tensão e resolução, salto e grau conjunto, repetição e contraste.',
  'Subir cria tensão. Descer resolve. A melodia que vai e vem.',
  'A melodia perfeita equilibra grandes saltos e passos pequenos.',
  'A melodia que se repete cria expectativa. A variação a satisfaz.',
  'A nota mais alta de uma melodia carrega o máximo de energia.',
  'A descida final de uma frase — o ponto final da melodia.',
  'Identifique os elementos de qualquer melodia que você cantar.',
  'Como gravar uma melodia de forma definitiva na memória.',
  'Criar uma melodia do zero sobre uma progressão de acordes.',
  'Você fala fluente o idioma dos intervalos e da melodia.',
  // Month 6
  'Duas ou mais vozes cantando notas diferentes ao mesmo tempo.',
  'A segunda voz mais fácil: uma terça abaixo da melodia.',
  'Uma terça acima — mais brilhante, mais alto, mais desafiador.',
  'Quando a melodia sobe, sua harmonia nem sempre sobe junto.',
  'A habilidade de cantar uma coisa e ouvir outra simultaneamente.',
  'A tercina é a base de todo arranjo vocal. Domine-a primeiro.',
  'Uma sexta abaixo soa plena e encorpada. A base do barbershop.',
  'Cantar a mesma nota uma oitava acima ou abaixo — a base do coro.',
  'Uma melodia independente que complementa a melodia principal.',
  'Ooh, aah, pad — o suporte que faz a música respirar.',
  'Quatro vozes em harmonia apertada. O som que eleva.',
  'Harmonia é conversa entre vozes. Ouça e responda.',
  'Soprano, mezzo, contralto — ou tenor, barítono, baixo.',
  'Como uma voz se move em relação à outra.',
  'Quando uma voz sobe, a outra desce. O mais bonito dos movimentos.',
  'A voz do meio sustenta a harmonia quando extremos se afastam.',
  'A dissonância é tensão — ela pede para resolver.',
  'Três vozes em equilíbrio são a célula da harmonia coral.',
  'Vozes muito próximas umas das outras. Rico e complexo.',
  'Quatro vozes, progressões específicas, acorde final sempre reto.',
  'Ouvir qual nota está faltando numa harmonia incompleta.',
  'Afinar com outra voz — mais exigente que afinar solo.',
  'Fazer sua voz soar junto com outra sem sobressair.',
  'Cantar em conjunto é uma habilidade diferente de cantar solo.',
  'Duas vozes cantando a mesma melodia em tempos diferentes.',
  'Frère Jacques — a estrutura do cânone básico.',
  'Três vozes em cânone — complexidade e satisfação.',
  'Criar harmonias na hora, em tempo real, sem partitura.',
  'A segunda voz que serve a melodia, não compete com ela.',
  'Harmonia vocal: a linguagem que conecta cantores.',
  // Month 7
  'Criar música em tempo real, sem partitura, respondendo ao momento.',
  'Comece simples: improvisar sobre uma nota pedal.',
  '5 notas que sempre funcionam. O primeiro vocabulário do improv.',
  'Ouvir os acordes e escolher notas que se encaixam.',
  'Improvisação como conversa: perguntar e responder.',
  'Improvise 30 segundos hoje. Qualquer coisa. Comece.',
  'A escala blues tem 6 notas. Cada uma conta uma história.',
  'O semitom que não deveria estar ali — mas que faz tudo funcionar.',
  'A estrutura do blues: pergunta e resposta, tensão e alívio.',
  'Improvise sobre um blues de 12 compassos. O mais permissivo.',
  'Deslizar entre notas — a inflexão que define o blues e o soul.',
  'O blues é sentimento antes de ser teoria. Deixe sair.',
  'A colcheia que não é colcheia. O swing que balança.',
  'Improvise com sílabas em vez de palavras. Você é o instrumento.',
  'Dit, dah, bee-bop — as sílabas do scat têm personalidade.',
  'Pense como um saxofone. Ataque, sustentação, vibrato.',
  'Improvise sobre Autumn Leaves, All of Me. Clássicos que ensinam.',
  'O jazz vocal é liberdade dentro de estrutura.',
  'Dórico, mixolídio — cada modo tem seu sabor improvisatório.',
  'A progressão mais comum do jazz. O campo de treinamento.',
  'Appoggiaturas, mordentes — ornamentos são improv micro.',
  'Figuras melódicas curtas e repetíveis. A assinatura do cantor de soul.',
  'Escalas rápidas entre notas. O run de Mariah ou Whitney.',
  'Riffs e runs são vocabulário. Aprenda e depois esqueça.',
  'Estirar e comprimir o tempo dentro de uma frase improvisada.',
  'Sem progressão, sem regras. O que sua voz quer dizer hoje?',
  'A voz como instrumento de expressão total, além da melodia.',
  'Usar o range completo na improvisação — a dinâmica do range.',
  'Improv bom vem de muito ouvido, muita prática, muita escuta.',
  'Improvisação: a conversa entre você e a música.',
  // Month 8
  'Cada estilo tem técnicas específicas. O estilo educa a técnica.',
  'Música popular brasileira: a síntese de tudo que o Brasil é musicalmente.',
  'A colcheia sincopada, o dedilhado, a voz intimista de João Gilberto.',
  'O samba tem ginga no corpo antes de ter nota na boca.',
  'Pé-de-serra, eletrônico, universitário — o forró tem muitas vozes.',
  'MPB, bossa nova, samba, forró: você identificou as diferenças?',
  'Dupla sertaneja raiz: viola, harmonia simples, emoção direta.',
  'Nasal alto, falsete gritado, gaita — o novo country brasileiro.',
  'Malícia, cavaquinho, tamborim — e uma voz que sorri enquanto canta.',
  'Energia de bloco, percussão, voz que contagia.',
  'Groove, gíria, presença — o funk carioca tem uma voz própria.',
  'O Brasil musical cabe num ano de estudo. Você está só começando.',
  'O gospel americano e o brasileiro têm vozes distintas.',
  'Aretha, Sam Cooke, Amy Winehouse — o soul não esconde nada.',
  'Adornos, syncopation, runs — o R&B tem seu próprio vocabulário.',
  'A corrida melódica do gospel é uma declaração de fé.',
  'Runs sobre acordes de jazz: a sofisticação do soul moderno.',
  'O soul sai do coração, mas a técnica ajuda o coração a falar.',
  'O pop quer ser cantado por todos. Clareza é a sua força.',
  'O rock tem permissão para ser imperfeito. A imperfeição é o ponto.',
  'Pequena, íntima, próxima. O indie valoriza a autenticidade.',
  'Autotune como estética. A voz processada como instrumento.',
  'Growl seguro existe. Sem técnica, você se machuca.',
  'A voz de cada época reflete a cultura daquela época.',
  'Vogais abertas, ritmo marcado — o espanhol transforma a voz.',
  'A vogal do inglês é mais fechada. O ritmo é stress-timed.',
  'A língua do bel canto. Vogais puras, consoantes suaves.',
  'O francês é nasal, ligado, com liaisons que mudam a prosódia.',
  'Estilo educa, não engessa. Absorva sem copiar.',
  'Você explorou o mundo através da voz.',
  // Month 9
  'A energia que você irradia antes de abrir a boca já é performance.',
  'Peito aberto, ombros atrás, queixo paralelo ao chão — você manda.',
  'Olhar para o público cria conexão. Olhar para o chão, afasta.',
  'Movimentos que saem da música, não de uma coreografia forçada.',
  'O gesto amplifica a emoção. O gesto errado distrai.',
  'Presença de palco é a arte de fazer o público se importar.',
  'Entre as músicas, entre as frases — o silêncio também é performance.',
  'A sintonia com a banda é visível. O público sente quando há ou não.',
  'Errou. E daí? Continue. O público perdoa quando você não para.',
  'A música ao vivo é viva. Responda ao que acontece no momento.',
  'Não é sobre você. É sobre a música e o público.',
  'Performance é serviço. Sirva a música, sirva o público.',
  'Distância, ângulo — cada centímetro muda o som captado.',
  'Ganho de proximidade, feedback, técnica de aproximar e afastar.',
  'Liberdade de movimento. Desafio de monitoramento.',
  'Você precisa se ouvir para cantar bem. O monitor é seu aliado.',
  'Microfone apontado para monitor. A física do feedback e como fugir.',
  'O microfone amplifica quem você é. Não esconde, amplia.',
  'Antes do microfone, todo cantor precisava projetar naturalmente.',
  'Igreja, cave, estádio — o eco muda seu tempo e sua afinação.',
  'Sem paredes, o som se perde. Mais apoio, mais abertura.',
  'Projetar por 2 horas sem rouquidão. O segredo é o apoio.',
  'O cantor acústico treina para ser ouvido. Sem esforço aparente.',
  'Projeção acústica é o nível mais alto da técnica vocal.',
  '10-15 minutos antes de entrar no palco. Nunca pule.',
  'Acordar, hidratar, descansar, aquecer — a sequência que protege.',
  'Desaqueça, hidrate, descanse. A recuperação é parte do treino.',
  'Voz saudável em tournê: uma logística, não um milagre.',
  'Ansiedade de palco: ela não vai embora. Aprenda a usá-la.',
  'Performance é a síntese de tudo que você aprendeu.',
  // Month 10
  'No palco, você se move. No estúdio, a fita não mente.',
  'Descanse bem, hidrate, evite leite. Sua voz é o instrumento.',
  'O mix do fone define como você canta. Peça o que precisa.',
  'O metrônomo digital não tem compaixão. Treine antes.',
  'No estúdio, ±15 cents já é erro. A barra está mais alta.',
  'O estúdio expõe tudo que o palco esconde.',
  'Gravar 10 takes e escolher os melhores trechos de cada.',
  'Entrar no meio de uma frase e continuar perfeitamente.',
  'Cantar a mesma parte duas vezes. A duplicação que engrossa.',
  'Gravar a segunda, terceira, quarta voz sobre si mesmo.',
  'Os solos, runs e improvisos que aparecem no final.',
  'Estúdio é artesanato. Cada take é uma peça do quebra-cabeça.',
  'O produtor dirige. O cantor executa. A parceria que cria o disco.',
  'Como dizer ao engenheiro: mais warm, mais ar, menos estridência.',
  'Mais emoção, mais seco, mais íntimo — e você entrega.',
  'O cantor contratado. Versatilidade, pontualidade, profissionalismo.',
  'Cantar para filmes, séries, propagandas — a voz como serviço.',
  'Estúdio é uma profissão específica. Treine para ela.',
  'O compressor nivela os picos. Saber isso muda como você canta.',
  'O espaço sonoro que a voz habita. Mais reverb = mais distância.',
  'Cortar as frequências que atrapalham, realçar as que definem.',
  'Usado sutil, corrige. Usado extremo, cria estética nova.',
  'Como exportar sua voz para o produtor trabalhar.',
  'A pós-produção pode salvar e pode destruir uma gravação vocal.',
  'Interface, microfone, fone, DAW — o mínimo para começar.',
  'Paredes paralelas, reflexões — como tratar o quarto.',
  'Distância, posição, ângulo — o básico que muda tudo.',
  'O fluxo básico de uma gravação vocal de home studio.',
  'O que um produtor espera receber. Formato, qualidade, atitude.',
  'Você agora fala a língua do estúdio.',
  // Month 11
  'Sua voz são cordas vocais, músculos, cartilagens. Cuide do corpo.',
  'A voz boa é uma voz hidratada. 2 litros por dia, sempre.',
  'Gritar, sussurrar forçado, fumar, refluxo — os inimigos da voz.',
  'Álcool desidrata as mucosas. Secar a voz antes de cantar é risco.',
  'O ácido que sobe e queima as cordas. Sintoma silencioso e destrutivo.',
  'Sua voz vai durar décadas se você a tratar bem desde agora.',
  'Nunca pule. O aquecimento previne lesão e melhora o resultado.',
  'Depois de cantar, a voz precisa esfriar antes de calar.',
  'Faringite, laringite, nódulo — a voz manda um sinal. Ouça.',
  'Rouquidão que passa em 2 dias é fadiga. Que persiste é problema.',
  'Falar gritado cronicamente cria nódulos. A prevenção é o silêncio.',
  'O cantor que se cuida canta por mais tempo. Simples assim.',
  'A voz que não descansou não performa. Sono é treino.',
  'Leite espessa muco. Picante irrita. Mel ajuda. Os fatos.',
  'Corpo saudável, voz saudável. O cantor é um atleta.',
  'Ombro tensionado, pescoço curvado — a postura que prejudica.',
  'Tensão na mandíbula, língua, ombro — o bloqueio que fecha a voz.',
  'O instrumento é o corpo. Cuide da fábrica, não só da produção.',
  'Stress cronicamente seca a mucosa e tenciona a laringe.',
  'O nervosismo antes do show é fisiológico. É possível treiná-lo.',
  'Presença plena no momento da performance.',
  '5 minutos de meditação antes de cantar mudam o resultado.',
  'A respiração profunda diária alimenta a voz.',
  'A saúde mental do cantor afeta diretamente a qualidade vocal.',
  'Cantar todos os dias não significa cantar até esgotar.',
  '30 minutos focados valem mais que 3 horas dispersas.',
  'A dose certa depende do seu nível, objetivo e saúde atual.',
  'Cantar por décadas requer paciência com o próprio desenvolvimento.',
  'O que você ensina ao outro consolida o que você sabe.',
  'Saúde vocal: a fundação de uma carreira longa.',
  // Month 12 (35 days)
  'Maestria não é perfeição. É consistência, profundidade, presença.',
  '±2 cents por 5 segundos. O padrão do cantor de referência.',
  'O amador tem um bom dia. O profissional performa todo dia.',
  'Ouvir uma nota e reproduzi-la imediatamente — relative pitch.',
  'Escalas em andamento rápido, ornamentos limpos, runs precisos.',
  'Técnica no nível de maestria: o não-pensado que sai perfeito.',
  'II-V-I, blues, modal, livre — você improvisa sobre tudo.',
  'Criar melodias que duram. A linha vocal que alguém vai lembrar.',
  'Melodia que casa com o texto, que sobe no lugar certo.',
  'Colocar 3-4 vozes em harmonia para uma peça existente.',
  'O improvisador avançado cita, distorce, reinventa repertório.',
  'Criatividade é o que distingue o bom do inesquecível.',
  'Seu timbre, seu fraseo, suas escolhas melódicas — ninguém igual.',
  'Parar de imitar. Absorver. Deixar sair o que só você tem.',
  'As músicas que você canta dizem quem você é.',
  'O intérprete serve a música. O artista transforma a música em si.',
  'Reconhecível em 2 segundos. A marca do cantor verdadeiro.',
  'Sua voz é um ponto de vista. Expresse-o sem pedir licença.',
  'Transmitir o que você sabe é a mais alta forma de dominá-lo.',
  'Feedback específico e honesto é o presente que acelera o crescimento.',
  'O mentor que você tem e o mentor que você pode ser.',
  'Cantar sozinho evolui. Cantar com outros transforma.',
  'Dois músicos que constroem juntos criam o que nenhum criaria sozinho.',
  'A música é relacional. A técnica é solitária. Equilibre os dois.',
  'Selecione as músicas. Prepare o corpo. Prepare a mente.',
  'O último ensaio antes do que importa. Trate como o show real.',
  'Não é sobre você. É sobre a experiência que você cria no outro.',
  'Acorde cedo. Hidrate. Aqueça. Apareça. Cante.',
  'Celebre. Recupere. Reflita. Planeje o próximo.',
  '365 dias. Tudo que você estudou, praticou, sentiu.',
  'As técnicas que ficaram no corpo. As músicas que ficaram na alma.',
  'Não existe topo. Existe o próximo degrau.',
  'Cantar bem é uma prática de vida, não uma meta com data fim.',
  'O maior presente que um músico pode dar.',
  'Um ano. Você chegou. Agora continue.',
];

// ── Build ──
export function buildJourney(): JourneyDay[] {
  const lessons = allLessons();
  const days: JourneyDay[] = [];

  for (let d = 1; d <= 365; d++) {
    const month = getMonth(d);
    const steps: JourneyStep[] = [];

    // 1) Warmup — 2 of every 3 days
    if (d % 3 !== 2) {
      const routineId =
        month <= 3 ? (d <= 10 ? 'quick' : 'complete') :
        month <= 6 ? (d % 2 === 0 ? 'high' : 'low') :
        'complete';
      steps.push({ kind: 'warmup', title: 'Aquecimento vocal', view: 'warmup', viewOpts: { routineId }, xp: 12 });
    }

    // 2) Lesson — level appropriate
    const levelFilter =
      month <= 3 ? ['beginner'] :
      month <= 7 ? ['beginner', 'intermediate'] :
      ['intermediate', 'advanced'];
    const pool = lessons.filter(l => levelFilter.includes(l.course.level));
    const { course: c, lesson: l } = pick(pool.length > 0 ? pool : lessons, d - 1);
    steps.push({ kind: 'lesson', title: l.title, view: 'academy', viewOpts: { courseId: c.id, lessonId: l.id }, xp: l.xp });

    // 3) Practice
    const exLevel =
      d <= 12 ? 'beginner' as const :
      d <= 270 ? 'intermediate' as const :
      'advanced' as const;
    const ex = pickExercise(exLevel, d - 1);
    steps.push({ kind: 'practice', title: ex.title, view: 'practice', viewOpts: { exerciseIds: [ex.id], isDaily: true }, xp: ex.xp });

    // 4) Ear training every 3rd day
    if (d % 3 === 0) steps.push({ kind: 'ear', title: 'Treino de ouvido', view: 'ear', xp: 20 });

    // 5) Theory every 4th day
    if (d % 4 === 0) steps.push({ kind: 'theory', title: 'Teoria musical', view: 'theory', xp: 15 });

    // 6) Review at month ends and every 30 days
    if (d % 30 === 0 || d === 365) steps.push({ kind: 'review', title: 'Revisão', view: 'progress', xp: 10 });

    days.push({
      day: d,
      month,
      title: TITLES[d - 1] ?? `Dia ${d}`,
      blurb: BLURBS[d - 1] ?? 'Mais um passo na sua voz.',
      steps,
      totalXp: steps.reduce((s, x) => s + x.xp, 0),
    });
  }

  return days;
}

let CACHED: JourneyDay[] | null = null;
export function getJourney(): JourneyDay[] {
  if (!CACHED) CACHED = buildJourney();
  return CACHED;
}

export function getJourneyDay(day: number): JourneyDay | undefined {
  return getJourney().find(d => d.day === day);
}

export function currentJourneyDay(completedLessons: string[], resultExerciseIds: string[]): number {
  const journey = getJourney();
  let current = 1;
  for (const day of journey) {
    const lessonDone = day.steps.filter(s => s.kind === 'lesson').every(s => {
      const id = s.viewOpts?.lessonId;
      return id ? completedLessons.includes(id) : true;
    });
    const practiceDone = day.steps.filter(s => s.kind === 'practice').every(s => {
      const id = s.viewOpts?.exerciseIds?.[0];
      return id ? resultExerciseIds.includes(id) : true;
    });
    if (lessonDone && practiceDone) current = day.day + 1;
    else break;
  }
  return Math.min(current, 365);
}

export function isDayComplete(day: JourneyDay, completedLessons: string[], resultExerciseIds: string[]): boolean {
  const lessonDone = day.steps.filter(s => s.kind === 'lesson').every(s => {
    const id = s.viewOpts?.lessonId; return id ? completedLessons.includes(id) : true;
  });
  const practiceDone = day.steps.filter(s => s.kind === 'practice').every(s => {
    const id = s.viewOpts?.exerciseIds?.[0]; return id ? resultExerciseIds.includes(id) : true;
  });
  return lessonDone && practiceDone;
}
