/* Google Analytics (GA4).
   No banner (the owner, 1 Oct 2026): visits are measured for everyone and
   /privacy says so. Ad storage stays denied — GA is for counting, not ads.
   Its own file, not an inline script, so the Content-Security-Policy can
   forbid inline scripts outright. */
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }

(function () {
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted'
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

})();
