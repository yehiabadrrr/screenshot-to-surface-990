# SPEC: "One transfer, followed" (storyline A)

GOAL:    A center owner watches one EGP 800 InstaPay transfer travel from a chat into Markezly, get confirmed, and
         land in today's collections, the teacher's 40% and the student's settled balance, and thinks "nothing
         gets lost here". Then they book a demo on WhatsApp.
OUTPUT:  HyperFrames, 1080 x 1920 (Reels master), 30 fps. Later recomposed (not squeezed) to 4:5 and 16:9.
         Two renders from one composition: `lang` = en | ar (variables file), Arabic right to left.
TIME:    34.5 s x 30 = 1035 frames. Music 120 BPM: 1 beat = 0.5 s = 15 frames, 1 bar = 2 s = 60 frames.
         The score is the first launch film's own (`score.wav`, 58 s): film 1.0-22.0 plays score 0-21
         (drone, then the brand impact at score 5.0 = film 6.0, then the product groove); film 22.0-34.5 plays
         score 41-53.5 (the peak with claps, its final impact at score 49 = film 30.0, then the resolve).

## The real data (captured from the running app, sample center, nothing invented)

| What | Value |
| --- | --- |
| Student | Youssef Naguib, S-1095, Physics · Thanaweya 2 (Dr. Hesham Abdelaziz, 40% of collected tuition) |
| Owed before | "Balance today: EGP 800 due" (two months x EGP 400) |
| Payment | EGP 800, InstaPay, reference IP2611784403, status Pending, TX-43779 |
| Built timing | chat 0-6, record 6-16.45, ledger 16.45-22, payoff 22-30, end card 30-34.5 (see compositions/) |
| Confirmation | TX-43780 "Payment confirmed", row becomes Completed |
| Collected today | EGP 1,650 (2 payments) -> EGP 2,450 (3 payments) |
| Teacher payables | EGP 88,237 -> EGP 88,557 (+320 = 40% of 800) |
| Student after | Balance today EGP 0, Settled |

Captures: `film/assets/cap/{en,ar}/*.jpg`, phone viewport 390 x 1600 CSS px at 3x (1170 x 4800), boxes in
`manifest.json` (scripts/capture.mjs). Full-bleed a capture at 1080 wide = 2.769 px per CSS px; 13 CSS px app text
lands at 36 px. Teal chips use Teal 700 #0E7C77 (white text contrast).

## LOOK

- **Medium: the product's own phone screens.** Full-bleed captures, never a phone mock floating on a void.
  Punch-ins scale 1.6-2.0x on a wrapper; app text never under 36 px on screen.
