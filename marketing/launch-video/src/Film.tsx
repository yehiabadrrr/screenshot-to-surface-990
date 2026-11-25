import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { BgMesh, Grade, Grain, Vignette } from "./components/Atmosphere";
import { DemoTag } from "./components/DemoTag";
import { S1Hook } from "./scenes/S1Hook";
import { S2Brand } from "./scenes/S2Brand";
import { S3Overview } from "./scenes/S3Overview";
import { S4Students } from "./scenes/S4Students";
import { S5Classes } from "./scenes/S5Classes";
import { S6Attendance } from "./scenes/S6Attendance";
import { S7Finance } from "./scenes/S7Finance";
import { S8Finale } from "./scenes/S8Finale";
import { Soundtrack } from "./Soundtrack";
import { CUTS, theme } from "./theme";

const lead = theme.timing.lead;
const product = (from: number, to: number) => ({ from: from - lead, durationInFrames: to - from + lead });

export const Film: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => (
  <AbsoluteFill style={{ background: theme.colors.bg }}>
    {/* 1 background */}
    <BgMesh />
    {/* 2–3 assets + type */}
    <Sequence from={CUTS.hook} durationInFrames={CUTS.brand - CUTS.hook}><S1Hook /></Sequence>
    <Sequence from={CUTS.brand} durationInFrames={CUTS.overview - CUTS.brand}><S2Brand /></Sequence>
    <Sequence {...product(CUTS.overview, CUTS.students)}><S3Overview /></Sequence>
    <Sequence {...product(CUTS.students, CUTS.classes)}><S4Students /></Sequence>
    <Sequence {...product(CUTS.classes, CUTS.attendance)}><S5Classes /></Sequence>
    <Sequence {...product(CUTS.attendance, CUTS.finance)}><S6Attendance /></Sequence>
    <Sequence {...product(CUTS.finance, CUTS.finale)}><S7Finance /></Sequence>
    <Sequence {...product(CUTS.finale, CUTS.end)}><S8Finale /></Sequence>
    <DemoTag from={CUTS.overview + 10} to={CUTS.finale + 60} />
    {/* 4 grade, 5 grain + vignette */}
    <Grade />
    <Grain />
    <Vignette />
    {withAudio && <Soundtrack />}
  </AbsoluteFill>
);
