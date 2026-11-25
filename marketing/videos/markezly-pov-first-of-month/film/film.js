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
  const DOT = { x: PAD + TM.ms / 2, y: TM.my + TM.ms * 0.75, d: TM.ms * 5.2 / 32 };   // UI window; 9:16 ends at 1520 (< 80 %)

  // ---------------------------------------------------------------- shared: a real capture inside a camera window
  const BOXES = {
    att: { c1: { x: 1115, y: 509, w: 95, h: 40 }, c2: { x: 1115, y: 586, w: 95, h: 40 }, c3: { x: 1115, y: 663, w: 95, h: 40 },
           all: { x: 1212, y: 437, w: 203, h: 36 }, preview: { x: 1456, y: 338, w: 352, h: 365 } },
    pay: { ref: { x: 729, y: 645, w: 462, h: 36 }, method: { x: 729, y: 481, w: 223, h: 36 } },
    row: { x: 369, y: 389, w: 1438, h: 62 },
    chip: { x: 537, y: 183, w: 127, h: 38 },
    share: { x: 389, y: 450, w: 425, h: 61 }, card0: { x: 369, y: 365, w: 465, h: 302 },
  };

  function shot(root, S, caps) {
    S.box = el('div', { class: 'shot', style: `left:${BOX.x}px;top:${BOX.y}px;width:${BOX.w}px;height:${BOX.h}px` }, root);
    reg(S.box, { o: 0 });
    S.imgs = caps.map((n) => reg(el('img', { src: `../assets/cap/${n}.jpg` }, S.box), { o: 0 }));
    S.ring = reg(el('div', { class: 'ring abs' }, S.box), { o: 0 });
    S.cur = reg(el('div', { class: 'abs' }, S.box,
      '<svg width="44" height="50" viewBox="0 0 30 34"><path d="M4 3 L4 26 L10 20.5 L14.2 30 L18.4 28.2 L14.3 18.9 L22.5 18.6 Z" fill="#0B1A2E" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>'), { o: 0 });
  }
  // camera: focal point (capture px) + scale (stage px per capture px), clamped so the image always covers the window
  function cam(S, c, active) {
    const s = Math.max(c.s, BOX.w / 1920, BOX.h / 1080);
    const x = clamp(BOX.w / 2 - c.x * s, BOX.w - 1920 * s, 0), y = clamp(BOX.h / 2 - c.y * s, BOX.h - 1080 * s, 0);
    S.imgs.forEach((im, i) => put(im, { x, y, s, o: i === active ? 1 : 0 }));
    return { x, y, s };
  }
  const inBox = (v, b) => ({ x: v.x + b.x * v.s, y: v.y + b.y * v.s, w: b.w * v.s, h: b.h * v.s });
  function ring(S, v, b, p, pad = 10) {
    const r = inBox(v, b);
    put(S.ring, { o: p > 0.01 ? 1 : 0, x: r.x - pad, y: r.y - pad, s: 1.04 - 0.04 * p,
      css: { width: r.w + 2 * pad + 'px', height: r.h + 2 * pad + 'px' } });
  }
  function cursor(S, v, pt, o, clicks, t) {
    const last = clicks.filter((c) => t >= bt(c) - 0.017).pop();
    const since = last == null ? 9 : t - (bt(last) - 0.017);
    const press = since < 0.12 ? 0.86 + 0.14 * (since / 0.12) : 1;
    put(S.cur, { o, x: v.x + pt.x * v.s - 6, y: v.y + pt.y * v.s - 4, s: press });
  }
  // window enters on its cut beat (card rise, opacity snaps in within ~3 frames), micro push while held
  function boxIn(S, t, from, to) {
    const p = spHit(t, from, 'default', SNAP);
    const push = 1 + 0.03 * ease.inOut(seg(t, from, to));
    put(S.box, { o: p > 0.001 ? 1 : 0, y: 70 * (1 - p), s: (0.94 + 0.06 * p) * push });
  }
  function caption(root, q, a) {
    const lines = [];
    q.forEach((txt, i) => lines.push(line(root, txt, { x: PAD, y: CAP_Y + i * CAP_LH, size: CAP_SIZE })));
    a.forEach((txt, i) => lines.push(line(root, txt, { x: PAD, y: CAP_Y + (q.length + i) * CAP_LH, size: CAP_SIZE, color: 'var(--accent)' })));
    return { lines, nq: q.length };
  }
  function captionRun(t, Cp, qAt, aAt) {
    Cp.lines.forEach((L, i) => rise(t, L, (i < Cp.nq ? beatOf(qAt) : beatOf(aAt)) + (i < Cp.nq ? i : i - Cp.nq) * 0.18, null, { stagger: 0.05 }));
  }

  // ================================================================ 1 · HOOK (b0 → 4)
  scene({
    name: 'hook', from: 'hook', to: 'n1',
    build(root, S) {
      const sz = pick(120, 70, 112), lh = sz * 1.1, y0 = pick(160, 330, 300);
      S.l = ['POV: you run a', 'tutoring center', 'and it’s the', '1st of the month.'].map((txt, i) =>
        line(root, txt, { x: PAD, y: y0 + i * lh + (i > 1 ? sz * 0.35 : 0), size: sz, color: i > 1 ? 'var(--ink)' : 'var(--ink)' }));
      // calendar tile (illustration): month strip + a big "1"
      const ty = pick(700, 760, 940), ts = pick(260, 200, 520), tx = pick(PAD, W - 96 - 200, PAD);
      S.tile = reg(el('div', { class: 'abs', style: `left:${tx}px;top:${ty}px;width:${ts}px;height:${ts * 1.08}px;border-radius:34px;background:var(--paper);overflow:hidden;box-shadow:0 40px 90px -30px rgba(0,0,0,.8);transform-origin:50% 50%` }, root,
        `<div style="height:${ts * 0.27}px;background:#1E3555;color:#C9D4E3;font:700 ${ts * 0.12}px UI, sans-serif;letter-spacing:.18em;display:flex;align-items:center;justify-content:center">DEC</div>
         <div style="font:800 ${ts * 0.62}px Display, sans-serif;color:#0B1A2E;text-align:center;line-height:1.25;letter-spacing:-.04em">1</div>`), { o: 0 });
    },
    run(t, b, S) {
      rise(t, S.l[0], -0.4, null, { stagger: 0.04 });        // readable on frame 0
      rise(t, S.l[1], 0.2, null, { stagger: 0.04 });
      rise(t, S.l[2], 'hook_l2', null, { stagger: 0.04 });
      rise(t, S.l[3], beatOf('hook_l2') + 0.25, null, { stagger: 0.04 });
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
      const nw = W - 2 * 48, nh = pick(170, 196, 236);
      S.nh = nh;
      S.notes = NOTES.map(([who, msg], i) => {
        const n = el('div', { class: 'note', style: `left:48px;top:0;width:${nw}px;height:${nh}px;transform-origin:50% 0` }, S.stack,
          `<div class="nt"><div style="position:absolute;left:30px;top:30px;width:64px;height:64px;border-radius:32px;background:#21395C;color:#C9D4E3;font:700 26px UI,sans-serif;display:flex;align-items:center;justify-content:center">${who.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('')}</div>
           <div style="position:absolute;left:118px;top:26px;font:600 ${pick(28, 30, 34)}px UI,sans-serif;color:#A9B6CA">${who}<span style="color:#62728C;font-weight:500"> · now</span></div>
           <div style="position:absolute;left:118px;top:70px;right:30px;font:500 ${pick(40, 44, 50)}px/1.2 UI,sans-serif;color:#F2F5FA">${msg}</div></div>`);
        reg(n.querySelector('.nt'));
        return reg(n, { o: 0 });
      });
      S.counter = reg(el('div', { class: 'abs ui', style: `left:${PAD}px;top:${pick(60, 40, 300)}px;font-size:34px;color:var(--ink);background:#1E3555;border-radius:40px;padding:12px 26px` }, S.content, '5 unread'), { o: 0 });
      S.scrim = reg(el('div', { class: 'abs', style: `width:${W}px;height:${H}px;background:rgba(8,17,31,.78)` }, S.content), { o: 0 });
      const ws = pick(200, 190, 220), wy = pick(260, 300, 560);
      S.every = ['Every.', 'Single.', 'Month.'].map((w, i) => line(S.content, w, { x: PAD, y: wy + i * ws * 1.05, size: ws }));
      S.dot = reg(el('div', { class: 'abs', style: 'width:40px;height:40px;border-radius:20px;background:var(--accent);transform-origin:50% 50%' }, root), { o: 0 });
    },
    run(t, b, S) {
      const top = pick(160, 150, 470), gapBase = S.nh + 20;
      // arrivals so far; newest sits on top and pushes older cards down. The stack compresses through the avalanche.
      const compress = sp(t, 12, 'default');
      const spacing = lerp(gapBase, 70, compress);
      S.notes.forEach((n, i) => {
        const p = spHit(t, NOTE_AT[i], 'default', i >= 5 ? 0 : SNAP);
        if (p <= 0.001) { put(n, { o: 0 }); return; }
        // depth = how many cards arrived after this one (springs, so the push-down is continuous)
        let depth = 0;
        for (let j = i + 1; j < NOTE_AT.length; j++) depth += spHit(t, NOTE_AT[j], 'default', j >= 5 ? 0 : SNAP);
        put(n.querySelector('.nt'), { o: 1 - clamp((depth - 0.5) * 2.5 * compress) });
        const y = top + depth * spacing + 110 * (1 - p);
        const s = (0.92 + 0.08 * p) * (1 - Math.min(0.16, depth * 0.035 * compress));
        const dim = Math.min(0.55, depth * 0.08 * (0.4 + compress));
        put(n, { o: 1, y, s, filter: `brightness(${(1 - dim).toFixed(3)})` });
      });
      // unread counter during the avalanche
      const arrived = NOTE_AT.filter((a) => t >= bt(a) - C.leadFor('default')).length;
      const pc = spHit(t, 'pile', 'snappy');
      const unread = Math.min(27, 5 + Math.max(0, arrived - 5) * 3 - (arrived >= 13 ? 0 : 0));
      put(S.counter, { o: Math.min(1, pc * 8), s: 0.9 + 0.1 * pc, text: `${arrived >= 13 ? 27 : unread} unread` });
      // Every. Single. Month.
      const sc = sp(t, 15.75, 'snappy');
      put(S.scrim, { o: 0.97 * sc });
      rise(t, S.every[0], 'every_1', null, { stagger: 0 });
      rise(t, S.every[1], 'every_2', null, { stagger: 0 });
      rise(t, S.every[2], 'every_3', null, { stagger: 0 });
      // camera: slow push through the chaos, then the whole frame collapses into one teal dot (peaks on the snap)
      const push = 1 + 0.1 * seg(t, 4, 19);
      const col = ease.expoIn(seg(t, 19.55, 20));           // push-through style collapse, lands exactly on the snap
      const cx = DOT.x, cy = DOT.y;
      const k = push * (1 - 0.99 * col);                     // scale about the logo-dot point
      put(S.content, { s: k, x: cx * (1 - k), y: cy * (1 - k) });
      // the dot is born inside the collapsing pile and is already its final size on the snap: no empty frame
      put(S.dot, { o: col > 0.12 ? 1 : 0, x: cx - 20, y: cy - 20, s: (DOT.d / 40) * (0.5 + 0.5 * col) });
    },
  });

  // ================================================================ 5 · THE SNAP (b20 → 22)
  scene({
    name: 'turn', from: 'snap', to: 'f1', pre: 0.3, cut: false,   // type rises over the last frames of the collapse: never an empty frame
    build(root, S) {
      const ms = TM.ms, my = TM.my;
      S.my = my; S.ms = ms;
      S.dot = reg(el('div', { class: 'abs', style: 'width:40px;height:40px;border-radius:20px;background:var(--accent);transform-origin:50% 50%' }, root));
      // the app's own mark (src/components/app/logo.tsx): tile + M stroke; the teal dot is the shared element above
      S.mark = reg(el('div', { class: 'abs', style: `left:${PAD}px;top:${my}px;width:${ms}px;height:${ms}px;transform-origin:50% 75%` }, root,
        `<svg width="${ms}" height="${ms}" viewBox="0 0 32 32"><defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B78C2"/><stop offset="1" stop-color="#1D4F8C"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#t)"/><path d="M8.5 23V10L16 17.5L23.5 10V23" fill="none" stroke="white" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`), { o: 0 });
      const sz = pick(110, 84, 100), y0 = my + ms + pick(60, 50, 80);
      S.l = [line(root, 'Or… let Markezly', { x: PAD, y: y0, size: sz }), line(root, 'handle it.', { x: PAD, y: y0 + sz * 1.1, size: sz, color: 'var(--accent)' })];
    },
    run(t, b, S) {
      // dot: lands centred where the pile collapsed, then travels into the logo's center point as the mark grows around it
      const m = sp(t, 'turn_logo', 'heavy');
      const beat = sp(t, 'snap', 'snappy') - sp(t, 20.3, 'default');      // the dot lands with one firm pulse
      put(S.dot, { x: DOT.x - 20, y: DOT.y - 20, s: (DOT.d / 40) * (1 + 0.5 * beat) });
      put(S.mark, { o: m > 0.001 ? 1 : 0, s: 0.6 + 0.4 * m });
      rise(t, S.l[0], beatOf('turn') - 0.15, null, { stagger: 0.06 });
      rise(t, S.l[1], beatOf('turn_logo') + 0.25, null, { stagger: 0.06 });
      put(S.root, { s: 1 + 0.03 * seg(t, 20, 22) });
    },
  });

  // ================================================================ 6–9 · THE FIXES (real UI)
  // 6 · attendance: three Present taps, then "Mark all unmarked present"; the real billing preview updates.
  scene({
    name: 'f1', from: 'f1', to: 'f2',
    build(root, S) { shot(root, S, ['att-0', 'att-1', 'att-2', 'att-3', 'att-all']); S.cap = caption(root, ['Tap present.'], ['Billing does', 'itself.']); },
    run(t, b, S) {
      boxIn(S, t, 'f1', 'f2');
      captionRun(t, S.cap, 'f1', 'f1_b');
      const state = [['f1_c1', 1], ['f1_c2', 2], ['f1_c3', 3], ['f1_c4', 4]].reduce((a, [m, i]) => (t >= bt(m) ? i : a), 0);
      const c = trkObj(t, [[22, { x: 1215, y: 640, s: pick(1.3, 1.7, 1.9) }], [25.1, { x: 1555, y: 660, s: pick(1.9, 2.4, 2.6) }]], 'default');
      const v = cam(S, c, state);
      const T = BOXES.att, mid = (q) => ({ x: q.x + q.w * 0.42, y: q.y + q.h * 0.6 });
      const pt = trkObj(t, [[22.6, { x: 1380, y: 820 }], [22.95, mid(T.c1)], ['f1_c1', mid(T.c1)], [23.75, mid(T.c2)], [24.25, mid(T.c3)], [24.75, mid(T.all)]], 'snappy');
      cursor(S, v, pt, C.win(t, 22.6, 'f1_ring'), ['f1_c1', 'f1_c2', 'f1_c3', 'f1_c4'], t);
      ring(S, v, { x: 1470, y: 644, w: 165, h: 77 }, sp(t, 'f1_ring', 'snappy'), 8);   // "17 · Charges on finalize"
    },
  });

  // 7 · payments: the real form with InstaPay + reference, then a push into the ledger row it created.
  scene({
    name: 'f2', from: 'f2', to: 'f3',
    build(root, S) { shot(root, S, ['pay-dialog', 'fin-row']); S.cap = caption(root, ['InstaPay', 'screenshot?'], ['Logged. With', 'the reference.']); },
    run(t, b, S) {
      boxIn(S, t, 'f2', 'f3');
      captionRun(t, S.cap, 'f2', 'f2_b');
      const onRow = t >= bt('f2_row') ? 1 : 0;
      const c = onRow
        ? trkObj(t, [['f2_row', { x: 1150, y: 420, s: pick(1.8, 2.1, 2.2) }], [31.5, { x: 1160, y: 420, s: pick(1.9, 2.2, 2.35) }]], 'default')
        : trkObj(t, [[27, { x: 960, y: 560, s: pick(1.5, 1.9, 2.1) }], [28.2, { x: 960, y: 600, s: pick(1.7, 2.1, 2.3) }], [29.6, { x: 960, y: 660, s: 3.6 }]], 'default');
      const v = cam(S, c, onRow);
      if (!onRow) ring(S, v, BOXES.pay.ref, sp(t, 'f2_ring', 'snappy') * (1 - sp(t, 29.4, 'snappy')));
      else ring(S, v, { x: 935, y: 389, w: 430, h: 62 }, sp(t, 'f2_row_ring', 'snappy'), 6);   // Method + Reference cells
      put(S.cur, { o: 0 });
    },
  });

  // 8 · who owes: one tap on the real "Owing" filter, then the balance column.
  scene({
    name: 'f3', from: 'f3', to: 'f4',
    build(root, S) { shot(root, S, ['students-all', 'students-owing']); S.cap = caption(root, ['Who still owes?'], ['One tap.']); },
    run(t, b, S) {
      boxIn(S, t, 'f3', 'f4');
      captionRun(t, S.cap, 'f3', 'f3_b');
      const c = trkObj(t, [[32, { x: 640, y: 260, s: pick(1.8, 2.2, 2.4) }], [35.0, { x: 640, y: 260, s: pick(1.8, 2.2, 2.4) }], [35.9, { x: 1550, y: 500, s: pick(1.7, 2.0, 2.2) }]], 'default');
      const v = cam(S, c, t >= bt('f3_click') ? 1 : 0);
      const chip = BOXES.chip, cp = { x: chip.x + 40, y: chip.y + 24 };
      const pt = trkObj(t, [[32.4, { x: 980, y: 640 }], [32.85, cp]], 'snappy');
      cursor(S, v, pt, C.win(t, 32.4, 34.4), ['f3_click'], t);
      if (t < bt(35.4)) ring(S, v, chip, sp(t, 'f3_ring', 'snappy') * (1 - sp(t, 35.0, 'snappy')), 8);
      else ring(S, v, { x: 1479, y: 354, w: 141, h: 195 }, sp(t, 36.0, 'snappy'), 6);   // the red balances
    },
  });

  // 9 · teacher pay: the real Teachers card, "Revenue share · 40% of collected tuition".
  scene({
    name: 'f4', from: 'f4', to: 'end',
    build(root, S) { shot(root, S, ['teachers']); S.cap = caption(root, ['Mr. Hesham’s', '40%?'], ['Already', 'worked out.']); },
    run(t, b, S) {
      boxIn(S, t, 'f4', 'end');
      captionRun(t, S.cap, 'f4', 'f4_b');
      const k = BOXES.card0;
      const c = trkObj(t, [[37, { x: 600, y: 445, s: pick(1.6, 2.0, 2.2) }], [41.5, { x: 610, y: 470, s: pick(1.8, 2.3, 2.5) }]], 'default');
      const v = cam(S, c, 0);
      ring(S, v, BOXES.share, sp(t, 'f4_ring', 'snappy'), 6);
      put(S.cur, { o: 0 });
    },
  });

  // ================================================================ 10 · END CARD (b42 → 48)
  scene({
    name: 'end', from: 'end', to: 'done',
    build(root, S) {
      S.push = reg(el('div', { class: 'abs', style: `width:${W}px;height:${H}px;transform-origin:${PAD}px ${H / 2}px` }, root));
      const ms = pick(130, 120, 150), y0 = pick(220, 330, 600);
      S.ms = ms; S.y0 = y0;
      S.mark = reg(el('div', { class: 'abs', style: `left:${PAD}px;top:${y0}px;width:${ms}px;height:${ms}px;transform-origin:50% 75%` }, S.push,
        `<svg width="${ms}" height="${ms}" viewBox="0 0 32 32"><defs><linearGradient id="t2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B78C2"/><stop offset="1" stop-color="#1D4F8C"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#t2)"/><path d="M8.5 23V10L16 17.5L23.5 10V23" fill="none" stroke="white" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="24" r="2.6" fill="#19A7A0"/></svg>`), { o: 0 });
      S.pulse = reg(el('div', { class: 'abs', style: `width:30px;height:30px;border-radius:15px;border:3px solid var(--accent);transform-origin:50% 50%` }, S.push), { o: 0 });
      S.word = line(S.push, 'Markezly', { x: PAD + ms + 34, y: y0 + ms * 0.16, size: ms * 0.62 });
      const sz = pick(130, 108, 112), ly = y0 + ms + pick(80, 80, 110);
      S.l1 = line(S.push, 'Your center.', { x: PAD, y: ly, size: sz });
      S.l2 = line(S.push, 'Under control.', { x: PAD, y: ly + sz * 1.08, size: sz, color: 'var(--accent)' });
      S.url = line(S.push, 'markezly.dev', { x: PAD, y: ly + sz * 2.45, size: pick(56, 56, 64), cls: 'ui', color: 'var(--ink)' });
      S.note = line(S.push, 'App screens shown with sample data.', { x: PAD, y: ly + sz * 2.45 + pick(90, 90, 104), size: 30, cls: 'ui', color: 'var(--ink-2)' });
    },
    run(t, b, S) {
      put(S.push, { s: 1 + 0.05 * ease.inOut(seg(t, 'end', 'done')) });
      const m = spHit(t, 'end', 'heavy', SNAP);
      put(S.mark, { o: m > 0.001 ? 1 : 0, s: 0.8 + 0.2 * m });
      rise(t, S.word, beatOf('end') + 0.15, null, { stagger: 0.04 });
      rise(t, S.l1, beatOf('end') + 0.5, null, { stagger: 0.06 });
      rise(t, S.l2, beatOf('end_l2') + 0.2, null, { stagger: 0.06 });
      rise(t, S.url, 'cta', null, { stagger: 0.04, preset: 'snappy' });
      rise(t, S.note, beatOf('cta') + 0.5, null, { stagger: 0.02, preset: 'snappy' });
      // the hold stays alive: the logo dot sends a ring out on beats 44 and 46
      const ring = (beat) => { const k = clamp((t - bt(beat)) / 0.7); return k > 0 && k < 1 ? k : null; };
      const k = ring(46) ?? ring(44);
      const dx = PAD + S.ms / 2 - 15, dy = S.y0 + S.ms * 0.75 - 15;
      put(S.pulse, k == null ? { o: 0 } : { o: 1 - k, x: dx, y: dy, s: 1 + 5 * ease.out(k) });
    },
  });

  C.start();
})();
