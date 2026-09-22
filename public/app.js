/* ============================================================
   One Interiors — Waitlist
   Dust, stage machine, scrubber, validation, submission, demo.
   Edit config.js, not this file.
   ============================================================ */
(function () {
  'use strict';

  var CFG = Object.assign({
    formEndpoint: '/api/waitlist', sequence: {}, sequencePortrait: null,
    frames: [], framesPortrait: [], styleFrames: {}, logo: '', demoVideo: null,
    studioApplyUrl: null,
    city: 'Pune', waitlistCount: 412, consultationMinutes: 45,
    whatsappShare: true, track: function () {}
  }, window.OI_CONFIG || {});

  var STORE_KEY = 'oi_waitlist_joined';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var stage     = document.getElementById('stage');
  var torch     = document.getElementById('torch');
  var media     = document.getElementById('media');
  var vecroom   = document.getElementById('vecroom');
  var opening   = document.getElementById('opening');
  var cardWrap  = document.getElementById('cardwrap');
  var card      = document.getElementById('waitlistForm');
  var finale    = document.getElementById('finale');
  var demo      = document.getElementById('demo');
  var joinBtn   = document.getElementById('joinBtn');
  var submitBtn = document.getElementById('submitBtn');
  var formErr   = document.getElementById('formErr');

  var lead = { name: '', contact: '', style: '' };

  /* ---------- copy + logo from config ---------- */
  each(document.querySelectorAll('[data-city]'),  function (el) { el.textContent = CFG.city; });
  each(document.querySelectorAll('[data-mins]'),  function (el) { el.textContent = CFG.consultationMinutes; });
  each(document.querySelectorAll('[data-count]'), function (el) { el.textContent = CFG.waitlistCount; });
  if (!CFG.whatsappShare) document.getElementById('shareBlock').hidden = true;

  /* The studio door.
     Shown only when config.js supplies a URL, so the link cannot
     point at a subdomain that is not live yet — a studio owner who
     follows a dead link does not come back. */
  (function () {
    var a = document.getElementById('forStudios');
    if (!a) return;
    if (!CFG.studioApplyUrl) { a.remove(); return; }
    a.href = CFG.studioApplyUrl;
    a.hidden = false;
    a.addEventListener('click', function () {
      CFG.track && CFG.track('studio_apply_click', { href: CFG.studioApplyUrl });
    });
  })();

  /* A logo replaces the wordmark when one is supplied, and quietly
     falls back to type if the file is missing or fails to load. */
  if (CFG.logo) {
    each(document.querySelectorAll('[data-logo]'), function (img) {
      img.onload = function () {
        img.hidden = false;
        var w = img.parentNode.querySelector('.wordmark');
        if (w && img.classList.contains('brandlogo')) w.hidden = true;
      };
      img.onerror = function () { img.remove(); };
      img.src = CFG.logo;
    });
  }

  /* ============================================================
     DUST
     A full-screen canvas above every layer. Dissolving an element
     sweeps a mask across it while motes lift off the same area, so
     it comes apart rather than fading. Materialising runs it
     backwards: motes converge and hand off to the real element.
     ============================================================ */
  var FX = (function () {
    var canvas = document.getElementById('fx');
    if (!canvas || reduce) {
      // The still version of the real thing — and it has to honour the
      // same contract, not just the visible half of it. It previously
      // ignored `hidden`, so on reduced-motion the demo panel kept its
      // hidden attribute, `.demo[hidden]{display:none}` won, and "See
      // how it works" silently did nothing. Reduced motion means less
      // movement, never fewer working buttons.
      return {
        dissolve: function (el, opts) {
          el.classList.remove('shown', 'up');
          if (opts && opts.hide) el.hidden = true;
          el.style.opacity = '';
          return Promise.resolve();
        },
        materialize: function (el, cls) {
          if (el.hidden) el.hidden = false;
          el.classList.add(cls || 'shown');
          return Promise.resolve();
        }
      };
    }

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var bits = [];
    var running = false;
    var last = 0;
    var TINTS = ['#f4f1e9', '#e8d5b0', '#c89b5c', '#f2c98a', '#a8865a'];

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener('resize', size);

    /* Motes are seeded across the element's box. The per-mote delay
       is driven by horizontal position so the effect sweeps rather
       than popping everywhere at once — that sweep is the whole
       character of it. */
    function targetRect(el) {
      var r = el.getBoundingClientRect();
      var fullBleed = r.width >= window.innerWidth * .92 &&
                      r.height >= window.innerHeight * .92;
      if (!fullBleed) return r;

      var u = null;
      each(el.children, function (kid) {
        if (kid.hidden || kid.tagName === 'CANVAS') return;
        var k = kid.getBoundingClientRect();
        if (!k.width || !k.height) return;
        u = u ? {
          left: Math.min(u.left, k.left), top: Math.min(u.top, k.top),
          right: Math.max(u.right, k.right), bottom: Math.max(u.bottom, k.bottom)
        } : { left: k.left, top: k.top, right: k.right, bottom: k.bottom };
      });
      if (!u) return r;
      return { left: u.left, top: u.top, width: u.right - u.left, height: u.bottom - u.top };
    }

    function seed(rect, dir, count) {
      var n = count || Math.min(1100, Math.max(160, Math.round(rect.width * rect.height / 190)));
      for (var i = 0; i < n; i++) {
        var x = rect.left + Math.random() * rect.width;
        var y = rect.top + Math.random() * rect.height;
        var across = rect.width ? (x - rect.left) / rect.width : 0;
        bits.push({
          hx: x, hy: y,                       // home: where the element is
          x: x, y: y,
          vx: 16 + Math.random() * 74,
          vy: -(22 + Math.random() * 96),
          r: .5 + Math.random() * 1.7,
          delay: across * .52 + Math.random() * .26,
          life: .85 + Math.random() * .75,
          age: 0, dir: dir,
          wob: Math.random() * 6.283,
          tint: TINTS[(Math.random() * TINTS.length) | 0]
        });
      }
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
    }

    function tick(now) {
      var dt = Math.min(.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      var alive = 0;
      for (var i = 0; i < bits.length; i++) {
        var b = bits[i];
        b.age += dt;
        if (b.age < b.delay) { alive++; continue; }

        var t = (b.age - b.delay) / b.life;
        if (t >= 1) continue;
        alive++;

        var drift = Math.sin(b.wob + b.age * 2.8) * 16;

        if (b.dir === 'out') {
          b.x += (b.vx + drift) * dt;
          b.y += b.vy * dt;
          b.vy += 8 * dt;                       // ash slows as it rises
          ctx.globalAlpha = (t < .1 ? t / .1 : 1 - (t - .1) / .9) * .85;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * (1 - t * .45), 0, 6.283);
        } else {
          var e = 1 - Math.pow(1 - t, 3);       // ease toward home
          b.x = (b.hx + b.vx * 2.4 + drift) + (b.hx - (b.hx + b.vx * 2.4 + drift)) * e;
          b.y = (b.hy - b.vy * 2.0) + (b.hy - (b.hy - b.vy * 2.0)) * e;
          ctx.globalAlpha = (t < .18 ? t / .18 : 1 - (t - .18) / .82) * .8;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * (.5 + t * .5), 0, 6.283);
        }
        ctx.fillStyle = b.tint;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (alive) { requestAnimationFrame(tick); }
      else { running = false; bits.length = 0; ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr); }
    }

    /* Drive --diss from JS rather than @property so the sweep works
       the same in every browser. Opacity rides along: if a browser
       drops the mask, the element still leaves cleanly. */
    function sweep(el, from, to, ms, fadeWith) {
      return new Promise(function (done) {
        var t0 = performance.now();
        el.classList.add('fx-dissolving');
        (function step(now) {
          var p = Math.min(1, (now - t0) / ms);
          var v = from + (to - from) * p;
          el.style.setProperty('--diss', v);
          if (fadeWith) el.style.opacity = String(1 - Math.min(1, v) * .92);
          if (p < 1) requestAnimationFrame(step);
          else {
            el.classList.remove('fx-dissolving');
            el.style.removeProperty('--diss');
            done();
          }
        })(t0);
      });
    }

    return {
      dissolve: function (el, opts) {
        opts = opts || {};
        var rect = targetRect(el);
        if (!rect.width) { el.classList.remove('shown', 'up'); return Promise.resolve(); }
        seed(rect, 'out', opts.count);
        var p = sweep(el, 0, 1, opts.duration || 900, true);
        return p.then(function () {
          // class change and style reset in one tick, so nothing paints between
          el.classList.remove('shown', 'up');
          if (opts.hide) el.hidden = true;
          el.style.opacity = '';
        });
      },
      materialize: function (el, cls, opts) {
        opts = opts || {};
        cls = cls || 'shown';
        if (el.hidden) el.hidden = false;
        el.classList.add(cls);
        var rect = targetRect(el);
        if (!rect.width) return Promise.resolve();
        seed(rect, 'in', opts.count);
        return sweep(el, 1, 0, opts.duration || 1000, false);
      }
    };
  })();

  /* ============================================================
     RENDER LAYER
     ============================================================ */
  var seqCfg = CFG.sequence || {};
  var portrait = window.matchMedia('(max-aspect-ratio: 3/4)');
  var seqActive = pickSeq();
  var usingSeq = !!(seqActive && seqActive.path && seqActive.count > 0);

  function pickSeq() {
    var p = CFG.sequencePortrait;
    if (portrait.matches && p && p.path && p.count > 0) return Object.assign({}, seqCfg, p);
    return seqCfg;
  }

  var frames = (portrait.matches && (CFG.framesPortrait || []).length === 6)
    ? CFG.framesPortrait : (CFG.frames || []);
  var usingMedia = !usingSeq && frames.length === 6 && frames.every(Boolean);
  var imgs = media.querySelectorAll('img');

  if (usingMedia) {
    media.hidden = false;
    vecroom.style.display = 'none';
    each(imgs, function (img, i) { img.src = frames[i]; });
    frames.slice(1).forEach(function (s) { var i = new Image(); i.src = s; });
  }

  if (!usingSeq && !reduce) (usingMedia ? media : vecroom).classList.add('drift');
  if (usingSeq || usingMedia) stage.classList.add('render-bg');

  var Seq = (function () {
    if (!usingSeq) return null;

    var canvas = document.getElementById('seq');
    var ctx = canvas.getContext('2d', { alpha: false });
    var count = seqActive.count;
    var marks = seqActive.marks || [0, .07, .30, .47, .78, 1];
    var pad = seqActive.pad || 3;
    var ext = seqActive.ext || 'webp';

    var images = new Array(count);
    var head = 0, target = 0, ready = false;

    canvas.hidden = false;
    vecroom.style.display = 'none';

    function url(i) { return seqActive.path + String(i + 1).padStart(pad, '0') + '.' + ext; }

    /* Priority loading. The full sequence is a few MB, which is a
       real wait on Indian 4G — so every 8th frame lands first,
       covering the whole arc coarsely, and the rest backfills while
       the visitor reads the opening screen. draw() always falls back
       to the nearest loaded frame. */
    function load() {
      var order = [], seen = {}, i, j;
      for (i = 0; i < count; i += 8) { order.push(i); seen[i] = 1; }
      for (j = 0; j < count; j++) if (!seen[j]) order.push(j);

      var next = 0, inflight = 0, MAX = 6;
      (function pump() {
        while (inflight < MAX && next < order.length) {
          (function (idx) {
            inflight++;
            var img = new Image();
            img.decoding = 'async';
            img.onload = function () {
              images[idx] = img; ready = true; draw();
              inflight--; pump();
            };
            img.onerror = function () { inflight--; pump(); };
            img.src = url(idx);
          })(order[next++]);
        }
      })();
    }

    function nearest(i) {
      var n = Math.round(i);
      for (var r = 0; r < count; r++) {
        if (images[n + r]) return images[n + r];
        if (images[n - r]) return images[n - r];
      }
      return null;
    }

    function size() {
      var d = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * d);
      canvas.height = Math.round(window.innerHeight * d);
      draw();
    }

    function draw() {
      if (!ready) return;
      var img = nearest(head);
      if (!img) return;
      var cw = canvas.width, ch = canvas.height;
      var s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      var w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    }

    function run() {
      var d = target - head;
      if (Math.abs(d) > .01) { head += d * .055; draw(); }
      requestAnimationFrame(run);
    }

    load(); size();
    window.addEventListener('resize', size);
    if (!reduce) run();

    return {
      to: function (n) {
        target = (marks[Math.min(n, marks.length - 1)]) * (count - 1);
        if (reduce) { head = target; draw(); }
      }
    };
  })();

  /* ============================================================
     STAGE MACHINE
     ============================================================ */
  function setStage(n) {
    stage.setAttribute('data-stage', String(n));
    if (Seq) Seq.to(n);
    if (usingMedia) {
      each(imgs, function (img) {
        img.classList.toggle('on', img.getAttribute('data-s') === String(n));
      });
    }
  }
  setStage(0);

  /* ---------- cursor torch ---------- */
  var tx = window.innerWidth / 2, ty = window.innerHeight / 2, cx = tx, cy = ty;
  if (!reduce) {
    (function loop() {
      cx += (tx - cx) * .09; cy += (ty - cy) * .09;
      torch.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      requestAnimationFrame(loop);
    })();
    window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; },
      { passive: true });
  } else {
    torch.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
  }

  /* ============================================================
     OPENING -> the opening turns to dust, the panels strike on
     ============================================================ */
  var alreadyJoined = readSaved();
  if (alreadyJoined) joinBtn.textContent = 'You\u2019re already on the list';

  joinBtn.addEventListener('click', function () {
    joinBtn.disabled = true;

    // Someone who already signed up shouldn't be asked twice — take them
    // straight to the finished room.
    if (alreadyJoined) {
      CFG.track('waitlist_return', {});
      FX.dissolve(opening, { duration: 800 }).then(function () {
        opening.classList.add('gone');
        stage.classList.add('sty-warm');
        setStage(5);
        return FX.materialize(finale, 'shown', { duration: 1100 });
      });
      return;
    }

    CFG.track('waitlist_open', {});

    FX.dissolve(opening, { duration: 820 }).then(function () {
      opening.classList.add('gone');
    });

    setTimeout(function () {
      stage.classList.add('striking');
      setStage(1);
      setTimeout(function () { stage.classList.remove('striking'); }, 1000);
    }, reduce ? 0 : 360);

    setTimeout(function () {
      card.classList.add('up');
      setTimeout(function () { focus('inName'); }, 600);
    }, reduce ? 60 : 900);
  });

  /* ============================================================
     VALIDATION
     ============================================================ */
  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  function isIndianPhone(v) {
    return /^[6-9]\d{9}$/.test(String(v).replace(/[\s\-()]/g, '').replace(/^\+?91/, ''));
  }
  function setError(inputId, errId, message) {
    var input = document.getElementById(inputId);
    document.getElementById(errId).textContent = message || '';
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (message) input.focus();
  }

  /* ---------- step 1 ---------- */
  document.getElementById('go1').addEventListener('click', step1);
  document.getElementById('inName').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); step1(); }
  });
  document.getElementById('inName').addEventListener('input', function () {
    setError('inName', 'errName', '');
  });
  function step1() {
    var v = document.getElementById('inName').value.trim();
    if (v.length < 2) {
      setError('inName', 'errName', 'We\u2019ll need a name to book the consultation under.');
      return;
    }
    lead.name = v;
    document.getElementById('greet').textContent = 'Good to meet you, ' + v.split(/\s+/)[0] + '.';
    swap('s1', 's2');
    document.getElementById('p2').classList.add('on');
    setStage(2);
    CFG.track('waitlist_step', { step: 1 });
    setTimeout(function () { focus('inContact'); }, 120);
  }

  /* ---------- step 2 ---------- */
  document.getElementById('go2').addEventListener('click', step2);
  document.getElementById('inContact').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); step2(); }
  });
  document.getElementById('inContact').addEventListener('input', function () {
    setError('inContact', 'errContact', '');
  });
  function step2() {
    var v = document.getElementById('inContact').value.trim();
    if (!(RE_EMAIL.test(v) || isIndianPhone(v))) {
      setError('inContact', 'errContact',
        'That doesn\u2019t look quite right \u2014 we need a working number or email to reach you on.');
      return;
    }
    lead.contact = v;
    swap('s2', 's3');
    document.getElementById('p3').classList.add('on');
    CFG.track('waitlist_step', { step: 2 });
  }

  /* ---------- step 3 ---------- */
  var chips = document.querySelectorAll('.chip');
  each(chips, function (chip) {
    chip.addEventListener('click', function () {
      each(chips, function (c) { c.setAttribute('aria-pressed', 'false'); });
      chip.setAttribute('aria-pressed', 'true');
      var key = chip.getAttribute('data-style');
      lead.style = chip.textContent.trim();
      stage.classList.remove('sty-warm', 'sty-modern', 'sty-industrial', 'sty-traditional');
      stage.classList.add('sty-' + key);
      if (usingMedia && CFG.styleFrames && CFG.styleFrames[key]) {
        var f3 = media.querySelector('img[data-s="3"]');
        if (f3) f3.src = CFG.styleFrames[key];
      }
      setStage(3);
      submitBtn.disabled = false;
      CFG.track('waitlist_style', { style: key });
    });
  });

  /* ============================================================
     SUBMIT
     Optimistic: the room starts furnishing the moment they click,
     because the animation covers the round trip. On failure the
     room rolls back and the card returns with everything in it.
     ============================================================ */
  card.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitBtn.disabled) return;
    if (document.getElementById('company').value) return;   // honeypot

    submitBtn.disabled = true;
    submitBtn.classList.add('busy');
    document.getElementById('submitLabel').textContent = 'Reserving your slot';
    formErr.hidden = true;

    setStage(4);

    send(buildPayload())
      .then(function () {
        remember();
        CFG.track('waitlist_submit', { style: lead.style });
        return FX.dissolve(card, { duration: 1050 });
      })
      .then(function () {
        cardWrap.style.pointerEvents = 'none';
        return wait(reduce ? 100 : 480);
      })
      .then(function () {
        setStage(5);
        return FX.materialize(finale, 'shown', { duration: 1150 });
      })
      .then(function () {
        if (!(CFG.demoVideo && CFG.demoVideo.src)) return;
        // Let them read the finale before anything happens to it.
        return wait(2100).then(function () {
          if (CFG.stickman !== false && window.Stickman && Stickman.supported()) return curtain();
          var b = document.getElementById('demoBtn');
          b.hidden = false;
          return FX.materialize(b, 'shown', { duration: 700, count: 220 });
        });
      })
      .catch(function (err) {
        setStage(3);
        card.classList.add('up');
        card.style.opacity = '';
        submitBtn.disabled = false;
        submitBtn.classList.remove('busy');
        document.getElementById('submitLabel').textContent = 'Try again';
        formErr.hidden = false;
        formErr.textContent = (err && err.friendly)
          ? err.message
          : 'That didn\u2019t save \u2014 nothing\u2019s lost, your details are still here. Try once more?';
        CFG.track('waitlist_error', { message: String((err && err.message) || err) });
      });
  });

  function buildPayload() {
    return {
      name: lead.name, contact: lead.contact, style: lead.style,
      city: CFG.city, source: 'waitlist-landing',
      submittedAt: new Date().toISOString()
    };
  }

  function send(payload) {
    if (!CFG.formEndpoint) {
      console.info('[One Interiors] Preview mode — no endpoint set.', payload);
      return wait(600);
    }
    return fetch(CFG.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (res.status === 400) {
        return res.json().then(function (b) {
          var f = (b && b.fields) || [];
          var e = new Error(f.indexOf('contact') > -1
            ? 'That doesn\u2019t look quite right \u2014 we need a working number or email to reach you on.'
            : 'Something there didn\u2019t come through. Have a quick look and try again?');
          e.friendly = true;
          throw e;
        });
      }
      if (res.status === 404 || res.status === 405) {
        console.error('[One Interiors] ' + CFG.formEndpoint + ' returned ' + res.status +
          '. The serverless function is not deployed at that path. On a static host ' +
          'with no API, set formEndpoint to "" in config.js to run in preview mode.');
        var e404 = new Error('Sign-ups aren\u2019t connected yet \u2014 we couldn\u2019t save your ' +
          'details. Please try again shortly.');
        e404.friendly = true;
        throw e404;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res;
    });
  }

  /* ============================================================
     DEMO
     The closing message turns to dust and the player assembles
     out of it.
     ============================================================ */
  if (CFG.demoVideo && CFG.demoVideo.src) {
    var vid = document.getElementById('demoVid');
    vid.src = CFG.demoVideo.src;
    if (CFG.demoVideo.poster) vid.poster = CFG.demoVideo.poster;

    document.getElementById('demoBtn').addEventListener('click', function () {
      CFG.track('demo_open', {});
      FX.dissolve(finale, { duration: 900 })
        .then(function () { return wait(reduce ? 80 : 400); })
        .then(function () { return FX.materialize(demo, 'shown', { duration: 1200 }); })
        .then(function () { vid.play().catch(function () {}); });
    });

    document.getElementById('demoClose').addEventListener('click', function () {
      vid.pause();
      var flead = document.querySelector('.flead');
      if (flead) flead.hidden = false;
      var b = document.getElementById('demoBtn');
      if (b && b.hidden) { b.hidden = false; b.classList.add('shown'); }
      FX.dissolve(demo, { duration: 800 })
        .then(function () { return wait(reduce ? 80 : 360); })
        .then(function () { return FX.materialize(finale, 'shown', { duration: 1000 }); });
    });
  }

  /* ============================================================
     WHY
     Same dissolve grammar as the demo panel, so it feels native
     rather than like a modal bolted on. Returns to the opening
     untouched — the stage machine has not advanced, so the room
     is exactly as it was left.
     ============================================================ */
  (function () {
    var whyBtn = document.getElementById('whyBtn');
    var why = document.getElementById('why');
    var whyClose = document.getElementById('whyClose');
    if (!whyBtn || !why || !whyClose) return;

    var open = false;

    function show() {
      if (open) return; open = true;
      CFG.track('why_open', {});
      why.hidden = false;
      document.body.classList.add('why-open');
      FX.dissolve(opening, { duration: 760 })
        .then(function () { opening.classList.add('gone'); return wait(reduce ? 80 : 340); })
        .then(function () { return FX.materialize(why, 'shown', { duration: 1000 }); })
        .then(function () { whyClose.focus({ preventScroll: true }); });
    }

    function hide() {
      if (!open) return; open = false;
      document.body.classList.remove('why-open');
      FX.dissolve(why, { duration: 700 })
        .then(function () { return wait(reduce ? 80 : 300); })
        .then(function () {
          // Must come off before materialize, or .gone's opacity:0 wins the
          // moment the sweep clears its inline opacity.
          opening.classList.remove('gone');
          return FX.materialize(opening, 'shown', { duration: 900 });
        })
        .then(function () {
          opening.classList.remove('shown');
          why.hidden = true;
          whyBtn.focus({ preventScroll: true });
        });
    }

    whyBtn.addEventListener('click', show);
    whyClose.addEventListener('click', hide);
    // Escape is the reflex for anything that covers the screen.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) hide();
    });
  })();

  /* ============================================================
     CURTAIN
     The stickman drives this: his foot decides when the line
     dissolves, his hands decide where the screen edge is. This
     function only translates those two events into page state, so
     the timing lives entirely in stickman.js.
     ============================================================ */
  function curtain() {
    var demoEl = document.getElementById('demo');
    var vid = document.getElementById('demoVid');
    var flead = document.querySelector('.flead');
    var vh = window.innerHeight;

    document.body.classList.add('curtain');
    demoEl.hidden = false;
    demoEl.classList.add('blind');
    demoEl.style.transform = 'translateY(-101%)';   // 1% over, so no hairline gap

    CFG.track('curtain_start', {});

    return Stickman.run({
      target: flead,

      // hide:true retires the element in the same tick the sweep
      // ends — otherwise clearing the inline opacity hands it back
      // at full strength for one frame.
      onKick: function () {
        if (flead) FX.dissolve(flead, { duration: 620, hide: true });
      },

      onPull: function (handY) {
        demoEl.style.transform = 'translateY(' + (handY - vh) + 'px)';
      },

      onDone: function () {
        demoEl.style.transform = '';
        demoEl.classList.remove('blind');
        demoEl.classList.add('shown');
        finale.classList.remove('shown');
        document.body.classList.remove('curtain');
        playDemo(vid);
      }
    });
  }

  /* Autoplay with sound is refused by every browser unless the gesture
     is recent enough, and this lands ~8s after the submit click. Try
     sound, accept silence, and say so rather than playing mute film at
     someone who thinks it is broken. */
  function playDemo(vid) {
    vid.play().catch(function () {
      vid.muted = true;
      vid.play().then(function () {
        var cap = document.querySelector('.demo .cap');
        if (cap) cap.textContent = 'One Interiors — how it works · tap for sound';
      }).catch(function () {
        vid.controls = true;   // last resort: let them start it themselves
      });
    });
  }

  /* ============================================================
     SHARE
     ============================================================ */
  var shareText = 'One Interiors is launching in ' + CFG.city +
    ' — verified interior designers, an instant quote, and a free architect ' +
    'consultation for anyone on the waitlist. Worth a look:';

  document.getElementById('shareBtn').addEventListener('click', function () {
    var url = window.location.href.split('#')[0];
    CFG.track('waitlist_share', {});
    if (navigator.share) {
      navigator.share({ title: 'One Interiors', text: shareText, url: url }).catch(function () {});
      return;
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(shareText + ' ' + url),
      '_blank', 'noopener');
  });

  /* ============================================================
     RETURNING VISITORS
     ============================================================ */
  function remember() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ name: lead.name, at: Date.now() })); }
    catch (e) {}
  }
  function readSaved() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); }
    catch (e) { return null; }   // private window — the page works without it
  }

  /* ============================================================
     QA HOOK
     #finale or #demo jumps straight to that screen so the end
     states can be checked without filling the form each time.
     Nothing is submitted and nobody is marked as joined.
     ============================================================ */
  (function preview() {
    var want = (location.hash || '').replace('#', '');
    if (want !== 'finale' && want !== 'demo') return;
    opening.classList.add('gone');
    stage.classList.add('sty-warm');
    setStage(5);
    if (want === 'demo' && CFG.demoVideo && CFG.demoVideo.src) {
      demo.hidden = false; demo.classList.add('shown');
    } else {
      finale.classList.add('shown');
      if (CFG.demoVideo && CFG.demoVideo.src) document.getElementById('demoBtn').hidden = false;
    }
  })();

  /* ---------- helpers ---------- */
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function focus(id) { var el = document.getElementById(id); if (el) el.focus(); }
  function swap(a, b) {
    document.getElementById(a).hidden = true;
    document.getElementById(b).hidden = false;
  }
})();
