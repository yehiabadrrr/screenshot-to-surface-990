// Single source of truth: every color, easing, spring and timing constant lives here.
// Colors are the Markezly app's own tokens (src/styles.css), converted from OKLCH.
import { Easing } from "remotion";

export const theme = {
  colors: {
    bg: "#04070E",          // cinematic base, a step darker than the app's dark theme
    bgAlt: "#0B1A2E",       // app navy-deep
    navy: "#142B4A",        // app navy
    sidebar: "#0F233E",     // app sidebar
    brand: "#2764A6",       // app brand blue
    brandLight: "#64A2E7",  // app brand (dark theme)
    hero: "#19A7A0",        // app teal-bright — THE hero color (the logo's center dot); max one element per frame
    heroGlow: "rgba(25, 167, 160, 0.45)",
    text: "#F2F5FA",
    textDim: "#A9B6CA",
    textFaint: "#62728C",
    line: "rgba(255, 255, 255, 0.09)",
    screenBg: "#F4F6FA",
  },
  fonts: {
    display: "Manrope, Inter, sans-serif", // the app's display face
    body: "Inter, sans-serif",
  },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),     // entrances
    inOut: Easing.bezier(0.83, 0, 0.17, 1),  // big moves
    cam: Easing.bezier(0.65, 0, 0.35, 1),    // camera moves: smooth, never linear
    in: Easing.bezier(0.7, 0, 0.84, 0),      // exits only
  },
  spring: {
    snappy: { damping: 14, stiffness: 160, mass: 0.6 },
    smooth: { damping: 20, stiffness: 90, mass: 1 },
    soft: { damping: 28, stiffness: 70, mass: 1 },
  },
  timing: {
    fps: 30,
    beat: 15,   // 120 BPM score: one beat = 15 frames
    lead: 15,   // each product scene starts 15 frames before its cut to overlap the transition
  },
} as const;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Scene cut points (frames). Audio hits are composed against these.
export const CUTS = { hook: 0, brand: 150, overview: 300, students: 540, classes: 780, attendance: 990, finance: 1230, finale: 1470, end: 1740 } as const;
