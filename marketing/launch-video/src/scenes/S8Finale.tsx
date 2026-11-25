import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LogoMark } from "../components/LogoMark";
import { Screen } from "../components/Screen";
import { MaskLine } from "../components/Type";
import type { Rect } from "../camera";
import { clamp, theme } from "../theme";

const { colors, fonts } = theme;
export const PING = 180; // logo dot pulse, on the score's final ping (55.0 s)

export const S8Finale: React.FC = () => {
  const t = useCurrentFrame() - theme.timing.lead;
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const recede = interpolate(t, [56, 104], [0, 1], { ...clamp, easing: theme.ease.inOut });
  const drift = interpolate(t, [-15, 270], [0, 1], { ...clamp, easing: theme.ease.cam });

  // The product comes together: three real workspaces, then they recede behind the brand.
  const panels: { name: string; rect: Rect; ry: number; delay: number; dx: number }[] = vertical
    ? [
        { name: "att-all", rect: { x: -120, y: 520, w: 860, h: 484 }, ry: 18, delay: 4, dx: -30 },
        { name: "finance", rect: { x: 340, y: 1000, w: 860, h: 484 }, ry: -18, delay: 8, dx: 30 },
        { name: "overview", rect: { x: 90, y: 720, w: 900, h: 506 }, ry: 0, delay: 0, dx: 0 },
      ]
    : [
        { name: "att-all", rect: { x: 40, y: 260, w: 860, h: 484 }, ry: 20, delay: 5, dx: -40 },
        { name: "finance", rect: { x: 1020, y: 260, w: 860, h: 484 }, ry: -20, delay: 9, dx: 40 },
        { name: "overview", rect: { x: 440, y: 200, w: 1040, h: 585 }, ry: 0, delay: 0, dx: 0 },
      ];

  const tile = spring({ frame: t - 70, fps, config: theme.spring.smooth });
  const draw = interpolate(t, [74, 100], [0, 1], { ...clamp, easing: theme.ease.inOut });
  const ping = interpolate(t, [PING, PING + 30], [0, 1], { ...clamp, easing: theme.ease.out });
  const fadeIn = (a: number, b = a + 20) => interpolate(t, [a, b], [0, 1], { ...clamp, easing: theme.ease.out });

  return (
    <AbsoluteFill>
      {panels.map((p) => {
        const e = spring({ frame: t + 8 - p.delay, fps, config: theme.spring.soft }); // already moving on the impact
        return (
          <Screen key={p.name} layers={[{ name: p.name }]} cam={{ x: 960, y: 540, z: 1 }}
            rect={{ ...p.rect, x: p.rect.x + p.dx * drift, y: p.rect.y + (1 - e) * 90 + recede * 70 }}
            rotateY={p.ry * (0.6 + 0.4 * e)} rotateX={recede * 8} scale={(0.92 + 0.08 * e) * (1 - 0.16 * recede)}
            opacity={e * (1 - 0.72 * recede)} blur={recede * 4} />
        );
      })}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 46%, rgba(4,7,14,${0.86 * recede}) 0%, rgba(4,7,14,${0.6 * recede}) 46%, rgba(4,7,14,${0.25 * recede}) 100%)` }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 60px" }}>
        <div style={{ opacity: tile, transform: `scale(${0.7 + 0.3 * tile})`, position: "relative" }}>
          <LogoMark size={vertical ? 130 : 108} tile={tile} draw={draw} glow={ping > 0 ? (1 - ping) * 6 : 0} />
          {ping > 0 && ping < 1 && (
            <div style={{ position: "absolute", left: "50%", top: `${(24 / 32) * 100}%`, width: 18, height: 18, borderRadius: "50%", border: `2px solid ${colors.hero}`,
              transform: `translate(-50%, -50%) scale(${1 + ping * 7})`, opacity: (1 - ping) * 0.8 }} />
          )}
        </div>
        <div style={{ marginTop: 26, fontFamily: fonts.display, fontWeight: 800, fontSize: vertical ? 44 : 38, letterSpacing: "0.34em", color: colors.textDim,
          opacity: fadeIn(86), transform: `translateY(${(1 - fadeIn(86, 110)) * 14}px)` }}>MARKEZLY</div>
        <div style={{ marginTop: 46, fontFamily: fonts.display }}>
          <MaskLine at={104} style={{ fontSize: vertical ? 104 : 112, fontWeight: 800, lineHeight: 1, color: colors.text }}>YOUR CENTER.</MaskLine>
          <MaskLine at={112} style={{ fontSize: vertical ? 104 : 112, fontWeight: 800, lineHeight: 1.04, color: colors.text }}>UNDER CONTROL.</MaskLine>
        </div>
        <div style={{ marginTop: 40, fontFamily: fonts.body, fontWeight: 600, fontSize: vertical ? 26 : 22, letterSpacing: "0.28em", color: colors.textDim,
          opacity: fadeIn(140), transform: `translateY(${(1 - fadeIn(140, 164)) * 14}px)` }}>THE SMARTER WAY TO RUN YOUR EDUCATIONAL CENTER.</div>
        <div style={{ marginTop: 26, fontFamily: fonts.body, fontWeight: 600, fontSize: vertical ? 30 : 26, letterSpacing: "0.12em", color: colors.brandLight,
          opacity: fadeIn(PING - 6), transform: `translateY(${(1 - fadeIn(PING - 6, PING + 16)) * 12}px)` }}>markezly.dev</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
