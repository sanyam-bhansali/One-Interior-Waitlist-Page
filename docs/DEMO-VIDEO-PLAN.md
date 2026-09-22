# One Interiors — product demo film

Built from the real customer portal and the two references you sent. Replaces everything
before it.

---

## 1 · What the references actually are

| | |
|---|---|
| Doks.AI — "Video Ad for AI / SaaS Product" | **20 seconds** |
| MotionSwell — "SaaS Product Demo Video (UI Animation)" | **21 seconds** |

Both are UI animation. No actors, no story, no room. Product on screen, moving, with type
doing the talking.

**The length is the headline.** We built 41 seconds. These are twenty. Everything below is
cut to that, and it is the single biggest change — at 20 seconds you cannot afford a setup,
a problem statement or a narrative arc. You get a hook and four beats.

---

## 2 · What the portal actually looks like

I went through the captures. Three things in the design I had wrong in the last attempt:

**No rounded corners, no shadows.** The tier cards are square-cornered with hairline rules.
The verification page is flat cream with rules between sections. My Shot 3 used 10px radii
and drop shadows — that's a different, softer product than the one you built.

**Cream, not white, and not dark.** Roughly `#faf7f2` on the marketing pages, near-white on
the tier page. The film should live in that, not on the waitlist page's black.

**The display serif is doing enormous work.** High thick/thin contrast, set very large, set
tight. "There is no such thing as a licensed interior designer in India." runs three lines
and fills a third of the screen. That confidence *is* the brand.

Palette, read off the screens:

| | |
|---|---|
| Ground | `#faf7f2` cream · near-white `#fdfcfa` on data pages |
| Ink | `#1a1a18` |
| Rust — primary CTA | `#c0562f` |
| Teal — secondary action | `#1f6b63` |
| Rules | hairline, ~8% ink |
| Type | high-contrast display serif · geometric sans body · mono eyebrows, uppercase, wide tracking |

---

## 3 · The copy is already written, and it's better than an ad

This is the most useful thing I found. Your product says, in its own voice:

> **"There is no such thing as a licensed interior designer in India."**
> No statutory licence, no board exam, no register. Anyone can print a card and take your
> advance tomorrow.

> **"So we verify what can actually be verified."**
> We can prove a business exists, that it has been trading for years, that real clients have
> worked with it, and that its sites stand up to inspection. *We cannot prove anyone's taste,
> and we do not pretend to.*

> **"Here is what a home like yours would cost, at three levels of finish."**
> These are real ranges for a home your size, not brackets we invented to make one look
> reasonable.

> "You did not give us a carpet area, so these use 850 sqft, typical for a 2 BHK in Pune.
> **Tell us the real figure and every number here tightens.**"

Do not write new lines for the film. Use these. "We cannot prove anyone's taste, and we do
not pretend to" is a better ad than anything a copywriter would hand you, and it is already
on your site.

---

## 4 · The film · 20.0 seconds

Five beats. No voiceover — the references don't use one, and Hindi VO would fight the
English UI on screen. Music and type carry it. Sound design only: soft ticks on the check
marks, one low swell under the total.

| | Time | On screen | Motion |
|---|---|---|---|
| **1** | 0.0–3.6 | **"There is no such thing as a licensed interior designer in India."** Cream. Nothing else. | Lines rise in one at a time, 0.5s apart. Hold on the last line. |
| **2** | 3.6–8.0 | **"So we verify what can actually be verified."** Then the 15 checks list, each with its source: Protean · IDFY · GST Portal · MCA · Udyam · eCourts. Counter climbs 1 → 15. | Rows tick in at ~0.18s. Counter counts. Ends on `12 / 15` and, in rust, `3 not checked yet`. |
| **3** | 8.0–12.4 | The match cards. Three studios, scores counting 0 → 66%, "why this matched" reasoning visible. One card reads **+9 days over promise** in rust. | Cards slide up in sequence. Scores count. Reasoning line types on under the top card. |
| **4** | 12.4–16.6 | The tier screen. **₹5.95L – ₹9.35L · ₹9.35L – ₹15.3L · ₹15.3L – ₹27.2L.** Under it: *"real ranges for a home your size, not brackets we invented."* | Three columns rise together, numbers count up, the caption fades under. |
| **5** | 16.6–20.0 | **One Interiors** · *Free architect consultation for the Pune waitlist* · the URL. | Wordmark fades, rule draws across, CTA pill settles. |

**The argument, in one sentence:** nobody is licensed, so we verify what can be verified,
show you the score and the reasoning, price it honestly, and publish the parts that make us
look bad.

Beat 2 is the film. If anything has to be cut, cut beat 4 before beat 2.

---

## 5 · Motion language

Take this from the references, not from the last attempt.

- **Cuts, not dissolves.** Every beat change is a hard cut on the beat of the music.
- **Elements enter, they don't fade.** Rise 24px with a firm ease-out over 0.32s. Nothing
  crossfades.
- **Numbers always count.** Scores, totals, the check counter. A number that simply appears
  reads as a graphic; a number that counts reads as a system doing work.
- **One thing moves at a time.** The references are calm because only the newest element is
  animating; everything already on screen is still.
- **Nothing bounces.** I added overshoot to the last version to make it feel "crazy". The
  references don't overshoot — they're fast and exact, which reads as *precise*, which is
  the whole brand.
- **No camera moves, no parallax, no 3D card flights.** Flat, like the product.

---

## 6 · How we build it

Same pipeline that produced the last Shot 3, which worked:

1. I write the 20 seconds as a deterministic render — 480 frames at 24fps, 1920×1080.
2. Type, colour and layout taken from the portal captures so it *is* the product, not an
   impression of it.
3. Encode to MP4, drop it into the waitlist page's demo panel.

The real screens go in as-is wherever a beat shows a whole page — I have the 2880px retina
captures for landing, verification and tier. **Match and compare are still missing** because
the capture run hit the empty-brief gate; once `npm run shots` runs again with the brief
seeding I added, those two become real screenshots instead of drawn approximations.

**Music** is the one thing I can't make. One restrained electronic bed, 20 seconds, ~100bpm
so the cuts land on the beat. Artlist or Epidemic Sound, about $15. Without it the film
feels half-finished, and the cuts have nothing to land against.

---

## 7 · What gets thrown away

Everything shot so far. The six Higgsfield clips, the couple, the empty flat, the Hindi
voiceover, the 41-second cut.

That's the right call and it costs about ₹500 of generation. The footage is competent and
generic; this film is specific and short. Keep the files in `source/` in case a longer
brand film gets made later — the couple and the finished room would work for that. They
don't work for this.

---

## 8 · Open questions

- **Hindi or English?** The portal is in English and the references carry no voice at all.
  I'd run it silent with English type. A Hindi cut can be made later by swapping the type;
  no re-render of the motion.
- **Which four screens?** I've picked verification, match, tier and the end card. Compare is
  the obvious alternative to tier — it's more distinctive but harder to read at 4 seconds.
- **Does "3 not checked yet" stay?** It's the bravest frame and the most persuasive. Your
  call, and it's the only one I'd argue about.
