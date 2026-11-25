# Style guide: Markezly — "POV: 1st of the month" reel

Source material: the running Markezly app (real UI in `assets/cap/`, 2x), app tokens (`src/styles.css` in the repo),
`assets/site/info.json`. No reference film: rhythm from the house rules.

## 1. Palette (from the app's own tokens)
| Token | Hex | Source |
|---|---|---|
| `--bg` | #08111F | between app navy-deep #0B1A2E and the film's #04070E — dark canvas for phone feeds |
| `--bg-2` | #0F233E | app sidebar navy — card and panel surfaces in the chaos section |
| `--ink` | #F2F5FA | headline ink |
| `--ink-2` | #A9B6CA | secondary copy, notification body |
| `--paper` | #F4F6FA | app screen background (UI captures sit on it) |
| `--accent` | #19A7A0 | app teal-bright = the logo's center dot. THE one accent |

**The accent tells the story:** the chaos section (0–10 s) is strictly monochrome navy/ink. Teal first appears at the
snap (10 s) as the single dot everything collapses into, and from then on it marks every fix (key word + focus ring).

## 2. Type
- Display: Manrope 800 (the app's display face, `assets/fonts/Manrope-var.woff2`), tracking -0.03em, line-height 0.98,
  sentence case, full stops (the app's punctuation habit). Left-aligned at x ≥ 120 px (9:16: x = 96 px at 1080 wide, inside safe zone).
- UI: Inter 500/600 (`assets/fonts/Inter-var.woff2`) for notification sender lines and small labels.
- Sizes at 1080 wide: hook 120–150 px, fix captions 96–110 px, notification text ≥ 40 px, nothing read < 28 px.
- Accent on the second phrase only ("…does itself.", "…with the reference.", "One tap.", "…worked out.", "Under control.").

## 3. Rhythm
120 BPM, bar = 2 s. Hard cuts on bar lines (b4, b20, b22 etc. — the fix scenes cut every 5 beats = 2.5 s, landing on
half-bars, each with a shutter on the cut). Notification pops on beats, accelerating to half-beats in the avalanche.
Nothing holds longer than one bar without a new element.

## 4. Transitions (allowed)
Hard cut on the bar · collapse-reveal (the pile collapses into the teal dot, the logo grows out of it) · push-through
(payment form → its ledger row) · card rise (notifications). Never crossfades, spins, glitches, light leaks.

## 5. Camera
Constant micro push on every hold (1.00 → 1.05). Punch-ins on real UI to make text readable at phone size
(scale the camera, never the font). Slight perspective on UI cards settling to ~3°, deep soft shadows, never glow.

## 6. Texture & finish
Clean digital, very light seeded grain on the navy canvas only. Depth from shadow and scale, never glow on UI.

## 7. Text in / out
Enter: rise through a mask (TYPE.rise, heavy preset), notifications card-rise from below (default preset).
Exit: lift through the mask, or pushed past camera / covered by the next card. Never a fade.

## 8. Sound
Synth score: intro groove (hook) → dark half-time under the messages → build + accelerating claps through the
avalanche → stop-time gap → drop on the snap → full groove for the fixes → outro on the logo.
SFX: pop per notification (gain rising with the pile), thump on "Every. Single. Month.", whoosh into the collapse,
click on every real UI press, shutter on each hard cut, pop on each focus ring, thump on the logo. No voiceover.
