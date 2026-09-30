/* Google Analytics (GA4), with Consent Mode.
   Loaded before gtag.js. Analytics storage starts DENIED: until the visitor
   says yes on the small banner, GA sets no cookies and sends only cookieless
   pings. The choice is remembered on this device (oi_analytics = yes | no).
   Its own file, not an inline script, so the Content-Security-Policy can
   forbid inline scripts outright. */
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }

(function () {
  var choice = null;
  try { choice = localStorage.getItem('oi_analytics'); } catch (e) {}

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: choice === 'yes' ? 'granted' : 'denied',
    wait_for_update: 500
  });
  gtag('js', new Date());

  /* The society tag from ?s=baner-greens, attached to every hit for this
     visitor rather than to one event. The whole campaign is one WhatsApp
     message per society, so "which society" has to be a property of the
     SESSION — otherwise it only ever lands on the pageview and no funnel
     step can be segmented by it. */
  var via = null;
  try {
    var q = new URLSearchParams(location.search);
    via = (q.get('s') || q.get('src') || q.get('utm_source') || '')
      .trim().toLowerCase().replace(/[^a-z0-9 _-]/g, '').slice(0, 48) || null;
    // A friend's link (?r=CODE) is its own channel.
    if (!via && q.get('r')) via = 'referral';
  } catch (e) {}

  gtag('config', 'G-Y451K5CT0R', via ? { via: via } : {});
  if (via) gtag('set', 'user_properties', { via: via });

  window.OI_ANALYTICS = {
    choice: choice,
    set: function (yes) {
      try { localStorage.setItem('oi_analytics', yes ? 'yes' : 'no'); } catch (e) {}
      gtag('consent', 'update', { analytics_storage: yes ? 'granted' : 'denied' });
      this.choice = yes ? 'yes' : 'no';
      // The same "Allow" covers the Meta pixel (meta.js), which says so on the banner.
      if (yes && window.OI_META) window.OI_META.start();
    }
  };
})();
