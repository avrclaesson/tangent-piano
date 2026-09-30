# Tangent – Spec

## Goal
A PWA for iPhone that listens to me play piano through the phone's microphone and tells me, note by note, whether I played the right note at the right time. Falling-notes view, a bit like Guitar Hero. Inspired by OKTAV's Falling Notes mode. For my own use.

## Users and devices
- One user (me), beginner/re-starter pianist, reading Swedish music books
- iPhone, Safari, installed to the home screen
- Acoustic piano or keyboard, heard through the phone mic
- Optional wired headphones (no built-in mic). Web MIDI is not available on iPhone Safari, so no MIDI input.

## Beta 1 (built)
### Input
- Mic via getUserMedia with echo cancellation, noise suppression and auto gain off
- Monophonic: one note at a time (right-hand melodies)
- Pitch: YIN on 2048-sample frames, ~60 per second, confidence > 0.8
- Onset: energy jump above the recent floor (rising, ×1.4), 90 ms refractory. Pitch is read 25–220 ms after the attack; two agreeing readings resolve the note.
- Legato: a new stable pitch (3 frames) without an energy jump also counts as a new note
- On-screen keys and computer keys (A–K = C4–C5) as a fallback for testing without a piano

### Modes
- **Play along**: notes fall to a hit line in time with a metronome and a one-bar count-in
  - Perfect: within ±80 ms
  - Early / Late: within ±250 ms
  - Missed: no correct note in the window
  - Wrong: a different note played in the window
- **Wait for me**: the song stops at each note until the right key is played; timing isn't graded

### Practice tools
- Tempo 40–160 bpm per song (remembered)
- Loop a bar range
- Optional melody playback (headphones recommended)
- "Allow octave slips": accept the right note name in any octave
- Note names on falling notes; Swedish names option (B shown as H)
- Mic sensitivity (1–10) and a noise-floor measurement
- Timing calibration: 4 count clicks + 8 clicks at 80 bpm; median offset between click and heard onset is stored as the mic delay

### Results
- Score (100 perfect, 60 early/late, streak bonus), hit %, on-time %, best streak
- Counts per grade and a per-note colour strip
- Best score saved per song and mode (localStorage)

### Songs (public domain)
- C major scale, Twinkle Twinkle, Ode to Joy (16 bars)

### Platform
- Single index.html (inline CSS/JS), manifest, service worker (cache-first app shell), icons
- Works offline after first load
- Must be served over HTTPS for the mic (GitHub Pages)

## Look
Dark "piano case" theme: mahogany ground, ivory keys, brass accent. Gloock for display, Figtree for UI. Portrait, one screen, thumb-reach controls.

## Out of scope for beta 1
- Chords and two hands
- Loading your own song files
- Sheet-music view
- Accounts, sync, sharing

## Known risks
- A real piano in a real room is messier than the synthetic tests: expect to tune the sensitivity and onset thresholds
- Headset mics (EarPods) replace the phone mic
- Bluetooth headphones add latency: recalibrate when switching
