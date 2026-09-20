# Generating the room in Higgsfield

Step by step, with the exact prompts. Budget about $15 including failed attempts.

---

## The plan in one line

Build two still frames first, then let Kling 3.0 travel between them — twice, in two
6-second generations that join seamlessly — then split the result into frames for the page.

---

## Why two generations and not one

Higgsfield's own docs list the top five reasons Kling generations fail. Number one is
**overloading a single shot**: one shot carries one action and one camera move. Our ten
seconds contains two very different events — a lighting change and a furnishing event.
Asked to do both at once, it will drift.

So we split it, and we use the last frame of the first generation as the start frame of
the second. That guarantees they join invisibly.

| | Covers | Duration |
|---|---|---|
| **Gen A** | dark empty room → fully lit empty room | 6 s |
| **Gen B** | lit empty room → furnished room | 6 s |

Also note: **do not use multi-shot mode.** Multi-shot means cuts. We need one unbroken
take. Single shot, both times.

---

## Step 1 — Build the END frame first

Everything works backwards from the finished room, because it's the hardest image to get
right and every other frame has to match its geometry.

Go to **Image** (`higgsfield.ai/ai/image`). Use **Nano Banana Pro** or **Seedream 5**.
Aspect **16:9**.

> Photoreal architectural interior photography of a modern Indian apartment living room.
> One-point perspective, camera at 1.5 m height, centred and facing the back wall,
> 35 mm lens, symmetrical composition. Floor-to-ceiling window on the right wall with
> soft daylight flooding in. Two recessed rectangular LED panels in the ceiling, warm
> 3000 K, plus a continuous warm cove light tracing the ceiling perimeter. Wide-plank
> oak flooring. Warm oatmeal plastered walls.
>
> Furnished: a low three-seater sofa in oatmeal linen against the back wall, a round
> walnut coffee table on a large textured rug, one accent armchair at the left, a slim
> floor lamp and a tall potted plant at the right, two framed abstract artworks on the
> back wall.
>
> **The centre of the frame is uncluttered** — the back wall behind the sofa is plain,
> with no busy detail in the middle third of the image.
>
> Magazine-quality interior photography, warm golden grade, gentle bloom around the
> light sources, subtle film grain. No people. No text. No logos.

That "centre of the frame is uncluttered" line matters more than it looks. Our glass form
card sits dead centre for the whole experience. If the render puts a chandelier or a
pattern-heavy artwork there, the card becomes unreadable and you'll have to start over.

Generate until you have one you'd put on a billboard. Save it as `end.png`.

---

## Step 2 — Work backwards to the other two frames

Do **not** write new prompts for these. Go to **Edit / Inpaint**
(`higgsfield.ai/edit?model=nano_banana_pro_inpaint`) and edit `end.png` directly. That's
what keeps the room identical.

**`mid.png` — lit but empty.** Upload `end.png`, mask the furniture, prompt:

> Remove all furniture, rugs, lamps, plants and wall art. Empty room. Keep the walls,
> floor, window, daylight and ceiling lighting exactly as they are.

**`start.png` — dark and empty.** Upload `mid.png`, edit the whole image:

> Same room, same camera, all lights switched off and the window shuttered. Near-black,
> cool blue-grey shadow. Only the faint outline where the walls meet the floor is
> legible. Deep cinematic darkness, crushed blacks. Nothing else changes.

Check `start.png` isn't *pure* black — white text sits on it, and the room needs to be
just readable. If it's too dark, ask for "a faint trace of ambient light from the left."

---

## Step 3 — Gen A: the lights come up

**Video** → model **Kling 3.0**. Settings:

| Setting | Value |
|---|---|
| Duration | 6 s |
| Resolution | **720p for the draft** |
| Aspect ratio | 16:9 |
| Audio | **Off** |
| Shots | Single (multi-shot off) |
| Start frame | `start.png` |
| End frame | `mid.png` |

Their prompt format uses labelled blocks. Match it:

> **SCENE CONTEXT** A single unbroken six-second shot: an empty modern apartment living
> room emerges from darkness as its lighting comes up, while the camera drifts slowly
> backwards to reveal more of the space.
>
> **FORMAT** ONE CONTINUOUS TAKE, 6.0 s, zero cuts, real time. No speed ramps.
>
> **CAMERA** One slow continuous dolly out along the lens axis, constant velocity,
> precision-slider smoothness — not handheld, no shake, no reframing, no rotation. Starts
> exactly at the start-frame composition and ends exactly at the end-frame composition.
> The room stays symmetrical and centred throughout. ONE camera move only.
>
> **ACTION TIMING**
> 0.0–0.8 s: the two recessed ceiling panels come up to low intensity, warm 3000 K. Soft
> light pools appear on the floor beneath them. Everything else stays in shadow.
> 0.8–1.8 s: **hold.** Lighting steady, only the camera continues its slow drift back.
> 1.8–3.5 s: the warm cove light tracing the ceiling perimeter fades up; the walls take on
> their warm plaster tone; the oak flooring becomes visible and reads darker than the walls.
> 3.5–5.0 s: daylight builds through the right-hand window and spills across the floor.
> 5.0–6.0 s: the room settles at full brightness, matching the end frame exactly.
>
> **PHYSICS / LIGHT** Light behaves physically: intensity ramps smoothly, shadows soften
> and lengthen as sources brighten, warm light bounces off the walls onto the ceiling.
> The floor is dark wood, so the room does not simply get uniformly brighter — mid-tones
> deepen as the material appears.
>
> **LOCKS** The room stays completely empty — no furniture, no objects, nothing enters
> frame. No people. No text, no logos, no watermarks. The centre of the frame stays
> uncluttered. Photoreal architectural cinematography, fine film grain, no CGI smoothness.

