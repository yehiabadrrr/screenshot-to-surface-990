import React from "react";
import { interpolate } from "remotion";
import { clamp, theme } from "../theme";

/** The app's own mark (src/components/app/logo.tsx), animatable: tile p, stroke draw d, dot visibility. */
export const LogoMark: React.FC<{ size: number; tile: number; draw: number; dot?: boolean; glow?: number }> = ({ size, tile, draw, dot = true, glow = 0 }) => {
  const len = 52; // approx path length of the M stroke
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="mz-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B78C2" />
          <stop offset="1" stopColor="#1D4F8C" />
        </linearGradient>
      </defs>
      <rect x={16 - 16 * tile} y={16 - 16 * tile} width={32 * tile} height={32 * tile} rx={9 * tile} fill="url(#mz-tile)" opacity={interpolate(tile, [0, 0.4], [0, 1], clamp)} />
      <path d="M8.5 23V10L16 17.5L23.5 10V23" fill="none" stroke="white" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={len} strokeDashoffset={len * (1 - draw)} opacity={draw > 0.01 ? 1 : 0} />
      {dot && <circle cx="16" cy="24" r="2.6" fill={theme.colors.hero} style={{ filter: glow > 0 ? `drop-shadow(0 0 ${2 * glow}px ${theme.colors.hero})` : undefined }} />}
    </svg>
  );
};
