import type { Rect } from "./camera";

/** Window rectangles for both aspect ratios. "side" = which side the headline sits on. */
export function layout(width: number, height: number, side: "left" | "right") {
  const vertical = height > width;
  if (vertical) {
    return {
      vertical,
      compact: { x: 60, y: 760, w: 960, h: 540 } as Rect,
      full: { x: 40, y: 250, w: 1000, h: 1420 } as Rect,
      text: { x: 90, y: 300, w: 900, align: "left" as const },
    };
  }
  return {
    vertical,
    compact: (side === "left" ? { x: 690, y: 205, w: 1140, h: 641 } : { x: 90, y: 205, w: 1140, h: 641 }) as Rect,
    full: { x: 96, y: 54, w: 1728, h: 972 } as Rect,
    text: side === "left" ? { x: 110, y: 0, w: 540, align: "left" as const } : { x: 1290, y: 0, w: 540, align: "left" as const },
  };
}
