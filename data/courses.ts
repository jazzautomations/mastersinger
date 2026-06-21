import type { Course } from '../types';

export const COURSES: Course[] = [
  // ── Warmup Course ──
  {
    id: 'warmup',
    title: 'Vocal Warmup',
    description: 'Get your voice ready in 8 lessons. Breathing, resonance, gentle stretches.',
    level: 'beginner',
    color: '#22d3ee',
    icon: '🔥',
    lessons: [
      {
        id: 'warmup-1', courseId: 'warmup', index: 0,
        title: 'Why warm up?',
        summary: 'Understand what a warmup actually does to your vocal folds.',
        content: [
          { kind: 'heading', text: 'Your vocal folds are muscles' },
          { kind: 'paragraph', text: 'Just like an athlete would never sprint cold, a singer should never belt cold. Warming up increases blood flow to the vocal folds, lengthens and shortens them safely, and primes your respiratory system for controlled airflow.' },
          { kind: 'paragraph', text: 'A good warmup has three stages: relaxation (release neck and jaw tension), gentle onset (humming and lip trills on comfortable pitches), and gradual range extension (moving up and down by half steps).' },
          { kind: 'tip', text: 'Aim for 5–10 minutes. Anything beyond that risks fatigue before you even start singing.' },
          { kind: 'list', items: [
            'Drink water 30 minutes before — hydrated folds vibrate more freely',
            'Stand or sit tall — slouched posture crushes your diaphragm',
            'Use a soft onset first — never start with a glottal attack',
          ] },
        ],
        xp: 10,
      },
      {
        id: 'warmup-2', courseId: 'warmup', index: 1,
        title: 'The Lip Trill',
        summary: 'The single most useful warmup exercise. Learn it once, use it forever.',
        content: [
          { kind: 'heading', text: 'Why it works' },
          { kind: 'paragraph', text: 'The lip trill (also called "lip buzz") creates back-pressure on the vocal folds, which prevents them from slamming together too hard. It is the safest way to phonate across your range when your voice is still cold.' },
          { kind: 'paragraph', text: 'To produce it: lightly press your lips together, exhale with enough air to make them flap, then add voice (a low "uh"). Start on a comfortable pitch and glide down, then up.' },
          { kind: 'tip', text: 'If your lips refuse to trill, press your index fingers into your cheeks near the corners of your mouth to support them.' },
          { kind: 'audio', midi: 60, durationMs: 4000, label: 'Try this glide' },
        ],
        xp: 15,
      },
      {
        id: 'warmup-3', courseId: 'warmup', index: 2,
        title: 'Humming Warmup',
        summary: 'Gentle humming on a 5-note scale to wake up your resonance.',
        content: [
          { kind: 'heading', text: 'Forward placement' },
          { kind: 'paragraph', text: 'Humming with closed lips naturally places vibration in your "mask" — the front of your face. This forward resonance is what gives singers projection without strain.' },
          { kind: 'paragraph', text: 'Hum a simple 5-note pattern (do-re-mi-fa-sol-fa-mi-re-do) starting on a low comfortable pitch. Move up by half steps until you feel any tightness, then stop.' },
          { kind: 'tip', text: 'You should feel a buzz on your lips and the bridge of your nose. If you feel it in your throat, you are pushing — back off.' },
        ],
        xp: 15,
      },
      {
        id: 'warmup-4', courseId: 'warmup', index: 3,
        title: 'Breath Support Basics',
        summary: 'Diaphragmatic breathing: the engine of every sound you make.',
        content: [
          { kind: 'heading', text: 'Diaphragm, not chest' },
          { kind: 'paragraph', text: 'When you inhale, your belly should expand — not your shoulders. The diaphragm is a dome-shaped muscle under your lungs; when it contracts, it descends and pulls air in. When it relaxes controlledly, air flows out at the rate you choose.' },
          { kind: 'paragraph', text: 'Place one hand on your belly and one on your chest. Breathe in slowly through your nose for 4 counts. The belly hand should move out; the chest hand should barely move.' },
          { kind: 'list', items: [
            'Inhale 4 counts, hiss out 8 — control the exhale',
            'Inhale 4, hiss out 16 — gradually extend',
            'Inhale 1 (sharp), hiss out 8 — supports staccato singing',
          ] },
        ],
        xp: 15,
      },
      {
        id: 'warmup-5', courseId: 'warmup', index: 4,
        title: 'Range Mapping',
        summary: 'Find your current comfortable range. MasterSinger will track it over time.',
        content: [
          { kind: 'heading', text: 'Sing your lowest comfortable note' },
          { kind: 'paragraph', text: 'Open the Tuner, sing the lowest note you can sustain comfortably (not a vocal fry). Note the pitch — that is your current floor.' },
          { kind: 'paragraph', text: 'Then sing up by half steps until you reach the highest note you can sing without strain or breathiness. That is your current ceiling.' },
          { kind: 'paragraph', text: 'MasterSinger tracks your range automatically — visit the Progress tab to see it expand over time as you train.' },
          { kind: 'tip', text: 'Range does NOT equal ability. A 2-octave range sung beautifully beats a 4-octave range sung poorly.' },
        ],
        xp: 20,
      },
      {
        id: 'warmup-6', courseId: 'warmup', index: 5,
        title: 'Onset Exercises',
        summary: 'How a note begins determines how it sounds. Master the clean onset.',
        content: [
          { kind: 'heading', text: 'Three onsets' },
          { kind: 'paragraph', text: 'A glottal onset (hard attack) happens when your vocal folds slam together before airflow starts — harsh and tiring. A breathy onset happens when air flows before the folds close — weak and wasteful. A balanced onset is when air and fold-closure happen simultaneously — clean and efficient.' },
          { kind: 'paragraph', text: 'Practice: say "uh-oh". The first "uh" is glottal. Now try to start the same vowel gently, as if you are sighing. That is a balanced onset.' },
          { kind: 'tip', text: 'Imagine the sound starting from a place of stillness, not from a push.' },
        ],
        xp: 15,
      },
      {
        id: 'warmup-7', courseId: 'warmup', index: 6,
        title: 'Vowel Tuning',
        summary: 'Vowels are the shape of your sound. Tune them like an instrument.',
        content: [
          { kind: 'heading', text: 'Vowels carry resonance' },
          { kind: 'paragraph', text: 'Each vowel (AH, EH, EE, OH, OO) has a different resonant shape in your mouth. Skilled singers adjust the shape slightly as they ascend in pitch to keep the tone even — this is called vowel modification.' },
          { kind: 'paragraph', text: 'Exercise: sing a 5-note scale on "AH", then on "OO", then on "EE". Notice how each vowel feels different in your mouth. As you ascend, let "AH" drift slightly toward "OH" and "EE" drift slightly toward "IH".' },
          { kind: 'tip', text: 'If a high note feels tight, try modifying the vowel slightly more open. It often unlocks.' },
        ],
        xp: 15,
      },
      {
        id: 'warmup-8', courseId: 'warmup', index: 7,
        title: 'Putting It Together',
        summary: 'A 5-minute warmup sequence you can use every day.',
        content: [
          { kind: 'heading', text: 'Your daily warmup recipe' },
          { kind: 'paragraph', text: 'You now have all the pieces. Here is a sequence that takes 5 minutes and covers everything: relaxation, breath, onset, range, resonance.' },
          { kind: 'list', items: [
            '1 min — Neck rolls, jaw release, shoulder drops',
            '1 min — 4-count inhale / 8-count hiss × 5',
            '1 min — Lip trill glides low → high → low',
            '1 min — Humming 5-note scales, ascending by half steps',
            '1 min — Vowel slides on "AH", "OO", "EE"',
          ] },
          { kind: 'tip', text: 'Do this before every practice session and before every performance. Consistency beats intensity.' },
        ],
        xp: 25,
      },
    ],
  },

  // ── Pitch Accuracy Course ──
  {
    id: 'pitch-accuracy',
    title: 'Pitch Accuracy',
    description: 'Train your ear and voice to land dead-center on every note.',
    level: 'beginner',
    color: '#22c55e',
    icon: '🎯',
    lessons: [
      {
        id: 'pitch-1', courseId: 'pitch-accuracy', index: 0,
        title: 'What is "in tune"?',
        summary: 'Understand cents, equal temperament, and why perfect pitch is a myth.',
        content: [
          { kind: 'heading', text: 'The cent is the unit of pitch' },
          { kind: 'paragraph', text: 'A semitone (the distance between two adjacent piano keys) is divided into 100 cents. So an octave is 1200 cents. The human ear can typically detect deviations of 5–10 cents; trained musicians notice 2–3 cents.' },
          { kind: 'paragraph', text: 'MasterSinger measures your pitch in real time and tells you, in cents, how far you are from the nearest note. Within ±10 cents is "green". ±10 to ±25 is "yellow". Beyond ±25 is "red".' },
          { kind: 'tip', text: 'Do not chase absolute zero. A slight, animated pitch (vibrato) is more musical than a frozen, dead-center note.' },
        ],
        xp: 15,
      },
      {
        id: 'pitch-2', courseId: 'pitch-accuracy', index: 1,
        title: 'Drone Practice',
        summary: 'The most powerful drill: sing against a sustained reference tone.',
        content: [
          { kind: 'heading', text: 'Lock onto the drone' },
          { kind: 'paragraph', text: 'When you sing against a sustained reference tone (a drone), you can hear "beating" — a wobble in the sound — when your pitch does not match. As you approach the correct pitch, the beating slows; when you are exactly in tune, the beating disappears.' },
          { kind: 'paragraph', text: 'Open the Tuner, listen to the reference tone for a few seconds, then try to sing it. Watch the cents display. Adjust slowly. The goal is to feel what "zero cents" sounds like.' },
          { kind: 'audio', midi: 60, durationMs: 8000, label: 'A4 = 440 Hz reference' },
          { kind: 'tip', text: 'When the beating disappears, your body will feel a "lock" sensation. Memorize that feeling.' },
        ],
        xp: 20,
      },
      {
        id: 'pitch-3', courseId: 'pitch-accuracy', index: 2,
        title: 'Pitch Holds',
        summary: 'Sustaining a note in tune is harder than hitting it. Train stability.',
        content: [
          { kind: 'heading', text: 'Hold it steady' },
          { kind: 'paragraph', text: 'Many singers can hit a target note briefly but drift flat (or sharp) as they sustain it. This happens because breath support fades, or because the larynx slowly rises as air depletes.' },
          { kind: 'paragraph', text: 'In Practice, pick a Pitch Hold exercise. Sing the target note for the full duration. The accuracy meter shows your average deviation; the stability meter shows how much you wavered during the hold.' },
          { kind: 'tip', text: 'If you tend to drift flat, engage more breath support halfway through the note — not at the start.' },
        ],
        xp: 20,
      },
      {
        id: 'pitch-4', courseId: 'pitch-accuracy', index: 3,
        title: 'Interval Accuracy',
        summary: 'Land intervals dead-center. The skill behind every melody.',
        content: [
          { kind: 'heading', text: 'Intervals are melodies in miniature' },
          { kind: 'paragraph', text: 'Every melody is a sequence of intervals. If you can reliably sing a major third, a perfect fifth, an octave — you can reliably sing anything. The trick is to internalize the size of each interval.' },
          { kind: 'paragraph', text: 'In Practice → Interval Leap, the exercise plays the first note, then the target note. Sing the first, then leap to the target without sliding. The score rewards accuracy of the leap, not the slide.' },
          { kind: 'tip', text: 'Use song references: "Here Comes the Bride" opens with a perfect fourth. "Twinkle Twinkle" opens with a perfect fifth.' },
        ],
        xp: 20,
      },
      {
        id: 'pitch-5', courseId: 'pitch-accuracy', index: 4,
        title: 'Self-Correction',
        summary: 'Notice you are off — and fix it instantly.',
        content: [
          { kind: 'heading', text: 'The feedback loop' },
          { kind: 'paragraph', text: 'A skilled singer hears their own pitch in real time and corrects within milliseconds. This is not magic — it is a trained reflex. MasterSinger gives you the visual feedback you need to train it.' },
          { kind: 'paragraph', text: 'In any practice exercise, watch the cents meter. The moment you see yellow or red, nudge your pitch gently toward zero. Do not overcorrect — small, smooth adjustments.' },
          { kind: 'tip', text: 'The goal is not to never be off. The goal is to recover fast when you are.' },
        ],
        xp: 25,
      },
    ],
  },

  // ── Intervals Course ──
  {
    id: 'intervals',
    title: 'Intervals Deep Dive',
    description: 'Learn every interval by name, by sound, and by feel.',
    level: 'intermediate',
    color: '#7c3aed',
    icon: '📏',
    lessons: [
      {
        id: 'int-1', courseId: 'intervals', index: 0,
        title: 'Naming Intervals',
        summary: 'The grammar of melodic distance.',
        content: [
          { kind: 'heading', text: 'Quality + number' },
          { kind: 'paragraph', text: 'Every interval has a number (2nd, 3rd, 4th, 5th, 6th, 7th, 8th/octave) and a quality (major, minor, perfect, augmented, diminished). The number counts letters; the quality counts semitones.' },
          { kind: 'paragraph', text: 'Example: C to E is a 3rd (count C-D-E = 3 letters). It spans 4 semitones, so it is a major 3rd. C to Eb is also a 3rd (3 letters) but spans 3 semitones, so it is a minor 3rd.' },
          { kind: 'tip', text: 'Perfect intervals (4th, 5th, octave) cannot be major or minor — only perfect, augmented, or diminished.' },
        ],
        xp: 20,
      },
      {
        id: 'int-2', courseId: 'intervals', index: 1,
        title: 'Consonance vs Dissonance',
        summary: 'Why some intervals sound "restful" and others "tense".',
        content: [
          { kind: 'heading', text: 'The harmonic series decides' },
          { kind: 'paragraph', text: 'Consonant intervals (octave, 5th, 4th, major/minor 3rd and 6th) appear early in the harmonic series — they are mathematically simple ratios. Dissonant intervals (2nd, 7th, tritone) are complex ratios; the ear perceives them as tension that wants resolution.' },
          { kind: 'paragraph', text: 'Western music uses dissonance intentionally — to create motion. A melody that only used consonant intervals would feel static. The art is in the balance.' },
          { kind: 'tip', text: 'The tritone (3 whole steps) was historically called "the devil in music" — banned in medieval church music for its tension.' },
        ],
        xp: 20,
      },
      {
        id: 'int-3', courseId: 'intervals', index: 2,
        title: 'Memorizing Intervals with Songs',
        summary: 'Anchor each interval to a melody you already know.',
        content: [
          { kind: 'heading', text: 'Reference songs' },
          { kind: 'paragraph', text: 'The fastest way to internalize interval sizes is to attach a famous melody to each. When you need to sing a perfect fifth, recall the opening of "Twinkle Twinkle" — that is the sound of a fifth.' },
          { kind: 'list', items: [
            'Minor 2nd — "Jaws" theme',
            'Major 2nd — "Happy Birthday" (first 2 notes)',
            'Minor 3rd — "Greensleeves"',
            'Major 3rd — "When the Saints Go Marching In"',
            'Perfect 4th — "Here Comes the Bride"',
            'Tritone — "The Simpsons" theme',
            'Perfect 5th — "Twinkle Twinkle Little Star"',
            'Minor 6th — "The Entertainer"',
            'Major 6th — "My Bonnie Lies Over the Ocean"',
            'Minor 7th — "Star Trek" theme',
            'Major 7th — "Take On Me" (chorus)',
            'Octave — "Somewhere Over the Rainbow"',
          ] },
          { kind: 'tip', text: 'Use these references until you no longer need them. The interval becomes instinctive.' },
        ],
        xp: 25,
      },
      {
        id: 'int-4', courseId: 'intervals', index: 3,
        title: 'Singing Intervals Accurately',
        summary: 'From recognition to reproduction.',
        content: [
          { kind: 'heading', text: 'Pre-hear the target' },
          { kind: 'paragraph', text: 'Before you sing the target note, you must hear it in your head. This is called "audiation". If you cannot hear it internally, you will not sing it accurately.' },
          { kind: 'paragraph', text: 'Exercise: in Interval Leap practice, after the first note sounds but before the target sounds, try to sing the target. Then compare. If you missed, identify the direction (too high? too low?) and try again.' },
          { kind: 'tip', text: 'If you consistently miss an interval up but nail it down (or vice versa), practice the harder direction twice as much.' },
        ],
        xp: 25,
      },
    ],
  },

  // ── Scales Course ──
  {
    id: 'scales',
    title: 'Scales & Modes',
    description: 'Major, minor, modes, pentatonic — what they are and how to sing them.',
    level: 'intermediate',
    color: '#f59e0b',
    icon: '🪜',
    lessons: [
      {
        id: 'scl-1', courseId: 'scales', index: 0,
        title: 'The Major Scale',
        summary: 'The foundation of Western tonality.',
        content: [
          { kind: 'heading', text: 'Do-re-mi-fa-sol-la-ti-do' },
          { kind: 'paragraph', text: 'The major scale is a 7-note sequence with a specific pattern of whole and half steps: W-W-H-W-W-W-H. It sounds "happy" or "bright" to Western ears. Every other scale is described by how it differs from this one.' },
          { kind: 'paragraph', text: 'Practice singing the major scale in different keys. Use Scale Runner in Practice. Start with C major (all white keys on piano), then move to G, D, A, E — adding one sharp each time.' },
          { kind: 'tip', text: 'The half steps in a major scale are between 3-4 and 7-8. Listen for them — they are the "magnetic" notes that pull toward resolution.' },
        ],
        xp: 20,
      },
      {
        id: 'scl-2', courseId: 'scales', index: 1,
        title: 'The Three Minors',
        summary: 'Natural, harmonic, melodic — three flavors of minor.',
        content: [
          { kind: 'heading', text: 'Why three minors?' },
          { kind: 'paragraph', text: 'The natural minor (W-H-W-W-H-W-W) is the relative minor of a major scale. The harmonic minor raises the 7th to create a strong leading tone (and a V-i cadence). The melodic minor raises the 6th and 7th going up (for smoother melody) and reverts going down.' },
          { kind: 'paragraph', text: 'Each minor has a different emotional color: natural minor is mournful, harmonic minor is dramatic (slightly Eastern-sounding), melodic minor is smooth and jazzy.' },
          { kind: 'tip', text: 'The harmonic minor has an augmented 2nd between the 6th and 7th — that "exotic" three-semitone leap.' },
        ],
        xp: 25,
      },
      {
        id: 'scl-3', courseId: 'scales', index: 2,
        title: 'The Modes',
        summary: 'Seven scales hidden inside every major scale.',
        content: [
          { kind: 'heading', text: 'Same notes, different root' },
          { kind: 'paragraph', text: 'If you play the white keys of a piano from C to C, you get C major. From D to D, you get D Dorian. From E to E, E Phrygian. And so on: F Lydian, G Mixolydian, A Aeolian (= natural minor), B Locrian.' },
          { kind: 'paragraph', text: 'Each mode has a distinct emotional flavor. Dorian is "minor with a major 6th" — used in folk and jazz. Phrygian is "minor with a flat 2" — Spanish, exotic. Lydian is "major with a sharp 4" — dreamy, floating. Mixolydian is "major with a flat 7" — bluesy.' },
          { kind: 'tip', text: 'Memorize: "I Don\'t Particularly Like Modes A Lot" — Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian.' },
        ],
        xp: 30,
      },
      {
        id: 'scl-4', courseId: 'scales', index: 3,
        title: 'Pentatonic Scales',
        summary: 'Five notes that never sound wrong.',
        content: [
          { kind: 'heading', text: 'The "no wrong notes" scale' },
          { kind: 'paragraph', text: 'The major pentatonic (1-2-3-5-6) and minor pentatonic (1-3-4-5-7) omit the half-step intervals that create tension. This means almost any note in the scale sounds consonant against any chord in the key — they are the foundation of folk, blues, rock, and pop melodies.' },
          { kind: 'paragraph', text: 'Try singing a melody using only the 5 notes of C major pentatonic (C-D-E-G-A) over a C major chord. Notice how every note fits. This is why pentatonic is the perfect scale for improvisation beginners.' },
          { kind: 'tip', text: 'The black keys on a piano form an F# major pentatonic. Play any of them in any order — it always works.' },
        ],
        xp: 25,
      },
    ],
  },

  // ── Harmony Course ──
  {
    id: 'harmony',
    title: 'Harmony Functional',
    description: 'How chords work together to support your melody.',
    level: 'advanced',
    color: '#ef4444',
    icon: '🎼',
    lessons: [
      {
        id: 'harm-1', courseId: 'harmony', index: 0,
        title: 'Triads: The Building Blocks',
        summary: 'Major, minor, augmented, diminished — what they sound like.',
        content: [
          { kind: 'heading', text: 'Stacking thirds' },
          { kind: 'paragraph', text: 'A triad is three notes stacked in thirds: root, third, fifth. The quality of the third and fifth determines the chord: major third + perfect fifth = major triad. Minor third + perfect fifth = minor triad. Major third + augmented fifth = augmented. Minor third + diminished fifth = diminished.' },
          { kind: 'paragraph', text: 'Major sounds "happy". Minor sounds "sad". Augmented sounds "suspended/dreamy". Diminished sounds "tense/unstable".' },
          { kind: 'tip', text: 'In Ear Training, practice identifying these four qualities until they are instant.' },
        ],
        xp: 30,
      },
      {
        id: 'harm-2', courseId: 'harmony', index: 1,
        title: 'Diatonic Chords',
        summary: 'The 7 chords that naturally occur in any major key.',
        content: [
          { kind: 'heading', text: 'Roman numerals' },
          { kind: 'paragraph', text: 'In a major key, each scale degree gets a chord built on it. They are labeled with Roman numerals: I (major), ii (minor), iii (minor), IV (major), V (major), vi (minor), vii° (diminished). Upper case = major, lower case = minor, ° = diminished.' },
          { kind: 'paragraph', text: 'In C major: I=C, ii=Dm, iii=Em, IV=F, V=G, vi=Am, vii°=B°. Almost every pop song ever written uses some subset of these seven chords.' },
          { kind: 'tip', text: 'The vi chord (relative minor) is the most common destination after I — it shares two notes with I, so the move is smooth.' },
        ],
        xp: 35,
      },
      {
        id: 'harm-3', courseId: 'harmony', index: 2,
        title: 'The ii-V-I',
        summary: 'The most important progression in jazz and beyond.',
        content: [
          { kind: 'heading', text: 'Why ii-V-I works' },
          { kind: 'paragraph', text: 'The ii-V-I progression is the cornerstone of jazz harmony. It works because each chord shares two notes with the next, creating smooth voice-leading, and because the V chord creates tension (with its leading tone) that resolves to I.' },
          { kind: 'paragraph', text: 'In C major: Dm → G → C. Notice how the 7th of Dm (C) becomes the 4th of G (C) becomes the 3rd of C (E becomes... wait, C is the root). The point is: notes resolve by half-step, the strongest resolution.' },
          { kind: 'tip', text: 'If you can sing the root of each chord in a ii-V-I as it plays, you can navigate jazz tunes. Practice in Harmony → Sing the Fifth.' },
        ],
        xp: 35,
      },
      {
        id: 'harm-4', courseId: 'harmony', index: 3,
        title: 'Singing Harmony Parts',
        summary: 'Sing a third or fifth above the melody — the heart of backing vocals.',
        content: [
          { kind: 'heading', text: 'The third and the fifth' },
          { kind: 'paragraph', text: 'When you sing harmony, you are usually singing a chord tone that is not the melody. The two most common harmony parts are the third (which gives the chord its major/minor quality) and the fifth (which adds fullness without changing the quality).' },
          { kind: 'paragraph', text: 'Exercise: in Harmony → Sing the Third, the app plays a melody note. Your job is to sing the major or minor third above it. The pitch detector tells you if you are accurate. Start slow — this is a skill that takes time.' },
          { kind: 'tip', text: 'If the melody is on the root of the chord, sing the third. If the melody is on the third, sing the fifth. Avoid harmonizing with the fifth — the root works better.' },
        ],
        xp: 40,
      },
    ],
  },
];

export function getCourseById(id: string): Course | undefined {
  return COURSES.find(c => c.id === id);
}
