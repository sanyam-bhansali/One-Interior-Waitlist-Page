# One Interiors — intro film

Production guide, built from Higgsfield's own documentation rather than guesswork.

**Tone: premium throughout.** No meme styling in the main film — it would meet a visitor
who just came from the waitlist page and read as two different companies. A 20-second
social cut comes out of the same footage at the end.

---

## 1 · What I got wrong, and what their docs actually say

We burned three generations on Scene 1. Reading Higgsfield's official Nano Banana Pro
prompt guide afterwards, most of that was avoidable.

**We were hand-writing end frames. There's a tool for that.** Higgsfield ships
**Zooms** ("9 zoom levels from one image"), **Shots** ("9 unique shots from one image"),
**Angles 2.0** ("any angle view for any image") and **Expand image** (outpaint past the
edges). Feed one still in, get consistent reframes out. No prompt, no drift, same scene
guaranteed — because it *is* the same image. Every end frame in this document now comes
from Zooms or Expand, not from a written prompt.

**We never locked the seed.** Their guide is explicit: *"Once you achieve a specific
result, [lock the seed] and reuse [it] to generate a consistent series of images."* That
is the single biggest consistency lever and we weren't touching it.

**Our prompts were too polite.** Their guide: *"Models lose focus on conversational
filler. Remove polite phrases. Use command-line style syntax."* Every prompt below is
now `KEY: value`, terse, no sentences where a list will do.

**Aspect ratio belongs in the prompt text**, not just the dropdown — *"Establish rigid
canvas boundaries to prevent composition drift. Specify aspect ratios numerically."*

**Camera spec needs aperture and shutter, not just focal length** — *"define lens focal
length, aperture, and shutter speed to enforce realistic volumetric depth"* — plus the
tag *"shot on full-frame cinema camera"*, which their guide says forces film-grain
emulation.

**Reference images take a weight value.** Set it high for the couple so faces hold.

**Nano Banana Pro can render text** if you quote the string and name the font. Useful for
the end card. **Kling still cannot** — video text stays in the edit.

---

## 2 · Toolchain — which tool for which job

Stop using one tool for everything. This is most of the speed-up.

| Job | Tool | Why |
|---|---|---|
| The couple anchor | **Image → Nano Banana Pro** | Full control, 4K |
| A scene's opening frame | **Image → Nano Banana Pro** + couple reference | Compose it deliberately |
| A **tighter** end frame | **Apps → Zooms** | 9 zoom levels from your start frame. Pick one. Zero drift. |
| A **wider** end frame | **Apps → Expand image** | Outpaints past the edges, keeps everything inside identical |
| A different framing of the same scene | **Apps → Shots** | 9 framings, same scene |
| A different camera angle | **Apps → Angles 2.0** | New viewpoint, same scene |
| Changing what someone *does* | **Edit → Nano Banana Pro Inpaint** | Mask just the person |
| Animating between two frames | **Video → Kling 3.0** | Start + end frame |
| Matching grade across shots | **Apps → Color grading** | Temperature, contrast, grain in one pass |
| Joining two shots | **Apps → Transitions** | Seamless join between clips |

**The rule that follows:** if the end frame differs from the start frame only in *framing*,
never write a prompt — use Zooms or Expand. Only write a prompt when a **person changes
what they are doing**, and then use Inpaint on just that person.

---

## 3 · Rules

**R1 · Lock the seed.** Once a still is right, note its seed and reuse it for everything
in that scene.

**R2 · Reframes come from Zooms/Expand, never from prompts.**

**R3 · An end frame is ~1.3–1.5× from the start. Never 4×.** A bigger jump makes the
camera travel *and* the subject walk, and it slides and morphs.

**R4 · Never move the camera and rotate the subject at once.** If someone turns, the
camera nearly holds.

**R5 · One figure acts, the other stays still.** Half the moving parts.

**R6 · Nothing over 7 seconds.** Two safe 6s takes beat one 13s gamble. A cut is normal
filmmaking.

**R7 · Lock the shadows in words.** Hard light is the best thing in these frames and the
first thing a generator wobbles.

**R8 · Command syntax. No filler.** `KEY: value`. No "please", no "try to".

---

## 4 · Blocks

Paste verbatim. Never paraphrase between shots — identical wording is what keeps the room
the same room.

