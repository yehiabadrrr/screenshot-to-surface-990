import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, theme } from "../theme";

const { colors, fonts } = theme;

/** One line revealed through a mask: rise + fade + tracking settle; exits faster than it enters. */
export const MaskLine: React.FC<{ children: React.ReactNode; at: number; exitAt?: number; style?: React.CSSProperties; dur?: number }> = ({ children, at, exitAt, style, dur = 24 }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: theme.ease.out });
  const q = exitAt === undefined ? 0 : interpolate(f, [exitAt, exitAt + 10], [0, 1], { ...clamp, easing: theme.ease.in });
  const y = (1 - p) * 105 - q * 105;
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.08em", marginBottom: "-0.08em" }}>
      <div style={{ transform: `translateY(${y}%)`, opacity: p * (1 - q), letterSpacing: `${(1 - p) * 0.06 - 0.025}em`, ...style }}>{children}</div>
    </div>
  );
};

/** Scene headline: module eyebrow + stacked display lines; the last line is the emphasis. */
export const Headline: React.FC<{ eyebrow?: string; lines: string[]; at: number; exitAt?: number; size?: number; align?: "left" | "center"; dimEarlier?: boolean }> = ({ eyebrow, lines, at, exitAt, size = 76, align = "left", dimEarlier = true }) => {
  const f = useCurrentFrame();
  const bar = interpolate(f, [at, at + 22], [0, 1], { ...clamp, easing: theme.ease.out });
  const barOut = exitAt === undefined ? 0 : interpolate(f, [exitAt, exitAt + 8], [0, 1], { ...clamp, easing: theme.ease.in });
  return (
    <div style={{ textAlign: align, fontFamily: fonts.display }}>
      {eyebrow && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: align === "center" ? "center" : "flex-start", marginBottom: 26 }}>
          <div style={{ width: 34 * bar * (1 - barOut), height: 2, background: colors.brandLight, borderRadius: 2 }} />
          <MaskLine at={at + 2} exitAt={exitAt} dur={18}
            style={{ fontFamily: fonts.body, fontSize: 18, fontWeight: 600, letterSpacing: "0.32em", color: colors.brandLight, textTransform: "uppercase" }}>
            {eyebrow}
          </MaskLine>
        </div>
      )}
      {lines.map((line, i) => (
        <MaskLine key={line} at={at + 6 + i * 6} exitAt={exitAt === undefined ? undefined : exitAt + i * 2}
          style={{ fontSize: size, fontWeight: 800, lineHeight: 1.02, textTransform: "uppercase",
            color: dimEarlier && i < lines.length - 1 ? colors.textDim : colors.text }}>
          {line}
        </MaskLine>
      ))}
    </div>
  );
};
