# 🎤 MasterSinger

> Sing in tune. Master your voice.

The coolest free web app to learn singing — real-time pitch detection, an editable MIDI melody studio, gamified practice for scales/arpeggios/intervals, ear training, theory, harmony, and a full vocal academy. No login, no payment, no backend. Everything runs in your browser.

🌐 **Live:** Coming soon on Vercel
🏗️ **Architecture:** Vite 6 + React 19 + TypeScript + Tailwind CSS 4 — 100% static SPA
🔒 **Privacy-first:** Microphone audio is analyzed locally and never recorded or sent anywhere
🎓 **Levels:** Beginner → Intermediate → Advanced (defaults to Intermediate)

---

## ✨ Features

### 🎙️ Real-time Pitch Detection
- **YIN algorithm** in pure TypeScript (~20ms latency, ~90% accuracy on vocals)
- Live note name, frequency, cents deviation, and confidence display
- Pitch history oscilloscope with green/amber/red zones
- Sub-cent precision via parabolic interpolation

### 🎯 Tuner Mode
- Full-screen pitch meter with needle gauge (-50 to +50 cents)
- Live waveform + history visualization
- Detects sustained dead-center notes (±2 cents for 3s) and awards the "Dead Center" badge

### 💪 Practice Engine
Four plug-and-play exercise types:
- **Scale Runner** — sing scales up and down in tempo
- **Arpeggio Drill** — arpeggiate triads, 7ths, dim, aug
- **Interval Leap** — land intervals dead-center
- **Pitch Hold** — sustain a note within ±10 cents

Library: 7 scales × 12 keys, 9 arpeggio types, 15 intervals, full chromatic. All in 3 levels (beginner, intermediate, advanced).

Scoring combines pitch accuracy (50%), stability (30%), and timing (20%) → 0–100% score with XP.

### 📼 Melody Studio (MIDI Editor)
- **Record** your voice — YIN converts the audio stream into editable `Note[]`
- **Piano roll editor** with select / draw / erase tools
- Color-coded notes by pitch accuracy (green/amber/red)
- **Quantize** toggle (1/4 note grid)
- **Export** as `.mid` file (pure TS MIDI writer — no native deps)
- Drag notes up/down to fix mis-detected pitches
- Audio playback of the edited melody

### 👂 Ear Training
- **Melodic intervals** — ascending/descending
- **Harmonic intervals** — simultaneous notes
- **Scale identification** — major, minor, modes, pentatonic, blues
- **Chord identification** — major, minor, aug, dim, sus4, maj7, dom7, m7
- Streak counter rewards consecutive correct answers

### 📚 Theory
Interactive lessons covering:
- **Notes & Pitch** — 12-tone system, A4=440Hz reference, octave math
- **Intervals** — every interval with audio playback
- **Scales & Modes** — all 14 scales with key/scale selector and playback
- **Rhythm & Meter** — note values, time signatures, BPM
- **Key Signatures** — full circle of keys

### 🎼 Harmony
- **Triads Explorer** — build any chord type on any root, hear it
- **Common Progressions** — I-IV-V, I-V-vi-IV, ii-V-I, etc., with playback
- **Sing the Third** — sing a major third above a root note (with real-time pitch feedback)
- **Sing the Fifth** — same, for perfect fifths

### 🎓 Academy
Five structured courses with multiple lessons each:
- 🔥 Vocal Warmup (8 lessons)
- 🎯 Pitch Accuracy (5 lessons)
- 📏 Intervals Deep Dive (4 lessons)
- 🪜 Scales & Modes (4 lessons)
- 🎼 Harmony Functional (4 lessons)

Every lesson has rich content (paragraphs, headings, tips, audio examples, lists) and grants XP on completion.

### 🏆 Gamification
- **XP** per exercise (10–50 XP, scaled by accuracy)
- **Levels 1–100** with titles: Aprendiz → Coralista → Solista → Vocalista → Primeira Voz → Maestro → Virtuoso → Lenda
- **Streaks** with weekly freeze (1 free freeze/week)
- **25+ badges** — first-time achievements, streaks, accuracy, range, ear training, course completion
- **Leagues** (Bronze → Silver → Gold → Platinum → Diamond) based on weekly XP
- **Daily Challenge** — 3 mixed exercises for bonus XP

### 🌍 Bilingual
- 🇧🇷 Português (default)
- 🇺🇸 English
- Toggle in settings, or pick during onboarding

### 📱 PWA
- Installable on mobile/desktop
- Dark mode default, mobile-first responsive

---

## 🚀 Quick Start

```bash
npm install
npm run dev      # dev server at http://localhost:3000
npm test         # run 82 unit tests
npm run build    # production build to dist/
npm run preview  # preview the production build
```

Requires Node 18+.

---

## 🏗️ Tech Stack