**BLOCK-NEG**
```
NEGATIVE: no text, no logos, no signage, no watermarks, no readable screens, no extra
people, no distorted hands, no extra fingers, no plastic skin, no CGI smoothness.
```

**BLOCK-CAM-WIDE**
```
CAMERA: 35mm, f/5.6, 1/250s, shot on full-frame cinema camera, fine film grain.
```

**BLOCK-CAM-CLOSE**
```
CAMERA: 50mm, f/2.0, 1/500s, shot on full-frame cinema camera, shallow depth of field,
fine film grain.
```

**BLOCK-ROOM-EMPTY**
```
LOCATION: large empty unfurnished Indian apartment living room. Full-height sliding
aluminium balcony doors with slim safety grilles. Balcony with steel railing beyond.
White residential towers and a flowering gulmohar tree outside. Bare grey cement screed
floor. Plain white putty walls. Ceiling fan hook plate centred in ceiling. Completely
empty, no furniture, no boxes.
```

**BLOCK-ROOM-DONE**
```
LOCATION: the same Indian apartment living room, finished and furnished. Oatmeal linen
three-seater sofa, round walnut coffee table, large textured rug, oak flooring, warm
plastered walls, slim floor lamp, tall potted plant, two framed abstract artworks.
```

**BLOCK-STUDIO**
```
LOCATION: bright architectural design studio in oak, concrete and glass. Drafting tables,
wall of material samples, tall windows. Calm, uncluttered.
```

**BLOCK-COUPLE**
```
SUBJECT: the Indian couple from the reference image, early thirties. She: oatmeal knit
sweater, blue jeans. He: grey linen shirt, dark jeans. Both barefoot. Reference weight:
high — faces must match exactly.
```

---

## 5 · Shot list

Seven shots, none over 7 seconds, mapped to the measured voiceover.

| # | Shot | Length | How |
|---|---|---|---|
| 1A | Empty flat, wide — the dream | 6.5s | Kling |
| 1B | Closer on him — the doubt | 6.3s | Kling |
| 2A | Designers, lineup | 5.0s | Kling |
| 2B | One designer, locked-off | 4.8s | Kling |
| 3 | The product | 8.7s | **Screen recording** |
| 4A | Couple with tablet | 5.0s | Kling |
| 4B | Settled, wide | 4.7s | Kling |

```
0:00.00 ── 1A ──┐
0:06.50 ── 1B ──┘ vo-1-problem.mp3    12.77s
0:12.77 ── 2A ──┐
0:17.77 ── 2B ──┘ vo-2-verified.mp3    9.77s
0:22.54 ── 3  ──── vo-3-process.mp3     8.74s
0:31.28 ── 4A ──┐
0:36.28 ── 4B ──┘ vo-4-architect.mp3    9.74s
0:41.02 ── end card                     2.00s
```

Generate each clip **half a second longer** than its slot for trim room.

**Fixed Kling settings, every time:** 16:9 · **720p for drafts** · audio **Off** ·
multi-shot **Off** · **Enhance Off** (it rewrites your prompt and breaks the locks) ·
start frame and end frame both supplied.

---

## 6 · Stills

### 6.0 · `couple.png` ✅ done — **record its seed now**

```
SUBJECT: Indian couple, early thirties, middle class, standing side by side facing camera.
ACTION: relaxed, natural expressions, still.
WARDROBE: she — oatmeal knit sweater, blue jeans. he — grey linen shirt, dark jeans.
COMPOSITION: 16:9. Waist-up. Centred. Equal weight to both faces.
LOCATION: plain warm grey seamless backdrop.
[BLOCK-CAM-CLOSE]
LIGHT: soft daylight from camera left, gentle falloff right.
STYLE: photoreal editorial portrait, natural skin texture.
[BLOCK-NEG] No props.
```

### 6.1 · `s1a-start` ✅ done

```
[BLOCK-COUPLE]
ACTION: standing a few steps inside the room, holding hands, seen from behind, looking
out through the balcony doors.
COMPOSITION: 16:9. Wide shot. Both figures small and centred, full length, floor visible
at their feet. Symmetrical one-point perspective.
[BLOCK-ROOM-EMPTY]
[BLOCK-CAM-WIDE]
LIGHT: hard midday sun through balcony doors. Sharp window-grille shadows across floor
and left wall. High contrast. Warm dust in air.
STYLE: photoreal architectural photography.
[BLOCK-NEG]
```

