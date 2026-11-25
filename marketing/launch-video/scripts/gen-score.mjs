// Original 58 s score for the Markezly launch film. Fully synthesized and deterministic:
// no samples, no third-party audio. 120 BPM (1 beat = 0.5 s = 15 frames at 30 fps).
//
// Story map (seconds):
//   0–5    Hook: low drone, scattered data ticks thinning out, riser into 5.0
//   5      Brand impact. 5–10 warm Am(add9) pad swell
//   10–26  Product: soft half-time kick, pulsing bass, offbeat hats from 14
//   26–41  Build: four-on-the-floor, 8th bass, plucked arpeggio
//   41–49  Peak: claps on 2 & 4, riser 47–49
//   49     Final impact, half-time resolution, last chord rings out to 58
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const SR = 44100;
const DUR = 58;
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);
const OUT = resolve(process.argv[2] ?? join(process.cwd(), "public", "sfx"));
mkdirSync(OUT, { recursive: true });

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const BEAT = 0.5;
const TAU = Math.PI * 2;

// add(start, dur, fn(t, p) -> sample | [l, r], gainL, gainR)
const add = (start, dur, fn, pan = 0) => {
  const s0 = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  const gl = Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < n && s0 + i < N; i++) {
    if (s0 + i < 0) continue;
    const v = fn(i / SR, i / n);
    if (Array.isArray(v)) { L[s0 + i] += v[0]; R[s0 + i] += v[1]; }
    else { L[s0 + i] += v * gl; R[s0 + i] += v * gr; }
  }
};
const smooth = (x) => x * x * (3 - 2 * x);
const env = (t, a, len, rel) => Math.min(1, t / a) * Math.min(1, Math.max(0, (len - t) / rel));

// ---------- chords (pad voicings) ----------
const NOTE = { A1: 55, E2: 82.41, F2: 87.31, G2: 98, A2: 110, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, G4: 392, A4: 440, B4: 493.88, C5: 523.25, E5: 659.25 };
const CH = {
  Am: { pad: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.B4], arp: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.B4, NOTE.E4, NOTE.C4] },
  F: { pad: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.E4], arp: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.E4, NOTE.C4, NOTE.A3] },
  C: { pad: [NOTE.G3, NOTE.C4, NOTE.E4, NOTE.D4], arp: [NOTE.G3, NOTE.C4, NOTE.E4, NOTE.G4, NOTE.E4, NOTE.C4] },
  G: { pad: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.E4], arp: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4, NOTE.D4, NOTE.B3] },
};
// chord timeline: [start, end, chord]
const prog = [];
for (let t = 5, i = 0; t < 49; t += 4, i++) prog.push([t, Math.min(t + 4, 49), ["Am", "F", "C", "G"][i % 4]]);
prog.push([49, 53, "F"], [53, 58, "Am"]);
const chordAt = (t) => (prog.find(([a, b]) => t >= a && t < b) ?? [0, 0, "Am"])[2];

// ---------- 0–5 hook drone ----------
add(0, 5.2, (t) => {
  const e = smooth(Math.min(1, t / 1.8)) * Math.min(1, (5.2 - t) / 0.25);
  const wob = 1 + 0.004 * Math.sin(TAU * 0.3 * t);
  const v = Math.sin(TAU * NOTE.A1 * t) * 0.55 + Math.sin(TAU * NOTE.E2 * wob * t) * 0.25 + Math.sin(TAU * NOTE.A2 * t) * 0.12;
  return v * e * 0.32;
});
// scattered data ticks, thinning out as fragments converge (0.4–3.6 s)
for (let k = 0; k < 26; k++) {
  const t0 = 0.4 + Math.pow(k / 26, 1.4) * 3.2 + rnd() * 0.05;
  const f = 1800 + ((k * 337) % 900);
  add(t0, 0.06, (t, p) => Math.sin(TAU * f * t) * Math.exp(-p * 9) * 0.05, ((k * 0.37) % 1.6) - 0.8);
}
// riser 3.2–5.0 (filtered noise + rising tone)
{ let lp = 0; add(3.2, 1.8, (t, p) => { lp += (0.02 + 0.3 * p * p) * (rnd() - lp); return lp * p * p * 0.5 + Math.sin(TAU * (220 + 660 * p * p) * t) * p * p * 0.05; }); }

// ---------- impacts ----------
const impact = (t0, gain = 1) => {
  add(t0, 2.2, (t, p) => { const f = 58 - 22 * Math.min(1, t * 2.5); return Math.sin(TAU * f * t) * Math.exp(-t * 2.2) * 0.9 * gain; });
  let lp = 0; add(t0, 0.5, (t, p) => { lp += 0.25 * (rnd() - lp); return lp * Math.exp(-p * 5) * 0.55 * gain; });
  // shimmer tail
  add(t0, 3, (t) => [NOTE.E5, NOTE.A4 * 2, NOTE.B4 * 2].reduce((s, f, i) => s + Math.sin(TAU * f * t + i) * 0.03, 0) * Math.exp(-t * 1.3) * smooth(Math.min(1, t * 8)) * gain, 0);
};
impact(5);
impact(49, 1.1);

// ---------- pad 5–58 ----------
for (const [a, b, name] of prog) {
  const ch = CH[name];
  const len = b - a + 1.2; // overlap tail
  const last = b >= 58;
  add(a, last ? DUR - a : len, (t) => {
    const swell = a === 5 ? smooth(Math.min(1, t / 3)) : smooth(Math.min(1, t / 0.6));
    const tail = last ? Math.min(1, (DUR - a - t) / 4.5) : Math.min(1, Math.max(0, (len - t) / 1.2));
    const build = a >= 26 && a < 49 ? 0.85 : 1;
    let l = 0, r = 0;
    ch.pad.forEach((f, i) => {
      l += Math.sin(TAU * f * 0.9985 * t + i) + 0.18 * Math.sin(TAU * f * 2 * t);
      r += Math.sin(TAU * f * 1.0015 * t + i * 1.7) + 0.18 * Math.sin(TAU * f * 2.003 * t);
    });
    const trem = 1 - 0.12 * (0.5 + 0.5 * Math.sin(TAU * 0.25 * t));
    const g = 0.034 * swell * tail * trem * build;
    return [l * g, r * g];
  });
}

