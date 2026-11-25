import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { box, mid } from "../captures";
import { track, type Cam } from "../camera";
import { Cursor, Ring, Screen } from "../components/Screen";
import { Headline } from "../components/Type";
import { clamp, theme } from "../theme";
import { pulse, windowState } from "./stage";

const LEN = 240;
// Real interactions, captured in order: Present ×3, Absent, Present ×2, then "Mark all unmarked present".
export const CLICKS = [88, 101, 114, 127, 140, 153, 178];
const STATES = ["att-1", "att-2", "att-3", "att-4", "att-5", "att-6", "att-all"];

export const S6Attendance: React.FC = () => {
  const t = useCurrentFrame() - theme.timing.lead;
  const { width, height } = useVideoConfig();
  const w = windowState(t, { width, height, side: "right", expandAt: 58, len: LEN });
  const layers = [{ name: "att-0" }, ...STATES.map((name, i) => ({ name, opacity: t >= CLICKS[i]! + 1 ? 1 : 0 }))];
  const targets = STATES.map((s) => mid(box(s, "target")));
  const preview = mid(box("att-all", "preview"));
  const rx = w.L.vertical ? 900 : 1090; // phones: keep student names in frame
  const cam = track<Cam>(t, [
    { f: 0, x: 960, y: 540, z: 1 }, { f: 58, x: 960, y: 560, z: 1.02 },
    { f: 82, x: rx, y: 600, z: 1.28 }, { f: 160, x: rx, y: 640, z: 1.32 },
    { f: 186, x: rx, y: 600, z: 1.28 }, { f: 206, x: preview.x - 60, y: preview.y + 40, z: 1.9 }, { f: 240, x: preview.x - 60, y: preview.y + 40, z: 1.96 },
  ]);
  // cursor arrives a few frames before each click, then moves on
  const cursorKeys = [{ f: 64, x: 1500, y: 980 }];
  targets.forEach((p, i) => { cursorKeys.push({ f: CLICKS[i]! - 3, x: p.x - 8, y: p.y + 4 }, { f: CLICKS[i]! + 2, x: p.x - 8, y: p.y + 4 }); });
  const cursor = track(t, cursorKeys);
  const cursorO = interpolate(t, [62, 72, 186, 194], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: w.L.text.x, top: w.L.vertical ? w.L.text.y : 0, width: w.L.text.w, height: w.L.vertical ? 420 : height, display: "flex", alignItems: "center" }}>
        <Headline eyebrow="Attendance" lines={["Attendance.", "Without the chaos."]} at={8} exitAt={52} size={w.L.vertical ? 84 : 72} />
      </div>
      <Screen layers={layers} cam={cam} rect={w.rect} zoom={w.zoom} rotateX={w.rotateX} scale={w.scale} opacity={w.opacity} blur={w.blur}
        overlay={(s) => (<>
          <Ring b={box("att-all", "counters")} s={s} p={pulse(t, 150, 196)} spot={0.12} />
          <Ring b={box("att-all", "preview")} s={s} p={pulse(t, 202, 236)} />
          <Cursor x={cursor.x} y={cursor.y} s={s} opacity={cursorO} clickAt={CLICKS.map((c) => c + theme.timing.lead)} />
        </>)} />
    </AbsoluteFill>
  );
};