### 6.2 · `s1a-end` — **Apps → Zooms**

Feed `s1a-start` in. Take the **~1.4× tighter** result. Nine options, no prompt, no drift.

Then **Edit → Inpaint**, mask only the man:

```
CHANGE: he has released her hand, turned head and shoulders three-quarters toward camera,
and holds a phone low at chest height, looking down at it.
KEEP: everything else identical. Her pose unchanged. Same floor, shadows, walls, view.
[BLOCK-NEG] Nothing readable on the phone screen.
```

### 6.3 · `s1b-start` ✅ done

The near-portrait you made — him at frame right, hand at his neck, phone low, her small
at the balcony behind. Too big a jump to serve as an end frame; an excellent **start**
frame for its own shot.

### 6.4 · `s1b-end` — **Edit → Inpaint only**

No reframe at all. Mask the man:

```
CHANGE: phone lowered to his side. Hand dropped from the back of his neck. Looking away
past camera, still and quiet. Shoulders settled.
KEEP: identical framing and scale — he must not move closer to or further from camera.
Her position unchanged. Same light, same shadows.
[BLOCK-NEG]
```

### 6.5 · `s2a-start`

No couple reference.

```
SUBJECT: four Indian interior designers, thirties to forties, standing in a relaxed line.
ACTION: looking toward camera, calm and unhurried. One holds a rolled drawing, one holds
material swatches.
WARDROBE: contemporary professional, muted neutrals, no bright colours.
COMPOSITION: 16:9. Medium shot, waist-up. All four evenly spaced, fully in frame.
[BLOCK-STUDIO]
[BLOCK-CAM-WIDE]
LIGHT: warm daylight from tall windows behind them, soft and even.
STYLE: photoreal editorial portrait photography.
[BLOCK-NEG]
```

### 6.6 · `s2a-end` — **Apps → Expand image**

Outpaint outward to reveal more studio. Everything inside the original frame stays
pixel-identical, which is exactly what a dolly-back needs.

### 6.7 · `s2b-start`

```
SUBJECT: one Indian interior designer, seated at a drafting table.
ACTION: reviewing a printed floor plan, pencil in hand, head down in concentration.
COMPOSITION: 16:9. Medium close-up. Hands and drawing in lower third, face in upper third.
[BLOCK-STUDIO]
[BLOCK-CAM-CLOSE]
LIGHT: warm window light from camera left, soft shadow under the hands.
STYLE: photoreal.
[BLOCK-NEG] Floor plan shows line work only — no readable dimensions, labels or title
block.
```

### 6.8 · `s2b-end` — **Edit → Inpaint only**

```
CHANGE: head lifted, looking directly at camera, calm and assured. Pencil at rest on the
drawing.
KEEP: identical framing, scale, seat position, drawing, light.
[BLOCK-NEG]
```

### 6.9 · `s4a-start` — **Edit → Inpaint** on `source/stills/room-finished.png`

That file is the final frame of your waitlist render, so the film and the landing page
show the same room. Attach `couple.png` as reference, weight high.

```
ADD: [BLOCK-COUPLE] seated close together on the sofa, leaning slightly forward toward a
tablet propped on the coffee table. Relaxed posture.
COMPOSITION: 16:9. Medium two-shot. Both fully in frame. Sofa and coffee table visible.
KEEP: room, furniture, lighting and colour grade exactly as they are. Same golden light
direction, same warm lamps, same rug and artwork.
[BLOCK-NEG] Tablet screen angled away from camera, softly out of focus, nothing readable.
```

### 6.10 · `s4a-end` — **Expand image**, then **Inpaint**

Expand ~1.3× wider, then mask the couple:

```
CHANGE: sat back into the sofa. He rests one arm along the backrest. Small shared smile.
KEEP: same seats, same tablet on the table, same light.
[BLOCK-NEG]
```

### 6.11 · `s4b-start` / `s4b-end`

`s4b-start` **is** `s4a-end`. For `s4b-end`, run **Expand image** once more (~1.4× wider,
to take in the whole living room), then Inpaint:

