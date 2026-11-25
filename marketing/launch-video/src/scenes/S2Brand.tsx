import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LogoMark } from "../components/LogoMark";
import { clamp, theme } from "../theme";

const { colors, fonts } = theme;
const WORD = "MARKEZLY";

export const S2Brand: React.FC = () => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const size = vertical ? 190 : 168;
  const markY = height / 2 - (vertical ? 210 : 150);
  const dotTargetY = markY + ((24 - 16) / 32) * size;

  const tile = spring({ frame: f - 6, fps, config: theme.spring.smooth });
  const draw = interpolate(f, [12, 40], [0, 1], { ...clamp, easing: theme.ease.inOut });
  const dotMove = interpolate(f, [0, 18], [0, 1], { ...clamp, easing: theme.ease.out });
  const ring = interpolate(f, [0, 40], [0, 1], { ...clamp, easing: theme.ease.out });
  const exit = interpolate(f, [128, 146], [0, 1], { ...clamp, easing: theme.ease.in });
  const breathe = 1 + Math.sin(f / 22) * 0.008;

  return (
    <AbsoluteFill style={{ opacity: 1 - exit, transform: `scale(${(1 - 0.08 * exit) * breathe})`, filter: `blur(${exit * 8}px)` }}>
      {/* impact ring from the center point */}
      <div style={{ position: "absolute", left: width / 2, top: height / 2, width: 40, height: 40, borderRadius: "50%", border: `2px solid ${colors.hero}`,
        transform: `translate(-50%, -50%) scale(${1 + ring * 26})`, opacity: (1 - ring) * 0.6 }} />
      <div style={{ position: "absolute", left: width / 2 - size / 2, top: markY - size / 2, transform: `scale(${0.7 + 0.3 * tile})`, opacity: tile }}>
        <LogoMark size={size} tile={tile} draw={draw} dot={false} />
      </div>
      {/* the converged point travels into the logo's center dot */}
      <div style={{ position: "absolute", left: width / 2, top: height / 2 + (dotTargetY - height / 2) * dotMove, width: 22 + ((5.2 / 32) * size - 22) * dotMove, height: 22 + ((5.2 / 32) * size - 22) * dotMove,
        borderRadius: "50%", background: colors.hero, transform: "translate(-50%, -50%)", boxShadow: `0 0 ${30 - 14 * dotMove}px ${colors.heroGlow}` }} />
      <div style={{ position: "absolute", top: markY + size / 2 + 56, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: fonts.body, fontSize: vertical ? 26 : 22, fontWeight: 600, letterSpacing: "0.5em", color: colors.textDim,
          opacity: interpolate(f, [22, 38], [0, 1], clamp), transform: `translateY(${interpolate(f, [22, 40], [16, 0], { ...clamp, easing: theme.ease.out })}px)` }}>
          MEET
        </div>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "center", fontFamily: fonts.display, fontWeight: 800, fontSize: vertical ? 132 : 128, color: colors.text, lineHeight: 1 }}>
          {WORD.split("").map((ch, i) => {
            const p = spring({ frame: f - 30 - i * 3, fps, config: theme.spring.smooth });
            return <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 34}px)`, filter: `blur(${(1 - p) * 10}px)`,
              marginRight: interpolate(p, [0, 1], [42, 10]) }}>{ch}</span>;
          })}
        </div>
        <div style={{ marginTop: 30, fontFamily: fonts.body, fontSize: vertical ? 26 : 23, fontWeight: 600, letterSpacing: "0.3em", color: colors.textDim, padding: "0 60px",
          opacity: interpolate(f, [66, 86], [0, 1], clamp), transform: `translateY(${interpolate(f, [66, 90], [18, 0], { ...clamp, easing: theme.ease.out })}px)` }}>
          THE OPERATING SYSTEM FOR MODERN LEARNING CENTERS.
        </div>
      </div>
    </AbsoluteFill>
  );
};
