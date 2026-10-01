/* Meta pixel — loads whenever config.js has a `metaPixelId`.

   No banner (the owner, 1 Oct 2026): page visits are measured for everyone,
   and /privacy says so. The signup's own consent box covers the one thing
   that carries personal data — the server's hashed copy of the Lead (see
   api/_lib.js) — so that is sent only for people who ticked it.

   The Lead event carries an event_id. /api/waitlist sends the same id to the
   Conversions API from the server, so Meta counts one lead, not two, and
   still counts it when an ad blocker ate the browser's copy.

   Its own file, not the usual inline snippet, so the Content-Security-Policy
   can keep forbidding inline scripts. A failure here never touches the form. */
(function () {
  'use strict';
  var started = false;

  function pixelId() {
    var c = window.OI_CONFIG || {};
    return c.metaPixelId ? String(c.metaPixelId).replace(/\D/g, '') : '';
  }

  function start() {
    if (started || !pixelId()) return false;
    started = true;
    /* Meta's standard loader, unrolled. */
    var n = window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
    window.fbq('init', pixelId());
    window.fbq('track', 'PageView');
    return true;
  }

  function newEventId() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'ev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  window.OI_META = {
    /** An id for this signup, shared by the browser and the server events. */
    newEventId: newEventId,
    /** The browser's half of the Lead event. */
    lead: function (eventId) {
      try {
        if (!start() && !started) return;
        window.fbq('track', 'Lead', { content_name: 'pune_waitlist' }, { eventID: eventId });
      } catch (e) { /* never let measurement break the page */ }
    }
  };

  start();
})();
