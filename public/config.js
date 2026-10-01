/* ============================================================
   One Interiors — Waitlist configuration
   This file ships to the browser. Never put a secret in it.
   Provider keys live in Vercel environment variables and are
   read by /api/waitlist.js on the server.
   ============================================================ */

window.OI_CONFIG = {

  /* ---- Submissions -------------------------------------------
     Points at this project's own serverless function. Set the
     provider with env vars (see README), not here.
     To bypass the function and post straight to a third party,
     replace this with that URL — but then anything you'd need to
     authenticate with becomes public.
  ------------------------------------------------------------- */
  formEndpoint: "/api/waitlist",

  /* ---- Room render -------------------------------------------
     A scrubbed frame sequence: the visitor's progress moves a
     playhead through it, so the room is always gliding rather
     than cross-fading.

     Regenerate from source/ with `npm run frames`, which rewrites
     `count` below to match whatever it produced.
  ------------------------------------------------------------- */
  sequence: {
    path: "assets/seq/frame-",
    count: 97,
    pad: 3,
    ext: "webp",
    /* Where each stage lands in the sequence, 0-1. Read off the
       actual render: Gen A (lighting) ends at 0.50, Gen B
       (furnishing) runs to the end.
         0.00  unlit
         0.08  ceiling panels at low intensity
         0.28  walls warm, oak floor and window established
         0.50  fully lit, still empty   <- end of Gen A
         0.86  furnished
         1.00  final                                           */
    marks: [0, 0.08, 0.28, 0.50, 0.86, 1.0]
  },

  /* Optional 9:16 sequence for phones. Without it the landscape
     frames get centre-cropped and lose the window. */
  sequencePortrait: null,

  /* Fallbacks, used only if `sequence.path` is empty. */
  frames: [],
  framesPortrait: [],
  styleFrames: {},

  /* ---- Logo --------------------------------------------------
     Drop the file in public/assets/ and name it here. SVG is best
     — it stays crisp and weighs nothing. A light/white version,
     since it sits on a dark room.
     Leave empty and the page uses the typeset wordmark instead;
     if the file 404s it falls back to that automatically.
  ------------------------------------------------------------- */
  logo: "",                  // e.g. "assets/logo.svg"

  /* ---- Product demo ------------------------------------------
     If set, a "See how it works" button appears after the closing
     message settles. The message turns to dust and the player
     assembles out of it.
     MP4 (H.264 + AAC), under ~8 MB, 1280x720 or 1920x1080.
  ------------------------------------------------------------- */
  demoVideo: { src: "assets/demo.mp4", poster: "assets/demo-poster.jpg" },

  /* The finale gag: he walks on, kicks the closing line away and
     pulls the screen down onto the demo film. Set false to go back
     to a plain "See how it works" button. Visitors on
     prefers-reduced-motion skip him automatically. */
  stickman: true,

  /* The character in the brand film is blank — no eyes, no mouth.
     The page figure matches it. Set true to give him a face again
     (he has a full set of expressions either way; they are simply
     not drawn). */
  stickmanFace: false,

  /* ---- For studios -------------------------------------------
     The one link out of this page. Interior studios who hear about
     us land here like everybody else, and this is how they reach
     the application form — which lives on the studio product, not
     on this page.

     Set to null to hide the link entirely (before the studio site
     is live, or once the roster is closed).
  ------------------------------------------------------------- */
  studioApplyUrl: "https://studio.oneinteriors.in/apply",

  /* ---- Copy and numbers --------------------------------------
     Keep these true. They are the first promises you make.
  ------------------------------------------------------------- */
  city: "Pune",
  consultationMinutes: 30,   // must match what you will honour
  whatsappShare: true,

  /* The live numbers — members, free calls left, each person's place —
     come from /api/stats and /api/status, never from here. There is no
     count to set by hand any more: an invented number is the one thing
     this page must not show. */

  /* Cloudflare Turnstile site key (public). Leave empty until you have a
     Cloudflare account; set TURNSTILE_SECRET_KEY in Vercel at the same
     time, or every signup is refused. */
  turnstileSiteKey: "",

  /* Meta pixel ID (public — it is in every page that uses it). Events
     Manager → Data sources → your pixel. Nothing loads until it is set AND
     the visitor taps "Allow". The server half (Conversions API) needs
     META_PIXEL_ID and META_CAPI_TOKEN in Vercel — see docs/META-SETUP.md. */
  metaPixelId: "1669962868129035",

  /* ---- Analytics ---------------------------------------------
     Fires at waitlist_open, waitlist_step, waitlist_submit,
     waitlist_extras, waitlist_error, waitlist_share, link_copy, and more.
  ------------------------------------------------------------- */
  /* Every milestone on the page calls this — opening the form, each step,
     the style pick, submit, errors, the film, the skip, the share. Thirteen
     events, which is a funnel rather than a pageview count.

     The guard matters: gtag is absent whenever an ad blocker ate the script,
     and roughly a third of people run one. An unguarded call would throw
     inside the submit handler and lose the signup — analytics must never be
     able to break the form it is measuring. */
  track: function (event, data) {
    try {
      if (window.gtag) gtag('event', event, data || {});
    } catch (e) { /* never let measurement break the page */ }
    // window.plausible && plausible(event, { props: data });
  }
};
