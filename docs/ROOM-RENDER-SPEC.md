# One Interiors — Waitlist Room Render Spec

What to generate so the waitlist page looks photoreal instead of vector-illustrated.

---

## Read this first — the format changed

I measured the reference clip frame by frame. Six cross-faded stills will **not**
reproduce it, and here's the evidence:

**The camera never stops moving.** Frame-to-frame difference stays at ~7 units for the
entire back half of the clip. There's a slow continuous pull-back running underneath
every transition. Six stills gives you five dissolves between frozen images — you *see*
the dissolve. The reference never dissolves, because time is always moving.

**The rhythm is burst-then-hold, not a steady ramp.** Measured brightness:

| Time | What happens |
|---|---|
| 0.0 → 0.67s | lights strike, brightness 31 → 64. Fast. |
| 0.67 → 1.67s | **hold.** A full second of near-stillness (frame-diff drops to 0.9). |
| 1.67 → 3.0s | warm cove lighting, 65 → 103 |
| 3.0 → 3.9s | brightness **drops** to 84 — the dark wood floor lands |
| 3.9 → 4.7s | daylight floods in, 84 → 130. Peak. |
| 4.7 → 5.3s | **hold** again |
| 5.3 → 7.7s | furniture arrives; long 2.4s settle down to 112 |
| 7.7 → 10s | at rest, text appears, camera still drifting |

Two things in there are worth stealing. The **holds** are what make it feel controlled
rather than busy — and in our version they come free, because that's when the visitor is
typing. And the **brightness dropping** when the floor appears is the detail that sells
it: real material introduction doesn't monotonically brighten.

**So generate a frame sequence, not six stills.** I checked the numbers on the reference
clip itself: 80 frames at 1280px WebP is **1.9 MB total, 23 KB per frame**. That preloads
comfortably while the visitor is on the dark screen. The page scrubs it — their progress
moves the playhead, with inertia, so the room is always gliding.

The page already supports both. `sequence` in `config.js` for the smooth version, `frames`
for the six-still fallback. Everything below still applies — it's the same room, just
rendered as a move instead of six poses.

---

## The one rule that decides whether this works

**Every frame must be the same room, same camera, same lens.** The page cross-fades between
frames. If the camera drifts even slightly between stage 2 and stage 3, the fade reads as a
cut and the whole "one room transforming" illusion dies.

Generative tools drift by default. So do not generate six frames from six prompts.

**Generate the FINAL frame first, then work backwards using image-to-image / edit on that
same image.** Higgsfield, Nano Banana, Gemini, Firefly — all of them will hold geometry if
you feed them the master image and ask only for a removal or a lighting change. Six
independent text-to-image runs will give you six different rooms.

Order of production:

1. Generate **Frame 5** (final, fully furnished, fully lit). Iterate until you love it. This
   is the master.
2. From the master, image-to-image → **Frame 4** (same room, warmer/dimmer grade).
3. From the master → **Frame 3** (remove all furniture, keep materials + light).
4. From Frame 3 → **Frame 2** (dim the lights to ~40%, mute the materials).
5. From Frame 2 → **Frame 1** (lights at ~20%, room mostly in shadow).
6. From Frame 1 → **Frame 0** (lights completely off, near-black silhouette).

---

## The fixed room description

Paste this block **verbatim** into every prompt. Do not reword it between frames.

> Modern Indian apartment living room, strict one-point perspective, camera locked at 1.5 m
> height dead centre facing the back wall, 35 mm lens, perfectly symmetrical composition,
> back wall centred in frame, floor-to-ceiling window on the right wall, two recessed
> rectangular LED panels set into the ceiling, wide-plank oak flooring, plain plastered
> walls, no people, no text, 16:9

---

## Frame-by-frame

### Frame 0 — Unlit
Add to the fixed description:
> All lights off. Room lit only by a faint trace of ambient spill. Near-black, cool blue-grey
> shadow, barely legible geometry — you can just make out the corner where the walls meet the
> floor. No furniture. Deep cinematic darkness, crushed blacks, film grain.

*This frame is on screen behind the Join Waitlist button, so it must be dark enough to read
white text over — but not pure black, or the room disappears entirely.*

### Frame 1 — Panels strike on, low
> The two ceiling LED panels are ON at roughly 20% intensity, 3000 K warm white. Visible soft
> volumetric light cones descending from each panel. Two soft pools of warm light on the
> floor. Walls still in deep shadow. No furniture. Empty shell. Moody, cinematic.

### Frame 2 — Materials appear
> Ceiling panels at 50% intensity. Oak plank flooring now clearly visible and warm. Walls
> read as warm plaster. Soft daylight beginning to come through the right-hand window. Still
> completely empty — no furniture at all. Clean, unfurnished, ready.

### Frame 3 — Fully lit, styled, still empty
> Ceiling panels at full intensity, 3000 K. Bright natural daylight flooding through the
> right window. Rich oak floor, warm plastered walls, crisp shadows. Still no furniture —
> a beautiful, finished, completely empty room.

**Generate this one four times**, once per style, changing only the material line:

