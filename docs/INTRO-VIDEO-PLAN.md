# One Interiors — intro video

Your plan, reviewed. The structure is good: problem → hero → process → safety → CTA is the
right spine for a 45-second explainer. Four things will hurt it, and one of them will make
the video look cheap enough to undermine the brand. Those first, then the revised script
and the prompts.

---

## 1. Scene 3 must not be AI. It should be a screen recording.

This is the most important correction in this document.

Your Scene 3 prompt asks Kling for "a futuristic, minimalist app interface with
glassmorphism… tapping a colorful quiz button, swiping to a designer match profile, a
transparent price quote… a comparison chart."

**No video model can render a legible user interface.** It will produce something that
looks like an app from three metres away and turns to nonsense the moment anyone reads it
— warped labels, invented glyphs, numbers that change between frames. On a video whose
whole job is to say *we are precise and trustworthy about money*, that's actively damaging.

You don't need it. **You already have the product.** `one-interiors.vercel.app` has a
working quiz, a match screen with real scores and "why this matched" reasoning, real
quotes, and a side-by-side compare. Screen-record it.

Real product footage is free, accurate, and more persuasive than any render — because
viewers can tell the difference between a real interface and a mock, even when they can't
say why.

**How to shoot it:**

- Chrome at 1920×1080, zoom 100%, no bookmarks bar, no extensions visible
- Use a seeded example — a real Pune locality, a real BHK, a plausible budget
- Record at 60fps (OBS, or Chrome DevTools recorder)
- Move the cursor **slowly and deliberately.** Real-time mouse movement looks frantic on
  video; aim for about half the speed that feels natural
- One continuous take per step, cut together in post
- Then speed-ramp in the edit, not while recording

Four beats to capture, roughly 3 seconds each: answering a quiz question, the match
results appearing, a quote itemising, the compare view side by side.

---

## 2. AI video cannot write words

Scene 1 asks for notification bubbles reading "Project Delayed", "Budget Doubled",
"No Response". You'll get bubbles with garbled pseudo-text.

Generate the shot **without any text**, then add the notifications in post — Higgsfield's
own Edit/Layers, or Canva, or After Effects. You get crisp type, correct Devanagari if you
want Hindi, and full control over timing.

The same applies to your final CTA card. Never ask a video model for a logo or a wordmark.

---

## 3. The couple has to be the same couple

They appear in Scene 1 and again in Scene 4. Generated independently, they'll be two
different couples, and the emotional payoff — *these people were stressed, now they're
relieved* — evaporates.

Kling 3.0 has element tagging for exactly this. Generate **one portrait of the couple
first** as a still, then tag it in both scenes with `@couple` and describe only what they
*do* in each prompt, never how they look. Higgsfield's own guidance is explicit: tag the
same element in every shot it appears in, and let the element carry the appearance.

---

## 4. The tone fights your own brand

Your prompt asks for "a subtle comedic/dramatic meme-like visual style, fast motion."

That's a legitimate style and it travels well on Instagram. But it is the opposite of the
waitlist page you just built — warm oak, 3000K cove light, restraint, a room that reveals
itself slowly. And your stated goal for this brand is to be *the only thought customers
have when they look for interiors*, which is a premium-trust position, not a viral-comedy
position.

A customer who sees the meme ad and then lands on the waitlist page meets two different
companies.

**My recommendation:** keep the *tension* in Scene 1 — that's real and it earns the rest of
the video — but play it straight. Genuine overwhelm, not comedy. It's more relatable
anyway; nobody who has actually been quoted three different prices for the same kitchen
finds it funny.

If you want the meme energy for reach, make it a **separate 15-second social cut**, not the
video that sits on your site.

You know your market better than I do. Both versions work — just don't blend them.

---

## 5. Two smaller fixes to the script

**"Best of the best" is a weak claim.** Everyone says it, so it reads as noise. You have
something better and true: your own `/verification` page runs **15 checks** across three
tiers. "Har designer pandrah checks se guzarta hai" is concrete, defensible, and does more
work in fewer words.

