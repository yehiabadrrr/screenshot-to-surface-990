import manifest from "../public/captures/manifest.json";

export type Box = { x: number; y: number; w: number; h: number };
export type Capture = { file: string; width: number; height: number; boxes: Record<string, Box | null> };

// Real UI captured by scripts/capture.mjs. Coordinates are CSS px of a 1920-wide app window.
export const captures = manifest as unknown as Record<string, Capture>;

export const cap = (name: string): Capture => {
  const c = captures[name];
  if (!c) throw new Error(`Unknown capture: ${name}`);
  return c;
};
export const box = (name: string, key: string): Box => {
  const b = cap(name).boxes[key];
  if (!b) throw new Error(`Missing box ${name}.${key}`);
  return b;
};
export const mid = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
