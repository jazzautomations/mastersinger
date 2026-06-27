# 🎤 MasterSinger

> Sing in tune. Master your voice.

Vocal training app with real-time pitch detection, MIDI studio, gamified practice, ear training, theory, harmony, and a full vocal academy. Free tier + Pro subscription (R$54,90/mês or R$347/ano). Auth + payments via Supabase + Asaas.

🌐 **Live:** https://mastersinger.vercel.app
🏗️ **Architecture:** Vite 6 + React 19 + TypeScript + Tailwind CSS 4 — SPA with Supabase auth + Asaas payments
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

### 📼 Melody Studio (MIDI Editor)
- **Record** your voice — YIN converts the audio stream into editable `Note[]`
- **Piano roll editor** with select / draw / erase tools
- **Quantize** toggle (1/4 note grid)
- **Export** as `.mid` file
- Audio playback of the edited melody

### 🎓 Academy
Five structured courses with multiple lessons each:
- 🔥 Vocal Warmup (8 lessons)
- 🎯 Pitch Accuracy (5 lessons)
- 📏 Intervals Deep Dive (4 lessons)
- 🪜 Scales & Modes (4 lessons)
- 🎼 Harmony Functional (4 lessons)

### 🏆 Gamification
- **XP** per exercise (10–50 XP, scaled by accuracy)
- **Levels 1–100** with titles: Aprendiz → Coralista → Solista → Vocalista → Primeira Voz → Maestro → Virtuoso → Lenda
- **Streaks** with weekly freeze (1 free freeze/week)
- **Leagues** based on weekly XP

### 🌍 Bilingual
- 🇧🇷 Português (default)
- 🇺🇸 English

### ☁️ Optional Supabase sync
- Optional profile + melody sync for users who want cloud persistence
- Falls back to local-only storage if env vars are missing
- Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- SQL schema lives in `supabase-schema.sql`

---

## 🚀 Quick Start

```bash
npm install
npm run dev
npm test
npm run build
```

---

## 🏗️ Tech Stack

| Layer | Choice |
|---|---|
| Framework | Vite 6 + React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| State | React Context + localStorage + optional Supabase |
| Audio analysis | Web Audio API + custom YIN |
| MIDI export | Custom pure-TS MIDI writer |
| Tests | Vitest + jsdom + Testing Library |

---

## 📁 Project Structure

- `services/supabase.ts` — tiny Supabase client wrapper
- `supabase-schema.sql` — profiles table + RLS policies
- `store/store.tsx` — local state with optional cloud sync
- `components/Settings.tsx` — Supabase connection controls

---

## 🎯 Roadmap (Post-MVP)

- 🤖 AI coach (LLM feedback on technique)
- 🎵 Backing tracks (sing over real songs)
- 🔐 Optional login + cross-device sync
