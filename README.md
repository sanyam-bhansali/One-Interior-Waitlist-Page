# One Interiors — Waitlist

A cinematic waitlist landing page. The visitor opens a dark, empty room; it lights,
lights as they give a name and a WhatsApp number or email, and furnishes itself as they
see their place in line. Pune opens when **2,000** people have joined; invites go out in
queue order, and every friend who joins through someone's link moves them up.

The rules of the gate — places per referral, the ladder, the society unlock, when the
count appears — live in the product (`src/modules/waitlist/queue.ts`). This page only
shows what the product answers.

Static HTML, CSS and one JS file, plus a single serverless function. No framework, no
bundler, no build step for the page itself.

---

## Layout

```
├── public/              everything served to the browser
│   ├── index.html
│   ├── styles.css
│   ├── app.js           stage machine, scrubber, validation, share
│   ├── config.js        copy, numbers and render settings — safe to edit
│   └── assets/
│       ├── og-room.jpg  link preview card
│       └── seq/         97 render frames, scrubbed by form progress
├── api/
│   ├── waitlist.js      signup → the product; returns their code and place
│   ├── status.js        a returning member's place (by code)
│   ├── extras.js        the optional "move up 20 places" answers
│   ├── stats.js         members so far (from 100) and free calls left
│   └── _lib.js          the shared call to the product, rate limit, Turnstile
├── source/              raw Higgsfield renders — never deployed, gitignored
├── scripts/
│   └── build-frames.mjs regenerates public/assets/seq from source/
├── docs/                how the renders were made
├── vercel.json          routing, caching, security headers
└── .env.example         which environment variables to set
```

Two rules keep this tidy: **anything in `public/` ships**, and **nothing else does**.
`source/` holds 31 MB of raw renders that must never reach the edge — `.vercelignore`
and `.gitignore` both exclude it.

---

## Run it

```bash
npm run dev      # vercel dev — serves the page AND /api/waitlist
npm run serve    # static only, no API route
```

`vercel dev` needs the Vercel CLI: `npm i -g vercel`.

Out of the box the API route runs in **preview mode** — it validates submissions and logs
them, but stores nothing. The experience works end to end, which is what you want for a
demo.

---

## Deploy

```bash
npm run deploy
```

