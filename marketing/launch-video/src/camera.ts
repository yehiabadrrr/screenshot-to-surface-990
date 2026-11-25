import { theme } from "./theme";

export type Cam = { x: number; y: number; z: number };
export type Rect = { x: number; y: number; w: number; h: number };
type Keyed<T> = { f: number } & T;

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const progress = (frame: number, a: number, b: number, ease = theme.ease.cam) =>
  ease(Math.min(1, Math.max(0, (frame - a) / Math.max(1, b - a))));

/** Eased keyframe track for any numeric record (camera, rect, box). Holds before the first and after the last key. */
export function track<T extends Record<string, number>>(frame: number, keys: Keyed<T>[], ease = theme.ease.cam): T {
  const first = keys[0]!;
  const strip = ({ f: _f, ...rest }: Keyed<T>) => rest as unknown as T;
  if (frame <= first.f) return strip(first);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!, b = keys[i + 1]!;
    if (frame <= b.f) {
      const p = progress(frame, a.f, b.f, ease);
      const out: Record<string, number> = {};
      for (const k of Object.keys(a)) if (k !== "f") out[k] = lerp(a[k] as number, b[k] as number, p);
      return out as T;
    }
  }
  return strip(keys[keys.length - 1]!);
}
