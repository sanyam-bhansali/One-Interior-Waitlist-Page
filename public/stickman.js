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

  /* The character in the One Interiors film is blank — no eyes, no
     mouth. A smiling figure on the page followed by a faceless one in
     the film is two characters, not one, so the face is off by
     default. config.js can turn it back on. */
  var FACE = false;

  /* ---------- proportions ----------------------------------
     Fractions of standing height H, head-top to sole. Long-limbed
     and small-headed: a big round head reads as a cartoon, and
     this page is not a cartoon. */
  var P = {
    headRx: 0.070, headRy: 0.076,   // very nearly round, as in the film
    neck: 0.122,
    torso: 0.288,
    thigh: 0.260,
    shin: 0.250,
    upperArm: 0.205,
    foreArm: 0.195
  };
  /* Limb thicknesses, also fractions of H. Every limb tapers toward
     its far end — that taper is most of what separates a mannequin
     from a stick figure, more than the fill does. */
  var R = {
    shoulder: 0.038, elbow: 0.026, wrist: 0.017, hand: 0.022,
    hip: 0.044, knee: 0.032, ankle: 0.019, foot: 0.021, footLen: 0.058,
    torsoTop: 0.085, torsoBot: 0.068, neck: 0.026
  };
  var LEG = P.thigh + P.shin;
  var ARM = P.upperArm + P.foreArm;

  /* ---------- timeline --------------------------------------
     Absolute ms, in one table so the performance can be re-timed
     without touching the poses. */
  var T = {
    fallIn:   [0, 520],       // drops in from above
    land:     [520, 900],     // impact, crumpled
    getUp:    [900, 1420],
    dust:     [1420, 2020],   // brushes himself off
    turnCam:  [2020, 2330],
    hold:     [2330, 2870],   // looks you in the eye. the charisma beat.
    turnBack: [2870, 3080],   // squares up to the text
    windUp:   [3080, 3350],
    kick:     [3350, 3550],
    impact:   3508,
    /* He holds here, off to the side, until the text has finished
       scattering. He used to set off for centre stage while it was
       still legible and walk straight across it — a figure occluding
       the words it just destroyed reads as a z-index accident, not as
       choreography. The dissolve is 520ms from impact (4028); he does
       not move until 4080. */
    recover:  [3550, 4080],
    walkMid:  [4080, 4480],
    crouch:   [4480, 4700],
    jump:     [4700, 5100],
    grab:     [5100, 5250],
    pull:     [5250, 6300],
    hang:     [6300, 6490],
    fall:     [6490, 6890]
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


  /* ---------- dust -------------------------------------------
     He arrives hard enough to raise some, and then brushes it off.
     Cheap particles, drawn on the same canvas: it costs almost
     nothing and it is what sells the landing as an impact rather
     than an arrival. */
  var motes = [];
  function puff(x, y, n, speed, upward) {
    for (var i = 0; i < n; i++) {
      var a = Math.PI + Math.random() * Math.PI;      // outward and up
      var v = speed * (0.35 + Math.random() * 0.9);
      motes.push({
        x: x + (Math.random() - 0.5) * speed * 0.5, y: y,
        vx: Math.cos(a) * v * 1.5,
        vy: Math.sin(a) * v * (upward === undefined ? 1 : upward),
        r: 0.7 + Math.random() * 2.1,
        life: 1, decay: 0.010 + Math.random() * 0.016
      });
    }
  }
  function drawMotes(ctx, col, dt) {
    var k = Math.min(3, dt / 16.7);                   // frame-rate independent
    for (var i = motes.length - 1; i >= 0; i--) {
      var m = motes[i];
      m.x += m.vx * k; m.y += m.vy * k;
      m.vy += 0.085 * k;                              // gravity
      m.vx *= 0.975; m.vy *= 0.975;                   // air
      m.life -= m.decay * k;
      if (m.life <= 0) { motes.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, m.life) * 0.62;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * (0.4 + m.life * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
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

  /* ---------- draw ------------------------------------------
     The figure is filled, not stroked: a set of tapered capsules
     painted white with a thin dark outline, matching the character
     in the brand film. Each part is filled AND outlined in turn, so
     where a limb crosses the body you see the edge of the limb —
     which is what the film does, and what a single silhouette
     outline could never give you. */

  /* A capsule whose two ends have different radii. This is the whole
     trick: the tangent lines between two circles, closed by the arc
     on the far side of each. */
  function taperPath(ctx, x1, y1, r1, x2, y2, r2) {
    var dx = x2 - x1, dy = y2 - y1, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1e-4) {
      ctx.beginPath();
      ctx.arc(x1, y1, Math.max(r1, r2), 0, Math.PI * 2);
      return;
    }
    var a = Math.atan2(dy, dx);
    // If one circle contains the other there is no tangent; clamp.
    var t = Math.acos(Math.max(-1, Math.min(1, (r1 - r2) / d)));
    ctx.beginPath();
    ctx.arc(x1, y1, r1, a + t, a - t);
    ctx.arc(x2, y2, r2, a - t, a + t);
    ctx.closePath();
  }

  function render(ctx, p, H, col, groundY) {
    /* Contact shadow first: this is what puts him on a floor. It
       shrinks and fades as he leaves it, which is most of how the
       eye judges his height off the ground. */
    if (p.shadow > 0.01) {
      var lift = clamp01(p.airborne);
      var rw = H * 0.26 * (1 - lift * 0.55) * (2 - p.sq);
      var rh = H * 0.040 * (1 - lift * 0.5);
      ctx.save();
      ctx.globalAlpha = 0.42 * p.shadow * (1 - lift * 0.7) * p.alpha;
      ctx.fillStyle = '#000';
      ctx.filter = 'blur(6px)';
      ctx.beginPath();
      ctx.ellipse(p.hipX, groundY, Math.max(1, rw), Math.max(1, rh), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* Squash and stretch, about the point he stands on, at constant
       volume — wider as he gets shorter. */
    ctx.save();
    var sy = p.sq, sx = 1 / Math.sqrt(sy);
    ctx.translate(p.hipX, groundY);
    ctx.scale(sx, sy);
    ctx.translate(-p.hipX, -groundY);

    var out = paintFigure(ctx, p, H, col);
    if (FACE) drawFace(ctx, out.head[0], out.head[1], P.headRy * H * 0.92, p, col);

    ctx.restore();
    return out;
  }

  function paintFigure(ctx, p, H, col) {
    /* Each body part is drawn TWICE — once fattened in the outline
       colour, once at true size in white — rather than filled and
       stroked segment by segment. Stroking segments individually put
       an outline around every upper arm and every thigh, so each
       elbow and knee showed up as a ball joint and the figure read
       as a wooden artist's model. Filling a whole limb in one pass
       merges its segments seamlessly; the parts still outline
       against each OTHER, which is what the film does. */
    var OUT = 'rgba(16,11,3,.88)';
    var ow = Math.max(1.2, H * 0.0095);

    var hx = p.hipX, hy = p.hipY;
    var shx = hx - Math.sin(p.lean) * P.torso * H;
    var shy = hy - Math.cos(p.lean) * P.torso * H;
    var hcx = shx - Math.sin(p.lean + p.headLag) * P.neck * H;
    var hcy = shy - Math.cos(p.lean + p.headLag) * P.neck * H;
    // Toes point the way he faces; front-on they simply shorten.
    var footLen = R.footLen * H * (0.35 + 0.65 * clamp01(p.turn));

    var lastFoot = null, lastHand = null;

    function legPath(hipA, kneeA, pad) {
      var kn = tip(hx, hy, hipA, P.thigh * H);
      var an = tip(kn[0], kn[1], hipA - kneeA, P.shin * H);
      taperPath(ctx, hx, hy, R.hip * H + pad, kn[0], kn[1], R.knee * H + pad); ctx.fill();
      taperPath(ctx, kn[0], kn[1], R.knee * H + pad, an[0], an[1], R.ankle * H + pad); ctx.fill();
      taperPath(ctx, an[0], an[1], R.ankle * H + pad,
                an[0] + footLen, an[1] + R.ankle * H * 0.55, R.foot * H + pad); ctx.fill();
      lastFoot = an;
    }
    function armPath(shoA, elbA, pad) {
      var el = tip(shx, shy, shoA, P.upperArm * H);
      var wr = tip(el[0], el[1], shoA + elbA, P.foreArm * H);
      taperPath(ctx, shx, shy, R.shoulder * H + pad, el[0], el[1], R.elbow * H + pad); ctx.fill();
      taperPath(ctx, el[0], el[1], R.elbow * H + pad, wr[0], wr[1], R.wrist * H + pad); ctx.fill();
      ctx.beginPath(); ctx.arc(wr[0], wr[1], R.hand * H + pad, 0, Math.PI * 2); ctx.fill();
      lastHand = wr;
    }
    function torsoPath(pad) {
      taperPath(ctx, shx, shy, R.torsoTop * H + pad, hx, hy, R.torsoBot * H + pad); ctx.fill();
      taperPath(ctx, shx, shy, R.neck * H * 1.2 + pad, hcx, hcy, R.neck * H + pad); ctx.fill();
    }
    function headPath(pad) {
      ctx.save();
      ctx.translate(hcx, hcy);
      ctx.rotate(p.lean + p.headLag);
      ctx.beginPath();
      ctx.ellipse(0, 0, P.headRx * H + pad, P.headRy * H + pad, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = p.alpha;
    function part(fn) {
      ctx.fillStyle = OUT; fn(ow);
      ctx.fillStyle = col; fn(0);
    }

    // far side first, so the near limbs read in front of it
    part(function (d) { legPath(p.hipR, p.kneeR, d); });
    part(function (d) { armPath(p.shoR, p.elbR, d); });
    part(torsoPath);
    part(function (d) { legPath(p.hipL, p.kneeL, d); });
    part(function (d) { armPath(p.shoL, p.elbL, d); });
    part(headPath);          // last: the head is never behind anything
    ctx.restore();

    return { foot: lastFoot, hand: lastHand, head: [hcx, hcy] };
  }

  function setFace(p, turn, smile, brow, open, blink) {
    p.turn = turn;
    p.face = { smile: smile, brow: brow || 0, open: open || 0, blink: blink || 0 };
  }

  /* ---------- the performance --------------------------------
     He arrives by falling, which is funnier and faster than walking
     on, and it gives the landing an impact to squash into. Then the
     order of business is: get up, brush off, look at you, and only
     THEN deal with the text. Establishing him before he does
     anything is what makes the kick read as a character's choice
     rather than a transition effect. */
  function build(t, C) {
    var H = C.H, ground = C.ground, p = pose();
    var kickX = C.kickX, midX = C.midX, stand = ground - LEG * H;
    p.hipX = kickX;
    p.hipY = stand;

    /* 1 · falls in from above — tucked, arms trailing, alarmed */
    if (t < T.fallIn[1]) {
      var u = span(t, T.fallIn);
      p.hipY = lerp(-H * 1.5, stand, easeIn(u));      // gravity accelerates
      p.shoL = Math.PI - 0.34; p.shoR = Math.PI + 0.34;
      p.elbL = 0.22; p.elbR = -0.22;
      p.hipL = 0.34; p.kneeL = 0.80;
      p.hipR = -0.22; p.kneeR = 0.62;
      p.lean = 0.06 * Math.sin(u * 5);
      p.headLag = -0.10;
      p.sq = 1 + 0.30 * u;                            // stretches as he speeds up
      p.airborne = 1; p.shadow = 0.5 * u;             // shadow rushes up to meet him
      setFace(p, 0.25, -0.2, 0.9, 0.85);              // brows up, mouth open
      return p;
    }

    /* 2 · impact — deep squash, collapsed, eyes shut */
    if (t < T.land[1]) {
      var l = span(t, T.land);
      var s2 = settle(l, 1);
      p.hipY = stand + 0.30 * H * (1 - s2);
      p.sq = lerp(0.52, 1, s2);                       // the squash of the whole piece
      p.hipL = lerp(0.85, 0.40, s2); p.kneeL = lerp(1.35, 0.80, s2);
      p.hipR = lerp(-0.70, -0.30, s2); p.kneeR = lerp(1.20, 0.70, s2);
      p.shoL = lerp(1.15, 0.75, s2); p.elbL = lerp(0.55, 0.40, s2);
      p.shoR = lerp(-1.05, -0.70, s2); p.elbR = lerp(-0.55, -0.40, s2);
      p.lean = 0.26 * (1 - s2);
      p.headLag = 0.14 * (1 - s2);
      setFace(p, 0.3, -0.3, -0.5, 0.6 * (1 - l), 1 - l * 2.2);
      return p;
    }

    /* 3 · gets up */
    if (t < T.getUp[1]) {
      var g = easeOut(span(t, T.getUp));
      p.hipY = stand;
      p.hipL = lerp(0.40, 0.12, g); p.kneeL = lerp(0.80, 0.08, g);
      p.hipR = lerp(-0.30, -0.12, g); p.kneeR = lerp(0.70, 0.08, g);
      p.shoL = lerp(0.75, 0.30, g); p.elbL = lerp(0.40, 0.18, g);
      p.shoR = lerp(-0.70, -0.30, g); p.elbR = lerp(-0.40, -0.18, g);
      p.lean = 0.10 * (1 - g);
      p.headLag = -0.08 * g;
      p.sq = lerp(0.94, 1, g);
      setFace(p, 0.45, lerp(-0.5, 0.35, g), lerp(-0.3, 0.2, g), 0);
      return p;
    }

    /* 4 · brushes the dust off — shoulders, then the thighs. Three
           passes, because two reads as a twitch and four as a tic. */
    if (t < T.dust[1]) {
      var d = span(t, T.dust);
      var swipe = Math.sin(d * Math.PI * 3.2);
      var low = clamp01((d - 0.55) / 0.45);           // second half goes lower
      p.hipY = stand - 0.012 * H * Math.abs(swipe);
      p.turn = 0.35;
      // one hand does the work, the other stays out of the way
      p.shoL = lerp(1.05, 0.55, low) + swipe * 0.30;
      p.elbL = lerp(-1.15, -0.75, low) - swipe * 0.22;
      p.shoR = -0.34; p.elbR = -0.18;
      p.hipL = 0.12; p.kneeL = 0.08; p.hipR = -0.12; p.kneeR = 0.08;
      p.lean = 0.10 + swipe * 0.045 + low * 0.10;
      p.headLag = -0.10 - low * 0.12;
      p.sq = 1 - 0.02 * Math.abs(swipe);
      setFace(p, 0.35, 0.45, 0.15, 0);
      return p;
    }

    /* 5 · turns to the lens */
    if (t < T.turnCam[1]) {
      var tn = easeOut(span(t, T.turnCam));
      p.turn = lerp(0.35, 0, tn);
      p.hipL = 0.10; p.kneeL = 0.07; p.hipR = -0.10; p.kneeR = 0.07;
      p.shoL = lerp(0.55, 0.16, tn); p.elbL = lerp(-0.75, 0.10, tn);
      p.shoR = -0.16; p.elbR = -0.10;
      p.lean = 0.10 * (1 - tn);
      p.headLag = -0.05 * (1 - tn);
      p.sq = 1 + 0.02 * Math.sin(tn * Math.PI);
      p.face = { smile: lerp(0.45, 1, tn), brow: lerp(0.2, 0.55, tn), open: 0, blink: 0 };
      return p;
    }

    /* 6 · hold — straight down the lens. One blink, one breath, and
           nothing else. This beat is the whole character. */
    if (t < T.hold[1]) {
      var hd = span(t, T.hold);
      p.turn = 0;
      p.hipL = 0.08; p.kneeL = 0.07; p.hipR = -0.08; p.kneeR = 0.07;
      p.shoL = 0.16; p.shoR = -0.16; p.elbL = 0.10; p.elbR = -0.10;
      var breathe = Math.sin(hd * Math.PI * 1.7);
      p.sq = 1 + 0.018 * breathe;
      p.hipY = stand - 0.008 * H * breathe;
      p.face = { smile: 1, brow: 0.55, open: 0,
                 blink: Math.max(0, 1 - Math.abs(hd - 0.42) * 22) };
      return p;
    }

    /* 7 · squares up to the text. The smile goes first, then the
           shoulders — the face always turns before the body. */
    if (t < T.turnBack[1]) {
      var tb = easeInOut(span(t, T.turnBack));
      p.turn = tb;
      p.hipL = 0.10; p.kneeL = 0.07; p.hipR = -0.10; p.kneeR = 0.07;
      p.shoL = lerp(0.16, 0.10, tb); p.elbL = 0.12;
      p.shoR = lerp(-0.16, -0.10, tb); p.elbR = 0.12;
      p.lean = 0.06 * tb;
      setFace(p, tb, lerp(1, 0.15, tb), lerp(0.55, -0.35, tb), 0);
      return p;
    }

    /* 8 · wind up */
    if (t < T.windUp[1]) {
      var w = easeOut(span(t, T.windUp));
      p.lean = -0.22 * w;
      p.headLag = 0.10 * w;
      p.hipL = lerp(0.10, -0.55, w); p.kneeL = 0.88 * w;
      p.hipR = lerp(-0.10, 0.16, w); p.kneeR = 0.10 * w;
      p.shoL = lerp(0.10, -0.72, w); p.elbL = 0.52 * w;
      p.shoR = lerp(-0.10, 0.56, w); p.elbR = 0.36 * w;
      p.sq = 1 - 0.10 * w;
      p.hipY = stand + 0.035 * H * w;
      setFace(p, 1, lerp(0.15, -0.20, w), lerp(-0.35, -0.95, w), 0);
      return p;
    }

    /* 9 · kick */
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

    /* 10 · recover */
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
      setFace(p, 0.94, lerp(-0.2, 0.85, re), lerp(-1, 0.4, re), 0.5 * (1 - re));
      return p;
    }

    /* 11 · to centre stage, on an empty screen */
    if (t < T.walkMid[1]) {
      var m = easeInOut(span(t, T.walkMid));
      p.hipX = lerp(kickX + 0.045 * H, midX, m);
      walk(p, t * 0.0125, H, 0.85);
      setFace(p, 0.9, 0.8, 0.35, 0);
      return p;
    }

    /* 12 · crouch — anticipation, and he glances up at what he is
            about to grab, which is all the staging this needs */
    if (t < T.crouch[1]) {
      var c = easeInOut(span(t, T.crouch));
      p.hipX = midX;
      p.turn = lerp(0.9, 0.25, c);
      p.hipL = lerp(0.12, 0.42, c); p.kneeL = lerp(0.08, 0.86, c);
      p.hipR = lerp(-0.12, 0.30, c); p.kneeR = lerp(0.08, 0.86, c);
      p.shoL = -0.62 * c; p.shoR = -0.62 * c;
      p.elbL = 0.12 + 0.52 * c; p.elbR = p.elbL;
      p.lean = 0.18 * c;
      p.headLag = -0.14 * c;
      p.sq = 1 - 0.20 * c;
      p.hipY = stand + 0.175 * H * c;
      setFace(p, p.turn, lerp(0.8, 0.25, c), lerp(0.35, -0.5, c), 0);
      return p;
    }

    /* 13 · jump */
    if (t < T.jump[1]) {
      var j = span(t, T.jump), je = easeOut(j);
      p.hipX = midX;
      p.turn = 0.2;
      p.hipY = lerp(stand + 0.175 * H, C.apexHipY, je);
      p.shoL = lerp(-0.62, Math.PI, je); p.shoR = p.shoL;
      p.elbL = (0.12 + 0.52) * (1 - je); p.elbR = p.elbL;
      p.hipL = lerp(0.42, 0.22, je); p.kneeL = lerp(0.86, 0.55, je);
      p.hipR = lerp(0.30, -0.16, je); p.kneeR = lerp(0.86, 0.30, je);
      p.lean = 0.18 * (1 - je);
      p.headLag = -0.10 + 0.16 * je;
      p.sq = 1 + 0.26 * Math.sin(j * Math.PI) * (1 - j * 0.5);
      p.airborne = je;
      setFace(p, 0.2, 0.1, -0.35, 0.45 + 0.4 * Math.sin(j * Math.PI));
      return p;
    }

    /* 14 · grab — the edge gives, then holds */
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

    /* 15 · pull — hands pinned to the edge, body hanging off them.
            Solving downward from the hands rather than up from the
            hips is what makes his weight look like the thing moving
            the screen. */
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

    /* 16 · hang — it worked, and he knows it */
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
      setFace(p, 0, 0.9, 0.5, 0);
      return p;
    }

    /* 17 · lets go */
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

  /* The finale is inset:0, so its own box is the whole viewport and
     tells us nothing. Union its visible children instead — that is
     the actual footprint of the text. */
  function unionRect(el) {
    if (!el) return null;
    var kids = el.children, L = Infinity, R = -Infinity, T2 = Infinity, B = -Infinity, n = 0;
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k.hidden || k.offsetParent === null) continue;
      var b = k.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      L = Math.min(L, b.left); R = Math.max(R, b.right);
      T2 = Math.min(T2, b.top); B = Math.max(B, b.bottom);
      n++;
    }
    if (!n) return null;
    return { left: L, right: R, top: T2, bottom: B, width: R - L, height: B - T2 };
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
    FACE = !!opts.face;
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

      /* Two different measurements, and conflating them was a bug:
         the FLOOR comes from the line he stands on, but how far left
         he must stand comes from the WIDEST thing on screen. Taking
         both from the narrow lead line put him on top of the
         headline the moment the headline got bigger. */
      var r = opts.target && opts.target.getBoundingClientRect();
      var blk = unionRect(opts.block) || r;
      if (r && r.width) {
        C.ground = r.bottom + C.H * 0.05;
        C.kickX = Math.max(C.H * 0.52, (blk ? blk.left : r.left) - C.H * 0.44);
      } else {
        C.ground = C.vh * 0.62;
        C.kickX = C.vw * 0.34;
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

    motes.length = 0;                 // a re-run starts on a clean floor

    return new Promise(function (resolve) {
      var t0 = 0, last = 0, kicked = false, landed = false, done = false, brushed = -1;

      function finish(skipped) {
        if (done) return;
        done = true; active = null;
        motes.length = 0;
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
        if (!t0) { t0 = now; last = now; }
        var t = now - t0, dt = Math.min(64, now - last);
        last = now;

        ctx.clearRect(0, 0, C.vw, C.vh);
        var p = build(t, C);

        // Dust on the frame he hits the floor, not on the phase change.
        if (!landed && t >= T.land[0]) {
          landed = true;
          puff(C.kickX, C.ground, 26, C.H * 0.055);
        }
        // and a little comes off him while he brushes
        if (t >= T.dust[0] && t < T.dust[1]) {
          var bi = Math.floor((t - T.dust[0]) / 150);
          if (bi !== brushed) {
            brushed = bi;
            puff(C.kickX + C.H * 0.10, C.ground - C.H * 0.42, 4, C.H * 0.012, 0.35);
          }
        }

        // Fires once, on the frame the foot is at full extension —
        // not when the phase begins.
        if (!kicked && t >= T.impact) {
          kicked = true;
          if (opts.onKick) opts.onKick();
        }
        if (p._handY !== undefined && opts.onPull) opts.onPull(p._handY);

        render(ctx, p, C.H, col, C.ground);
        drawMotes(ctx, col, dt);

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