**The free consultation arrives at 0:38.** It's the single strongest reason to join, and
most viewers won't reach it. Seed it around 0:12 and land it properly at the end.

---

## The revised script

Hindi ad reads run about 2.4 words/second, so the timings below are realistic.

### Scene 1 — the dream, then the dread · 0:00–0:11

> "Pune mein naye flat ki chaabi milna — kisi sapne ke poore hone jaisa hai.
> Par hazaaron designers mein se sahi kaun hai?
> Chhupe hue kharche. Mahino ki deri. Aur jawaab kisi ke paas nahi."

### Scene 2 — why we exist · 0:11–0:21

> "Isiliye humne banaya One Interiors.
> Har designer humare pandrah verification checks se guzarta hai — tabhi woh aapke saamne
> aata hai.
> Aur waitlist par, ek architect ka consultation bilkul free."

### Scene 3 — the process · 0:21–0:33

> "Process seedha hai.
> OneQuiz bhariye. Apne matches dekhiye — score ke saath, wajah ke saath.
> OneQuote se turant quotation. OneCompare se saath-saath tulna."

### Scene 4 — safe hands, then the ask · 0:33–0:45

> "Aur kuch bhi final karne se pehle — humara OneExpert architect aapke plans khud review
> karta hai.
> Bina kisi kharche ke.
> One Interiors. Pune. Aaj hi waitlist join kijiye."

---

## Revised Higgsfield prompts

Settings for all three generated scenes: **Kling 3.0 · single shot · 16:9 · audio OFF ·
720p for drafts, 1080p for finals.** Multi-shot introduces cuts; you want one clean take
per scene so you control the cutting in the edit.

### Step 0 — the couple portrait (Image, not Video)

Generate this first in **Image** with Nano Banana Pro. Save it, tag it `@couple` in both
scenes.

> Photoreal portrait of a young middle-class Indian couple in their early thirties, warm
> natural lighting, neutral modern clothing, relaxed friendly faces, standing side by side
> facing camera, plain soft background, shot on 50mm, shallow depth of field. No text.

### Scene 1 · 11s

> **SCENE CONTEXT** @couple step into an empty, unfurnished new apartment in daylight, and
> the excitement on their faces gives way to being overwhelmed.
>
> **FORMAT** One continuous take, 11 seconds, no cuts, real time.
>
> **CAMERA** Starts wide behind them as the door opens, then one slow push toward the man's
> face, settling into a medium close-up. One move only, no shake, no rotation.
>
> **ACTION TIMING**
> 0.0–3.5s: the door opens, bright empty room beyond, both smiling, she steps in first and
> turns in the space.
> 3.5–7.0s: his smile fades as he looks around at the bare walls; he scrolls his phone,
> the screen light on his face.
> 7.0–11.0s: he lowers the phone, exhales, rubs the back of his neck and looks off; she
> glances at him. Real fatigue, not comedy.
>
> **LIGHT** Hard midday sun through uncovered windows, high contrast, unflattering — the
> room is beautiful but empty and a little cold.
>
> **LOCKS** @couple 100% per reference in every frame. No furniture. **No text anywhere in
> frame, no phone UI, no notifications, no logos.** Photoreal, 35mm film grain, no CGI
> smoothness.

*Add the "Project Delayed / Budget Doubled / No Response" cards in post, over 4.0–8.0s.*

### Scene 2 · 10s

Motion graphics are the one thing here best done outside a video model. Two options:

**2a — live action, simplest and on-brand:**

> **SCENE CONTEXT** A single slow lateral track past four interior designers standing in a
> bright architectural studio, each looking directly into the lens with quiet confidence.
>
> **FORMAT** One continuous take, 10 seconds, no cuts.
>
> **CAMERA** Slow dolly left to right at constant speed, waist-up framing, each person
> passing through frame in turn. Precision-slider smooth, no handheld.
>
> **ACTION** Each designer is mid-work and pauses to look up as the camera reaches them:
> one at a drafting table, one holding material samples, one at a large monitor, one by a
> window with a rolled drawing.
>
> **LOOK** Indian designers, thirties to forties, contemporary professional clothing in
> muted neutrals. Warm daylight from a tall window, oak and concrete studio interior,
> shallow depth of field.
>
> **LOCKS** No text, no logos, no signage anywhere. Photoreal editorial cinematography,
> fine film grain.

