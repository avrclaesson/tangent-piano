# Tangent – Plan

## Done
- [x] Scope and decisions (see SPEC.md)
- [x] Pitch + onset detector (src/detect.js) with Node tests on synthetic piano, incl. repeated and overlapping notes
- [x] App: falling notes, Play along + Wait for me, grading, metronome, count-in, tempo, loop, settings, calibration, results
- [x] PWA packaging: manifest, service worker, icons (build.py → dist/app)
- [x] Headless browser test: layout at 390 px, no horizontal scroll, grading verified with scripted key presses

## Next
1. [ ] Publish on GitHub Pages (public repo `tangent`, serve dist/app, HTTPS)
2. [ ] Test on my iPhone with my real piano
   - Calibrate, then play the C major scale in Wait for me mode
   - Note what's missed, doubled or heard wrong, and at which sensitivity
3. [ ] Tune detection from real-world results
   - Consider recording a short real-piano clip and adding it to the tests
   - Adjust onset ratio, gate and pitch confidence
4. [ ] Small polish
   - Short first-run guide (Listen → Calibrate → Play)
   - Show the app version in Settings so I can tell when an update has loaded

## Beta 2 ideas
- Load my own MIDI / MusicXML files (e.g. Ida's Sommarvisa from a file I own)
- Chords / two hands (likely needs an ML model such as Spotify's Basic Pitch)
- Sheet-music view alongside falling notes
- Practice history over days

## How to work on it
- Edit src/app.html and src/detect.js, never dist/ directly
- `node test/detect.test.js` after any detector change
- `python3 build.py` to rebuild dist/app (needs Pillow)
