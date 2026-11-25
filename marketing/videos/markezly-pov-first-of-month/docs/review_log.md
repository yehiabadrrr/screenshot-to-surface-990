# Review log

Every check is made from the rendered MP4s (`python3 scripts/review.py <round>`) plus the per-beat contact sheets
(`node scripts/render.mjs --sheet`). Nothing is judged from the page. Critic prompt: the skill's `reference/CRITIQUE.md`.

Scores 1–10. Ship only when EVERY score is ≥ 8, after at least 3 rounds.

---

## Round 1: <what was rendered, when>

| Criterion | Score | Evidence (timestamps, frames, metrics) |
|---|---|---|
| Hook (first 2 s) | | |
| Readability at phone size | | |
| Motion quality | | |
| Variety / pacing | | |
| Brand accuracy | | |
| Sound sync | | |
| Composition (every format) | | |
| Polish | | |

**3 worst problems**
1.
2.
3.

**Fixes for round 2**
1.
2.
3.

## Round 1: draft_9x16.mp4 + draft_4x5.mp4 (24.0 s, 30 fps), beat sheets, r1 contact/strips/phone/safe/seam, metrics.json, stills at 8.0, 8.25, 10.03, 10.2, 10.55, 11.0, 21.0, 21.25 s (9:16) and 11.9, 14.6 s (4:5)

| Criterion | Score | Evidence (timestamps, frame numbers, metric values) |
|---|---|---|
| Hook (first 2 s) | 7 | f0 (loop_seam B f0) reads "POV: you run a", half a sentence. "tutoring center" is still rising at f2–f5. Both lines read by 1.0 s (contact 1.0 s) and the DEC 1 tile lands at about 1.3 s (sync -67 ms), so the promise lands inside 1.5 s. The 9:16 frame is empty below y ≈ 45 % for the whole 2 s (phone_9x16 0 s, 1 s), and the tile is small and static after landing. |
| Readability at phone size | 5 | Captions and notification text read at 360 px (phone_9x16 2–9 s). The proof inside the real UI does not: "17 Charges on finalize" (12.5–13 s), "IP447192011" (14–15 s), the "Owing 106" pill (16.5–18 s) and "40% of collected tuition" (19–21 s) are about 5–7 px tall in phone_9x16 and phone_4x5. Whole panels are shown at about 0.5x, and the punch-ins promised in the shotlist never happen. safe_9x16: the right UI rail covers the right ~12 % of every UI card (balance column at 18 s, "InstaPay" method cell of the ledger row at 15 s) and the "?" of "Mr. Hesham's 40%?" (19–20 s). The CTA tagline is the most legible thing in the film. "markezly.dev" is the weakest line at about 15 px. |
| Motion quality | 5 | strip_fast2: incoming notification cards enter on an opacity ramp, so f178 (5.933 s) shows "Paid 600 cash…" ghosted over "Cash drawer says 1,200…" and f185 (6.167 s) shows "Is there class tomorrow?" ghosted over "Paid 600 cash…". That is a fade used as an enter, which caps this at 6. The shotlist's key transition, the collapse-reveal, is not on screen: the pile is gone in one frame at 10.0 s (near-blank), a rounded ring then grows off the left edge (10.2 s), and the M appears at 10.55 s with a separate teal dot left behind on the "O". No motion blur on any fast move. Caption rises and the UI-card settle (strip_fast f331–f340) are clean and weighted. |
| Variety / pacing | 6 | max_gap_between_visual_events 2.67 s (21.33 s), longest_static 0.87 s (19.87 s), so no cap. Hook, card rise, avalanche and word slams vary well from 0 to 10 s. From 11.0 to 21.0 s, four fix scenes use the same template (caption top, full UI panel at the same size, ring), with hard cuts every 2.5 s and one push-through at 15.0 s. There is no change of shot size and no punch-in. The film decelerates into the logo instead of building. |
| Brand accuracy | 7 | Real captured UI, real M logo, Manrope/Inter, one teal accent. Teal is held back until 10.0 s as specified, and the chaos section is monochrome. However, a grey veil dims the real UI to muddy grey on every ring beat (b26, b30–31, b34–35, b39–41), so the app's #F4F6FA paper never reads as itself. In 9:16 the "sample data / demo" notice only shows as a cropped yellow strip at 13.5 s (4:5 b27 shows "Demo only" properly). The teacher card is cut at the right edge ("Taught across the c…", 19–21 s). |
| Sound sync | 5 | Capped at 6. hits_within_45ms is 25/37 and mean_abs is 37.8 ms. There is a systematic -67 ms (picture two frames ahead of the audio) on the pops at 3.5, 5.0, 6.0, 6.5, 7.0 and 7.5 s, the logo pop (10.5 s), the click at 11.75 s, the ring at 12.75 s, the whoosh at 15.0 s and "Under control." (21.5 s). The 6.245 s avalanche pop is at -100 ms (> 80 ms). Loudness is -14.1 LUFS (OK), but Peak is -0.8 dBFS, above the -1 dBTP ceiling. |
| Composition (every format) | 5 | Capped at 7. In 9:16, 2.0–4.0 s holds one or two cards in the top ~35 % with about 60 % of the frame empty below (phone_9x16 2 s, 3 s). In 8.0–10.0 s the pile is dimmed to near-black with the lower half dead. The end card (21–24 s) sits at y 30–60 % with the lower 40 % empty. 4:5 is not re-blocked: the shotlist wanted the date tile to the right of the text, but it sits below as in 9:16. In 4:5 at 14.6 s, "the reference." overlaps the top of the payment dialog by about 25 px (teal text on the grey UI). At 10.2 s the ring is clipped by the left frame edge in both formats. UI cards have a real shadow and depth. |
| Polish | 5 | Capped at 7. near_blank_frames: 1 frame at 10.0 s (luma 16) mid-film. Notification enters are double-exposed (5.933 s, 6.167 s). In the avalanche pile (6.0–10.0 s), orphan line-ends ("says 1,500.", "November??", "screenshot.", "directly.") float with their cards invisible, and glyphs are cut mid-line. An orphan teal dot touches the "O" of "Or…" at 10.55 s. "Every." slams through the still-visible "Where is the notebook." card (8.0–8.25 s). The loop seam is clean (jump 10.0, navy to navy, type to type). |

