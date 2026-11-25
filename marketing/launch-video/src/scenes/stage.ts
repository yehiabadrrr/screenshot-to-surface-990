import { interpolate } from "remotion";
import { track, type Rect } from "../camera";
import { layout } from "../layout";
import { clamp, theme } from "../theme";

/**
 * Shared window choreography for product scenes. t = frames since the cut (negative during the lead-in).
 * enter (t -6..20) -> compact beside the headline -> expand to full (expandAt..expandAt+22) -> exit (last 12 frames).
 */
export function windowState(t: number, o: { width: number; height: number; side: "left" | "right"; expandAt: number; len: number; tiltIn?: number }) {
  const L = layout(o.width, o.height, o.side);
  const rect = track<Rect>(t, [{ f: o.expandAt, ...L.compact }, { f: o.expandAt + 22, ...L.full }], theme.ease.cam);
  // starts as the previous window finishes its exit: ~6 frames of overlap, never a double exposure
  const enter = interpolate(t, [-6, 20], [0, 1], { ...clamp, easing: theme.ease.out });
  const exit = interpolate(t, [o.len - 12, o.len], [0, 1], { ...clamp, easing: theme.ease.in });
  const tiltIn = o.tiltIn ?? 9;
  return {
    L,
    rect: { ...rect, y: rect.y + (1 - enter) * 70 },
    rotateX: (1 - enter) * tiltIn,
    scale: (0.94 + 0.06 * enter) * (1 + 0.05 * exit),
    opacity: enter * (1 - exit),
    blur: exit * 10,
  };
}

/** 0 -> 1 -> 0 envelope for rings and highlights. */
export const pulse = (t: number, a: number, b: number, fade = 8) =>
  interpolate(t, [a, a + fade, b - fade, b], [0, 1, 1, 0], { ...clamp, easing: theme.ease.out });