**2b — the verification graphic:** build it in After Effects or Canva over a still frame.
A 15-check list ticking through in sequence will look sharper than anything generated, and
it's your actual differentiator, so it deserves to be legible.

### Scene 3 · 12s — **screen recording, not generated**

See section 1.

### Scene 4 · 11s

> **SCENE CONTEXT** @couple sit together on a sofa in the same apartment, now furnished and
> warm, relaxed, looking at a tablet propped on the coffee table.
>
> **FORMAT** One continuous take, 11 seconds, no cuts, real time.
>
> **CAMERA** Slow dolly back from a medium two-shot to a wider shot that takes in the
> finished room. One move, constant speed.
>
> **ACTION TIMING**
> 0.0–4.0s: they lean toward the tablet; she points at something on it and he nods.
> 4.0–8.0s: both sit back, comfortable, he rests an arm along the sofa; light laughter.
> 8.0–11.0s: they look at each other, then out at the room. Settled. The camera keeps
> easing back.
>
> **LIGHT** Late-afternoon golden hour through a large window, warm and soft, with warm
> practical lamps on. Oak floor, oatmeal upholstery, plastered walls — the same palette as
> the finished room in our waitlist render.
>
> **LOCKS** @couple 100% per reference. **No readable content on the tablet screen** — keep
> it angled away or softly out of focus. No text, no logos. Photoreal, warm grade, 35mm
> grain.

*Composite the architect video call onto the tablet in post, and hold the last second for
the end card.*

---

## Voiceover

I tested Hindi TTS from here — `hi-IN-Chirp3-HD-Charon` (Google Chirp3-HD, the newest
tier) reads the script cleanly and is usable.

**But use it as a scratch track, not the final.** Hindi TTS is noticeably behind English
TTS, and a synthetic voice on a brand-launch film is the kind of detail people can't name
but do feel. A Hindi voice artist runs roughly ₹2,000–8,000 for 45 seconds on Fiverr or
Voice123, and it is the cheapest quality upgrade in this entire production.

The scratch track earns its keep anyway: **record it first, and cut each Kling generation
to the actual measured length of its line.** Otherwise you generate 11 seconds of footage
for a 13-second line and have to re-run it.

Say the word and I'll generate all four lines as files you can drop into the timeline.

---

## Assembly

| Scene | Source | Length |
|---|---|---|
| 1 | Kling 3.0 | 11s |
| 2 | Kling 3.0 (or AE graphic) | 10s |
| 3 | Screen recording | 12s |
| 4 | Kling 3.0 | 11s |
| End card | After Effects / Canva | 2s |

Total about 46s.

**Then cut a 20-second version** from the same assets for Instagram and YouTube pre-roll:
Scene 1 trimmed to 5s, the verification claim, two of the four product beats, and the CTA.
Same footage, no extra generation cost, and it's the cut most people will actually see.

**Budget:** three Kling generations at 1080p is roughly ₹350–450 including drafts. Draft
every scene at 720p first — Higgsfield's own guidance is not to iterate at high resolution,
and it's the mistake that burns credits fastest.

**Music:** one warm, restrained bed. No drops, no trailer hits. The waitlist page is quiet
and confident; the video should sound like the same company.

---

## What I need from you to take this further

- **Which tone** — premium-throughout, or premium site cut plus a separate meme social cut
- **The logo file**, for the end card and the waitlist page
- **Whether to generate the four VO lines** as scratch audio

Sources: [Kling 3.0 on Higgsfield](https://higgsfield.ai/blog/Kling-3.0-is-on-Higgsfield-User-Guide-AI-Video-Generation) ·
[Higgsfield camera controls](https://higgsfield.ai/camera-controls)
