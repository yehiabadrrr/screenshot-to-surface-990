import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { box, mid } from "../captures";
import { track, type Cam } from "../camera";
import { Ring, Screen } from "../components/Screen";
import { Headline } from "../components/Type";
import { theme } from "../theme";
import { pulse, windowState } from "./stage";

const C = "overview";
const LEN = 240;

export const S3Overview: React.FC = () => {
  const t = useCurrentFrame() - theme.timing.lead;
  const { width, height } = useVideoConfig();
  const w = windowState(t, { width, height, side: "left", expandAt: 96, len: LEN, tiltIn: 22 });
  const k = (name: string) => mid(box(C, name));
  const cam = track<Cam>(t, [
    { f: 0, x: 960, y: 540, z: 1 },
    { f: 60, x: 960, y: 540, z: 1 },
    { f: 96, x: 1000, y: 400, z: 1.08 },
    { f: 120, ...k("revenue"), z: 1.7 },
    { f: 132, ...k("revenue"), z: 1.7 },
    { f: 146, ...k("students"), z: 1.7 },
    { f: 156, ...k("students"), z: 1.7 },
    { f: 168, ...k("attendance"), z: 1.7 },
    { f: 176, ...k("attendance"), z: 1.7 },
    { f: 188, ...k("outstanding"), z: 1.7 },
    { f: 196, ...k("outstanding"), z: 1.7 },
    { f: 216, x: 1088, y: 900, z: 1.12 },
    { f: 240, x: 1088, y: 960, z: 1.1 },
  ]);
  // ring glides card to card, locked to the camera's focus
  const ringBox = track(t, [
    { f: 120, ...box(C, "revenue") }, { f: 132, ...box(C, "revenue") },
    { f: 146, ...box(C, "students") }, { f: 156, ...box(C, "students") },
    { f: 168, ...box(C, "attendance") }, { f: 176, ...box(C, "attendance") },
    { f: 188, ...box(C, "outstanding") },
  ]);
  const ringP = pulse(t, 112, 204);
  const heroP = pulse(t, 52, 92);
  const actP = pulse(t, 214, 238);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: w.L.text.x, top: w.L.vertical ? w.L.text.y : 0, width: w.L.text.w, height: w.L.vertical ? 420 : height, display: "flex", alignItems: "center" }}>
          <Headline eyebrow="Overview" lines={["Your entire center.", "One clear view."]} at={10} exitAt={88} size={w.L.vertical ? 84 : 72} />
      </div>
      <Screen layers={[{ name: C }]} cam={cam} rect={w.rect} rotateX={w.rotateX} scale={w.scale} opacity={w.opacity} blur={w.blur}
        overlay={(s) => (<>
          <Ring b={box(C, "collected")} s={s} p={heroP} spot={0.18} />
          <Ring b={ringBox} s={s} p={ringP} />
          <Ring b={box(C, "activity")} s={s} p={actP} />
        </>)} />
    </AbsoluteFill>
  );
};