Or connect the repo at [vercel.com/new](https://vercel.com/new). Vercel reads
`vercel.json`, serves `public/`, and turns `api/waitlist.js` into a function
automatically. No build command, no framework preset.

---

## Going live

### 1. Point submissions somewhere

Set **one** environment variable in Vercel → Settings → Environment Variables.

**Google Sheets** — free, unlimited, and you get a list you can call from.

1. New Sheet → Extensions → Apps Script
2. ```js
   function doPost(e) {
     var d = JSON.parse(e.postData.contents);
     SpreadsheetApp.getActiveSheet()
       .appendRow([new Date(), d.name, d.contact, d.style, d.city]);
     return ContentService.createTextOutput(JSON.stringify({ok: true}))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```
3. Deploy → New deployment → Web app → execute as **Me**, access **Anyone**
4. `WAITLIST_WEBHOOK_URL` = the `/exec` URL

**Web3Forms** — submissions arrive by email, no account needed.
Get a key at [web3forms.com](https://web3forms.com), set `WEB3FORMS_KEY`.

**Your own API** — set `WAITLIST_WEBHOOK_URL`. It receives:

```json
{
  "name": "Sanyam",
  "contact": "+91 98XXX XXXXX",
  "style": "Warm Minimalist",
  "city": "Pune",
  "source": "waitlist-landing",
  "submittedAt": "2026-09-19T10:04:00.000Z",
  "ip": "…"
}
```

> The key never reaches the browser. That's the whole reason `/api/waitlist` exists —
> putting a provider key in `config.js` would publish it to every visitor.

### 2. Check the numbers are true

In `public/config.js`:

- `consultationMinutes` — **must match what you will actually honour** (30).
- `city` — swap when you expand past Pune.

There is no hand-set count any more. The member count comes from the product and is
shown only from 100 ("Founding list open" below that); free calls left are shown from
the start. The ₹5,000 struck price and "free for the first 1,000" are the owner's
committed terms — change them in `index.html` only if the offer changes.

### 3. Set the OG image to an absolute URL

`public/index.html` has `og:image` as a relative path. WhatsApp and LinkedIn want the
full URL — once you know the domain, make it
`https://your-domain.com/assets/og-room.jpg`.

---

## The room

The background is a rendered sequence, not CSS. 97 WebP frames totalling 2.8 MB. The
visitor's progress moves a playhead through it with inertia, so the room is continuously
gliding rather than cross-fading between stills — that continuous motion is most of why
it reads as film instead of a slideshow.

Frames load by priority: every 8th first (~400 KB, covers the whole arc coarsely), then
the rest backfills while someone reads the opening screen. The renderer always falls back
to the nearest loaded frame, so the room is usable immediately and sharpens as it fills.

`sequence.marks` in `config.js` maps the six stages onto the sequence. They're read off
this specific render — Gen A (lighting) ends at exactly 0.50, Gen B (furnishing) runs to
the end.

### Regenerating it

Put new renders in `source/` and:

```bash
npm run frames
```

It checks the two clips actually join (and warns loudly if they don't), concatenates
losslessly, splits to WebP, and rewrites `count` in `config.js` so the page and the files
can't drift apart.

`docs/HIGGSFIELD-GUIDE.md` has the exact prompts and settings used to make these.

### Your logo

Drop it in `public/assets/` and name it in `config.js`:

```js
logo: "assets/logo.svg",
```

SVG is best — crisp at any size, weighs nothing. **A light or white version**, since it
sits on a dark room. It appears above the Join Waitlist button and again on the closing
screen. Without it the page uses the typeset wordmark, and if the file 404s it falls back
to that automatically rather than showing a broken image.

### Product demo video

```js
demoVideo: { src: "assets/demo.mp4", poster: "assets/demo-poster.jpg" },
```

MP4, H.264 video and AAC audio, 1280×720 or 1920×1080, ideally under 8 MB. Once set, a
"Watch how it works" link sits under their place in line. It no longer plays itself:
the seconds after joining are when people share, and the stickman used to kick their
link off the screen. Clicking it brings him on.

### Still to do

A 9:16 portrait sequence. Phones currently centre-crop the landscape frames and lose the
window and the left armchair. Same two generations at vertical aspect, recomposed rather
than cropped, into `public/assets/seq-p/`, then set `sequencePortrait` in config.

---

## Checking the end states

Filling the form every time you want to look at the closing screen gets old:

```
/#finale        the closing screen with no member (preview mode)
/#finale-demo   the closing screen for a made-up member — place, ladder, society
/#demo          jumps straight to the video panel
```

Nothing is submitted and nobody is marked as joined.

---

## What's already handled

- **Validation** both sides — Indian mobile (`+91`, 10 digits, 6–9) or email
- **Spam** — honeypot field, checked server-side
- **Failed submissions** — the room rolls back, the error explains itself, details stay in
  the form, and the lead is written to the function logs so it's recoverable
- **Consent** — an unticked box, required on both sides, linking to `/privacy`
- **Rate limit** — best effort per IP; Cloudflare Turnstile when its keys are set
- **Returning visitors** — "See your place in line" fetches their current place by code
- **Referrals** — `?r=CODE` is kept on the device until they join, then sent with the signup
- **Sharing** — their own link, straight to WhatsApp, plus a copy button
- **Analytics consent** — GA starts denied (Consent Mode) until they allow it
- **Headers** — CSP (no inline scripts) and HSTS in `vercel.json`
- **Reduced motion** — full flow works, animation collapses to near-instant
- **Keyboard** — Enter advances, focus follows, visible focus rings
- **Contrast** — the card deepens and the finale gets a scrim once the render brightens,
  which it does a lot: the area behind the card goes from luminance 48 to 155
- **Landscape phones** — vertical space is scarce there, so the card scrolls inside itself
  and the display type steps down rather than pushing off-screen
- **Dust** — every transition disperses into motes. Disabled entirely under
  `prefers-reduced-motion`, where the same flow runs as plain fades

---

## Analytics

`config.js` has a `track()` hook. Events: `waitlist_open`, `waitlist_step`,
`waitlist_submit`, `waitlist_extras`, `waitlist_extras_skip`, `waitlist_style`,
`waitlist_error`, `waitlist_share`, `link_copy`, `perks_open`, `why_open`, `demo_open`,
`waitlist_return`.

GA runs with Consent Mode: analytics storage is denied until the visitor allows it on
the banner (`public/ga.js`). Before that GA sends cookieless pings only.

The numbers that matter: the gap between `waitlist_open` and `waitlist_submit` (is the
form the problem?), and `waitlist_share` per `waitlist_submit` (is the ladder working?).