| Style | Material line to append |
|---|---|
| Warm Minimalist | warm oatmeal plaster walls, pale oak floor, soft beige tones |
| Modern Classic | deep sage-green walls, dark walnut floor, brass fixtures |
| Industrial Loft | exposed grey concrete walls, dark charcoal micro-cement floor, black steel window frames |
| Traditional Indian | warm terracotta walls, deep-toned teak floor, brass and jaali detailing |

### Frame 4 — Furnished
> Same room, now furnished: a low three-seater sofa centred against the back wall, a round
> wooden coffee table on a large textured rug, one accent armchair at the left, a floor lamp
> and a tall potted plant at the right, two framed artworks on the back wall. Realistic
> contact shadows under every piece. Same camera, same lighting.

### Frame 5 — Final grade
> Identical to the previous frame with a final cinematic colour grade: slightly warmer
> highlights, gentle bloom around the ceiling panels and window, soft golden-hour feel, subtle
> film grain. Magazine-quality interior photography.

---

## Delivery specs

| | |
|---|---|
| Count | 6 frames minimum. 9 if you do all four style variants of Frame 3. |
| Resolution | 2560 × 1440 (16:9). Don't go below 1920 × 1080. |
| Format | WebP or AVIF, quality ~78 |
| Weight | **Under 250 KB each.** Six frames = whole page under 1.5 MB. Non-negotiable — the brief says zero lag. |
| Naming | `room-0.webp` … `room-5.webp`, style variants `room-3-warm.webp` etc. |
| Where | Drop them in this folder. |

**Also worth generating: a portrait set.** The room is full-bleed, so on a phone the 16:9
frames get centre-cropped and you lose the window and the left armchair. A second set at
1080 × 1920 with the same room recomposed for vertical would make the mobile experience
properly good. Name them `room-0-p.webp` etc.

---

## Preferred: the frame sequence

One continuous 10-second move through all six stages, exported as numbered frames.

| | |
|---|---|
| Length | 10 s at 24 fps, exported every 3rd frame = **80 frames** |
| Naming | `frame-001.webp` … `frame-080.webp` in `assets/seq/` |
| Resolution | 1280 × 720 (the page upscales on a cover fit; 1920 if you have the budget) |
| Format | WebP quality 72 — measured at ~23 KB/frame, 1.9 MB total |
| Camera | **One slow continuous pull-back.** Not locked — drifting. Start tight on the back wall, end wide enough to hold the sofa, armchairs and window. |
| Beats | Follow the timing table at the top of this document. |

Then in `config.js`:

```js
sequence: { path: "assets/seq/frame-", count: 80, pad: 3, ext: "webp",
            marks: [0, 0.07, 0.30, 0.47, 0.78, 1.0] }
```

`marks` is where each of the six stages lands in the sequence. They're pre-set to the
reference clip's own beats — adjust only if your render's pacing differs.

If you render this in Blender, Cinema 4D, or any real 3D tool, this is the easy route:
it's one animation with a camera path and keyframed lights, and you export the PNG
sequence you'd export anyway.

If you're generating with AI, produce the **video** first (Veo, Kling, Runway), then
`ffmpeg -i clip.mp4 -vf "select='not(mod(n,3))'" -c:v libwebp -quality 72 frame-%03d.webp`.

---

## Alternative: video element

A single continuous clip also works, and I'd scrub it by form progress rather than play it.
Lighter to produce, but seeking H.264 is janky unless you encode with a keyframe every
frame (`-g 1`), which triples the file size — which is why the frame sequence usually wins.

| | |
|---|---|
| Length | 12 s |
| Camera | **Completely locked. No pan, no push-in, no parallax.** This is the whole thing. |
| Resolution | 1920 × 1080 |
| Format | H.264 MP4 **and** WebM/VP9, no audio track |
| Weight | Under 4 MB |
| Beats | 0:00 dark · 0:02 panels strike on low · 0:04 up to half · 0:06 materials · 0:08 full light · 0:10 furniture in · 0:12 final grade |

Give me the file plus the timestamp of each beat, and I'll map the three form answers onto
those seven beats.

**One caution:** Veo/Gemini video will almost certainly add a slow camera push even when you
ask for a locked camera, and it tends to hallucinate furniture drifting in and out. If the
first attempt drifts, abandon video and go with the six stills — the cross-fade route is
lower risk and the page already supports it.

---

## Handing them back to me

Put the files in this folder and tell me they're there. The page has a media layer waiting:

```js
var ROOM_FRAMES = [];   // ← six URLs go here
```

The moment that array has six entries, the vector room switches off and your renders take
over. Nothing else in the page changes. If you do the four style variants, tell me and I'll
extend it so picking a style swaps the render instead of just re-tinting it.

---

## Where the free consultation line sits right now

Four places, so it can't be missed:

- Under the Join Waitlist button — *"Waitlist members get a free consultation with a certified architect"*
- Step 1 of the form — *"free 45-minute consultation with a certified architect, before you commit to anything"*
- Step 2 — *"We contact you once, to book your free architect consultation. Nothing else."*
- The submit button itself reads **Claim my free consultation**, and the closing screen confirms it's reserved.

Change the 45-minute figure if that's not what you'll actually honour — it should match the
real offer, because it's the first promise you make to these people.
