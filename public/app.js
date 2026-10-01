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
    city: 'Pune', consultationMinutes: 30, turnstileSiteKey: '',
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
  /* The waitlist gate (owner, 30 Sep 2026). Mirrors src/modules/waitlist/
     queue.ts in the product; the product is the authority, these only word
     the page before its answer arrives. */
  var LAUNCH_AT = 2000, FREE_CALLS = 1000, CALL_AT = 3, CAB_AT = 5, SOCIETY_UNLOCK = 25;
  var me = null;          // { code, status } once joined
  var extras = { possession: '', bhk: '', style: '' };

  /* ---------- copy + logo from config ---------- */
  each(document.querySelectorAll('[data-city]'),  function (el) { el.textContent = CFG.city; });
  each(document.querySelectorAll('[data-mins]'),  function (el) { el.textContent = CFG.consultationMinutes; });
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
  if (alreadyJoined) joinBtn.textContent = 'See your place in line';

  joinBtn.addEventListener('click', function () {
    joinBtn.disabled = true;

    // Someone who already signed up shouldn't be asked twice — take them
    // straight to the finished room.
    if (alreadyJoined) {
      CFG.track('waitlist_return', {});
      var fresh = alreadyJoined.code ? fetchStatus(alreadyJoined.code) : Promise.resolve(null);
      FX.dissolve(opening, { duration: 800 }).then(function () {
        opening.classList.add('gone');
        stage.classList.add('sty-warm');
        setStage(5);
        return fresh;
      }).then(function (st) {
        me = { code: alreadyJoined.code || null, status: st };
        renderFinale();
        return FX.materialize(finale, 'shown', { duration: 1100 });
      }).then(showFilmButton);
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
  /* Kept deliberately identical to normalisePhone() in the product repo
     (src/modules/studio/phone.ts). That file records what a narrower version
     of this rule already cost: "09876543210" is one of the two commonest ways
     an Indian writes a mobile — the habit is left over from STD dialling and
     it is on a great many business cards — and rejecting it told people
     typing their own number correctly that it was wrong. Those signups never
     reached anybody to be counted.

     Dropping ONE zero and re-testing is deliberately narrow: "020 2567 8900"
     is also eleven digits with a leading zero, and it is a Pune landline. It
     strips to 2025678900, fails the 6-9 rule, and is still refused — rightly,
     because nothing can send a message to it. */
  function isIndianPhone(v) {
    var d = String(v == null ? '' : v).replace(/\D/g, '');
    if (d.length === 10 && /^[6-9]/.test(d)) return true;
    if (d.length === 11 && d.charAt(0) === '0' && /^[6-9]/.test(d.slice(1))) return true;
    if (d.length === 12 && d.slice(0, 2) === '91' && /^[6-9]/.test(d.slice(2))) return true;
    if (d.length === 13 && d.slice(0, 3) === '091' && /^[6-9]/.test(d.slice(3))) return true;
    return false;
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
    loadTurnstile();
    setTimeout(function () { focus('inContact'); }, 120);
  }

  /* ---------- step 2: contact + consent, and that is the signup ---------- */
  var consentBox = document.getElementById('inConsent');
  document.getElementById('inContact').addEventListener('input', function () {
    setError('inContact', 'errContact', '');
  });
  consentBox.addEventListener('change', function () {
    document.getElementById('errConsent').textContent = '';
  });
  function step2Valid() {
    var v = document.getElementById('inContact').value.trim();
    if (!(RE_EMAIL.test(v) || isIndianPhone(v))) {
      setError('inContact', 'errContact',
        'That doesn’t look quite right — we need a working WhatsApp number or email.');
      return false;
    }
    lead.contact = v;
    if (!consentBox.checked) {
      document.getElementById('errConsent').textContent =
        'Tick this so we can send you your place and your invite.';
      consentBox.focus();
      return false;
    }
    if (CFG.turnstileSiteKey && !tsToken) {
      document.getElementById('errConsent').textContent =
        'One moment — we’re checking this isn’t a bot.';
      return false;
    }
    return true;
  }

  /* ---------- Cloudflare Turnstile, only when a site key is set ---------- */
  var tsToken = '', tsWidget = null;
  function loadTurnstile() {
    if (!CFG.turnstileSiteKey || loadTurnstile.done) return;
    loadTurnstile.done = true;
    var box = document.getElementById('tsBox');
    window.oiTurnstile = function () {
      box.hidden = false;
      tsWidget = window.turnstile.render(box, {
        sitekey: CFG.turnstileSiteKey, theme: 'dark', size: 'flexible',
        callback: function (t) { tsToken = t; document.getElementById('errConsent').textContent = ''; },
        'expired-callback': function () { tsToken = ''; }
      });
    };
    var sc = document.createElement('script');
    sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=oiTurnstile';
    sc.async = true;
    document.head.appendChild(sc);
  }
  function resetTurnstile() {
    tsToken = '';
    try { if (tsWidget !== null && window.turnstile) window.turnstile.reset(tsWidget); } catch (e) {}
  }

  /* ---------- step 3: after joining, "move up 20 places" (all optional) ---------- */
  var extrasBtn = document.getElementById('extrasBtn');
  each(document.querySelectorAll('#s3 .opts'), function (group) {
    var q = group.getAttribute('data-q');
    each(group.querySelectorAll('.chip'), function (chip) {
      chip.addEventListener('click', function () {
        var on = chip.getAttribute('aria-pressed') !== 'true';
        each(group.querySelectorAll('.chip'), function (c) { c.setAttribute('aria-pressed', 'false'); });
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
        extras[q] = on ? chip.getAttribute('data-v') : '';
        extrasReady();
      });
    });
  });
  var styleChips = document.querySelectorAll('#s3 .styles .chip');
  each(styleChips, function (chip) {
    chip.addEventListener('click', function () {
      each(styleChips, function (c) { c.setAttribute('aria-pressed', 'false'); });
      chip.setAttribute('aria-pressed', 'true');
      var key = chip.getAttribute('data-style');
      extras.style = chip.textContent.trim();
      stage.classList.remove('sty-warm', 'sty-modern', 'sty-industrial', 'sty-traditional');
      stage.classList.add('sty-' + key);
      if (usingMedia && CFG.styleFrames && CFG.styleFrames[key]) {
        var f3 = media.querySelector('img[data-s="3"]');
        if (f3) f3.src = CFG.styleFrames[key];
      }
      CFG.track('waitlist_style', { style: key });
    });
  });
  document.getElementById('inSociety').addEventListener('input', extrasReady);
  /* The 20 places are for the answers that help us line up studios — keys,
     size or society (the product grants them on the same rule). A style
     alone is kept, but moves nobody. */
  function extrasReady() {
    extrasBtn.disabled = !(extras.possession || extras.bhk ||
      document.getElementById('inSociety').value.trim().length >= 2);
  }
  extrasBtn.addEventListener('click', function () {
    if (extrasBtn.disabled) return;
    extrasBtn.disabled = true;
    extrasBtn.classList.add('busy');
    var body = {
      code: me && me.code, possession: extras.possession || null, bhk: extras.bhk || null,
      society: document.getElementById('inSociety').value.trim() || null,
      style: extras.style || null
    };
    CFG.track('waitlist_extras', { possession: body.possession, bhk: body.bhk, society: !!body.society });
    var go = (me && me.code && CFG.formEndpoint)
      ? postJson('/api/extras', body).then(function (j) { if (j && j.status) me.status = j.status; })
      : wait(400);
    go.catch(function (err) {
      // Never hold them here: the answers are a bonus, the signup is done.
      CFG.track('waitlist_error', { message: 'extras ' + String((err && err.message) || err) });
    }).then(toFinale);
  });
  document.getElementById('extrasSkip').addEventListener('click', function () {
    CFG.track('waitlist_extras_skip', {});
    toFinale();
  });

  /* ============================================================
     SUBMIT
     Optimistic: the room lights the moment they click, because the
     animation covers the round trip. On failure the room rolls back
     and the card stays with everything in it.
     ============================================================ */
  card.addEventListener('submit', function (e) {
    e.preventDefault();
    // Enter in the name field is "continue", not "submit".
    if (!document.getElementById('s1').hidden) { step1(); return; }
    if (document.getElementById('s2').hidden) return;
    if (submitBtn.disabled) return;
    // The bot trap. A person never sees it; if it holds anything, say so in
    // analytics rather than vanish without a word — a silent return here once
    // swallowed real signups when Chrome autofilled the old "company" field.
    if (document.getElementById('oiTrap').value) {
      CFG.track('waitlist_trap', {});
      return;
    }
    if (!step2Valid()) return;

    submitBtn.disabled = true;
    submitBtn.classList.add('busy');
    document.getElementById('submitLabel').textContent = 'Saving your place';
    formErr.hidden = true;

    setStage(3);

    send(buildPayload())
      .then(function (json) {
        me = { code: (json && json.code) || null, status: (json && json.status) || null };
        remember();
        clearRef();
        CFG.track('waitlist_submit', { referred: !!readRef(), created: !!(json && json.created) });
        // A person joining again is not a new lead; the server skips them too.
        if (window.OI_META && eventId && !(json && json.created === false)) window.OI_META.lead(eventId);
        setStage(4);
        // Someone joining again who already answered goes straight to their place.
        if (me.status && me.status.answered) return toFinale();
        showExtras();
      })
      .catch(function (err) {
        setStage(2);
        resetTurnstile();
        submitBtn.disabled = false;
        submitBtn.classList.remove('busy');
        document.getElementById('submitLabel').textContent = 'Try again';
        formErr.hidden = false;
        formErr.textContent = (err && err.friendly)
          ? err.message
          : 'That didn’t save — nothing’s lost, your details are still here. Try once more?';
        CFG.track('waitlist_error', { message: String((err && err.message) || err) });
      });
  });

  function showExtras() {
    var st = me && me.status;
    document.getElementById('s3Eyebrow').textContent =
      'You’re on the list' + (st && st.firstName ? ', ' + st.firstName : '');
    document.getElementById('s3Title').textContent = st && st.position
      ? 'You’re #' + fmt(st.position) + '. Move up 20 places?'
      : 'Move up 20 places?';
    swap('s2', 's3');
    document.getElementById('p3').classList.add('on');
    CFG.track('waitlist_step', { step: 3 });
  }

  var finishing = false;
  function toFinale() {
    if (finishing) return;
    finishing = true;
    return FX.dissolve(card, { duration: 1050 })
      .then(function () {
        cardWrap.style.pointerEvents = 'none';
        return wait(reduce ? 100 : 480);
      })
      .then(function () {
        setStage(5);
        renderFinale();
        return FX.materialize(finale, 'shown', { duration: 1150 });
      })
      .then(showFilmButton);
  }

  /* The film no longer plays itself: the first seconds after joining are
     when someone is most likely to share, and the stickman used to kick
     their link off the screen. Now he comes on only when asked. */
  function showFilmButton() {
    if (!(CFG.demoVideo && CFG.demoVideo.src)) return;
    var b = document.getElementById('demoBtn');
    b.hidden = false;
  }

  /* ============================================================
     THEIR PLACE
     Everything on the confirmation screen comes from the product's
     answer (src/modules/waitlist/queue.ts): place, referrals, what
     they have unlocked, their society. With no answer (preview mode,
     or the product unreachable) it says only that the place is saved.
     ============================================================ */
  function renderFinale() {
    var st = me && me.status;
    var code = (me && me.code) || (st && st.code) || null;
    var fTitle = document.getElementById('fTitle');
    var fMark = document.getElementById('fMark');

    if (st && st.position) {
      fMark.textContent = 'You’re on the list' + (st.firstName ? ', ' + st.firstName : '');
      fTitle.textContent = 'You’re #' + fmt(st.position) + ' in line.';
    } else {
      fMark.textContent = 'You’re on the list';
      fTitle.textContent = 'Your place is saved.';
    }

    if (st && st.stats) paintGate(st.stats);

    // The call: free because they were early, free because they brought
    // three, or ₹5,000 with the way to make it free.
    var u = (st && st.unlocks) || null;
    var callText = document.getElementById('fCallText');
    var mins = CFG.consultationMinutes;
    if (!u || u.freeCall) {
      callText.innerHTML = 'Your <b>' + mins + '-minute architect call</b> — ' +
        '<s class="was">₹5,000</s> <b>free</b>' +
        (u && u.freeCallReason === 'referrals' ? ', thanks to your friends' : '') +
        '. We’ll call to book it.';
    } else {
      callText.innerHTML = 'The first 1,000 free calls are taken. Bring <b>' + CALL_AT +
        ' friends</b> and your <b>₹5,000 architect call is free</b>.';
    }

    var ladder = document.getElementById('ladder');
    if (!code) { ladder.hidden = true; paintShare(null); return; }
    ladder.hidden = false;

    var refs = (st && st.referrals) || 0;
    var head = refs === 0
      ? 'Bring friends, move up'
      : 'You’ve brought ' + refs + ' friend' + (refs === 1 ? '' : 's');
    if (u && u.next) {
      head += ' · ' + u.next.friends + ' more: ' + u.next.unlocks;
    }
    document.getElementById('ladderHead').textContent = head;
    each(document.querySelectorAll('.rungs li'), function (li) {
      var at = Number(li.getAttribute('data-at'));
      li.classList.toggle('done', refs >= at);
      if (at === CALL_AT && u && u.freeCallReason === 'early') {
        li.classList.add('done');
        li.querySelector('span').textContent = 'your call is already free — you joined early';
      }
      if (at === CAB_AT && u && u.cabReason === 'society') {
        li.classList.add('done');
        li.querySelector('span').textContent = 'free cab — your society unlocked it';
      }
    });

    var soc = document.getElementById('society');
    if (st && st.society) {
      var n = st.societyCount || 0;
      soc.hidden = false;
      soc.textContent = n >= SOCIETY_UNLOCK
        ? st.society + ' has ' + n + ' members — everyone there gets a free cab to the studio and the first invites.'
        : st.society + ': ' + n + ' of ' + SOCIETY_UNLOCK + ' neighbours have joined. At ' +
          SOCIETY_UNLOCK + ', everyone there gets a free cab to the studio and the first invites.';
    } else {
      soc.hidden = true;
    }

    document.getElementById('myLink').value = linkFor(code);
    paintShare(code);
  }

  function linkFor(code) {
    var base = (location.origin && location.origin.indexOf('http') === 0)
      ? location.origin : 'https://oneinteriors.in';
    return base + '/?r=' + code;
  }

  /* ============================================================
     THE GATE — members so far, and free calls left
     "3 people have joined" does more harm than no number, so the
     count appears from a hundred (the product sends null below it).
     The free-call counter is shown from the start.
     ============================================================ */
  function paintGate(stats) {
    if (!stats) return;
    var launch = stats.launchAt || LAUNCH_AT;
    var total = typeof stats.total === 'number' ? stats.total : null;
    var pct = total === null ? 0 : Math.min(100, Math.round(total / launch * 100));

    var gateText = document.getElementById('gateText');
    var gateBar = document.getElementById('gateBar');
    if (total === null) {
      gateText.textContent = 'Founding list open · ' + CFG.city + ' opens at ' + fmt(launch);
      gateBar.hidden = true;
    } else {
      gateText.textContent = fmt(total) + ' of ' + fmt(launch) + ' joined · ' +
        CFG.city + ' opens at ' + fmt(launch);
      gateBar.hidden = false;
      document.getElementById('gateFill').style.width = pct + '%';
    }

    var calls = document.getElementById('gateCalls');
    if (typeof stats.freeCallsLeft === 'number') {
      calls.hidden = false;
      calls.textContent = stats.freeCallsLeft > 0
        ? fmt(stats.freeCallsLeft) + ' of ' + fmt(FREE_CALLS) + ' free calls left'
        : 'The 1,000 free calls are taken — bring 3 friends and yours is free';
    }

    var fGate = document.getElementById('fGate');
    if (total === null) { fGate.hidden = true; }
    else {
      fGate.hidden = false;
      document.getElementById('fGateText').textContent =
        fmt(total) + ' of ' + fmt(launch) + ' joined';
      document.getElementById('fGateFill').style.width = pct + '%';
    }
  }

  if (CFG.formEndpoint) {
    fetch('/api/stats', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.stats) paintGate(j.stats); })
      .catch(function () { /* the line keeps its default wording */ });
  }

  /* ============================================================
     REFERRALS IN
     ?r=CODE is a friend's link. Kept for the visit (and the next
     one on this device) so reading the "why" first doesn't lose it.
     ============================================================ */
  (function () {
    try {
      var r = new URLSearchParams(location.search).get('r');
      r = r ? String(r).trim().toUpperCase() : '';
      if (/^[A-HJ-NP-Z2-9]{7}$/.test(r)) localStorage.setItem('oi_ref', r);
    } catch (e) {}
  })();
  function readRef() {
    try { return localStorage.getItem('oi_ref') || null; } catch (e) { return null; }
  }
  function clearRef() {
    try { localStorage.removeItem('oi_ref'); } catch (e) {}
  }

  /* Where this visitor came from. One link per society — oneinteriors.in/?s=baner-greens —
     is the only way to know which groups actually worked; without this the page
     reads the tag and throws it away, and every lead looks identical. */
  function referrerTag() {
    try {
      var q = new URLSearchParams(window.location.search);
      var v = q.get('s') || q.get('src') || q.get('utm_source') || '';
      // whitelist, not blacklist: this string ends up in someone's inbox
      v = String(v).trim().toLowerCase().replace(/[^a-z0-9 _-]/g, '').slice(0, 48);
      if (!v && readRef()) v = 'referral';
      return v || null;
    } catch (e) { return null; }
  }

  var eventId = '';
  function buildPayload() {
    // One id per attempt, shared by the browser pixel and the server's
    // Conversions API call so Meta counts the lead once.
    eventId = window.OI_META ? window.OI_META.newEventId() : '';
    return {
      eventId: eventId || undefined,
      // The consent box names ad measurement, and the form refuses without it.
      adConsent: consentBox.checked,
      name: lead.name, contact: lead.contact,
      city: CFG.city, source: 'waitlist-landing',
      consent: true,
      ref: readRef(),
      via: referrerTag(),
      turnstile: tsToken || undefined,
      submittedAt: new Date().toISOString()
    };
  }

  function send(payload) {
    if (!CFG.formEndpoint) {
      console.info('[One Interiors] Preview mode — no endpoint set.', payload);
      return wait(600).then(function () { return { ok: true, code: null, status: null }; });
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
            ? 'That doesn’t look quite right — we need a working WhatsApp number or email.'
            : f.indexOf('turnstile') > -1
            ? 'We couldn’t confirm this isn’t a bot. Give it a second and try again?'
            : 'Something there didn’t come through. Have a quick look and try again?');
          e.friendly = true;
          throw e;
        });
      }
      if (res.status === 429) {
        var e429 = new Error('A lot of tries from this connection — give it a few minutes and try again.');
        e429.friendly = true;
        throw e429;
      }
      if (res.status === 404 || res.status === 405) {
        console.error('[One Interiors] ' + CFG.formEndpoint + ' returned ' + res.status +
          '. The serverless function is not deployed at that path. On a static host ' +
          'with no API, set formEndpoint to "" in config.js to run in preview mode.');
        var e404 = new Error('Sign-ups aren’t connected yet — we couldn’t save your ' +
          'details. Please try again shortly.');
        e404.friendly = true;
        throw e404;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json().catch(function () { return {}; });
    });
  }

  function postJson(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function fetchStatus(code) {
    if (!CFG.formEndpoint) return Promise.resolve(null);
    return postJson('/api/status', { code: code })
      .then(function (j) { return (j && j.status) || null; })
      .catch(function () { return null; });
  }

  function fmt(n) {
    try { return Number(n).toLocaleString('en-IN'); } catch (e) { return String(n); }
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
      if (CFG.stickman !== false && window.Stickman && Stickman.supported()) {
        curtain(skippedBefore());
        return;
      }
      document.body.classList.add('film');
      FX.dissolve(finale, { duration: 900 })
        .then(function () { return wait(reduce ? 80 : 400); })
        .then(function () { return FX.materialize(demo, 'shown', { duration: 1200 }); })
        .then(function () { vid.play().catch(function () {}); });
    });

    document.getElementById('demoClose').addEventListener('click', function () {
      vid.pause();
      document.body.classList.remove('film');
      var flead = document.querySelector('.flead');
      if (flead) flead.hidden = false;   // in case an older visit hid it alone
      finale.hidden = false;
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
  var SKIP_KEY = 'oi_anim_skipped';
  function skippedBefore() {
    try { return localStorage.getItem(SKIP_KEY) === '1'; } catch (e) { return false; }
  }
  function rememberSkip() {
    try { localStorage.setItem(SKIP_KEY, '1'); } catch (e) {}
  }

  function curtain(instant) {
    var demoEl = document.getElementById('demo');
    var vid = document.getElementById('demoVid');
    var flead = document.querySelector('.flead');
    var skipBtn = document.getElementById('skipBtn');
    var vh = window.innerHeight;
    var showTimer = 0;

    /* The film is ~9MB and the element is preload="none", so nothing
       has been fetched yet. Start buffering NOW, at the top of the
       curtain: the animation gives it ~7 seconds of head start, which
       on a slow connection is the difference between the screen
       coming down onto a film and onto a black rectangle. */
    vid.preload = 'auto';
    try { vid.load(); } catch (e) {}

    document.body.classList.add('curtain');
    demoEl.hidden = false;
    demoEl.classList.add('blind');
    demoEl.style.transform = 'translateY(-101%)';   // 1% over, so no hairline gap

    function land() {
      demoEl.style.transform = '';
      demoEl.classList.remove('blind');
      demoEl.classList.add('shown');
      finale.classList.remove('shown');
      finale.hidden = true;
      document.body.classList.remove('curtain');
      document.body.classList.add('film');
      playDemo(vid);
    }

    function hideSkip() {
      clearTimeout(showTimer);
      skipBtn.classList.remove('shown');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { skipBtn.hidden = true; }, 450);
    }
    function onKey(e) {
      // Escape is the reflex; Enter/Space are handled by the button itself.
      if (e.key === 'Escape') { e.preventDefault(); doSkip(); }
    }
    function doSkip() {
      CFG.track('curtain_skip', {});
      rememberSkip();          // don't make them ask twice on this device
      hideSkip();
      Stickman.skip();         // lands on the same end state as a full watch
    }

    // They already told us once that they would rather not watch it.
    if (instant) {
      CFG.track('curtain_instant', {});
      FX.dissolve(finale, { duration: 240, hide: true });
      land();
      return Promise.resolve();
    }

    CFG.track('curtain_start', {});

    // A beat late: an escape hatch offered before he has even walked
    // on reads as an apology for the thing you just built.
    skipBtn.hidden = false;
    skipBtn.onclick = doSkip;
    showTimer = setTimeout(function () { skipBtn.classList.add('shown'); }, 900);
    document.addEventListener('keydown', onKey);

    return Stickman.run({
      target: flead,      // the line he stands on
      block: finale,      // the full width of what he has to clear
      face: CFG.stickmanFace === true,

      // hide:true retires the element in the same tick the sweep
      // ends — otherwise clearing the inline opacity hands it back
      // at full strength for one frame.
      onKick: function () {
        // Everything goes: headline, line, perk, share block. The foot
        // is measured against .flead only because that is where the
        // text sits on screen — the whole block is what it clears.
        FX.dissolve(finale, { duration: 520, hide: true });
      },

      onPull: function (handY) {
        demoEl.style.transform = 'translateY(' + (handY - vh) + 'px)';
      },

      onDone: function () {
        hideSkip();
        land();
      }
    });
  }

  /* Autoplay with sound is refused by every browser unless the gesture
     is recent enough, and this lands ~8s after the submit click. Try
     sound, accept silence, and say so rather than playing mute film at
     someone who thinks it is broken. */
  function playDemo(vid) {
    vid.addEventListener('volumechange', function () {
      if (!vid.muted) {
        var cap = document.querySelector('.demo .cap');
        if (cap) cap.classList.remove('on');
      }
    });

    vid.play().catch(function () {
      vid.muted = true;
      vid.play().then(function () {
        var cap = document.querySelector('.demo .cap');
        if (cap) {
          cap.textContent = 'Muted by your browser — tap for sound';
          cap.classList.add('on');
        }
      }).catch(function () {
        vid.controls = true;   // last resort: let them start it themselves
      });
    });
  }

  /* ============================================================
     SHARE
     Their own link, so every friend who joins through it moves them
     up. WhatsApp first: it is where Pune's society groups live.
     ============================================================ */
  function shareText(code) {
    return 'I\u2019ve joined One Interiors \u2014 10 verified interior studios in ' + CFG.city +
      ', an instant quote, and a \u20b95,000 architect call free for the first 1,000. ' +
      (code ? 'Join through my link: ' : 'Worth a look: ');
  }
  var shareCode = null;
  function paintShare(code) {
    shareCode = code;
    document.getElementById('shareLabel').textContent = code
      ? 'Every friend who joins through your link moves you up 25 places'
      : 'Know someone who just got their keys?';
  }

  document.getElementById('shareBtn').addEventListener('click', function () {
    var url = shareCode ? linkFor(shareCode) : window.location.origin + '/';
    CFG.track('waitlist_share', { personal: !!shareCode });
    window.open('https://wa.me/?text=' + encodeURIComponent(shareText(shareCode) + url),
      '_blank', 'noopener');
  });

  document.getElementById('copyBtn').addEventListener('click', function () {
    var box = document.getElementById('myLink');
    var btn = this;
    var done = function () {
      btn.textContent = 'Copied';
      setTimeout(function () { btn.textContent = 'Copy'; }, 1800);
    };
    CFG.track('link_copy', {});
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(box.value).then(done, function () { box.select(); });
    } else {
      box.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
    }
  });

  /* ============================================================
     MEMBER BENEFITS
     The same dissolve grammar as "Why we started this". Opens from
     the opening screen or from their place, and returns to whichever
     it came from.
     ============================================================ */
  (function () {
    var panel = document.getElementById('perks');
    var close = document.getElementById('perksClose');
    var from = null, open = false;

    function show(src) {
      if (open) return; open = true; from = src;
      CFG.track('perks_open', { from: src === finale ? 'finale' : 'opening' });
      panel.hidden = false;
      document.body.classList.add('why-open');
      FX.dissolve(src, { duration: 700 })
        .then(function () {
          if (src === opening) opening.classList.add('gone');
          return wait(reduce ? 80 : 300);
        })
        .then(function () { return FX.materialize(panel, 'shown', { duration: 900 }); })
        .then(function () { close.focus({ preventScroll: true }); });
    }
    function hide() {
      if (!open) return; open = false;
      document.body.classList.remove('why-open');
      FX.dissolve(panel, { duration: 650 })
        .then(function () { return wait(reduce ? 80 : 280); })
        .then(function () {
          if (from === opening) opening.classList.remove('gone');
          return FX.materialize(from, 'shown', { duration: 850 });
        })
        .then(function () {
          if (from === opening) opening.classList.remove('shown');
          panel.hidden = true;
        });
    }
    document.getElementById('perksBtn').addEventListener('click', function () { show(opening); });
    document.getElementById('fPerksBtn').addEventListener('click', function () { show(finale); });
    close.addEventListener('click', hide);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) hide();
    });
  })();

  /* ============================================================
     RETURNING VISITORS
     ============================================================ */
  function remember() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        name: lead.name, code: (me && me.code) || null, at: Date.now()
      }));
    }
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
    if (want === 'finale-demo') {
      want = 'finale';
      me = { code: 'ABCD234', status: {
        code: 'ABCD234', firstName: 'Asha', position: 212, joined: 237, referrals: 1, answered: true,
        society: 'Kolte Patil Life Republic', societyCount: 9,
        unlocks: { freeCall: true, freeCallReason: 'early', cab: false, cabReason: null, priority: false,
          next: { friends: 4, unlocks: 'a free cab to the studio' } },
        stats: { total: 640, launchAt: 2000, freeCallsLeft: 360 } } };
    }
    if (want !== 'finale' && want !== 'demo') return;
    opening.classList.add('gone');
    stage.classList.add('sty-warm');
    setStage(5);
    if (want === 'demo' && CFG.demoVideo && CFG.demoVideo.src) {
      demo.hidden = false; demo.classList.add('shown');
    } else {
      // #finale shows the no-code state; #finale-demo a made-up member, to
      // check the ladder's layout. Neither calls the API.
      renderFinale();
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