```
CHANGE: looking at each other, then out across the room. Settled and still.
KEEP: same seated positions, same room, same light.
[BLOCK-NEG]
```

---

## 7 · Generations

Same seven headings every time.

### Shot 1A · 7.0s · `s1a-start` → `s1a-end`

```
SCENE: couple stand in their empty new flat looking out at the balcony. Quiet happiness
turns to doubt as he checks his phone. Resolves exactly on the end frame.
FORMAT: one continuous take, 7s, zero cuts, real time, no speed ramps.
CAMERA: begins exactly at start-frame composition. ONE slow dolly forward, constant
velocity, ending exactly at end-frame framing. Precision-slider smooth. No handheld, no
shake, no rotation, no arc, no orbit, no pan.
TIMING:
  0.0-3.5 both still, holding hands, looking out. She tilts her head toward his shoulder.
  3.5-5.5 he releases her hand, takes out a phone, holds it low, scrolls. Shoulders drop.
  5.5-7.0 he keeps reading, head lowered. She unchanged.
PHYSICS: real weight on bare feet on concrete. Clothing drapes and settles. Hands whole
and purposeful, never morphing. Gulmohar branches move slightly in the breeze.
LIGHT: continuous with start frame. Hard midday sun, sharp window-grille shadows across
the floor. Shadows stay geometrically consistent as the camera moves — must not swim,
wobble or change angle.
LOCKS: both people 100% consistent with start frame. Room completely empty, nothing
carried in. ONE camera move only. Nothing readable on the phone. No text, no logos.
Photoreal, 35mm film grain.
```

### Shot 1B · 6.8s · `s1b-start` → `s1b-end`

Near-static. The most reliable shot in the film.

```
SCENE: the man finishes reading something on his phone, lowers it and looks away, tired.
FORMAT: one continuous take, 6.8s, zero cuts, real time.
CAMERA: begins exactly at start-frame composition and HOLDS. Only a barely perceptible
push forward, under ten percent change in framing across the whole shot. No pan, no tilt,
no rotation, no reframing.
TIMING:
  0.0-2.5 exactly as start frame. Hand at back of neck, eyes moving over the screen. One
          slow blink.
  2.5-4.5 lowers the phone to his side, drops the hand from his neck, exhales.
  4.5-6.8 looks away past camera and holds. Behind him she shifts weight once, still
          facing out.
PHYSICS: real breathing, true blink timing. Shirt shifts slightly as the arm lowers.
Hands whole.
LIGHT: continuous with start frame. Grille shadows on the floor do not move.
LOCKS: he must NOT move closer to or further from camera — his scale in frame is fixed.
Both people 100% consistent with start frame. Room empty. Nothing readable on the phone.
No text, no logos. Photoreal, 35mm film grain.
```

### Shot 2A · 5.5s · `s2a-start` → `s2a-end`

```
SCENE: four designers stand composed in their studio as the camera eases back to reveal
the room around them.
FORMAT: one continuous take, 5.5s, zero cuts, real time.
CAMERA: begins exactly at start-frame composition. ONE slow dolly backward, constant
velocity, ending exactly at end-frame wide composition. Precision-slider smooth. No
handheld, no rotation, no arc, no pan.
TIMING:
  0.0-2.5 small natural movements only — weight shift, slow blink, drawing adjusted.
  2.5-4.0 the two at the edges turn their heads very slightly toward the lens.
  4.0-5.5 all four settle and hold as the camera reaches its widest.
PHYSICS: real breathing and blink timing. Paper and fabric have weight. Nobody drifts,
slides or changes position on the floor.
LIGHT: continuous with start frame. Warm daylight from tall windows, soft and even.
LOCKS: all four 100% consistent with start frame — same faces, clothing, objects. Nobody
walks. ONE camera move. No text, no logos, no signage, no readable screens. Photoreal
editorial cinematography, fine film grain.
```

### Shot 2B · 5.3s · `s2b-start` → `s2b-end`