- **Grounds (worlds):**
  1. Chat: #E6EBF1 flat, 1.5% noise. Bubbles white #FFFFFF, radius 28, shadow 0 6 18 rgba(20,43,74,.10).
  2. App: the captures themselves (app background #F4F6FA).
  3. Payoff: the app's own navy hero card (#142B4A) filling the frame through a punch-in.
  4. End card: brand navy #142B4A flat, 0% grain.
- **Ink:** #142B4A on light grounds, #FFFFFF on navy. Quiet ink #5B6B82.
- **Accent: teal #19A7A0**, rationed to the 800 amount (chip, ring), the "Confirmed" moment and the logo's
  centre point. Status colours stay the app's own.
- **Type:** display Manrope 800, titles 104 px, tracking -2%, line height 1.04, max 5 words a line;
  body Inter 600 44 px for captions; Arabic: IBM Plex Sans Arabic 700 titles 104 px, 600 captions 44 px.
  Titles sit inside the Reels safe band: y 288-1248, x 120-888 (780 px wide below y 840).
- **Depth:** one shadow only, on lifted UI pieces: 0 24 60 rgba(20,43,74,.22). No glow, no grain on UI.

## OBJECTS

- **The chat bubble:** a white bubble with a 12 px tail, sender line "Youssef's mother" / "والدة يوسف" in quiet ink
  28 px, text 44 px, time 26 px, two grey ticks. No messaging-app logo or colours.
- **The transfer receipt:** a 620 x 360 white card inside the bubble: "Transfer receipt", "EGP 800",
  "Ref IP2611784403", a green tick circle. Generic, no bank or InstaPay logo.
- **The pile:** 9 more receipt cards (amounts 450, 1,200, 600, 280, 350, 900, 400, 750, 520; refs IP26117…),
  each rotated -9..+9 degrees, dropping onto the bubble.
- **The 800 chip:** teal #19A7A0 pill, white Manrope 800 "+EGP 800", 64 px, the carrier the eye follows.
- **Cursor:** a 76 px finger-tap circle (white, 3 px #142B4A ring, 22% fill), 4% of frame width.
- **The mark:** the app's own SVG logo (M stroke + teal point), lockup 300 px wide (28% of frame).

## MOTION

- Eases: arrive `expo.out`; camera moves `power2.inOut`; exits and zoom-throughs `power3.in`;
  springs only on the chip's landing (`back.out(1.6)`), never on opacity or colour.
- Durations (frames): camera punch 15-18; title word stagger 2; title blur-in 4 (8 px -> 0);
  exits 40-50% of entrances; overlaps start at 30-50%.
- Taps: finger circle scales 1 -> 0.82 -> 1 in 6 frames; the UI changes on the rebound frame.
- One hero move per shot; secondaries travel 50-70% as far, 3-6 frames later; everything else still.
- Transitions (5 kinds): pile-to-dialog morph (object becomes the world), dialog-to-row carry across,
  punch-in hard cuts inside the app, zoom-through on Confirm, colour flood to the end card navy.

## SHOTS (seconds / frames)

| # | Time | Hero move | Reads | Sound | Hand-off |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.0-3.0 (0-90) | Bubble with receipt already on screen at frame 0; it nudges up 24 px as the title lands | "Where does this transfer go?" / "التحويل ده بيروح فين؟" (from 0.3) | two soft taps (message ticks) | the receipt is the carrier |
| 2 | 3.0-6.0 (90-180) | 9 receipts drop onto it (stagger 5 f), burying it; frame shakes 0 | "Usually: lost in the chat." / "غالبًا: بيتوه في الشات." (3.4-5.8) | score drone enters at film 1.0; tick per landing card | one card (ours) lifts out |
| 3 | 6.0-8.5 (180-255) | Our receipt lifts, grows past the frame, becomes the Record payment dialog (pay-1-student) | "Record it in Markezly" / "سجّله على مركزلي" | brand impact at 6.0 | camera already on the Student field |
| 4 | 8.5-11.0 (255-330) | Punch 1.8x on Student + "Balance today: EGP 800 due" | the app's own words | groove from 10.0 | hard cut punch |
| 5 | 11.0-15.5 (330-465) | Amount 800 -> Method InstaPay -> Reference IP2611784403 -> Status Pending, one tap each (1.1 s apart) | caption "Reference kept. Pending until it lands." / "رقم العملية محفوظ. معلّقة لحد ما توصل." | click per tap | tap on "Add to demo data" |
| 6 | 15.5-18.0 (465-540) | The dialog shrinks 1 -> 0.6 and lands as the ledger row (ledger-pending), Pending pill ringed | toast read in the app | whoosh | finger moves to Confirm |
| 7 | 18.0-22.0 (540-660) | Tap Confirm: row becomes Completed (ledger-confirmed), teal ring | caption "Confirmed. Now it counts." / "اتأكدت. ودلوقتي بتتحسب." | click, chime | the 800 chip leaves the row |
| 8 | 22.0-25.0 (660-750) | Chip flies up into "Collected today": 1,650 -> 2,450 (overview-before -> after) | the KPI itself | peak music cut at 22.0, whoosh | chip continues |
| 9 | 25.0-27.5 (750-825) | Chip splits into 320 -> Teacher payables 88,237 -> 88,557 | caption "40% to the teacher: +320" / "٤٠٪ للمدرس: +٣٢٠" | tick | then the student |
| 10 | 27.5-30.0 (825-900) | Youssef's profile, Balance today EGP 0 Settled | claim "Every pound, traced." / "كل جنيه ليه أثر." | | the chip shrinks to a teal dot |
| 11 | 30.0-34.5 (900-1035) | Navy floods from the dot; the dot becomes the logo's centre point, M draws, wordmark wipes; tagline; CTA | "Mark attendance. The billing does itself." / "سجّل الحضور… والحساب بيتعمل لوحده." + "Book a demo on WhatsApp" / "احجز عرض على واتساب" + "Shown with sample data" / "معروض ببيانات تجريبية" (26 px) | final impact at 30.0, resolve, 0.6 s fade | end |

## BANNED

Dark navy void with small floating UI (navy only as the app's own hero card and the end card); glow, bloom,
particles; mesh or purple gradients; glass cards; three cards in a row; a title over a dimmed screenshot; the logo
docked in a corner; every element fading and sliding up; titles moving after they land; click rings that pulse;
UI tilted in 3D; invented numbers or customers; any messaging-app or bank branding; typing into a prompt box as
the opener.

## QA

| Frame | Must show |
| --- | --- |
| 0 | Bubble + receipt + title already readable (it is the thumbnail) |
| 150 | Pile covering most of the receipt; caption inside safe band |
| 200 | Morph midway: receipt card larger than 60% of the frame, the dialog fading in through it |
| 300 | "Balance today: EGP 800 due" at >= 36 px, inside the safe band |
| 450 | Status "Pending (awaiting confirmation)" legible |
| 600 | Row "Completed", teal ring, caption legible |
| 720 | "Collected today EGP 2,450" legible |
| 800 | "Teacher payables EGP 88,557" + "+320" caption |
| 880 | "EGP 0 Settled" + claim |
| 1000 | Lockup centred, CTA readable, held still |
