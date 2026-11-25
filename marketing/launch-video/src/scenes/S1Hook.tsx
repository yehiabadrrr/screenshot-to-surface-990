import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Headline } from "../components/Type";
import { clamp, theme } from "../theme";

const { colors, fonts } = theme;

// The scattered paperwork of a center: the things Markezly replaces. Text only, no invented UI.
const FRAGMENTS = [
  { t: "Attendance notebook · p. 14", x: 0.12, y: 0.18, d: 0.9 },
  { t: "InstaPay screenshot — 850?", x: 0.74, y: 0.15, d: 0.6 },
  { t: "Who paid for October?", x: 0.83, y: 0.42, d: 1.0 },
  { t: "Cash drawer: 1,200", x: 0.08, y: 0.55, d: 0.7 },
  { t: "Teacher share — 35%", x: 0.2, y: 0.8, d: 0.55 },
  { t: "Group B moved to 6 PM", x: 0.62, y: 0.84, d: 0.85 },
  { t: "students_final_v3.xlsx", x: 0.42, y: 0.1, d: 0.5 },
  { t: "Is Omar absent today?", x: 0.88, y: 0.7, d: 0.75 },
  { t: "Receipt #— missing", x: 0.32, y: 0.9, d: 0.45 },
  { t: "Branch 2 totals?", x: 0.05, y: 0.33, d: 0.4 },
];

export const S1Hook: React.FC = () => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const cx = width / 2, cy = height / 2;
  const vertical = height > width;
  const dotIn = spring({ frame: f - 116, fps, config: theme.spring.smooth });
  return (
    <AbsoluteFill>
      {FRAGMENTS.map((fr, i) => {
        const inP = spring({ frame: f - 4 - i * 4, fps, config: theme.spring.soft });
        const pull = interpolate(f, [92 + i * 1.5, 128 + i * 1.5], [0, 1], { ...clamp, easing: theme.ease.inOut });
        const drift = Math.sin((f + i * 40) / 38) * 10 * fr.d;
        const x0 = fr.x * width, y0 = fr.y * height + drift - f * 0.25 * fr.d;
        const x = x0 + (cx - x0) * pull, y = y0 + (cy - y0) * pull;
        return (
          <div key={fr.t} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${(0.7 + 0.3 * fr.d) * (0.9 + 0.1 * inP) * (1 - 0.85 * pull)})`,
            opacity: inP * (0.25 + 0.5 * fr.d) * (1 - pull), filter: `blur(${(1 - fr.d) * 2.2 + pull * 4}px)`,
            padding: "12px 18px", borderRadius: 12, border: `1px solid ${colors.line}`, background: "rgba(20,43,74,0.35)",
            fontFamily: fonts.body, fontSize: vertical ? 26 : 22, fontWeight: 500, color: colors.textDim, whiteSpace: "nowrap" }}>
            {fr.t}
          </div>
        );
      })}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: vertical ? 70 : 0 }}>
        <Headline lines={["Running an educational center", "shouldn't be this complicated."]} at={8} exitAt={86} size={vertical ? 70 : 74} align="center" />
      </AbsoluteFill>
      {/* every fragment converges into one point: the center */}
      <div style={{ position: "absolute", left: cx, top: cy, width: 22, height: 22, borderRadius: 11, background: colors.hero,
        transform: `translate(-50%, -50%) scale(${dotIn})`, boxShadow: `0 0 ${40 * dotIn}px ${colors.heroGlow}, 0 0 ${90 * dotIn}px ${colors.heroGlow}` }} />
    </AbsoluteFill>
  );
};
