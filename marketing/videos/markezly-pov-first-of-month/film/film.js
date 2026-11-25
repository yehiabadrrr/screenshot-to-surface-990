// Markezly — "POV: 1st of the month" (approved shotlist: docs/shotlist.md).
// Pure function of time: no timers, no Math.random, nothing mutated in run().
// Product shots are REAL captures of the app (assets/cap/*.jpg, 2x). Boxes below are copied from assets/cap/manifest.json
// (CSS px of the 1920x1080 app window). Notification cards are illustrative, not product UI.
(() => {
  const { W, H, pick, put, reg, el, scene, sp, spHit, trk, trkObj, seg, clamp, lerp, ease, bt, beatOf, beatAt, mulberry32 } = C;
  const { line, rise } = TYPE;
  C.fonts = ['800 100px Display', '500 40px UI', '600 40px UI'];

  // ---------------------------------------------------------------- layout per format: pick(16x9, 4x5, 9x16)
  const PAD = pick(140, 96, 96);
  const CAP_Y = pick(120, 96, 290);            // caption block top (9:16: below the top 14 % platform zone)
  const CAP_SIZE = pick(104, 66, 96);
  const CAP_LH = CAP_SIZE * 1.12;
  const BOX = { x: 48, y: pick(380, 470, 760), w: W - 96, h: pick(620, 840, 770) };
  // things that snap in (opacity within ~3 frames) read on their first frame, so they lead the beat by only 2 frames
  const SNAP = 2 / 60;
  // the snap: everything collapses into the exact point where the logo's teal dot will sit
  const TM = { ms: pick(150, 120, 150), my: pick(170, 150, 560) };
  const DOT = { x: PAD + TM.ms / 2, y: TM.my + TM.ms * 0.75, d: TM.ms * 5.2 / 32 };
  const EM = { ms: pick(130, 120, 150), y0: pick(220, 330, 600) };
  const END_DOT = { x: PAD + EM.ms / 2, y: EM.y0 + EM.ms * 0.75, d: EM.ms * 5.2 / 32 };   // UI window; 9:16 ends at 1520 (< 80 %)

  // ---------------------------------------------------------------- shared: a real capture inside a camera window
  const BOXES = {
    att: { c1: { x: 1115, y: 509, w: 95, h: 40 }, c2: { x: 1115, y: 586, w: 95, h: 40 }, c3: { x: 1115, y: 663, w: 95, h: 40 },
           all: { x: 1212, y: 437, w: 203, h: 36 }, preview: { x: 1456, y: 338, w: 352, h: 365 } },
    pay: { ref: { x: 729, y: 645, w: 462, h: 36 }, method: { x: 729, y: 481, w: 223, h: 36 } },
    row: { x: 369, y: 389, w: 1438, h: 62 },
    chip: { x: 537, y: 183, w: 127, h: 38 },
    share: { x: 389, y: 450, w: 425, h: 61 }, card0: { x: 369, y: 365, w: 465, h: 302 },
  };

  // 4x-density crops of the proof regions (scripts/capture-hires.mjs), laid over their 2x capture at the same rect
  const HIRES = {
    'att-all': [{ file: 'att-all', clip: { x: 1456, y: 338, w: 352, h: 380 } }],
    'pay-dialog': [{ file: 'pay-dialog', clip: { x: 704, y: 170, w: 512, h: 740 } }],
    'fin-row': [{ file: 'fin-row', clip: { x: 369, y: 349, w: 1438, h: 142 } }],
    'students-all': [{ file: 'students-all', clip: { x: 369, y: 170, w: 620, h: 64 } }],
    'students-owing': [{ file: 'students-owing', clip: { x: 369, y: 170, w: 620, h: 64 } }, { file: 'students-owing-bal', clip: { x: 1340, y: 340, w: 440, h: 560 } }],
    'teachers': [{ file: 'teachers', clip: { x: 369, y: 365, w: 465, h: 302 } }],
  };
  function shot(root, S, caps, B = BOX, radius = 28) {
    S.B = B;
    S.box = el('div', { class: 'shot', style: `left:${B.x}px;top:${B.y}px;width:${B.w}px;height:${B.h}px;border-radius:${radius}px;transform-origin:0 0` }, root);
    reg(S.box, { o: 0 });
    // the camera moves ONE layer; captures, crops and rings are children, so rings can never drift off their target
    S.layer = reg(el('div', { class: 'abs', style: 'width:1920px;height:1080px' }, S.box));
    S.imgs = caps.map((n) => {
      const g = reg(el('div', { class: 'abs', style: 'width:1920px;height:1080px' }, S.layer), { o: 0 });
      el('img', { src: `../assets/cap/${n}.jpg`, style: 'position:absolute;left:0;top:0;width:1920px;height:1080px' }, g);
      for (const h of HIRES[n] || []) el('img', { src: `../assets/cap4/${h.file}.jpg`,
        style: `position:absolute;left:${h.clip.x}px;top:${h.clip.y}px;width:${h.clip.w}px;height:${h.clip.h}px` }, g);
      return g;
    });
    S.ring = reg(el('div', { class: 'abs', style: 'border:4px solid var(--accent);border-radius:12px;box-sizing:border-box' }, S.layer), { o: 0 });
    S.cur = reg(el('div', { class: 'abs' }, S.box,
      '<svg width="44" height="50" viewBox="0 0 30 34"><path d="M4 3 L4 26 L10 20.5 L14.2 30 L18.4 28.2 L14.3 18.9 L22.5 18.6 Z" fill="#0B1A2E" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>'), { o: 0 });
  }
  // camera: focal point (capture px) + scale (stage px per capture px), clamped so the image always covers the window
  function cam(S, c, active) {
    const B = S.B;
    const s = Math.max(c.s, B.w / 1920, B.h / 1080);
    const x = clamp(B.w / 2 - c.x * s, B.w - 1920 * s, 0), y = clamp(B.h / 2 - c.y * s, B.h - 1080 * s, 0);
    put(S.layer, { x, y, s });
    S.imgs.forEach((g, i) => put(g, { o: i === active ? 1 : 0 }));
    return { x, y, s };
  }
  // focus ring in capture px: draws in left→right over ~8 frames while settling 1.06 → 1; constant 4 px on screen
  function ring(S, v, b, p, pad = 8) {
    const w = b.w + 2 * pad, h = b.h + 2 * pad;
    put(S.ring, { o: p > 0.01 ? 1 : 0, x: b.x - pad - w * 0.03 * (1 - p), y: b.y - pad - h * 0.03 * (1 - p), s: 1.06 - 0.06 * p,
      clip: `inset(0 ${(100 * (1 - clamp(p * 1.15))).toFixed(1)}% 0 0)`,
      css: { width: w + 'px', height: h + 'px', borderWidth: (4 / v.s).toFixed(2) + 'px', borderRadius: (12 / v.s).toFixed(2) + 'px' } });
  }
  function cursor(S, v, pt, o, clicks, t) {
    const last = clicks.filter((c) => t >= bt(c) - 0.017).pop();
    const since = last == null ? 9 : t - (bt(last) - 0.017);
    const press = since < 0.12 ? 0.86 + 0.14 * (since / 0.12) : 1;
    put(S.cur, { o, x: v.x + pt.x * v.s - 6, y: v.y + pt.y * v.s - 4, s: press });
  }
  // window enters on its cut beat (card rise, opacity snaps in within ~3 frames), micro push while held
  // window enters on its cut beat (rise, opacity snaps within ~3 frames); micro push about its centre; optional tilt r (deg)
  function boxIn(S, t, from, to, r = 0) {
    const B = S.B, p = spHit(t, from, 'default', SNAP);
    const k = (0.94 + 0.06 * p) * (1 + 0.03 * ease.inOut(seg(t, from, to)));
    put(S.box, { o: p > 0.001 ? 1 : 0, x: (B.w / 2) * (1 - k), y: 70 * (1 - p) + (B.h / 2) * (1 - k), s: k, r });
  }
  function caption(root, q, a) {
    const lines = [];
    q.forEach((txt, i) => lines.push(line(root, txt, { x: PAD, y: CAP_Y + i * CAP_LH, size: CAP_SIZE })));
    a.forEach((txt, i) => lines.push(line(root, txt, { x: PAD, y: CAP_Y + (q.length + i) * CAP_LH, size: CAP_SIZE, color: 'var(--accent)' })));
    return { lines, nq: q.length };
  }
  function captionRun(t, Cp, qAt, aAt, outAt = null) {
    Cp.lines.forEach((L, i) => rise(t, L, (i < Cp.nq ? beatOf(qAt) : beatOf(aAt)) + (i < Cp.nq ? i : i - Cp.nq) * 0.18, outAt, { stagger: 0.05 }));
  }

  // ================================================================ 1 · HOOK (b0 → 4)
  scene({
    name: 'hook', from: 'hook', to: 'n1',
    build(root, S) {
      const sz = pick(120, 62, 112), lh = sz * 1.1, y0 = pick(160, 330, 300);
      S.l = ['POV: you run a', 'tutoring center', 'and it’s the', '1st of the month.'].map((txt, i) =>
        line(root, txt, { x: PAD, y: y0 + i * lh + (i > 1 ? sz * 0.35 : 0), size: sz, color: i > 1 ? 'var(--ink)' : 'var(--ink)' }));
      // calendar tile (illustration): month strip + a big "1"
      const ty = pick(700, 700, 940), ts = pick(260, 290, 520), tx = pick(PAD, W - 96 - 290, PAD);
      S.tile = reg(el('div', { class: 'abs', style: `left:${tx}px;top:${ty}px;width:${ts}px;height:${ts * 1.08}px;border-radius:34px;background:var(--paper);overflow:hidden;box-shadow:0 40px 90px -30px rgba(0,0,0,.8);transform-origin:50% 50%` }, root,
        `<div style="height:${ts * 0.27}px;background:#1E3555;color:#C9D4E3;font:700 ${ts * 0.12}px UI, sans-serif;letter-spacing:.18em;display:flex;align-items:center;justify-content:center">DEC</div>
         <div style="font:800 ${ts * 0.62}px Display, sans-serif;color:#0B1A2E;text-align:center;line-height:1.25;letter-spacing:-.04em">1</div>`), { o: 0 });
    },
    run(t, b, S) {
      rise(t, S.l[0], -1.4, null, { stagger: 0.04 });        // both hook lines are fully up on frame 0
      rise(t, S.l[1], -1.2, null, { stagger: 0.04 });
      rise(t, S.l[2], beatOf('hook_l2') - 0.2, null, { stagger: 0.04 });
      rise(t, S.l[3], beatOf('hook_l2') + 0.05, null, { stagger: 0.04 });
      const p = spHit(t, 'hook_date', 'heavy', SNAP);
      put(S.tile, { o: p > 0.001 ? 1 : 0, s: (0.82 + 0.18 * p) * (1 + 0.04 * seg(t, 2.6, 4)), r: -6 * (1 - p) });
      put(S.root, { s: 1 + 0.035 * seg(t, 0, 4) });           // micro push
    },
  });

  // ================================================================ 2–4 · MESSAGES → AVALANCHE → EVERY. SINGLE. MONTH. (b4 → 20)
  const NOTES = [
    ['Omar’s mom', 'Sent it on InstaPay. Here’s the screenshot.'],
    ['Mr. Hesham · Physics', 'When do I get my 40%?'],
    ['Front desk', 'Who still hasn’t paid for November??'],
    ['You', 'Group B’s register… page 14 or 15?'],
    ['Accountant', 'Cash drawer says 1,200. Notebook says 1,500.'],
    ['Ziad’s dad', 'Paid 600 cash to the teacher directly.'],
    ['Front desk', 'Is there class tomorrow?'],
    ['Nour’s mom', 'Can I pay half now?'],
    ['Ms. Mona', 'Need my session count for October.'],
    ['Front desk', 'Receipt book is full.'],
    ['Omar’s mom', 'Did you get the screenshot??'],
    ['Accountant', 'Which branch was that payment?'],
    ['You', 'Where is the notebook.'],
  ];
  const NOTE_AT = [4, 5.5, 7, 8.5, 10, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5];
  scene({
    name: 'messages', from: 'n1', to: 'snap',
    build(root, S) {
      // everything that collapses into the dot lives in one wrapper; the dot itself stays outside it
      S.content = reg(el('div', { class: 'abs', style: `width:${W}px;height:${H}px` }, root));
      S.stack = reg(el('div', { class: 'abs', style: `width:${W}px;height:${H}px` }, S.content));
      const nw = Math.round(W * 0.92), nh = pick(170, 186, 196);
      S.nh = nh;
      S.notes = NOTES.map(([who, msg], i) => {
        const n = el('div', { class: 'note', style: `left:${Math.round(W * 0.04)}px;top:0;width:${nw}px;height:${nh}px;transform-origin:50% 0` }, S.stack,
          `<div class="nt"><div style="position:absolute;left:30px;top:30px;width:64px;height:64px;border-radius:32px;background:#21395C;color:#C9D4E3;font:700 26px UI,sans-serif;display:flex;align-items:center;justify-content:center">${who.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('')}</div>
           <div style="position:absolute;left:118px;top:26px;font:600 ${pick(28, 30, 34)}px UI,sans-serif;color:#A9B6CA">${who}<span style="color:#62728C;font-weight:500"> · now</span></div>
           <div style="position:absolute;left:118px;top:70px;right:${Math.round(W * 0.08) + 24}px;font:500 ${pick(40, 40, 44)}px/1.2 UI,sans-serif;color:#F2F5FA">${msg}</div></div>`);
        reg(n.querySelector('.nt'));
        return reg(n, { o: 0 });
      });
      S.counter = reg(el('div', { class: 'abs ui', style: `left:${PAD}px;top:${pick(60, 40, 300)}px;font-size:34px;color:var(--ink);background:#1E3555;border-radius:40px;padding:12px 26px` }, S.content, '5 unread'), { o: 0 });
      S.scrim = reg(el('div', { class: 'abs', style: `width:${W}px;height:${H}px;background:var(--bg)` }, S.content), { o: 0 });
      const ws = pick(200, 190, 220), wy = pick(260, 300, 560);
      S.every = ['Every.', 'Single.', 'Month.'].map((w, i) => line(S.content, w, { x: PAD, y: wy + i * ws * 1.05, size: ws }));
      S.dot = reg(el('div', { class: 'abs', style: 'width:40px;height:40px;border-radius:20px;background:var(--accent);transform-origin:50% 50%' }, root), { o: 0 });
    },
    run(t, b, S) {
      const gapBase = S.nh + 20;
      // newest sits on top and pushes older cards down; the stack stays centred on the frame as it grows,
      // then compresses into a fanned pile through the avalanche
      const compress = sp(t, 12, 'default');
      const spacing = lerp(gapBase, pick(56, 48, 62), compress);
      const top = pick(H * 0.18, H * 0.2, H * 0.24);         // first card at ~24 %; the stack grows downward (≤ 78 %)
      S.notes.forEach((n, i) => {
        const p = spHit(t, NOTE_AT[i], 'default', i >= 5 ? 0 : SNAP);
        if (p <= 0.001) { put(n, { o: 0 }); return; }
        // depth = how many cards arrived after this one (springs, so the push-down is continuous)
        let depth = 0;
        for (let j = i + 1; j < NOTE_AT.length; j++) depth += spHit(t, NOTE_AT[j], 'default', j >= 5 ? 0 : SNAP);
        // a card that is overlapped by the one above hides its text (no orphan line-ends in the pile)
        put(n.querySelector('.nt'), { o: 1 - clamp((depth - 0.2) * 3) * clamp((gapBase - spacing) / 16) });
        const y = top + depth * spacing + 110 * (1 - p);
        const s = (0.92 + 0.08 * p) * (1 - Math.min(0.16, depth * 0.035 * compress));
        const dim = Math.min(0.55, depth * 0.08 * (0.4 + compress));
        put(n, { o: 1, y, s, filter: `brightness(${(1 - dim).toFixed(3)})` });
      });
      // unread counter during the avalanche
      const arrived = NOTE_AT.filter((a) => t >= bt(a) - C.leadFor('default')).length;
      const pc = spHit(t, 'pile', 'snappy');
      const unread = Math.min(27, 5 + Math.max(0, arrived - 5) * 3 - (arrived >= 13 ? 0 : 0));
      put(S.counter, { o: pc > 0.001 ? 1 : 0, s: 0.9 + 0.1 * pc, y: H * 1.15 * sp(t, 15.55, 'heavy'), text: `${arrived >= 13 ? 27 : unread} unread` });
      // Every. Single. Month.
      put(S.stack, { y: H * 1.15 * sp(t, 15.55, 'heavy') });
      rise(t, S.every[0], beatOf('every_1') - 0.1, null, { stagger: 0 });
      rise(t, S.every[1], beatOf('every_2') - 0.2, null, { stagger: 0 });
      rise(t, S.every[2], beatOf('every_3') - 0.2, null, { stagger: 0 });
      // camera: slow push through the chaos, then the whole frame collapses into one teal dot (peaks on the snap)
      const push = 1 + 0.1 * seg(t, 4, 19);
      const col = sp(t, 19.3, 'heavy');                     // ~0.35 s spring: < 0.1 scale by the snap
      const cx = DOT.x, cy = DOT.y;
      const k = push * (1 - 0.995 * col);                    // scale about the logo-dot point
      put(S.content, { s: k, x: cx * (1 - k), y: cy * (1 - k), hide: k < 0.02 });
      const dp = sp(t, 19.72, 'snappy');                     // arrives as the words shrink into its point
      put(S.dot, { o: dp > 0.01 ? 1 : 0, x: cx - 20, y: cy - 20, s: (DOT.d / 40) * dp });
    },
  });

  // ================================================================ 5 · THE SNAP (b20 → 22)
  scene({
    name: 'turn', from: 'snap', to: 'f1', pre: 0.1, cut: false,   // overlaps the last 3 frames of the collapse: never an empty frame
    build(root, S) {
      const ms = TM.ms, my = TM.my;
      S.my = my; S.ms = ms;
      S.dot = reg(el('div', { class: 'abs', style: 'width:40px;height:40px;border-radius:20px;background:var(--accent);transform-origin:50% 50%' }, root));
      // the app's own mark (src/components/app/logo.tsx): tile + M stroke; the teal dot is the shared element above
      S.mark = reg(el('div', { class: 'abs', style: `left:${PAD}px;top:${my}px;width:${ms}px;height:${ms}px;transform-origin:50% 75%` }, root,
        `<svg width="${ms}" height="${ms}" viewBox="0 0 32 32"><defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B78C2"/><stop offset="1" stop-color="#1D4F8C"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#t)"/><path d="M8.5 23V10L16 17.5L23.5 10V23" fill="none" stroke="white" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="24" r="2.6" fill="#19A7A0"/></svg>`), { o: 0 });
      const sz = pick(110, 84, 100), y0 = my + ms + pick(60, 50, 80);
      S.l = [line(root, 'Or… let Markezly', { x: PAD, y: y0, size: sz }), line(root, 'handle it.', { x: PAD, y: y0 + sz * 1.1, size: sz, color: 'var(--accent)' })];
    },
    run(t, b, S) {
      // dot: lands centred where the pile collapsed, then travels into the logo's center point as the mark grows around it
      const m = sp(t, 'turn_logo', 'heavy');
      const beat = sp(t, 'snap', 'snappy') - sp(t, 20.3, 'default');      // the dot lands with one firm pulse
      put(S.dot, { x: DOT.x - 20, y: DOT.y - 20, s: (DOT.d / 40) * (1 + 0.5 * beat) });
      // the mark grows continuously out of the dot (its own centre dot stays where the dot is)
      const m0 = (DOT.d * 1.15) / S.ms;
      put(S.mark, { o: m > 0.001 ? 1 : 0, s: m0 + (1 - m0) * m });
      rise(t, S.l[0], beatOf('turn') + 0.05, null, { stagger: 0.06 });
      rise(t, S.l[1], beatOf('turn_logo') + 0.25, null, { stagger: 0.06 });
      put(S.root, { s: 1 + 0.03 * seg(t, 20, 22) });
    },
  });

  // ================================================================ 6–9 · THE FIXES (real UI)
  // 6 · attendance: three Present taps, then "Mark all unmarked present"; the real billing preview updates.
  scene({
    name: 'f1', from: 'f1', to: 'f2',
    build(root, S) { shot(root, S, ['att-0', 'att-1', 'att-2', 'att-3', 'att-4', 'att-all']); S.cap = caption(root, ['Tap present.'], ['Billing does', 'itself.']); },
    run(t, b, S) {
      boxIn(S, t, 'f1', 'f2');
      captionRun(t, S.cap, 'f1', 'f1_b');
      const state = [['f1_c1', 1], ['f1_c2', 2], ['f1_c3', 3], ['f1_cabs', 4], ['f1_c4', 5]].reduce((a, [m, i]) => (t >= bt(m) ? i : a), 0);
      const c = trkObj(t, [[22, { x: 880, y: 640, s: pick(1.0, 1.12, 1.12) }], [25.35, { x: 1552, y: 650, s: pick(3.0, 3.8, 4.3) }]], 'default');
      const v = cam(S, c, state);
      const T = BOXES.att, mid = (q) => ({ x: q.x + q.w * 0.42, y: q.y + q.h * 0.6 });
      const ab = { x: 1216, y: 740, w: 95, h: 40 };   // Mariam's "Absent" (launch-film manifest, att-4 target)
      const pt = trkObj(t, [[22.5, { x: 1300, y: 900 }], [22.95, mid(T.c1)], [23.5, mid(T.c2)], [24.0, mid(T.c3)], [24.5, mid(ab)], [25.0, mid(T.all)]], 'snappy');
      cursor(S, v, pt, C.win(t, 22.5, 25.4), ['f1_c1', 'f1_c2', 'f1_c3', 'f1_cabs', 'f1_c4'], t);
      ring(S, v, { x: 1477, y: 619, w: 151, h: 63 }, sp(t, 'f1_ring', 'snappy'), 6);   // "17 · Charges on finalize" (measured)
    },
  });

  // 7 · payments: the real form with InstaPay + reference, then a push into the ledger row it created.
  scene({
    name: 'f2', from: 'f2', to: 'f3',
    build(root, S) { shot(root, S, ['pay-dialog', 'fin-row'], { x: 76, y: BOX.y + 30, w: W - 152, h: BOX.h - 50 }); S.cap = caption(root, ['InstaPay', 'screenshot?'], ['Logged. With', 'the reference.']); },
    run(t, b, S) {
      boxIn(S, t, 'f2', 'f3', -3 * (1 - sp(t, 'f2_row', 'default')));
      captionRun(t, S.cap, 'f2', 'f2_b');
      const onRow = t >= bt('f2_row') ? 1 : 0;
      const c = onRow
        ? trkObj(t, [['f2_row', { x: 1150, y: 420, s: pick(2.0, 2.3, 2.4) }], [31, { x: 1694, y: 420, s: pick(2.4, 2.9, 3.1) }]], 'default')
        : trkObj(t, [[27, { x: 960, y: 560, s: pick(1.5, 1.9, 2.1) }], [28.2, { x: 840, y: 650, s: pick(2.6, 3.1, 3.4) }]], 'default');
      const v = cam(S, c, onRow);
      if (!onRow) ring(S, v, BOXES.pay.ref, sp(t, 'f2_ring', 'snappy'));
      else if (t < bt(31)) ring(S, v, { x: 943, y: 389, w: 418, h: 62 }, sp(t, 'f2_row_ring', 'snappy'), 4);   // Method + Reference cells
      else ring(S, v, { x: 1628, y: 389, w: 131, h: 62 }, sp(t, 31.25, 'snappy'), 4);                          // +EGP 850
      put(S.cur, { o: 0 });
    },
  });

  // 8 · who owes: one tap on the real "Owing" filter, then the balance column.
  scene({
    name: 'f3', from: 'f3', to: 'f4',
    build(root, S) { shot(root, S, ['students-all', 'students-owing'], { x: 0, y: BOX.y - 20, w: W, h: BOX.h + 20 }, 0); S.cap = caption(root, ['Who still owes?'], ['One tap.']); },
    run(t, b, S) {
      boxIn(S, t, 'f3', 'f4');
      captionRun(t, S.cap, 'f3', 'f3_b');
      const c = trkObj(t, [[32, { x: 640, y: 220, s: pick(2.6, 3.0, 3.2) }], [33.2, { x: 600, y: 202, s: pick(4.0, 4.8, 5.0) }], [35.0, { x: 600, y: 202, s: pick(4.0, 4.8, 5.0) }], [35.9, { x: 1550, y: 470, s: pick(2.6, 2.9, 3.0) }]], 'default');
      const v = cam(S, c, t >= bt('f3_click') ? 1 : 0);
      const chip = BOXES.chip, cp = { x: chip.x + 40, y: chip.y + 24 };
      const pt = trkObj(t, [[32.4, { x: 980, y: 640 }], [32.85, cp]], 'snappy');
      cursor(S, v, pt, C.win(t, 32.4, 34.4), ['f3_click'], t);
      if (t < bt(35.4)) ring(S, v, chip, sp(t, 'f3_ring', 'snappy'), 6);
      else ring(S, v, { x: 1479, y: 354, w: 141, h: 195 }, sp(t, 36.0, 'snappy'), 4);   // the red balances
    },
  });

  // 9 · teacher pay: the real Teachers card, "Revenue share · 40% of collected tuition".
  scene({
    name: 'f4', from: 'f4', to: 'end', post: 0, 
    build(root, S) {
      shot(root, S, ['teachers']); S.cap = caption(root, ['Mr. Hesham’s', '40%?'], ['Already', 'worked out.']);
      S.dot = reg(el('div', { class: 'abs', style: 'width:40px;height:40px;border-radius:20px;background:var(--accent);transform-origin:50% 50%' }, root), { o: 0 });
    },
    run(t, b, S) {
      boxIn(S, t, 'f4', 'end');
      captionRun(t, S.cap, 'f4', 'f4_b', 40.3);
      // hand-off: the card collapses into the end card's teal dot (the lockup then grows out of it)
      const col = sp(t, 40.45, 'heavy'), B = S.B;
      if (col > 0.001) {
        const k = (1 - 0.995 * col);
        put(S.box, { o: 1, s: k, x: (END_DOT.x - B.x) * (1 - k), y: (END_DOT.y - B.y) * (1 - k) });
      }
      put(S.dot, { o: col > 0.6 ? 1 : 0, x: END_DOT.x - 20, y: END_DOT.y - 20, s: END_DOT.d / 40 });
      const k = BOXES.card0;
      const c = trkObj(t, [[37, { x: 600, y: 445, s: pick(1.9, 2.3, 2.5) }], [38.3, { x: 540, y: 481, s: pick(2.9, 3.3, 3.3) }]], 'default');
      const v = cam(S, c, 0);
      ring(S, v, { x: 398, y: 470, w: 262, h: 24 }, sp(t, 'f4_ring', 'snappy'), 6);   // "Revenue share · 40% of collected tuition"
      put(S.cur, { o: 0 });
    },
  });

  // ================================================================ 10 · END CARD (b42 → 48)
  scene({
    name: 'end', from: 'end', to: 'done',
    build(root, S) {
      S.push = reg(el('div', { class: 'abs', style: `width:${W}px;height:${H}px;transform-origin:${PAD}px ${H / 2}px` }, root));
      const ms = EM.ms, y0 = EM.y0;
      S.ms = ms; S.y0 = y0;
      S.mark = reg(el('div', { class: 'abs', style: `left:${PAD}px;top:${y0}px;width:${ms}px;height:${ms}px;transform-origin:50% 75%` }, S.push,
        `<svg width="${ms}" height="${ms}" viewBox="0 0 32 32"><defs><linearGradient id="t2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B78C2"/><stop offset="1" stop-color="#1D4F8C"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#t2)"/><path d="M8.5 23V10L16 17.5L23.5 10V23" fill="none" stroke="white" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="24" r="2.6" fill="#19A7A0"/></svg>`), { o: 0 });
      S.pulse = reg(el('div', { class: 'abs', style: `width:40px;height:40px;border-radius:20px;background:var(--accent);transform-origin:50% 50%` }, S.push), { o: 0 });
      S.word = line(S.push, 'Markezly', { x: PAD + ms + 34, y: y0 + ms * 0.16, size: ms * 0.62 });
      const sz = pick(130, 108, 112), ly = y0 + ms + pick(80, 80, 110);
      S.l1 = line(S.push, 'Your center.', { x: PAD, y: ly, size: sz });
      S.l2 = line(S.push, 'Under control.', { x: PAD, y: ly + sz * 1.08, size: sz, color: 'var(--accent)' });
      S.url = line(S.push, 'markezly.dev', { x: PAD, y: ly + sz * 2.45, size: pick(56, 56, 64), cls: 'ui', color: 'var(--ink)' });
      S.note = line(S.push, 'App screens shown with sample data.', { x: PAD, y: ly + sz * 2.45 + pick(90, 90, 104), size: 30, cls: 'ui', color: 'var(--ink-2)' });
    },
    run(t, b, S) {
      put(S.push, { s: 1 + 0.05 * ease.inOut(seg(t, 'end', 'done')) });
      const m = sp(t, beatOf('end') - 0.1, 'heavy');
      const m0 = (END_DOT.d * 1.15) / S.ms;
      put(S.mark, { o: m > 0.001 ? 1 : 0, s: m0 + (1 - m0) * m });   // grows continuously out of the dot the card collapsed into
      rise(t, S.word, beatOf('end') - 0.1, null, { stagger: 0.04 });
      rise(t, S.l1, beatOf('end') + 0.5, null, { stagger: 0.06 });
      rise(t, S.l2, beatOf('end_l2') - 0.2, null, { stagger: 0.06 });
      rise(t, S.url, beatOf('cta') - 0.1, null, { stagger: 0.04, preset: 'snappy' });
      rise(t, S.note, beatOf('cta') + 0.5, null, { stagger: 0.02, preset: 'snappy' });
      // the hold stays alive: the logo dot sends a ring out on beats 44 and 46
      // the hold stays alive: the logo's own dot pulses on beats 44 and 46 (no halo)
      const pz = (sp(t, 44, 'snappy') - sp(t, 44.35, 'default')) + (sp(t, 46, 'snappy') - sp(t, 46.35, 'default'));
      put(S.pulse, { o: 1, x: END_DOT.x - 20, y: END_DOT.y - 20, s: (END_DOT.d / 40) * (1 + 0.45 * pz) });
    },
  });

  C.start();
})();
