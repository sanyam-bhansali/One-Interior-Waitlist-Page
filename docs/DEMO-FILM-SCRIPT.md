# One Interiors — 20-second demo film

Production script. Everything needed to build it, frame by frame.

**The film in one line:** you got the keys, nobody in this trade is licensed, so we verify
what can be verified, show you the score and the reasoning, price it honestly, and publish
the parts that make us look bad.

---

## 1 · Specs

| | |
|---|---|
| Duration | **20.000s** exactly |
| Master | 1920 × 1080, 24 fps, H.264, CRF 18 |
| Voiceover | **None.** Type carries it. |
| Language | English |
| Cuts | Hard cuts only. No dissolves, no wipes. |
| Deliverables | 16:9 master · 9:16 social cut · 1:1 feed cut · 6s pre-roll |

---

## 2 · Design tokens

Read off the live portal captures. Match these exactly — the film has to look like the
product, not like an ad for it.

```
Ground        #FAF7F2   cream
Ground alt    #FDFCFA   near-white, data screens
Ink           #1A1A18
Ink secondary #5C564F
Ink tertiary  #968E85
Rust          #C0562F   primary accent, CTAs, the uncomfortable numbers
Teal          #1F6B63   check marks only
Rule          #E0DAD1   hairline, 2px at 1080p
```

**Type**

| Role | Face | Setting |
|---|---|---|
| Display | High-contrast serif (Fraunces `opsz 144, wght 300`, or Playfair Display) | tracking −0.02em, line-height 1.12 |
| Body | Geometric sans (Jost) | regular |
| Data / labels | IBM Plex Mono | uppercase, tracking 0.16em |

**Rules that matter:** square corners, no border radius anywhere. No drop shadows. Cards
are a 2px hairline rule and nothing else. Left margin 9% of frame width, consistent on
every beat.

---

## 3 · The script

Times are absolute. Every element enters by rising 24px with a firm ease-out over 0.32s —
no fades, no bounce, no overshoot.

### Beat 1 · The keys — 0.00 → 3.40

| At | Element | Copy |
|---|---|---|
| 0.25 | Display line 1 | **You finally have the keys.** |
| 1.15 | Display line 2 | **Now you have to find someone** |
| 1.45 | Display line 3 | **to do the interiors.** |

Left-aligned, starting 36% down the frame. Nothing else on screen. Hold the last line for
1.7 seconds — the pause is the point.

### Beat 2 · Nobody is licensed — 3.40 → 6.80

| At | Element | Copy |
|---|---|---|
| 3.52 | Display line 1 | **There is no such thing** |
| 3.74 | Display line 2 | **as a licensed interior** |
| 3.96 | Display line 3 | **designer in India.** |
| 4.70 | Body line 1 | No board exam. No register. Anyone can print a card |
| 4.86 | Body line 2 | and take your advance tomorrow. |

*Verbatim from the /verification page. Do not rewrite it.*

### Beat 3 · So we verify — 6.80 → 11.20

| At | Element | Content |
|---|---|---|
| 6.90 | Display, single line | **So we verify what can actually be verified.** |
| 7.14 | Hairline rule draws left→right, 0.4s | |
| 7.35 → 8.16 | Eight check rows, one every 0.115s | see list below |
| 8.70 → 9.70 | Counter, top right, counts 0 → 12 | **12 / 15** |
| 9.85 | Under the counter, rust, mono | **3 not checked yet** |

Rows: name left in body sans, teal ✓ before it, source right in mono tertiary. Hairline
under each.

```
✓  PAN name match                      PROTEAN
✓  Identity of the principal           IDFY
✓  GST registration active             GST PORTAL
✓  12 months of GST filings            GST PORTAL
✓  Company filings current             MCA
✓  Udyam / MSME registration           UDYAM
✓  Litigation and consumer forum       ECOURTS + NCDRC
✓  Completed sites inspected           OUR TEAM
```

**This beat is the film.** If anything has to go, cut Beat 5 before this.

### Beat 4 · Who fits, and why — 11.20 → 14.80

| At | Element | Content |
|---|---|---|
| 11.30 | Mono eyebrow, rust | **SCORED ON YOUR ANSWERS** |
| 11.42 | Display | **Who fits, and why.** |
| 11.75 / 11.89 / 12.03 | Three cards rise in sequence | |
| each +0.85s | Score counts 0 → final | |
| each +0.34s, then every 0.09s | Reasoning lines appear | |

