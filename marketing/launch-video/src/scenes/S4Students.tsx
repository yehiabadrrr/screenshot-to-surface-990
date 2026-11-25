import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { box, mid } from "../captures";
import { track, type Cam } from "../camera";
import { Cursor, Ring, Screen } from "../components/Screen";
import { Headline } from "../components/Type";
import { clamp, theme } from "../theme";
import { pulse, windowState } from "./stage";

const LEN = 240;
export const TYPE_AT = [56, 62, 68, 74]; // keystrokes of "Rana"
export const CLICK_SEARCH = 48;
export const CLICK_ROW = 128;

export const S4Students: React.FC = () => {
  const t = useCurrentFrame() - theme.timing.lead;
  const { width, height } = useVideoConfig();
  const w = windowState(t, { width, height, side: "right", expandAt: 94, len: LEN });
  const search = mid(box("students", "search"));
  const row = box("students-search-4", "rowLink");
  const rowC = mid(row);
  const layers = [
    { name: "students" },
    ...TYPE_AT.map((at, i) => ({ name: `students-search-${i + 1}`, opacity: t >= at ? 1 : 0 })),
  ];
  const camA = track<Cam>(t, [
    { f: 0, x: 960, y: 540, z: 1 }, { f: 40, x: 960, y: 540, z: 1 },
    { f: 80, x: 880, y: 420, z: 1.14 }, { f: 116, x: rowC.x + 260, y: rowC.y + 40, z: 1.6 },
    { f: 130, x: rowC.x + 260, y: rowC.y + 40, z: 1.6 }, { f: 146, x: rowC.x, y: rowC.y, z: 2.8 },
  ]);
  const cursor = track(t, [
    { f: 26, x: 1260, y: 760 }, { f: 46, x: search.x - 300, y: search.y + 4 },
    { f: 98, x: search.x - 300, y: search.y + 4 }, { f: 124, x: row.x + 50, y: row.y + 12 },
  ]);
  const cursorO = interpolate(t, [24, 32, 136, 142], [0, 1, 1, 0], clamp);
  // match cut: zoom through the student's name into their profile
  const through = interpolate(t, [136, 150], [0, 1], { ...clamp, easing: theme.ease.inOut });
  const camB = track<Cam>(t, [
    { f: 136, x: 560, y: 262, z: 2.1 }, { f: 176, x: w.L.vertical ? 880 : 1050, y: 470, z: 1.22 }, { f: 240, x: w.L.vertical ? 880 : 1050, y: 500, z: 1.18 },
  ]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: w.L.text.x, top: w.L.vertical ? w.L.text.y : 0, width: w.L.text.w, height: w.L.vertical ? 420 : height, display: "flex", alignItems: "center" }}>
        <Headline eyebrow="Students" lines={["Every student.", "Every detail.", "Organized."]} at={10} exitAt={86} size={w.L.vertical ? 84 : 72} />
      </div>
      {through < 1 && (
        <Screen layers={layers} cam={camA} rect={w.rect} zoom={w.zoom} rotateX={w.rotateX} scale={w.scale} opacity={w.opacity * (1 - through)} blur={w.blur + through * 6}
          overlay={(s) => (<>
            <Ring b={box("students", "search")} s={s} p={pulse(t, 44, 90)} spot={0.12} radius={12} pad={6} />
            <Cursor x={cursor.x} y={cursor.y} s={s} opacity={cursorO} clickAt={[CLICK_SEARCH + theme.timing.lead, CLICK_ROW + theme.timing.lead]} />
          </>)} />
      )}
      {through > 0 && (
        <Screen layers={[{ name: "profile" }]} cam={camB} rect={w.rect} zoom={w.zoom} scale={w.scale} opacity={w.opacity * through}
          overlay={(s) => <Ring b={box("profile", "balance")} s={s} p={pulse(t, 172, 222)} radius={16} />} />
      )}
    </AbsoluteFill>
  );
};
