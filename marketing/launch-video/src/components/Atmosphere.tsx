import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";

const { colors } = theme;

/** Layer 1: slow-drifting navy/blue light, never a flat background. */
export const BgMesh: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const f = useCurrentFrame();
  const d1 = Math.sin(f / 90) * 60, d2 = Math.cos(f / 110) * 50, d3 = Math.sin(f / 140) * 40;
  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <div style={{ position: "absolute", width: 1500, height: 1500, borderRadius: "50%", top: -760 + d3, left: -420 + d1, filter: "blur(60px)", opacity: intensity,
        background: `radial-gradient(circle, ${colors.navy}cc, transparent 64%)` }} />
      <div style={{ position: "absolute", width: 1200, height: 1200, borderRadius: "50%", bottom: -620, right: -360 - d2, filter: "blur(80px)", opacity: intensity,
        background: `radial-gradient(circle, ${colors.brand}40, transparent 62%)` }} />
      <div style={{ position: "absolute", width: 900, height: 900, borderRadius: "50%", top: 240 + d2, left: 620 - d3, filter: "blur(90px)", opacity: 0.5 * intensity,
        background: `radial-gradient(circle, ${colors.sidebar}, transparent 66%)` }} />
    </AbsoluteFill>
  );
};

/** Layer 4: unifying grade above all content. */
export const Grade: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ backgroundColor: colors.brand, mixBlendMode: "soft-light", opacity: 0.12 }} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.16), transparent 24%, transparent 76%, rgba(0,0,0,0.26))" }} />
  </AbsoluteFill>
);

/** Layer 5a: procedural film grain. */
export const Grain: React.FC = () => {
  const f = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;
  return <AbsoluteFill style={{ pointerEvents: "none", backgroundImage: noise, backgroundSize: "240px",
    backgroundPosition: `${(f * 37) % 240}px ${(f * 53) % 240}px`, opacity: 0.07, mixBlendMode: "overlay" }} />;
};

/** Layer 5b: vignette, topmost. */
export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.42) 100%)" }} />
);
