// Synthetic piano test for the detector: repeated notes, noise, octave-tricky tones.
const { yin, createDetector } = require('../src/detect.js');
const sr = 48000;

function pianoNote(out, start, midi, dur, amp = 0.3) {
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const s0 = Math.floor(start * sr), n = Math.floor((dur + 0.05) * sr);
  const B = 0.0004; // inharmonicity
  const partAmp = [1, 0.7, 0.45, 0.3, 0.2, 0.12, 0.08];
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / sr;
    let env = Math.exp(-t * 2.2) * Math.min(1, t / 0.004);
    if (t > dur) env *= Math.exp(-(t - dur) * 60); // damper
    let v = 0;
    partAmp.forEach((a, k) => {
      const h = k + 1, fk = f * h * Math.sqrt(1 + B * h * h);
      v += a * Math.exp(-t * (1 + k * 0.8)) * Math.sin(2 * Math.PI * fk * t);
    });
    if (t < 0.012) v += (Math.random() * 2 - 1) * 1.5 * (1 - t / 0.012); // hammer thump
    out[s0 + i] += amp * env * v;
  }
}

function run(label, notes, bpm, noise = 0.002) {
  const spb = 60 / bpm, lead = 0.5;
  const total = lead + notes.reduce((a, n) => a + n[1], 0) * spb + 1;
  const buf = new Float32Array(Math.ceil(total * sr));
  for (let i = 0; i < buf.length; i++) buf[i] = (Math.random() * 2 - 1) * noise;
  let beat = 0; const expected = [];
  for (const [m, d] of notes) {
    const t = lead + beat * spb + (Math.random() - 0.5) * 0.04;
    pianoNote(buf, t, m, d * spb * (global.LEGATO || 0.92));
    expected.push({ t, midi: m });
    beat += d;
  }
  const det = createDetector();
  const hop = 800, got = [];
  for (let end = 2048; end < buf.length; end += hop) {
    const frame = buf.subarray(end - 2048, end);
    const r = det.process(frame, end / sr, sr, 0.008);
    got.push(...r.events);
  }
  // Match
  let ok = 0, wrongPitch = 0, lat = [];
  const used = new Set();
  for (const e of expected) {
    const cand = got.find((g, i) => !used.has(i) && Math.abs(g.t - e.t) < 0.15);
    if (!cand) continue;
    used.add(got.indexOf(cand));
    if (cand.midi === e.midi) { ok++; lat.push(cand.t - e.t); } else wrongPitch++;
  }
  const extra = got.length - used.size;
  lat.sort((a, b) => a - b);
  console.log(`${label}: ${ok}/${expected.length} right, ${wrongPitch} wrong pitch, ${expected.length - ok - wrongPitch} missed, ${extra} extra; median onset delay ${(lat[lat.length >> 1] * 1000 || 0).toFixed(0)} ms`);
}

// yin sanity
for (const m of [55, 60, 64, 67, 72, 76]) {
  const x = new Float32Array(2048); const b = new Float32Array(2048 + 48000);
  pianoNote(b, 0, m, 1);
  const r = yin(b.subarray(4800, 4800 + 2048), sr);
  console.log('yin', m, r && r.midi.toFixed(2), r && r.conf.toFixed(2));
}

const tw = [[60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2],[65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2]];
run('Twinkle 90bpm', tw, 90);
run('Twinkle 140bpm', tw, 140);
const ode = [[64,1],[64,1],[65,1],[67,1],[67,1],[65,1],[64,1],[62,1],[60,1],[60,1],[62,1],[64,1],[64,1.5],[62,.5],[62,2],[62,1],[64,.5],[65,.5],[64,1],[60,1],[60,1],[62,1],[55,2]];
run('Ode 100bpm', ode, 100);
run('Ode 100bpm noisy room', ode, 100, 0.006);
global.LEGATO = 1.15;
run('Ode legato (overlapping notes)', ode, 100);
run('Twinkle legato', tw, 90);
