/* ============================================================
   STICKMAN  —  the finale gag
   ============================================================

   He walks in from the left, kicks "Now sit back and relax" off
   the screen, takes a beat to enjoy it, then jumps, catches the
   top edge of the world and drags it down. Behind it is the film.

   ---- On the animation -------------------------------------
   Built to the classical principles that make character animation
   read as weight rather than as movement. Not a pastiche of any
   particular studio's work — the principles themselves are just
   how the craft is done:

     Anticipation      every action is preceded by its opposite.
                       He sinks before he jumps, winds back before
                       he kicks. Without it the action has no cause.
     Squash & stretch  the body compresses on impact and elongates
                       in the air, at constant volume (the width
                       scale is 1/sqrt of the height scale). This
                       is the single biggest difference between a
                       figure that has mass and one that does not.
     Follow-through    the head lags the torso and settles after it
                       stops. Nothing in a body arrives all at once.
     Slow in/slow out  everything eases; nothing moves linearly.
     Staging           before he jumps for the top of the screen he
                       points at it. The audience needs to be told
                       where to look one beat before the action.
     Appeal            a held beat after the kick, doing nothing in
                       particular. The pause is what makes him a
                       character instead of a mechanism.

   Grounding him matters as much as any of it: the contact shadow
   under his feet is what fixes him to a floor. Remove it and he
   floats, no matter how good the walk is.

   ---- Structure ---------------------------------------------
   Every pose is the same nine bones at different angles, so the
   walk, the kick and the hang all come out of one skeleton. The
   module owns nothing outside its canvas — it reports what it is
   doing through callbacks and lets app.js decide what that means.

   Public API
     Stickman.run({ target, onKick, onPull, onDone })   → Promise
     Stickman.skip()      abandon mid-performance and land on the
                          same end state, so a skip and a full watch
                          are indistinguishable afterwards
     Stickman.supported()                               → boolean
   ============================================================ */