// ---------- drums ----------
const kick = (t0, g = 1) => add(t0, 0.32, (t, p) => Math.sin(TAU * (130 - 85 * Math.min(1, t * 10)) * t) * Math.exp(-p * 6.5) * 0.8 * g);
const hat = (t0, g = 1, pan = 0.25) => { let hp = 0, prev = 0; add(t0, 0.05, (t, p) => { const n = rnd(); hp = n - prev; prev = n; return hp * Math.exp(-p * 9) * 0.07 * g; }, pan); };
const clap = (t0) => { let lp = 0; for (const d of [0, 0.011, 0.023]) add(t0 + d, 0.16, (t, p) => { lp += 0.5 * (rnd() - lp); return lp * Math.exp(-p * 7) * 0.16; }, -0.1); };

for (let t = 10; t < 26; t += BEAT * 2) kick(t, 0.7);            // half time
for (let t = 14 + BEAT / 2; t < 26; t += BEAT) hat(t, 0.7);
for (let t = 26; t < 49; t += BEAT) kick(t, t < 41 ? 0.8 : 0.95); // four on the floor
for (let t = 26 + BEAT / 2; t < 49; t += BEAT) hat(t, 1);
for (let t = 26.25; t < 49; t += BEAT) hat(t, 0.45, -0.3);        // 16th shimmer
for (let t = 41 + BEAT; t < 49; t += BEAT * 2) clap(t);
for (let t = 49; t < 55; t += BEAT * 2) kick(t, 0.75);           // half-time finale
kick(55, 0.9);

// ---------- bass ----------
const bass = (t0, f, dur, g = 1) => add(t0, dur, (t, p) => {
  const e = Math.min(1, t * 120) * Math.exp(-p * 3);
  return (Math.sin(TAU * f * t) + Math.sin(TAU * f * 2 * t) * 0.22) * e * 0.26 * g;
});
const rootOf = (name) => ({ Am: 55, F: 43.65, C: 65.41, G: 49 })[name];
for (let t = 10; t < 26; t += BEAT) bass(t, rootOf(chordAt(t)), 0.42, 0.75);
for (let t = 26; t < 49; t += BEAT / 2) bass(t, rootOf(chordAt(t)) * ((Math.round(t * 4) % 8) === 6 ? 1.5 : 1), 0.22, 0.85);
bass(49, 43.65, 3.8, 1.1);
bass(53, 55, 4.8, 1.1);

// ---------- plucked arpeggio 26–49 with ping-pong delay ----------
const pluck = (t0, f, g, pan) => add(t0, 0.6, (t, p) => (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2 * t) + 0.1 * Math.sin(TAU * f * 3 * t)) * Math.exp(-t * 7) * Math.min(1, t * 400) * g, pan);
for (let t = 26, i = 0; t < 49; t += BEAT / 2, i++) {
  const ch = CH[chordAt(t)];
  const f = ch.arp[i % ch.arp.length] * 2;
  const g = 0.035 + 0.02 * ((t - 26) / 23);
  pluck(t, f, g, -0.35);
  pluck(t + 0.375, f, g * 0.45, 0.45);   // dotted-8th echo
  pluck(t + 0.75, f, g * 0.2, -0.45);
}
// final logo ping at 55
pluck(55, NOTE.E5, 0.09, 0); pluck(55.375, NOTE.E5, 0.04, 0.4); pluck(55.75, NOTE.E5, 0.02, -0.4);

// riser into the finale 47–49
{ let lp = 0; add(47, 2, (t, p) => { lp += (0.02 + 0.35 * p * p) * (rnd() - lp); return lp * p * p * 0.55; }); }

// ---------- simple stereo reverb (Schroeder combs + allpass) ----------
const reverb = (src, delaysMs, mix) => {
  const out = new Float32Array(N);
  for (const ms of delaysMs) {
    const d = Math.floor((ms / 1000) * SR); const buf = new Float32Array(d); let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) { const y = buf[idx]; lp = y * 0.6 + lp * 0.4; buf[idx] = src[i] + lp * 0.78; idx = (idx + 1) % d; out[i] += y / delaysMs.length; }
  }
  for (const ms of [5.0, 1.7]) { const d = Math.floor((ms / 1000) * SR); const buf = new Float32Array(d); let idx = 0;
    for (let i = 0; i < N; i++) { const b = buf[idx]; const y = -out[i] * 0.5 + b; buf[idx] = out[i] + b * 0.5; out[i] = y; idx = (idx + 1) % d; } }
  for (let i = 0; i < N; i++) src[i] = src[i] * (1 - mix * 0.4) + out[i] * mix;
};
reverb(L, [29.7, 37.1, 41.1, 43.7], 0.32);
reverb(R, [30.9, 35.3, 40.3, 44.9], 0.32);

// ---------- master: gentle saturation, fade, normalize to -1 dBFS ----------
let peak = 0;
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, i / (SR * 0.05)) * Math.min(1, (N - i) / (SR * 0.5));
  L[i] = Math.tanh(L[i] * 1.2) * fade; R[i] = Math.tanh(R[i] * 1.2) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = 0.891 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
}
writeFileSync(join(OUT, "score.wav"), buf);
console.log("score.wav written:", DUR, "s, pre-normalize peak", peak.toFixed(2));