```
SCENE: a designer studying a floor plan lifts her head and looks at camera.
FORMAT: one continuous take, 5.3s, zero cuts, real time.
CAMERA: locked off. Begins exactly at start-frame composition and HOLDS. No dolly, no
pan, no tilt, no rotation, no reframing whatsoever.
TIMING:
  0.0-2.0 continues reading, pencil moves once across the paper.
  2.0-3.5 pencil comes to rest, she lifts her head.
  3.5-5.3 looks directly at camera, calm and assured, holds. One slow blink.
PHYSICS: real neck and shoulder movement as the head lifts. Paper stays flat and still.
Hands whole, five fingers.
LIGHT: continuous with start frame, unchanged throughout.
LOCKS: framing completely locked — nothing moves but her. Drawing shows line work only,
no readable dimensions, labels or title block. No text, no logos. Photoreal, fine film
grain.
```

### Shot 4A · 5.5s · `s4a-start` → `s4a-end`

```
SCENE: the couple sit together on the sofa in their finished apartment, looking at a
tablet, relaxed and unhurried.
FORMAT: one continuous take, 5.5s, zero cuts, real time.
CAMERA: begins exactly at start-frame composition. ONE slow dolly backward, constant
velocity, ending exactly at end-frame framing. Precision-slider smooth. No handheld, no
rotation, no pan.
TIMING:
  0.0-2.5 both lean toward the tablet. She points at something, he nods once.
  2.5-4.5 they sit back into the sofa, he rests an arm along the backrest.
  4.5-5.5 small shared smile, both settle and hold.
PHYSICS: real weight shifting into upholstery, cushions compress. Natural breathing and
blink timing. Hands whole and purposeful.
LIGHT: continuous with start frame. Late-afternoon golden light through balcony doors,
warm practical lamps lit, soft shadows. Unchanged throughout.
LOCKS: both 100% consistent with start frame. Room and furniture exactly as they are —
nothing added, removed or moved. Tablet screen angled away and out of focus, nothing
readable. No text, no logos. Photoreal, warm grade, 35mm film grain.
```

### Shot 4B · 5.2s · `s4b-start` → `s4b-end`

```
SCENE: the couple sit back on their sofa and look out across their finished home.
FORMAT: one continuous take, 5.2s, zero cuts, real time.
CAMERA: begins exactly at start-frame composition. ONE slow dolly backward, constant
velocity, ending exactly at end-frame wide composition. Precision-slider smooth. No
handheld, no rotation, no pan.
TIMING:
  0.0-2.0 they look at each other, a small unforced smile.
  2.0-4.0 both turn to look out across the room toward the balcony doors.
  4.0-5.2 settle and hold, still and content, as the camera reaches its widest.
PHYSICS: real weight in the sofa cushions. Natural breathing. Hands rest naturally.
LIGHT: continuous with start frame. Golden hour, warm lamps lit. Unchanged throughout.
LOCKS: both 100% consistent with start frame, do not stand up or change seats. Room and
furniture exactly as they are. No text, no logos. Photoreal, warm grade, 35mm film grain.
```

---

## 8 · Shot 3 — record the real product · 8.7s

**Do not generate this.** No video model renders a legible interface; it produces
something that looks like an app from three metres and dissolves into nonsense the moment
anyone reads it — on the one scene whose job is to say *we are precise about money*.

Chrome at 1920×1080, zoom 100%, bookmarks bar hidden (`Ctrl+Shift+B`), no extension
icons. OBS at 1920×1080, **60fps**, Chrome window only.

**Four takes, ~5s each. Move the cursor at roughly half the speed that feels natural** —
real-time mouse movement looks frantic once cut to music.

| Take | What to show |
|---|---|
| A | Answering one quiz question — hover, click, next question arriving |
| B | Match results — scores and the "why this matched" reasoning |
| C | A quote itemising, scrolling slowly through line items |
| D | The side-by-side compare view |

One realistic example throughout: a real Pune locality, a real BHK, a plausible budget.
Trim each to ~2.2s in the edit and speed-ramp there, never while recording.

---

## 9 · Overlays

| Where | When | Content |
|---|---|---|
| 1B | 1.0–5.0s, staggered 0.6s | `Project delayed · 3 months` · `Budget ₹4.5L → ₹7.2L` · `No response · 11 days` |
| 2A | from 2.0s, count 1→15 over 1.5s | `15 verification checks · every designer` |
| 3 | one per take | `OneQuiz` · `OneMatch` · `OneQuote` · `OneCompare` |
| End | last 2s over a still of 4B | `One Interiors` / `Free architect consultation for the Pune waitlist` / `one-interiors.vercel.app` |

