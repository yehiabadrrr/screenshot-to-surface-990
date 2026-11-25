import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { cap, type Box } from "../captures";
import type { Cam, Rect } from "../camera";
import { clamp, theme } from "../theme";

const { colors } = theme;

export type Layer = { name: string; opacity?: number };

/**
 * A real app capture inside a rounded window. `cam` is the focal point (capture CSS px) and zoom,
 * where z = 1 shows the full 1920 px width. Overlays receive the current scale so they can draw
 * in capture coordinates and stay locked to the UI as the camera moves.
 */
export const Screen: React.FC<{
  layers: Layer[];
  cam: Cam;
  rect: Rect;
  rotateX?: number;
  rotateY?: number;
  scale?: number;
  opacity?: number;
  blur?: number;
  radius?: number;
  dim?: number;
  overlay?: (s: number) => React.ReactNode;
  zoom?: number;
}> = ({ layers, cam, rect, rotateX = 0, rotateY = 0, scale = 1, opacity = 1, blur = 0, radius = 18, dim = 0, overlay, zoom = 1 }) => {
  const base = cap(layers[0]!.name);
  const s = (cam.z * zoom * rect.w) / base.width;
  const vw = rect.w / s, vh = rect.h / s;
  const cx = vw >= base.width ? base.width / 2 : Math.min(base.width - vw / 2, Math.max(vw / 2, cam.x));
  const cy = vh >= base.height ? base.height / 2 : Math.min(base.height - vh / 2, Math.max(vh / 2, cam.y));
  const tx = rect.w / 2 - cx * s, ty = rect.h / 2 - cy * s;
  return (
    <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, opacity,
      transform: `perspective(2400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
      filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden", background: colors.screenBg,
        boxShadow: "0 50px 120px -30px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.10)" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: base.width, height: base.height, transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
          {layers.map((l, i) => {
            const c = cap(l.name);
            return <Img key={l.name + i} src={staticFile(`captures/${c.file}`)}
              style={{ position: "absolute", left: 0, top: 0, width: c.width, height: c.height, opacity: l.opacity ?? 1 }} />;
          })}
          {overlay?.(s)}
        </div>
        {dim > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(4,7,14,${dim})` }} />}
        {/* glass edge highlight */}
        <div style={{ position: "absolute", inset: 0, borderRadius: radius, pointerEvents: "none",
          background: "linear-gradient(160deg, rgba(255,255,255,0.10), transparent 22%)", mixBlendMode: "screen" }} />
      </div>
    </div>
  );
};

/** Hero focus ring with a soft spotlight, drawn in capture coordinates. */
export const Ring: React.FC<{ b: Box; s: number; p: number; pad?: number; radius?: number; spot?: number }> = ({ b, s, p, pad = 8, radius = 18, spot = 0.28 }) => {
  if (p <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: b.x - pad, top: b.y - pad, width: b.w + pad * 2, height: b.h + pad * 2, borderRadius: radius,
      border: `${2.6 / s}px solid ${colors.hero}`, opacity: p, transform: `scale(${1.035 - 0.035 * p})`,
      boxShadow: `0 0 ${26 / s}px ${colors.heroGlow}, 0 0 0 99999px rgba(6, 14, 30, ${spot * p})` }} />
  );
};

/** A card lifted out of the real screenshot (same pixels, raised with depth). */
export const Lift: React.FC<{ capName: string; b: Box; p: number; radius?: number }> = ({ capName, b, p, radius = 14 }) => {
  const c = cap(capName);
  return (
    <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: radius,
      backgroundImage: `url(${staticFile(`captures/${c.file}`)})`, backgroundSize: `${c.width}px ${c.height}px`, backgroundPosition: `${-b.x}px ${-b.y}px`,
      transform: `translateY(${-12 * p}px) scale(${1 + 0.04 * p})`,
      boxShadow: `0 ${34 * p}px ${70 * p}px -18px rgba(8, 20, 45, ${0.5 * p}), 0 0 0 ${p > 0.02 ? 1 : 0}px rgba(20,43,74,${0.12 * p})` }} />
  );
};

/** Pointer arrow + click ripple. Position in capture coords; drawn at constant screen size. */
export const Cursor: React.FC<{ x: number; y: number; s: number; opacity: number; clickAt?: number[] }> = ({ x, y, s, opacity, clickAt = [] }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const last = clickAt.filter((c) => c <= f).pop();
  const since = last === undefined ? 99 : f - last;
  const press = since < 6 ? interpolate(since, [0, 2, 6], [1, 0.86, 1], { ...clamp, easing: theme.ease.out }) : 1;
  const ripple = spring({ frame: since, fps, config: theme.spring.smooth });
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `scale(${1 / s})`, transformOrigin: "0 0", opacity, pointerEvents: "none" }}>
      {since < 20 && <div style={{ position: "absolute", left: -26, top: -26, width: 52, height: 52, borderRadius: "50%",
        border: `2px solid ${colors.brand}`, opacity: 1 - ripple, transform: `scale(${0.3 + ripple * 0.9})` }} />}
      <svg width="30" height="34" viewBox="0 0 30 34" style={{ transform: `scale(${press})`, transformOrigin: "4px 3px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.35))" }}>
        <path d="M4 3 L4 26 L10 20.5 L14.2 30 L18.4 28.2 L14.3 18.9 L22.5 18.6 Z" fill="#0B1A2E" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
    </div>
  );
};
