// ---- Pitch + onset detection (pure; no DOM, no Web Audio) ----
// yin(): YIN pitch estimate for one frame of samples.
// createDetector(): turns a stream of analyser frames into note events {t, midi}.

function yin(x, sr, work) {
  const tauMin = Math.max(2, Math.floor(sr / 1100));
  const tauMax = Math.min(Math.floor(sr / 70), x.length >> 1);
  const W = x.length - tauMax;
  const d = work && work.length > tauMax + 1 ? work : new Float32Array(tauMax + 2);
  let run = 0;
  d[0] = 1;
  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) { const v = x[i] - x[i + tau]; s += v * v; }
    run += s;
    d[tau] = run > 0 ? (s * tau) / run : 1;
  }
  let best = -1;
  for (let tau = tauMin; tau < tauMax; tau++) {
    if (d[tau] < 0.15) {
      while (tau + 1 < tauMax && d[tau + 1] < d[tau]) tau++;
      best = tau;
      break;
    }
  }
  if (best < 1) return null;
  const s0 = d[best - 1], s1 = d[best], s2 = d[best + 1];
  const den = 2 * (s0 - 2 * s1 + s2);
  const shift = den !== 0 ? (s0 - s2) / den : 0;
  const freq = sr / (best + (Math.abs(shift) < 1 ? shift : 0));
  return { freq, midi: 69 + 12 * Math.log2(freq / 440), conf: 1 - s1 };
}

function createDetector() {
  const st = {
    hist: [], lastOnset: -1, pending: null,
    stableMidi: null, stableCount: 0, lastEventMidi: null,
    work: null,
  };
  function modeOf(arr) {
    const c = {}; let best = arr[0], n = 0;
    for (const v of arr) { c[v] = (c[v] || 0) + 1; if (c[v] > n) { n = c[v]; best = v; } }
    return best;
  }
  // buf: latest samples (length 2048). now: clock time of the newest sample (s).
  // gate: RMS level that counts as sound. Returns what happened this frame.
  function process(buf, now, sr, gate) {
    const out = { rms: 0, pitch: null, events: [], onsets: [] };
    if (!st.work) st.work = new Float32Array((buf.length >> 1) + 4);
    const half = buf.length >> 1;
    let s = 0;
    for (let i = half; i < buf.length; i++) s += buf[i] * buf[i];
    const rms = Math.sqrt(s / half);
    out.rms = rms;
    st.hist.push(rms);
    if (st.hist.length > 8) st.hist.shift();

    let pitch = null;
    if (rms > gate) {
      const r = yin(buf, sr, st.work);
      if (r && r.conf > 0.8 && r.midi > 20 && r.midi < 110) pitch = r;
    }
    out.pitch = pitch;

    const emit = (t, midi) => { st.lastEventMidi = midi; out.events.push({ t, midi }); };
    const resolve = () => {
      const p = st.pending; st.pending = null;
      if (p && p.readings.length) emit(p.t, modeOf(p.readings));
    };

    // Energy onset: a jump above the quietest recent frame.
    const H = st.hist, L0 = H.length;
    const recent = H.slice(Math.max(0, L0 - 4), L0 - 1);
    const floor = recent.length ? Math.min(...recent) : Infinity;
    const rising = L0 >= 2 && rms > H[L0 - 2] * 1.15;
    if (rms > gate && rising && rms > floor * 1.4 + gate * 0.2 && now - st.lastOnset > 0.09) {
      if (st.pending) resolve();
      st.lastOnset = now;
      st.pending = { t: now, readings: [] };
      out.onsets.push(now);
    }

    // Collect pitch readings after the noisy attack.
    if (st.pending) {
      const age = now - st.pending.t;
      if (pitch && age >= 0.025) st.pending.readings.push(Math.round(pitch.midi));
      const r = st.pending.readings, L = r.length;
      if ((L >= 2 && r[L - 1] === r[L - 2]) || age > 0.22) resolve();
    }

    // Legato: pitch changes to a new stable note without a clear energy jump.
    if (pitch) {
      const m = Math.round(pitch.midi);
      if (m === st.stableMidi) st.stableCount++; else { st.stableMidi = m; st.stableCount = 1; }
      if (st.stableCount === 3 && !st.pending && st.lastEventMidi != null &&
          m !== st.lastEventMidi && (m - st.lastEventMidi) % 12 !== 0 && now - st.lastOnset > 0.15) {
        st.lastOnset = now;
        emit(now - 0.05, m);
      }
    } else {
      st.stableMidi = null; st.stableCount = 0;
    }
    if (rms <= gate) st.lastEventMidi = null;
    return out;
  }
  return { process };
}

if (typeof module !== 'undefined') module.exports = { yin, createDetector };
