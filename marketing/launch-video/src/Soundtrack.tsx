import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { CUTS, theme } from "./theme";
import { CLICK_ROW, CLICK_SEARCH, TYPE_AT } from "./scenes/S4Students";
import { LIFT_AT } from "./scenes/S5Classes";
import { CLICKS } from "./scenes/S6Attendance";
import { FIN_STOPS } from "./scenes/S7Finance";

type Hit = { at: number; sfx: "whoosh" | "click" | "tick" | "chime" | "thump"; vol: number };
const PRE = 2; // sounds land 2 frames before the visual — early reads as synced

const hits: Hit[] = [
  { at: 92, sfx: "whoosh", vol: 0.32 },                                   // fragments converge
  { at: CUTS.brand + 54, sfx: "chime", vol: 0.16 },                        // wordmark settles
  ...[CUTS.overview, CUTS.students, CUTS.classes, CUTS.attendance, CUTS.finance, CUTS.finale].map((c) => ({ at: c - 14, sfx: "whoosh" as const, vol: 0.3 })),
  ...[CUTS.students, CUTS.classes, CUTS.attendance, CUTS.finance].map((c) => ({ at: c, sfx: "thump" as const, vol: 0.22 })),
  ...[120, 146, 168, 188].map((f) => ({ at: CUTS.overview + f, sfx: "tick" as const, vol: 0.2 })),
  { at: CUTS.students + CLICK_SEARCH, sfx: "click", vol: 0.42 },
  ...TYPE_AT.map((f) => ({ at: CUTS.students + f, sfx: "tick" as const, vol: 0.24 })),
  { at: CUTS.students + CLICK_ROW, sfx: "click", vol: 0.42 },
  { at: CUTS.students + 136, sfx: "whoosh", vol: 0.2 },
  ...LIFT_AT.map((f) => ({ at: CUTS.classes + f, sfx: "tick" as const, vol: 0.18 })),
  ...CLICKS.map((f) => ({ at: CUTS.attendance + f, sfx: "click" as const, vol: 0.4 })),
  { at: CUTS.attendance + CLICKS[CLICKS.length - 1]! + 3, sfx: "chime", vol: 0.24 },
  ...FIN_STOPS.map((f) => ({ at: CUTS.finance + f, sfx: "tick" as const, vol: 0.2 })),
];

export const Soundtrack: React.FC = () => (
  <>
    <Audio src={staticFile("sfx/score.wav")} volume={0.9} />
    {hits.map((h, i) => (
      <Sequence key={i} from={Math.max(0, h.at - PRE)} durationInFrames={theme.timing.fps * 1}>
        <Audio src={staticFile(`sfx/${h.sfx}.wav`)} volume={h.vol} />
      </Sequence>
    ))}
  </>
);
