import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, theme } from "../theme";

/** Honest labelling on every product shot: real UI, sample data. */
export const DemoTag: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const o = interpolate(f, [from, from + 20, to - 10, to], [0, 1, 1, 0], clamp);
  const vertical = height > width;
  return (
    <div style={{ position: "absolute", right: vertical ? 60 : 96, bottom: vertical ? 250 : 16, opacity: o * 0.85, display: "flex", alignItems: "center", gap: 10,
      fontFamily: theme.fonts.body, fontSize: vertical ? 22 : 15, fontWeight: 500, letterSpacing: "0.08em", color: theme.colors.textFaint, textTransform: "uppercase" }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: theme.colors.textFaint }} />
      Real product UI · Sample data
    </div>
  );
};
