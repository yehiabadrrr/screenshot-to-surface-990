// Deterministic SFX kit for the launch film (16-bit mono WAV). Based on the
// remotion-motion-graphics skill's synthesizer, extended with UI sounds.
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const SR = 44100;
const OUT = resolve(process.argv[2] ?? join(process.cwd(), "public", "sfx"));
mkdirSync(OUT, { recursive: true });
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const TAU = Math.PI * 2;

function wav(name, samples) {
  let peak = 0; for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const g = peak > 0.95 ? 0.95 / peak : 1;
  const n = samples.length; const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i] * g)) * 32767), 44 + i * 2);
  writeFileSync(join(OUT, name), buf);
}
const make = (secs, fn) => { const n = Math.round(secs * SR); const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = fn(i / SR, i / n); return o; };

// whoosh: band-swept noise, swell then die
{ let lp = 0, lp2 = 0; wav("whoosh.wav", make(0.55, (t, p) => {
  const e = Math.sin(Math.PI * Math.pow(p, 0.65)) ** 2; const c = 0.03 + 0.22 * Math.sin(Math.PI * p);
  lp += c * (rnd() - lp); lp2 += c * (lp - lp2); return (lp - lp2 * 0.6) * e * 1.6; })); }
// soft UI click: short filtered transient + tiny tone
{ let lp = 0; wav("click.wav", make(0.06, (t, p) => { lp += 0.5 * (rnd() - lp); return (lp * 0.5 + Math.sin(TAU * 2400 * t) * 0.3) * Math.exp(-p * 14); })); }
// typing tick: very small blip
wav("tick.wav", make(0.035, (t, p) => Math.sin(TAU * 3100 * t) * Math.exp(-p * 12) * 0.35));
// confirm chime: two soft tones, perfect fifth
wav("chime.wav", make(0.7, (t) => (Math.sin(TAU * 880 * t) * Math.exp(-t * 6) + Math.sin(TAU * 1318.5 * Math.max(0, t - 0.07)) * Math.exp(-Math.max(0, t - 0.07) * 5) * (t > 0.07 ? 1 : 0)) * 0.35 * Math.min(1, t * 300)));
// low transition thump
wav("thump.wav", make(0.6, (t, p) => Math.sin(TAU * (72 - 30 * p) * t) * Math.exp(-p * 5) * 0.9));
console.log("SFX written to", OUT);
