# One Interiors — Waitlist

A cinematic waitlist landing page. The visitor opens a dark, empty room; it lights,
materialises and furnishes itself as they answer three questions. About twenty-five
seconds end to end.

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
│   └── waitlist.js      serverless form handler, keeps provider keys off the client
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

- `consultationMinutes` — **must match what you will actually honour.** It appears four
  times on the page and it's the first promise you make.
- `waitlistCount` — social proof. Update as the list grows; don't inflate it.
- `city` — swap when you expand past Pune.

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
"See how it works" button appears a couple of seconds after the closing message settles.
Clicking it turns the message to dust and the player assembles out of it.

### Still to do

A 9:16 portrait sequence. Phones currently centre-crop the landscape frames and lose the
window and the left armchair. Same two generations at vertical aspect, recomposed rather
than cropped, into `public/assets/seq-p/`, then set `sequencePortrait` in config.

---

## Checking the end states

Filling the form every time you want to look at the closing screen gets old:

```
/#finale    jumps straight to the closing message
/#demo      jumps straight to the video panel
```

Nothing is submitted and nobody is marked as joined.

---

## What's already handled

- **Validation** both sides — Indian mobile (`+91`, 10 digits, 6–9) or email
- **Spam** — honeypot field, checked server-side
- **Failed submissions** — the room rolls back, the error explains itself, details stay in
  the form, and the lead is written to the function logs so it's recoverable
- **Returning visitors** — anyone who already joined sees "You're already on the list"
- **Sharing** — native share sheet on mobile, WhatsApp on desktop
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
`waitlist_style`, `waitlist_submit`, `waitlist_error`, `waitlist_share`.

The number that matters is the gap between `waitlist_open` and `waitlist_submit`. If
people light the room and leave at step 2, the contact field is the problem — that's the
moment the page stops being an experience and starts asking for something.
