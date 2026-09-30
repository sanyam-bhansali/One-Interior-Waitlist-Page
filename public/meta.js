/* Meta pixel — only with consent, only when configured.

   Nothing here loads until BOTH are true:
     1. config.js has a `metaPixelId`, and
     2. the visitor tapped "Allow" on the banner (oi_analytics = yes).
   Before that, window.OI_META.lead() is a no-op, so a signup never waits on
   Meta and an ad blocker can never break the form.

   The Lead event carries an event_id. /api/waitlist sends the same id to the
   Conversions API from the server, so Meta counts one lead, not two, when
   both arrive — and still counts it when the browser's copy is blocked.

   Its own file, not the usual inline snippet, so the Content-Security-Policy
   can keep forbidding inline scripts. */
(function () {
  'use strict';
  var started = false;

  function pixelId() {
    var c = window.OI_CONFIG || {};
    return c.metaPixelId ? String(c.metaPixelId).replace(/\D/g, '') : '';
  }

  function consented() {
    return !!(window.OI_ANALYTICS && window.OI_ANALYTICS.choice === 'yes');
  }

  function start() {
    if (started || !pixelId() || !consented()) return false;
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
    /** Called by ga.js when the visitor allows analytics. */
    start: start,
    /** An id for this signup, shared by the browser and the server events. */
    newEventId: newEventId,
    /** Whether the server may send this signup to the Conversions API. */
    consented: consented,
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
