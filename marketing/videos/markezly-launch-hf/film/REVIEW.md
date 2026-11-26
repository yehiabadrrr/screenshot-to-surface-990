# REVIEW: Markezly launch film, storyline A "One transfer, followed"

Delivered (draft for approval): `renders/markezly-launch-9x16-en.mp4` and `renders/markezly-launch-9x16-ar.mp4`,
1080 x 1920, 30 fps, 34.5 s, H.264 + AAC, normalised to -14.4 LUFS integrated, -0.9 dBTP.
The Arabic cut is built by `../scripts/make-ar.mjs` into `../film-ar/` (same scenes, `lang` = ar).

## Creative calls

- Storyline A was picked. Not built: B "6:00 PM, the register" (one continuous take through an evening) and
  C "فين الفلوس؟" (Arabic kinetic type match-cut to the screens). Both are in `../STORYLINES.md`.
- The amount is EGP 800, not the 850 in the storyline: Youssef Naguib (S-1095) really owes EGP 800 in the sample
  data, so the payment settles him exactly. Every number on screen comes from the running app.
- Captured on the app's own phone layout (390 x 1600 CSS px at 3x) instead of a phone mock: the screens fill the
  frame and app text never drops under ~36 px.
- Typing is shown as state changes on the tap's rebound (real captures before and after), not as fake keystrokes.
- The receipt card, the chat bubble and the month-end pile are drawn (they have no source in the product); they
  carry no messaging-app or bank branding. Everything that claims to be Markezly is a capture.
- Music is the first launch film's original score, spliced on bar lines so its impacts land on the reveal (6.0 s),
  the payoff (22.0 s) and the end card (30.0 s). Effects: ticks, clicks on real taps, one chime on Confirmed,
  whooshes on carries and whips, a thump on the logo.

## Measured vs looked at

- Measured: `hyperframes check` passes (no errors); loudness and true peak with ffmpeg; stream specs with ffprobe.
- Looked at: snapshot sheets of every scene, every seam (-0.2 to +0.2 s), phone width, and frames pulled from both
  final MP4s.
- Not checked: the sound was measured, not heard. Please listen once on a phone.

## Weakest shot and what I'd change with more time

- The form-to-ledger carry (16.45-17.1 s) is a shrink and crossfade; the toast the app shows after saving is not in
  the film. A capture of the toast over the ledger would make the hand-off more literal.
- The payoff whips (Overview -> Finance -> Student) are fast; a viewer may not register that the second card is a
  different screen. A one-word label per screen would help if feedback says it reads as one dashboard.

## Warnings kept on purpose

- `outside_safe_zone` for YouTube Shorts (top edge) and TikTok (right edge): the master is for Instagram Reels,
  whose safe area is clean. Re-check with `--safe-zone tiktok` before posting there.
- The app's own "Demo data" banner and "Add to demo data" button stay visible: honesty about sample data.

## Fixed in this pass

- App bug found while capturing: a payment lost its class after the student was picked, so percentage teacher pay
  ignored it (committed separately: "Keep a payment's class when the student is picked").
- Frame 0 now reads as a thumbnail (title fully visible), Arabic caption no longer hides behind the pile, the finger
  sits beside values in Arabic, chip contrast raised (Teal 700), stray M stroke before the logo removed.