| Layer            | Choice                                |
|------------------|---------------------------------------|
| Framework        | Vite 6 + React 19                     |
| Language         | TypeScript 5                          |
| Styling          | Tailwind CSS 4 (custom dark theme)    |
| Audio analysis   | Web Audio API + custom YIN            |
| Audio synthesis  | Tone.js (drone playback, ear training)|
| MIDI export      | Custom pure-TS MIDI writer            |
| State            | React Context + localStorage          |
| Fonts            | Inter, Bricolage Grotesque, JetBrains Mono |
| Tests            | Vitest + jsdom + Testing Library      |
| Deploy           | Vercel (static SPA)                   |

---

## 🎨 Design

**Identity:** Deep studio black with violet → cyan neon accents. Vibe of a stage / Ableton / Splice dashboard.

**Typography:**
- `Bricolage Grotesque` — display headings
- `Inter` — UI body
- `JetBrains Mono` — notes, frequencies, XP numbers

**Color tokens** (remap Tailwind slate/blue → studio theme):
- Surfaces: `#050510` → `#f4f4fc` (warm charcoal → near-white)
- Primary: violet `#7c3aed` → cyan `#06b6d4` gradient
- Pitch-good `#22c55e`, pitch-warn `#f59e0b`, pitch-bad `#ef4444`

---

## 📁 Project Structure

```
mastersinger/
├── App.tsx                  # Root component, view router, bottom nav
├── index.tsx                # Entry point with ErrorBoundary
├── index.css                # Tailwind 4 theme + design tokens
├── index.html               # HTML shell with manifest + fonts
├── types.ts                 # Domain types (Note, Exercise, etc.)
├── vercel.json              # SPA rewrites + asset cache headers
├── vite.config.ts           # Vite + Vitest config
├── tsconfig.json
├── audio/
│   ├── yin.ts               # YIN pitch detection (pure TS)
│   └── usePitchDetection.ts # React hook wrapping getUserMedia + YIN
├── services/
│   ├── theoryService.ts     # Notes, scales, intervals, chords, dates
│   ├── audioService.ts      # Tone.js wrapper (playNote, playChord, etc.)
│   ├── midiService.ts       # Frames→Notes, Notes→MIDI file blob
│   └── scoringService.ts    # Exercise scoring (accuracy/stability/timing)
├── store/
│   └── store.tsx            # React Context store + localStorage persistence
├── i18n/
│   └── strings.ts           # PT-BR + EN dictionaries
├── data/
│   ├── exercises.ts         # 30+ practice exercises
│   ├── earQuestions.ts      # Generators for ear training
│   ├── courses.ts           # 5 Academy courses
│   └── badges.ts            # 25+ badges
├── components/
│   ├── Onboarding.tsx       # 4-step first-run flow
│   ├── Home.tsx             # Dashboard with streak/level/daily/courses
│   ├── Tuner.tsx            # Real-time pitch tuner
│   ├── Practice.tsx         # Exercise engine
│   ├── MelodyStudio.tsx     # Record → edit → export MIDI
│   ├── EarTraining.tsx      # Identify what you hear
│   ├── Theory.tsx           # Interactive theory lessons
│   ├── Harmony.tsx          # Chords + progressions + sing parts
│   ├── Academy.tsx          # Course + lesson browser
│   ├── Progress.tsx         # Stats, range, badges
│   └── Settings.tsx         # Lang, A4, level, data export/import
└── tests/                   # 82 unit tests
    ├── yin.test.ts
    ├── theoryService.test.ts
    ├── midiService.test.ts
    ├── scoringService.test.ts
    ├── exercises.test.ts
    ├── earQuestions.test.ts
    ├── data.test.ts
    └── i18n.test.ts
```

---

## 🔬 YIN Pitch Detection

The YIN algorithm (de Cheveigné & Kawahara, 2002) is implemented in `audio/yin.ts`. It improves on autocorrelation by:

1. Using the **cumulative mean normalized difference function** instead of raw autocorrelation — eliminates octave errors
2. **Absolute threshold** step finds the first dip below 0.12 (configurable)
3. **Parabolic interpolation** around the chosen dip gives sub-sample precision

Performance: ~20ms latency on modern hardware, ~90% accuracy on sustained vocals. Confidence metric (0–1) gates unreliable frames.

If accuracy on high female registers proves insufficient in production, an opt-in TensorFlow.js CREPE model can be plugged in as a fallback — but YIN handles the MVP comfortably.

---

## 🎯 Roadmap (Post-MVP)

- 🤖 AI coach (LLM feedback on technique)
- 🎵 Backing tracks (sing over real songs)
- 🎻 Vibrato analysis
- 🔗 Shareable melody URLs (encoded in hash, no backend)
- 📈 Long-term pitch accuracy analytics
- 🔐 Optional login + cross-device sync (phase 2)

---

## 📜 License

MIT — free for everyone, forever.

---

## 🙏 Acknowledgments

Built by [Jazz Automations](https://github.com/jazzautomations). Same architecture as [Guitar Master](https://github.com/jazzautomations/violaomaster-english) — free, static, no login, no backend.