window.Stickman = (function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- proportions ----------------------------------
     Fractions of standing height H, head-top to sole. Long-limbed
     and small-headed: a big round head reads as a cartoon, and
     this page is not a cartoon. */
  var P = {
    headR: 0.098,   // roomy enough to carry eyes and a mouth
    neck: 0.132,
    torso: 0.250,
    thigh: 0.230,
    shin: 0.220,
    upperArm: 0.200,
    foreArm: 0.190
  };
  var LEG = P.thigh + P.shin;
  var ARM = P.upperArm + P.foreArm;

  /* ---------- timeline --------------------------------------
     Absolute ms, in one table so the performance can be re-timed
     without touching the poses. */
  var T = {
    walkIn:  [0, 1500],
    windUp:  [1500, 1810],
    kick:    [1810, 2020],
    impact:  1975,
    recover: [2020, 2300],
    walkMid: [2300, 2820],    // strolls to centre stage
    turn:    [2820, 3180],    // rotates front-on
    hold:    [3180, 3800],    // looks you in the eye. the charisma beat.
    point:   [3800, 4130],    // tells you where to look next
    crouch:  [4130, 4370],
    jump:    [4370, 4790],
    grab:    [4790, 4940],
    pull:    [4940, 6030],
    hang:    [6030, 6240],
    fall:    [6240, 6660]
  };
  var END = T.fall[1];

  /* ---------- easing ---------------------------------------- */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function span(t, a) { return clamp01((t - a[0]) / (a[1] - a[0])); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { return t * t * t; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  /* Overshoot-and-settle. Used wherever something lands. */
  function settle(t, amp) {
    if (t >= 1) return 1;
    return 1 - Math.cos(t * Math.PI * 3.4) * Math.pow(1 - t, 2.2) * (amp || 1);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ---------- skeleton --------------------------------------
     Angles are world-absolute from straight-down: 0 hangs, +ve
     swings toward +x, the way he faces. */
  function tip(x, y, ang, len) {
    return [x + Math.sin(ang) * len, y + Math.cos(ang) * len];
  }

  function pose() {
    return {
      hipX: 0, hipY: 0, lean: 0, headLag: 0,
      hipL: 0, kneeL: 0, hipR: 0, kneeR: 0,
      shoL: 0, elbL: 0.12, shoR: 0, elbR: 0.12,
      sq: 1,            // <1 squashed, >1 stretched
      alpha: 1,
      shadow: 1,        // 0..1 strength
      airborne: 0,
      /* turn: 1 = full profile facing the way he walks, 0 = looking
         straight down the lens. The eyes slide across the head and the
         far one fades — the standard 2D cheat, and it reads as a head
         turning far better than any real rotation of a circle would. */
      turn: 1,
      face: { smile: 0.35, brow: 0, open: 0, blink: 0 }
    };
  }

  /* ---------- walk cycle ------------------------------------ */
  function walk(p, phase, H, k) {
    k = k === undefined ? 1 : k;
    var s = Math.sin(phase), s2 = Math.sin(phase + Math.PI);

    p.hipL = 0.52 * s * k;
    p.hipR = 0.52 * s2 * k;
    p.kneeL = Math.max(0, 0.95 * Math.sin(phase - 0.7)) * k;
    p.kneeR = Math.max(0, 0.95 * Math.sin(phase - 0.7 + Math.PI)) * k;

    p.shoL = -0.42 * s * k;
    p.shoR = -0.42 * s2 * k;
    p.elbL = 0.30 + 0.16 * Math.max(0, -s) * k;
    p.elbR = 0.30 + 0.16 * Math.max(0, -s2) * k;

    p.lean = 0.07 * k;
    p.headLag = -0.05 * Math.cos(phase) * k;          // the head trails
    p.hipY -= Math.abs(Math.sin(phase)) * 0.022 * H * k;
    p.sq = 1 - 0.035 * Math.abs(Math.cos(phase)) * k;  // weight on each footfall
    return p;
  }

  /* Both hands on the edge, shoulder-width apart rather than
     stacked in one line — a single vertical stroke does not read
     as a person, and he is hanging there for over a second. */
  function grip(p) {
    p.shoL = Math.PI - 0.10; p.elbL = 0.07;
    p.shoR = Math.PI + 0.10; p.elbR = -0.07;
  }


  /* ---------- the face --------------------------------------
     Drawn once, after both stroke passes, so it stays crisp on top
     of the dark separation pass. Everything is in head-local space:
     translate to the head centre, rotate with the neck, then draw
     at radius 1 and scale. That keeps the expression code readable
     as expression code rather than as trigonometry. */
  function drawFace(ctx, cx, cy, r, p, col) {
    var f = p.face, turn = clamp01(p.turn);
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(cx, cy);
    ctx.rotate(p.lean + p.headLag);
    ctx.scale(r, r);
    var ink = '#140d04';              // warm near-black, not pure black
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // As he turns to profile the features slide toward the near side
    // and compress, and the far eye goes with the head.
    var shift = turn * 0.30;
    var squeeze = 1 - turn * 0.42;
    var eyeGap = 0.36 * squeeze;
    var eyeY = -0.10;
    var open = clamp01(1 - f.blink);

    function eye(dx, alpha) {
      if (alpha <= 0.02) return;
      ctx.save();
      ctx.globalAlpha = p.alpha * alpha;
      if (open < 0.25) {                      // blinking: a closed lid
        ctx.lineWidth = 0.10;
        ctx.beginPath();
        ctx.moveTo(dx - 0.13, eyeY); ctx.lineTo(dx + 0.13, eyeY);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(dx, eyeY, 0.125, 0.150 * open, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    eye(shift - eyeGap, 1 - turn * 1.15);     // far eye, gone by full profile
    eye(shift + eyeGap, 1);

    // Brows carry most of the read: up = delight, down = effort.
    if (Math.abs(f.brow) > 0.02) {
      ctx.lineWidth = 0.085;
      var by = eyeY - 0.30 - f.brow * 0.10;
      var tilt = -f.brow * 0.16;
      [[shift - eyeGap, 1 - turn * 1.15, 1], [shift + eyeGap, 1, -1]]
        .forEach(function (E) {
          if (E[1] <= 0.02) return;
          ctx.save();
          ctx.globalAlpha = p.alpha * E[1];
          ctx.beginPath();
          ctx.moveTo(E[0] - 0.14 * squeeze, by - tilt * E[2]);
          ctx.lineTo(E[0] + 0.14 * squeeze, by + tilt * E[2]);
          ctx.stroke();
          ctx.restore();
        });
    }

    // Mouth: an open O for effort, otherwise a curve whose sign is
    // the difference between pleased and straining.
    var mY = 0.30;
    if (f.open > 0.02) {
      ctx.beginPath();
      ctx.ellipse(shift + turn * 0.10, mY, 0.17 * squeeze, 0.10 + 0.16 * f.open, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      var w = 0.32 * squeeze, curve = f.smile * 0.44;
      ctx.lineWidth = 0.10;
      ctx.beginPath();
      ctx.moveTo(shift - w + turn * 0.08, mY);
      ctx.quadraticCurveTo(shift + turn * 0.08, mY + curve, shift + w + turn * 0.08, mY);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- draw ------------------------------------------ */
  function render(ctx, p, H, col, groundY) {
    /* Contact shadow first: this is what puts him on a floor. It
       shrinks and fades as he leaves it, which is most of how the
       eye judges his height off the ground. */
    if (p.shadow > 0.01) {
      var lift = clamp01(p.airborne);
      var rw = H * 0.30 * (1 - lift * 0.55) * (2 - p.sq);
      var rh = H * 0.045 * (1 - lift * 0.5);
      ctx.save();
      ctx.globalAlpha = 0.42 * p.shadow * (1 - lift * 0.7) * p.alpha;
      ctx.fillStyle = '#000';
      ctx.filter = 'blur(6px)';
      ctx.beginPath();
      ctx.ellipse(p.hipX, groundY, Math.max(1, rw), Math.max(1, rh), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* Squash and stretch, about the point he stands on, at
       constant volume — wider as he gets shorter. */
    ctx.save();
    var sy = p.sq, sx = 1 / Math.sqrt(sy);
    ctx.translate(p.hipX, groundY);
    ctx.scale(sx, sy);
    ctx.translate(-p.hipX, -groundY);

    var out = null;
    for (var pass = 0; pass < 2; pass++) out = strokeFigure(ctx, p, H, col, pass);
    drawFace(ctx, out.head[0], out.head[1], P.headR * H, p, col);

    ctx.restore();
    return out;
  }

  function strokeFigure(ctx, p, H, col, pass) {
    var lw = Math.max(3, H * 0.040);
    var wide = pass ? lw : lw * 2.15;
    ctx.save();
    ctx.globalAlpha = p.alpha * (pass ? 1 : 0.42);
    ctx.strokeStyle = pass ? col : '#070604';
    ctx.lineWidth = wide;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    var hx = p.hipX, hy = p.hipY;
    var sx = hx - Math.sin(p.lean) * P.torso * H;
    var sy = hy - Math.cos(p.lean) * P.torso * H;

    function leg(hipA, kneeA) {
      var kn = tip(hx, hy, hipA, P.thigh * H);
      var ft = tip(kn[0], kn[1], hipA - kneeA, P.shin * H);
      ctx.beginPath();
      ctx.moveTo(hx, hy); ctx.lineTo(kn[0], kn[1]); ctx.lineTo(ft[0], ft[1]);
      ctx.stroke();
      return ft;
    }
    function arm(shoA, elbA) {
      var el = tip(sx, sy, shoA, P.upperArm * H);
      var hd = tip(el[0], el[1], shoA + elbA, P.foreArm * H);
      ctx.beginPath();
      ctx.moveTo(sx, sy); ctx.lineTo(el[0], el[1]); ctx.lineTo(hd[0], hd[1]);
      ctx.stroke();
      return hd;
    }

    ctx.globalAlpha = p.alpha * (pass ? 0.55 : 0.42);
    leg(p.hipR, p.kneeR);
    arm(p.shoR, p.elbR);
    ctx.globalAlpha = p.alpha * (pass ? 1 : 0.42);

    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(sx, sy); ctx.stroke();

    var foot = leg(p.hipL, p.kneeL);
    var hand = arm(p.shoL, p.elbL);

    var hcx = sx - Math.sin(p.lean + p.headLag) * P.neck * H;
    var hcy = sy - Math.cos(p.lean + p.headLag) * P.neck * H;
    ctx.beginPath();
    ctx.arc(hcx, hcy, P.headR * H, 0, Math.PI * 2);
    ctx.lineWidth = wide * 0.92;
    if (pass) { ctx.fillStyle = col; ctx.fill(); }
    ctx.stroke();

    ctx.restore();
    return { foot: foot, hand: hand, head: [hcx, hcy] };
  }

  function setFace(p, turn, smile, brow, open, blink) {
    p.turn = turn;
    p.face = { smile: smile, brow: brow || 0, open: open || 0, blink: blink || 0 };
  }

  /* ---------- the performance --------------------------------
     Order matters as much as the poses: he kicks where the text is,
     then walks to centre stage BEFORE turning to you. Looking down
     the lens from off-centre reads as an accident; from the middle
     of the frame it reads as address. */
  function build(t, C) {
    var H = C.H, ground = C.ground, p = pose();
    var kickX = C.kickX, midX = C.midX, stand = ground - LEG * H;
    p.hipY = stand;

    /* 1 · walk in — cheerful, on his way to do something about it */
    if (t < T.walkIn[1]) {
      var u = span(t, T.walkIn);
      p.hipX = lerp(C.startX, kickX, easeInOut(u));
      walk(p, t * 0.0125, H, 1 - 0.55 * easeIn(u));
      setFace(p, 1, 0.40, 0.12, 0);
      return p;
    }

    /* 2 · wind up — the smile drops, the brows come down */
    if (t < T.windUp[1]) {
      var w = easeOut(span(t, T.windUp));
      p.hipX = kickX;
      p.lean = -0.22 * w;
      p.headLag = 0.10 * w;
      p.hipL = -0.55 * w; p.kneeL = 0.88 * w;
      p.hipR = 0.16 * w; p.kneeR = 0.10 * w;
      p.shoL = -0.72 * w; p.elbL = 0.52 * w;
      p.shoR = 0.56 * w; p.elbR = 0.36 * w;
      p.sq = 1 - 0.10 * w;
      p.hipY = stand + 0.035 * H * w;
      setFace(p, 1, lerp(0.40, -0.15, w), lerp(0.12, -0.85, w), 0);
      return p;
    }

    /* 3 · kick — mouth open on the effort */
    if (t < T.kick[1]) {
      var k = easeOut(span(t, T.kick));
      p.hipX = kickX + 0.045 * H * k;
      p.lean = -0.22 - 0.16 * k;
      p.headLag = 0.10 - 0.26 * k;
      p.hipL = -0.55 + 2.10 * k;
      p.kneeL = 0.88 * (1 - k);
      p.hipR = 0.16 - 0.30 * k; p.kneeR = 0.10 + 0.18 * k;
      p.shoL = -0.72 - 0.52 * k; p.elbL = 0.52;
      p.shoR = 0.56 + 0.72 * k; p.elbR = 0.36;
      p.sq = 0.90 + 0.19 * k;
      p.hipY = stand + 0.035 * H - 0.055 * H * k;
      p.airborne = 0.25 * k;
      setFace(p, 0.96, -0.2, -1, 0.55 + 0.45 * Math.sin(k * Math.PI));
      return p;
    }

    /* 4 · recover — the effort resolves into a grin */
    if (t < T.recover[1]) {
      var r = span(t, T.recover), re = easeOut(r);
      p.hipX = kickX + 0.045 * H;
      p.lean = -0.38 * (1 - re);
      p.headLag = -0.16 * (1 - settle(r, 0.8));
      p.hipL = 1.55 * (1 - re); p.kneeL = 0.30 * (1 - re);
      p.hipR = -0.14 * (1 - re); p.kneeR = 0.28 * (1 - re);
      p.shoL = -1.24 * (1 - re); p.elbL = 0.12 + 0.40 * (1 - re);
      p.shoR = 1.28 * (1 - re); p.elbR = 0.12 + 0.24 * (1 - re);
      p.sq = 1 - 0.14 * (1 - settle(r, 1));
      p.hipY = stand - 0.02 * H * (1 - re);
      setFace(p, 0.94, lerp(-0.2, 0.75, re), lerp(-1, 0.3, re), 0.5 * (1 - re));
      return p;
    }

    /* 5 · stroll to centre stage, pleased with himself */
    if (t < T.walkMid[1]) {
      var m = easeInOut(span(t, T.walkMid));
      p.hipX = lerp(kickX + 0.045 * H, midX, m);
      walk(p, t * 0.0125, H, 0.85);
      setFace(p, 0.9, 0.75, 0.3, 0);
      return p;
    }

    /* 6 · turn — the head comes round to the lens, weight settles
           onto both feet, hands drop to his sides */
    if (t < T.turn[1]) {
      var tn = easeOut(span(t, T.turn));
      p.hipX = midX;
      p.turn = 1 - tn;
      p.hipL = 0.13 * (1 - tn * 0.4); p.kneeL = 0.07;
      p.hipR = -0.13 * (1 - tn * 0.4); p.kneeR = 0.07;
      p.shoL = 0.16 * tn; p.shoR = -0.16 * tn;
      p.elbL = 0.10; p.elbR = -0.10;
      p.lean = 0.05 * (1 - tn);
      p.headLag = -0.05 * (1 - tn);
      p.sq = 1 + 0.02 * Math.sin(tn * Math.PI);
      p.face = { smile: lerp(0.75, 1, tn), brow: lerp(0.3, 0.55, tn), open: 0, blink: 0 };
      return p;
    }

    /* 7 · hold — straight down the lens. He blinks once, breathes
           once, and does nothing else. This beat is the character. */
    if (t < T.hold[1]) {
      var hd = span(t, T.hold);
      p.hipX = midX;
      p.turn = 0;
      p.hipL = 0.08; p.kneeL = 0.07; p.hipR = -0.08; p.kneeR = 0.07;
      p.shoL = 0.16; p.shoR = -0.16; p.elbL = 0.10; p.elbR = -0.10;
      var breathe = Math.sin(hd * Math.PI * 1.6);
      p.sq = 1 + 0.018 * breathe;
      p.hipY = stand - 0.008 * H * breathe;
      // one blink, 40% of the way in — enough to read as alive
      var bl = Math.max(0, 1 - Math.abs(hd - 0.40) * 22);
      p.face = { smile: 1, brow: 0.55, open: 0, blink: bl };
      return p;
    }

    /* 8 · point — still mostly facing you, arm up to the top edge */
    if (t < T.point[1]) {
      var pt = easeOut(span(t, T.point));
      p.hipX = midX;
      p.turn = 0.22 * pt;
      p.shoL = lerp(0.16, Math.PI - 0.20, pt); p.elbL = lerp(0.10, 0, pt);
      p.shoR = -0.16; p.elbR = -0.10;
      p.hipL = 0.08; p.kneeL = 0.07; p.hipR = -0.08; p.kneeR = 0.07;
      p.lean = -0.10 * pt;
      p.headLag = -0.16 * pt;
      p.sq = 1 + 0.03 * pt;
      setFace(p, p.turn, 0.9, 0.65, 0);
      return p;
    }

    /* 9 · crouch */
    if (t < T.crouch[1]) {
      var c = easeInOut(span(t, T.crouch));
      p.hipX = midX;
      p.turn = 0.22;
      p.hipL = lerp(0.08, 0.42, c); p.kneeL = lerp(0.07, 0.86, c);
      p.hipR = lerp(-0.08, 0.30, c); p.kneeR = lerp(0.07, 0.86, c);
      p.shoL = lerp(Math.PI - 0.20, -0.62, c); p.shoR = lerp(-0.16, -0.62, c);
      p.elbL = 0.12 + 0.52 * c; p.elbR = p.elbL;
      p.lean = 0.18 * c;
      p.headLag = -0.10 * c;
      p.sq = 1 - 0.20 * c;
      p.hipY = stand + 0.175 * H * c;
      setFace(p, 0.22, lerp(0.9, 0.2, c), lerp(0.65, -0.55, c), 0);
      return p;
    }

    /* 10 · jump */
    if (t < T.jump[1]) {
      var j = span(t, T.jump), je = easeOut(j);
      p.hipX = midX;
      p.turn = 0.18;
      p.hipY = lerp(stand + 0.175 * H, C.apexHipY, je);
      p.shoL = lerp(-0.62, Math.PI, je); p.shoR = p.shoL;
      p.elbL = (0.12 + 0.52) * (1 - je); p.elbR = p.elbL;
      p.hipL = lerp(0.42, 0.22, je); p.kneeL = lerp(0.86, 0.55, je);
      p.hipR = lerp(0.30, -0.16, je); p.kneeR = lerp(0.86, 0.30, je);
      p.lean = 0.18 * (1 - je);
      p.headLag = -0.10 + 0.16 * je;
      p.sq = 1 + 0.26 * Math.sin(j * Math.PI) * (1 - j * 0.5);
      p.airborne = je;
      setFace(p, 0.18, 0.1, -0.35, 0.45 + 0.4 * Math.sin(j * Math.PI));
      return p;
    }

    /* 11 · grab — the edge gives under him, then holds */
    if (t < T.grab[1]) {
      var ct = span(t, T.grab), jolt = Math.sin(ct * Math.PI);
      p.hipX = midX;
      p._handY = C.apexHandY + jolt * 0.055 * H;
      p.hipY = p._handY + (ARM + P.torso) * H;
      grip(p);
      p.hipL = 0.40 + 0.26 * jolt; p.kneeL = 0.92 + 0.20 * jolt;
      p.hipR = -0.26 - 0.10 * jolt; p.kneeR = 0.62 + 0.14 * jolt;
      p.sq = 1 + 0.06 * jolt;
      p.airborne = 1; p.shadow = 0.25;
      setFace(p, 0.12, -0.3, -0.8, 0.5 * jolt);
      return p;
    }

    /* 12 · pull — hands pinned to the edge, the body hanging off
            them. Solving downward from the hands rather than up from
            the hips is what makes his weight look like the thing
            moving the screen. He is straining, and it shows. */
    if (t < T.pull[1]) {
      var q = span(t, T.pull);
      p._handY = lerp(C.apexHandY, C.vh, easeInOut(q));
      p.hipX = midX;
      p.hipY = p._handY + (ARM + P.torso) * H;
      grip(p);
      var sw = Math.sin(q * Math.PI * 2.2) * (1 - q * 0.6) * 0.34;
      p.hipL = 0.40 + sw; p.kneeL = 0.92 + sw * 0.35;
      p.hipR = -0.26 + sw * 0.7; p.kneeR = 0.62 + sw * 0.3;
      p.lean = sw * 0.30;
      p.headLag = -sw * 0.40;
      p.airborne = 1; p.shadow = 0;
      setFace(p, 0.08, -0.55, -0.95, 0.30);
      return p;
    }

    /* 13 · hang — it worked. He knows it worked. */
    if (t < T.hang[1]) {
      var hgt = span(t, T.hang), kk = Math.sin(hgt * Math.PI * 2.6) * 0.30 * (1 - hgt * 0.4);
      p._handY = C.vh;
      p.hipX = midX;
      p.hipY = C.vh + (ARM + P.torso) * H;
      grip(p);
      p.hipL = 0.40 + kk; p.kneeL = 0.92 - kk * 0.4;
      p.hipR = -0.26 - kk; p.kneeR = 0.62 + kk * 0.4;
      p.lean = kk * 0.2; p.headLag = -kk * 0.3;
      p.airborne = 1; p.shadow = 0;
      setFace(p, 0, 0.85, 0.45, 0);
      return p;
    }

    /* 14 · lets go */
    var f = span(t, T.fall);
    p._handY = C.vh;
    p.hipX = midX;
    p.hipY = C.vh + (ARM + P.torso) * H + easeIn(f) * C.vh * 0.9;
    p.shoL = (Math.PI - 0.10) * (1 - f * 0.6); p.shoR = (Math.PI + 0.10) * (1 - f * 0.6);
    p.elbL = 0.32 * f; p.elbR = -0.32 * f;
    p.hipL = 0.40; p.kneeL = 0.92; p.hipR = -0.26; p.kneeR = 0.62;
    p.alpha = 1 - f; p.airborne = 1; p.shadow = 0;
    setFace(p, 0, 1, 0.5, 0.35);
    return p;
  }

  /* ---------- runner ----------------------------------------- */
  var active = null;

  /* Abandon the performance. Whatever he had not got round to doing
     still happens — the line still goes, the screen still comes all
     the way down — because the page after a skip has to be the same
     page as after a full watch. A skip that leaves a half-open blind
     is a bug wearing a feature's clothes. */
  function skip() { if (active) active(); }

  function run(opts) {
    opts = opts || {};
    var cvs = document.getElementById('stick');
    if (!cvs || reduce) {
      // No canvas, or the visitor asked for stillness. Deliver the
      // outcome without the performance.
      if (opts.onKick) opts.onKick();
      if (opts.onPull) opts.onPull(window.innerHeight);
      if (opts.onDone) opts.onDone();
      return Promise.resolve();
    }

    var ctx = cvs.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var C = {};

    function measure() {
      C.vw = window.innerWidth; C.vh = window.innerHeight;
      cvs.width = Math.round(C.vw * dpr);
      cvs.height = Math.round(C.vh * dpr);
      cvs.style.width = C.vw + 'px';
      cvs.style.height = C.vh + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      C.H = Math.max(132, Math.min(C.vh * 0.28, 240));

      // Stand him on the line he is about to kick, so the foot meets
      // the actual glyphs rather than a lucky coincidence of timing.
      var r = opts.target && opts.target.getBoundingClientRect();
      if (r && r.width) {
        C.ground = r.bottom + C.H * 0.05;
        C.kickX = Math.max(C.H * 0.5, r.left - C.H * 0.40);
      } else {
        C.ground = C.vh * 0.62;
        C.kickX = C.vw * 0.40;
      }
      C.midX = C.vw * 0.5;
      C.startX = -C.H * 0.7;
      C.apexHipY = Math.max(C.H * 0.66, C.vh * 0.30);
      C.apexHandY = C.apexHipY - (P.torso + ARM) * C.H;
    }

    measure();
    window.addEventListener('resize', measure);

    var col = getComputedStyle(document.documentElement)
      .getPropertyValue('--bone').trim() || '#f4f1e9';

    return new Promise(function (resolve) {
      var t0 = 0, kicked = false, done = false;

      function finish(skipped) {
        if (done) return;
        done = true; active = null;
        ctx.clearRect(0, 0, C.vw, C.vh);
        window.removeEventListener('resize', measure);
        if (!kicked && opts.onKick) { kicked = true; opts.onKick(); }
        if (skipped && opts.onPull) opts.onPull(C.vh);
        if (opts.onDone) opts.onDone(skipped);
        resolve();
      }
      active = function () { finish(true); };

      function frame(now) {
        if (done) return;
        if (!t0) t0 = now;
        var t = now - t0;

        ctx.clearRect(0, 0, C.vw, C.vh);
        var p = build(t, C);

        // Fires once, on the frame the foot is at full extension —
        // not when the phase begins.
        if (!kicked && t >= T.impact) {
          kicked = true;
          if (opts.onKick) opts.onKick();
        }
        if (p._handY !== undefined && opts.onPull) opts.onPull(p._handY);

        render(ctx, p, C.H, col, C.ground);

        if (t < END) requestAnimationFrame(frame);
        else finish(false);
      }
      requestAnimationFrame(frame);
    });
  }

  return {
    run: run,
    skip: skip,
    supported: function () { return !reduce && !!document.getElementById('stick'); },
    duration: END
  };
})();
