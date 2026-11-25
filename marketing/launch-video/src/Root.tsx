import "./fonts";
import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { CUTS, theme } from "./theme";

export const Root: React.FC = () => (
  <>
    <Composition id="LaunchFilm" component={Film} durationInFrames={CUTS.end} fps={theme.timing.fps} width={1920} height={1080} />
    <Composition id="LaunchFilmVertical" component={Film} durationInFrames={CUTS.end} fps={theme.timing.fps} width={1080} height={1920} />
  </>
);