| | Card 1 | Card 2 | Card 3 |
|---|---|---|---|
| Score | **66%** | **66%** | **62%** |
| Name | Mrida Interiors | Terra Firma | Studio Kaaru |
| Meta | KOTHRUD · AUNDH · 6 YRS | BANER · AUNDH · 8 YRS | BANER · BALEWADI · 4 YRS |
| Why this fits | Delivered projects land / in your range / 1 home finished in Baner | 6 projects delivered / Decisions made together, / the way you asked | Closest on budget band / Smallest team of the three |
| Footer left | 12 / 15 | 12 / 15 | 11 / 15 |
| Footer right | verified | **+9 days over promise** *(rust)* | verified |

That rust line on card 2 is deliberate and it is the most persuasive frame in the film. A
marketplace that publishes a studio running late is the only one you can believe about the
ones running on time.

### Beat 5 · What it costs — 14.80 → 17.40

| At | Element | Content |
|---|---|---|
| 14.90 | Display | **What it costs.** |
| 15.22 | Body, above the headline | Real ranges for a home your size — not brackets we invented. |
| 15.20 / 15.32 / 15.44 | Three columns rise | |
| each +0.90s | Ranges count up | |

| Essential | Premium *(rust)* | Luxury |
|---|---|---|
| ₹5.95 L – ₹9.35 L | ₹9.35 L – ₹15.3 L | ₹15.3 L – ₹27.2 L |

Footer on each, mono tertiary: `FOR A 2 BHK IN PUNE · 850 SQFT`

*Figures are the live portal's own. If the tier engine changes them, change them here.*

### Beat 6 · The ask — 17.40 → 20.00

| At | Element | Content |
|---|---|---|
| 17.50 | Display | **One Interiors** |
| 17.82 | Hairline rule draws across | |
| 18.02 | Body | Free architect consultation for the Pune waitlist. |
| 18.35 | Outlined pill, rust, mono | **ONE-INTERIORS.VERCEL.APP** |

Swap the URL for the product domain if the customer portal is live by then.

---

## 4 · Motion rules

Six rules. They're what separate this from the last attempt.

1. **Cuts, never dissolves.** Every beat boundary is a hard cut, landing on the music.
2. **Rise, don't fade.** 24px up, firm ease-out, 0.32s. Nothing crossfades in.
3. **Numbers always count.** Scores, totals, the check counter. A number that appears is a
   graphic; a number that counts is a system doing work.
4. **One thing moves at a time.** Everything already on screen is still.
5. **No bounce, no overshoot.** Fast and exact reads as *precise*, which is the brand.
   Springy reads as a consumer app, which isn't.
6. **Camera never moves.** No push-ins, no parallax, no 3D card flights. Flat, like the
   product.

---

## 5 · Assets needed

| Asset | Status | Note |
|---|---|---|
| Fonts | ✅ | Fraunces, Jost, IBM Plex Mono — all Google Fonts, free |
| Portal screenshots | ⚠️ partial | landing, verification, tier captured at 2880px. **Match and compare still need re-capture** after the brief seeding fix. |
| Music | ❌ | One restrained electronic bed, 20s, ~100bpm. Artlist or Epidemic, ~$15. **The hard cuts need something to land on.** |
| Logo | ❌ | Light/white SVG if there's a mark beyond the wordmark |
| Sound design | optional | Soft tick on each check row; one low swell under the counter at 8.70 |

---

## 6 · Variants

All from the same master — no re-render of the content, only reframing.

**9:16 · Instagram / YouTube Shorts.** Stack everything vertically. Card rows become one
card at a time, held 1.2s each. Display type up ~15%. Same 20s.

**1:1 · feed.** Centre-crop the 16:9 and pull the left margin in to 7%. Beats 4 and 5 drop
to two cards — the third doesn't fit and isn't missed.

**6s · pre-roll / bumper.** Beat 1 line 1, then Beat 3's counter landing on 12 / 15 with
"3 not checked yet", then the end card. Nothing else.

---

## 7 · What this replaces

The 41-second film with the couple, the empty flat and the Hindi voiceover is retired. It
was competent and generic. Keep the footage in `source/` — the couple and the finished room
would serve a longer brand film later. They don't serve this one.

Reference for the format: [Doks.AI, 20s](https://youtu.be/jX4dLxiso6A) ·
[MotionSwell SaaS UI demo, 21s](https://youtu.be/uwAnvbtIjrg).

---

## 8 · Three calls worth making before anyone builds it

- **Does "3 not checked yet" stay?** It's the bravest frame and the most persuasive. The
  only one I'd argue for.
- **Beat 5 or compare?** Side-by-side is more distinctive than the tier ranges, but harder
  to read in 2.6 seconds. Tier is the safer read.
- **Which URL closes it** — the waitlist, or the live customer portal?
