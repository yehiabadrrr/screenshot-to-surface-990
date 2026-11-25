import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { box, mid } from "../captures";
import { track, type Cam } from "../camera";
import { Lift, Ring, Screen } from "../components/Screen";
import { Headline } from "../components/Type";
import { clamp, theme } from "../theme";
import { pulse, windowState } from "./stage";

const C = "classes";
const LEN = 210;
export const LIFT_AT = [104, 116, 128, 140];

export const S5Classes: React.FC = () => {
  const t = useCurrentFrame() - theme.timing.lead;
  const { width, height } = useVideoConfig();
  const w = windowState(t, { width, height, side: "left", expandAt: 84, len: LEN });
  const row = mid(box(C, "card0"));
  const focus = mid(box(C, "card1"));
  const cam = track<Cam>(t, [
    { f: 0, x: 960, y: 520, z: 1 }, { f: 60, x: 960, y: 560, z: 1.04 },
    { f: 106, x: 760, y: row.y, z: 1.38 }, { f: 150, x: 1420, y: row.y, z: 1.38 },
    { f: 176, x: focus.x, y: focus.y, z: 2.15 }, { f: 210, x: focus.x, y: focus.y + 6, z: 2.2 },
  ]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: w.L.text.x, top: w.L.vertical ? w.L.text.y : 0, width: w.L.text.w, height: w.L.vertical ? 420 : height, display: "flex", alignItems: "center" }}>
        <Headline eyebrow="Classes" lines={["Classes.", "Teachers.", "Total clarity."]} at={10} exitAt={78} size={w.L.vertical ? 84 : 72} />
      </div>
      <Screen layers={[{ name: C }]} cam={cam} rect={w.rect} zoom={w.zoom} rotateX={w.rotateX} scale={w.scale} opacity={w.opacity} blur={w.blur}
        overlay={(s) => (<>
          {LIFT_AT.map((at, i) => {
            // each card rises as the camera passes; the focused card (1) stays raised
            const up = interpolate(t, [at, at + 16], [0, 1], { ...clamp, easing: theme.ease.out });
            const down = i === 1 ? 0 : interpolate(t, [at + 30, at + 48], [0, 1], { ...clamp, easing: theme.ease.inOut });
            return <Lift key={i} capName={C} b={box(C, `card${i}`)} p={up * (1 - down)} />;
          })}
          <Ring b={box(C, "card1")} s={s} p={pulse(t, 176, 206)} pad={14} radius={22} spot={0.22} />
        </>)} />
    </AbsoluteFill>
  );
};
