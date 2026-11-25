import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { box, mid } from "../captures";
import { track, type Cam } from "../camera";
import { Ring, Screen } from "../components/Screen";
import { Headline } from "../components/Type";
import { theme } from "../theme";
import { pulse, windowState } from "./stage";

const C = "finance";
const LEN = 240;
export const FIN_STOPS = [104, 126, 148, 170];

export const S7Finance: React.FC = () => {
  const t = useCurrentFrame() - theme.timing.lead;
  const { width, height } = useVideoConfig();
  const w = windowState(t, { width, height, side: "left", expandAt: 80, len: LEN });
  const k = (n: string) => mid(box(C, n));
  const cam = track<Cam>(t, [
    { f: 0, x: 960, y: 540, z: 1 }, { f: 60, x: 960, y: 520, z: 1.04 },
    { f: 104, ...k("billed"), z: 1.65 }, { f: 114, ...k("billed"), z: 1.65 },
    { f: 126, ...k("gross"), z: 1.65 }, { f: 136, ...k("gross"), z: 1.65 },
    { f: 148, ...k("net"), z: 1.65 }, { f: 158, ...k("net"), z: 1.65 },
    { f: 170, ...k("outstanding"), z: 1.65 }, { f: 178, ...k("outstanding"), z: 1.65 },
    { f: 196, x: 1088, y: 650, z: 1.14 }, { f: 212, x: 1088, y: 650, z: 1.14 },
    { f: 240, x: 1088, y: 1240, z: 1.14 },
  ]);
  const ringBox = track(t, [
    { f: 104, ...box(C, "billed") }, { f: 114, ...box(C, "billed") }, { f: 126, ...box(C, "gross") }, { f: 136, ...box(C, "gross") },
    { f: 148, ...box(C, "net") }, { f: 158, ...box(C, "net") }, { f: 170, ...box(C, "outstanding") },
  ]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: w.L.text.x, top: w.L.vertical ? w.L.text.y : 0, width: w.L.text.w, height: w.L.vertical ? 420 : height, display: "flex", alignItems: "center" }}>
        <Headline eyebrow="Finance" lines={["Know where", "every pound goes."]} at={10} exitAt={74} size={w.L.vertical ? 84 : 72} dimEarlier />
      </div>
      <Screen layers={[{ name: C }]} cam={cam} rect={w.rect} zoom={w.zoom} rotateX={w.rotateX} scale={w.scale} opacity={w.opacity} blur={w.blur}
        overlay={(s) => (<>
          <Ring b={ringBox} s={s} p={pulse(t, 96, 186)} />
          <Ring b={box(C, "methods")} s={s} p={pulse(t, 194, 222)} />
        </>)} />
    </AbsoluteFill>
  );
};