That "hold" at 0.8–1.8s is deliberate. I measured your reference clip and it has exactly
this — a full second of near-stillness right after the lights come on. It's most of why
it feels controlled instead of busy.

---

## Step 4 — Gen B: the room furnishes

**Grab the last frame of Gen A first.** Download the clip and run:

```bash
ffmpeg -sseof -0.1 -i genA.mp4 -frames:v 1 genA-last.png
```

Use `genA-last.png` as the start frame, not `mid.png`. This is what makes the join
invisible — you're literally continuing from the pixel the last generation ended on.

Same settings as Gen A. Start frame `genA-last.png`, end frame `end.png`.

> **SCENE CONTEXT** A single unbroken six-second shot continuing directly from the
> previous take: a fully lit but empty modern living room becomes furnished, while the
> camera continues its slow backward drift.
>
> **FORMAT** ONE CONTINUOUS TAKE, 6.0 s, zero cuts, real time. Continues seamlessly from
> the start frame with no change in lighting, colour or camera speed.
>
> **CAMERA** The same slow continuous dolly out, same constant velocity, uninterrupted.
> No shake, no reframing, no rotation. Ends exactly at the end-frame composition.
>
> **ACTION TIMING** Furniture emerges from soft shadow into the light, one group at a
> time, each settling into place and staying put:
> 0.0–1.2 s: the large textured rug resolves on the floor at centre.
> 1.2–2.4 s: the oatmeal linen sofa resolves against the back wall.
> 2.4–3.4 s: the round walnut coffee table on the rug.
> 3.4–4.4 s: the accent armchair at the left; the floor lamp and potted plant at the right.
> 4.4–5.2 s: the two framed artworks resolve on the back wall.
> 5.2–6.0 s: everything settles; the shot rests on the finished room, matching the end
> frame exactly.
>
> **PHYSICS / LIGHT** Each piece has real weight and casts a correct contact shadow on
> the floor the moment it appears. Objects do not float, slide, tumble or bounce — they
> resolve in place, as though light is finding something that was always there. Lighting
> and white balance never change.
>
> **LOCKS** No people. No text, no logos, no watermarks. Nothing moves once it has
> settled. The centre of the frame stays uncluttered. Photoreal architectural
> cinematography, fine film grain.

**The phrasing there is doing real work.** Kling 3.0 models gravity and inertia, so
"furniture appears from nothing" fights the model and produces drifting, morphing objects.
"Resolves in place, as though light is finding something that was always there" gives it a
physically coherent story for the same visual result.

---

## Step 5 — Draft, then commit

Higgsfield's own guide says it plainly: don't iterate at high resolution. A 4K generation
costs three times a 720p one.

1. Run both at **720p** until the motion is right.
2. Only then rerun the locked prompts at **1080p**.

1080p is enough — the page renders at 1280px and upscales on a cover fit. 4K is money
you don't need to spend, and it triples your file sizes for no visible gain on a phone.

Rough cost: 6 s at 1080p is about 15 credits, roughly $0.75. Two final generations plus a
dozen 720p drafts lands around $12–15.

---

## Step 6 — Turn it into page assets

Join the two clips and split to frames:

```bash
# join
printf "file 'genA.mp4'\nfile 'genB.mp4'\n" > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy room.mp4

# split to 80 WebP frames (~23 KB each, ~1.9 MB total)
mkdir -p assets/seq
ffmpeg -i room.mp4 -vf "select='not(mod(n,3))',scale=1280:-1" -vsync 0 \
       -c:v libwebp -quality 72 assets/seq/frame-%03d.webp

ls assets/seq | wc -l    # note this number
```

Then in `config.js`:

```js
sequence: {
  path: "assets/seq/frame-",
  count: 80,          // whatever ls printed
  pad: 3,
  ext: "webp",
  marks: [0, 0.07, 0.30, 0.47, 0.78, 1.0]
}
```

Done. The vector room switches itself off and the visitor scrubs your render.

---

## Portrait version

Same two generations at aspect **9:16**, built from portrait versions of the three still
frames. Recompose rather than crop — in vertical you want more ceiling and floor, and the
sofa filling the lower third.

Output to `assets/seq-p/` and add `sequencePortrait` alongside `sequence` — tell me when
you have it and I'll wire the switch.

---

## What usually goes wrong

**The camera rotates or swings.** Kling likes drama. Add "no rotation, no arc, no orbit,
pure linear dolly" to the CAMERA block and regenerate.

**The room changes shape between Gen A and Gen B.** You used `mid.png` instead of Gen A's
actual last frame. Re-extract it.

**Furniture slides or morphs into place.** Strengthen the "resolves in place, does not
slide or float" phrasing, and slow the per-item timings.

**It ignores your end frame.** Higgsfield calls this "fighting your own end frame" — the
prompt describes motion that can't plausibly arrive where the frame says it ends. Simplify
the prompt and let the frames carry the direction.

**A light fixture or artwork lands dead centre.** Regenerate the end frame. The form card
lives there.

---

Sources: [Kling 3.0 guide](https://higgsfield.ai/blog/Kling-3.0-is-on-Higgsfield-User-Guide-AI-Video-Generation) ·
[Camera controls](https://higgsfield.ai/camera-controls) ·
[Image-to-video](https://higgsfield.ai/image-to-video-ai)
