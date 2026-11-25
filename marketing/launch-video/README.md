# Markezly launch film

A 58-second product film (1920×1080, 30 fps, H.264) built with Remotion from **real captures of the
Markezly app**. It's an editable project, kept separate from the app: the app's build, tests and lint
never touch this folder.

## Story

| Time | Scene | What's on screen |
| --- | --- | --- |
| 0–5 s | Hook | "Running an educational center shouldn't be this complicated." Scattered paperwork converges into one point. |
| 5–10 s | Brand | The point becomes the logo's teal dot. "Meet Markezly. The operating system for modern learning centers." |
| 10–18 s | Overview | Real dashboard: today's collections, revenue, active students, attendance, outstanding balances, recent activity. |
| 18–26 s | Students | Real directory, live search for "Rana", zoom through into her profile and balance. |
| 26–33 s | Classes | Real class cards lift out of the page: teacher, schedule, billing rule, enrollment. |
| 33–41 s | Attendance | Real roster: Present ×3, Absent, Present ×2, "Mark all unmarked present", then the billing preview (17 charges on finalize). |
| 41–49 s | Finance | Real ledger KPIs, payment methods and transactions. |
| 49–58 s | Finale | The workspaces recede; "Your center. Under control." markezly.dev |

## What is real, and what was changed

- **Every product frame is the running app**, captured by `scripts/capture.mjs` with Playwright at 2×
  device scale. Clicks, search and attendance marks are real interactions in the app, captured
  state by state. No screens were drawn or mocked.
- **Data is the app's built-in sample center (Nile Academy).** Student names and phone numbers are
  generated sample data. The app's "Demo data" banner stays visible, and every product scene carries a
  "Real product UI · Sample data" label. Before capturing, three payments are recorded through the app's
  own Record payment form so "Collected today" isn't zero. They're sample entries too.
- **Two text substitutions are made in the page just before each screenshot:**
  1. `Markazly` → `Markezly`, the approved brand spelling. **The app's code still says Markazly**, so
     rename it in the app before relying on these captures elsewhere.
  2. The sample owner `Yehia Hazem` → `Nadia Samir` (and the initials `YH` → `NS`), so no real
     person's name appears in a public film.
- The opening "fragments" (e.g. "Who paid for October?") are typographic, not UI. They stand for the
  paperwork the product replaces.

## Audio

All audio is original and synthesized by scripts in this folder, with no samples or licensed music:

- `scripts/gen-score.mjs` writes `public/sfx/score.wav`, a 58 s, 120 BPM score (drone → brand impact →
  build → peak → resolution). One beat = 15 frames, so scene cuts land on beats.
- `scripts/gen-sfx.mjs` writes whoosh, click, tick, chime and thump. They're placed in `src/Soundtrack.tsx`,
  2 frames ahead of each visual hit.
- No voiceover. No professional voice generation is available in this environment, and the brief
  prefers no voice to a poor synthetic one. The narration in the brief can be recorded and laid over
  the existing timing later.

## Reproduce

```bash
# 1. Run the app (repo root)
bun install && bunx vite dev --host 127.0.0.1 --port 5173

# 2. In this folder
npm install
node scripts/capture.mjs          # real UI → public/captures/*.jpg + manifest.json (card and button positions)
node scripts/gen-score.mjs && node scripts/gen-sfx.mjs

# 3. Preview / render (pass a local Chromium if Remotion can't download one)
npx remotion studio src/index.ts
npx remotion render src/index.ts LaunchFilm output/markezly-launch-1080p.mp4 --codec h264 --crf 16 --browser-executable=<chrome-headless-shell>
npx remotion render src/index.ts LaunchFilmVertical output/markezly-launch-9x16.mp4 --codec h264 --crf 16 --browser-executable=<chrome-headless-shell>
npx remotion still  src/index.ts LaunchFilm output/poster.png --frame 1700 --browser-executable=<chrome-headless-shell>
```

The captures are committed so the film re-renders without the app running. Re-run `capture.mjs`
after UI changes. Camera moves, focus rings and cursor clicks read positions from `manifest.json`,
so they follow the UI automatically.

## Project layout

```
src/theme.ts          every color, easing, spring and cut point (app brand tokens)
src/camera.ts         eased keyframe tracks for the camera, windows and rings
src/components/       Atmosphere (mesh, grade, grain, vignette), Screen (window + camera, Ring,
                      Lift, Cursor), Type (masked line reveals), LogoMark, DemoTag
src/scenes/           S1Hook … S8Finale; stage.ts holds the shared window choreography
src/Soundtrack.tsx    score + SFX hit list
scripts/              capture.mjs, gen-score.mjs, gen-sfx.mjs
public/captures/      real UI captures + manifest.json
output/               renders (git-ignored)
```