Stress cards look like real notification chips — rounded rectangle, dark translucent fill,
white text, subtle shadow, small. Pressure, not the subject.

**Type:** Fraunces for the end card headline, Jost for everything else — the waitlist
page's pairing. **Colours:** `#f4f1e9` text, `#c89b5c` brass.

> If you'd rather build the end card in Higgsfield than in an editor, Nano Banana Pro
> *can* render text — their guide says to put the string in double quotes and name the
> font family. Kling still can't; video text stays in the edit.

---

## 10 · Assembly

Lay the four VO files end to end first; they define the cuts. Drop each clip under its
slot, trim the spare half-second.

**Match the grade before cutting.** Run every clip through **Apps → Color grading** to one
target — the warm neutral of your waitlist render. Shots generated hours apart drift in
temperature, and mismatched grades are the clearest tell that a film was assembled rather
than shot.

**Transitions:** straight cuts everywhere except a 0.4s dissolve from 2B into 3, where the
film moves from people to product. If a cut between two generated shots feels abrupt,
**Apps → Transitions** will build a join.

**Music:** one warm restrained bed at about -22 LUFS, ducked 4dB under each VO line. No
drops, no trailer hits.

**Export:** H.264 MP4, 1080p, CRF 20, AAC. Under 8 MB.

---

## 11 · Onto the site

```bash
cp your-export.mp4 "public/assets/demo.mp4"
ffmpeg -i public/assets/demo.mp4 -ss 3 -frames:v 1 -q:v 3 public/assets/demo-poster.jpg
```

```js
demoVideo: { src: "assets/demo.mp4", poster: "assets/demo-poster.jpg" },
```

Check with `/#demo`. A "See how it works" button appears after the closing message
settles; clicking it turns the message to dust and the player assembles out of it.

**Social cut** — 20s from the same assets, no extra generation: 1B trimmed to 4s, the
15-checks beat, two product takes, the end card. Export 9:16 with overlays repositioned.

---

## 12 · Check each draft before spending on 1080p

- [ ] Camera moves in one direction only — no drift back, no rotation, no pan
- [ ] Subject scale stable; nobody slides toward or away from camera unbidden
- [ ] Faces match the start frame throughout, including the very last frame
- [ ] Five fingers in every frame — step through the edges
- [ ] Grille shadows hold their angle and don't swim
- [ ] Nothing in frame is trying to be text
- [ ] 1A/1B room completely empty; 4A/4B room furnished and unchanged
- [ ] Hard cool light in Scene 1, warm soft light in Scene 4 — that contrast *is* the story
- [ ] No frozen expressions, no unnatural blinks

---

## 13 · When it still goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| Camera swings or arcs | Kling likes drama | Add "no arc, no orbit, no pan, pure linear dolly" |
| Subject slides toward camera | Start/end framing gap too big | Remake the end frame with Zooms at a smaller step |
| Face changes mid-shot | End frame drifted from start frame | Rebuild it with Zooms/Expand, not a prompt |
| Room changes between stills | Seed not locked | Lock the seed and regenerate the series |
| Hands deform | Not promptable | Regenerate; give hands a job — phone, drawing, swatches |
| Timing ignored | Shot too long | Split it; second shot starts on the first's actual last frame |
| Room gains furniture | Locks too weak | Repeat "completely empty, nothing carried in" in SCENE *and* LOCKS |

---

## 14 · Voiceover

`source/vo/` holds a Google Chirp3-HD Hindi read, measured and split to the four scene
lengths. It has done its most important job: exact timings before a rupee went on video.

**Replace it with a human for launch.** Hindi TTS gets the words right and the warmth
wrong. A voice artist is ₹2,000–8,000 for 45 seconds on Fiverr or Voice123 — the cheapest
quality upgrade in this production. Have them read to these same timings and nothing else
in the edit changes.

---

Sources: [Nano Banana Pro prompt guide](https://higgsfield.ai/nano-banana-pro-prompt-guide) ·
[Kling 3.0 guide](https://higgsfield.ai/blog/Kling-3.0-is-on-Higgsfield-User-Guide-AI-Video-Generation) ·
[Higgsfield apps](https://higgsfield.ai/apps)
