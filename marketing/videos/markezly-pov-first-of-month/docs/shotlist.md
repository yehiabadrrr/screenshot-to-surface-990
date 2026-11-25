# Shotlist: Markezly "POV: 1st of the month" · 24 s · 120 BPM · 48 beats · formats 9x16 + 4x5

STATUS: APPROVED by the user (as drafted).

| # | Beats | Time (s) | Shot | On-screen text (exact) | Motion / transition | SFX | 9:16 · 4:5 notes |
|---|---|---|---|---|---|---|---|
| 1 | 0–4 | 0.0–2.0 | **Hook.** Navy canvas. Line 1 is readable on frame 0. A calendar tile slams in showing "1". | "POV: you run a tutoring center" / "and it's the 1st of the month." | Line 1 rises through a mask (released before frame 0); line 2 at b1.5; date tile grows 0.85→1 at b2.5 with heavy spring | pop b0, pop b1.5, thump b2.5 | 9:16: text block at y 22–48 %, tile below. 4:5: tile to the right of the text |
| 2 | 4–12 | 2.0–6.0 | **The messages.** Notification cards rise one per 1.5 beats, stacking; each new one pushes the stack down. Monochrome. | 1 "Omar's mom · Sent it on InstaPay. Here's the screenshot." 2 "Mr. Hesham · When do I get my 40%?" 3 "Front desk · Who still hasn't paid for November??" 4 "You · Group B's register… page 14 or 15?" 5 "Accountant · Cash drawer says 1,200. Notebook says 1,500." | Card rise (default preset), stack slides on a spring; camera micro-push | pop on each card (b4, 5.5, 7, 8.5, 10) | Cards 88 % width, text ≥ 40 px; newest card always inside the safe zone |
| 3 | 12–16 | 6.0–8.0 | **Avalanche.** Cards now land every half-beat, smaller and faster, piling up; an unread counter climbs 5 → 27. | Counter: "27 unread" | Faster rises, stack compresses, camera pushes in 1.0→1.12 | pop every half-beat (gain 0.4) | Counter top-left inside the safe zone |
| 4 | 16–20 | 8.0–10.0 | **Every. Single. Month.** One word per beat slams over the pile; b19 the music stops. | "Every." "Single." "Month." | Masked word rises, heavy; pile dims behind | thump b16, b17, b18 · gap b19 | Words stacked vertically on 9:16 |
| 5 | 20–22 | 10.0–11.0 | **The snap.** Everything collapses into one teal dot (first teal in the film); the Markezly mark grows out of it. | "Or… let Markezly handle it." | Collapse-reveal: pile scales into the dot (spring), mark grows from it at b21 | whoosh b20 (drop), pop b21 | Dot centered on the text's left edge, text left-aligned |
| 6 | 22–27 | 11.0–13.5 | **Fix 1: attendance.** Real Attendance screen, punched in on the roster. A cursor taps Present ×3, then "Mark all present"; the counters and "Charges on finalize: 17" update for real. | "Tap present." / "Billing does itself." | Hard cut b22; real captured states swap on each click; ring on the billing preview at b25.5 | shutter b22, click b23.5 / 24 / 24.5 / 25, pop b25.5 | Big crop of roster + preview; caption in the top third |
| 7 | 27–32 | 13.5–16.0 | **Fix 2: InstaPay.** Real Record-payment form, InstaPay selected, reference IP447192011; then a push-through into the ledger row it created (TX-43777, +EGP 850, InstaPay, reference). | "InstaPay screenshot?" / "Logged. With the reference." | Hard cut b27; ring on reference field b28.5; push-through to the Finance row b30, ring b30.5 | shutter b27, pop b28.5, whoosh b30, pop b30.5 | Crop: dialog fields, then the row (reference column visible) |
| 8 | 32–37 | 16.0–18.5 | **Fix 3: who owes.** Real Students directory; cursor taps the "Owing" filter → list shows 106 owing with red balances. | "Who still owes?" / "One tap." | Hard cut b32; click b33 swaps to the filtered capture; ring on "Owing 106" b34 | shutter b32, click b33, pop b34 | Crop: filter chips + balance column |
| 9 | 37–42 | 18.5–21.0 | **Fix 4: teacher pay.** Real Teachers page; Dr. Hesham's card: "Revenue share · 40% of collected tuition". | "Mr. Hesham's 40%?" / "Already worked out." | Hard cut b37; card lifts; ring on the pay model b38.5 | shutter b37, pop b38.5 | Crop: the card fills the width |
| 10 | 42–48 | 21.0–24.0 | **End card.** Markezly mark + wordmark lock up; tagline; URL. Keeps a slow push and the dot pulses on the downbeat. | "Your center." / "Under control." · "markezly.dev" | Lockup grows from the dot (heavy), tagline rises b43, URL b44, hold 2 s with motion | thump b42 (accent), pop b43, pop b44 | Lockup in the middle 60 % (clear of platform UI) |

Rule check: hook readable on frame 0 ✓ · something new every 0.5–2.5 s ✓ · end card hold = 2.0 s (b44–48), never static ✓.

Honesty: every fix screen is real, captured UI (sample data, demo banner visible in the crops where it fits). Teacher
pay says "worked out", not "paid" — the app accrues teacher payables but doesn't settle payouts yet. Notification cards
are illustrative (no messaging-app branding, no real people).

## Music
Synth, original: intro (b0) → dark half-time (b4) → build (b12) → stop-time gap (b19) → drop on the snap (b20) →
full groove for the fixes → outro + accent on the logo (b42/b44). Measured grid: 120.0 BPM, 0.0 ms residual.

## Open questions for the user
- none blocking. Optional: a real URL other than markezly.dev for the end card?