**3 worst problems** (ranked by damage to the film, each with timestamp + cause)
1. **11.0–21.0 s: the proof is illegible on a phone.** The four must-show facts ("17 charges on finalize", "IP447192011", "Owing 106", "40% of collected tuition") are 5–7 px at 360 px wide. The cause is that each UI capture is placed whole at about 0.5x scale with no camera punch-in, and the cards run into the 9:16 right UI rail. Half the brief's message is on screen but cannot be read.
2. **10.0–10.6 s: the snap, the film's turn, is broken.** There is no visible collapse: the pile vanishes in one near-blank frame (10.0 s, luma 16). A ring grows off the left frame edge (10.2 s). The M logo then appears on its own while the teal dot is left as a stray mark on the "O" of "Or…" (10.55 s). The cause is that the collapse tween and the dot-to-mark handoff are not chained, and the dot's anchor sits at the frame edge.
3. **Whole film: sound is out of spec and lags the picture.** The audio is systematically 67 ms late on 11 cues, 100 ms late at 6.245 s, only 25/37 hits are within ±45 ms, and Peak is -0.8 dBFS. The cause is that the SFX are placed on the beat grid while the visuals land about two frames earlier (springs pre-rolled), and there is no true-peak ceiling in the mix.

**Fixes for round 2** (concrete, testable, one per problem: what changes, where, and how to verify it)
1. In each fix scene, punch the camera (scale the camera, never the font) to 1.8–2.4x onto the one proof value, and settle the ring on it at the ring beat. The scenes are attendance (preview card, "17 Charges on finalize"), payment (the reference field, then the TX-43777 row with the InstaPay + reference cells), students (the "Owing 106" chip plus two red balances) and teachers (the "Revenue share · 40% of collected tuition" row). Remove the grey dim veil: isolate the value with the ring plus a scale/shadow lift instead. Keep every proof value inside x ≤ 88 % in 9:16. Verify in phone_9x16.jpg and phone_4x5.jpg that each value is at least 20 px cap height at 360 px wide, and in safe_9x16.jpg that none touches the red zones. In 4:5, move the UI top below the caption so the two never overlap (still at 14.6 s).
2. Rebuild the snap as one chained move. From b19.5 to b20, the pile and the "Every. Single. Month." words scale and translate on a spring into a teal dot anchored at x = 96 px (the caption's left edge), with motion blur and no frame without content. At b21 the M mark grows out of that dot, and the dot becomes the mark's own centre dot: no separate ring, nothing past the frame edge, no dot left on the "O". Verify that metrics near_blank_frames is empty and that stills at 9.9, 10.0, 10.2, 10.55 s show the pile shrinking into the dot, then the mark growing from it.
3. Re-time every SFX cue to the frame where its visual actually lands. Move the pops/clicks/whoosh/"Under control." pop 2 frames earlier where the visual is 67 ms early, and 3 frames earlier at 6.245 s. Alternatively, delay those visual pre-rolls by 2 frames. Put a true-peak limiter at -1.5 dBTP on the master and re-normalise to -14 LUFS. Verify in metrics: hits_within_45ms ≥ 35/37, no cue beyond ±45 ms, I = -14 ±0.5 LUFS, Peak ≤ -1.0.

Also on the list for round 2, not in the top 3 but each one caps a score: card enters must rise opaque (no opacity ramp, so no double exposure at 5.93/6.17 s); fill the empty lower 60 % of 9:16 at 2–4 s (start the stack lower or larger cards) and move the end-card lockup into the vertical middle; re-block 4:5 as the shotlist specified (tile to the right of the text); vary shot size across the four fix scenes so 11–21 s builds rather than repeats; hide line-ends of covered pile cards.

**Verdict:** ANOTHER ROUND
