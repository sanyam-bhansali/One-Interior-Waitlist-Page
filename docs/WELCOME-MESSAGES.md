# Welcome messages

The **product** sends the welcome, once, right after someone joins, on the channel
they gave (`src/modules/waitlist/welcome.ts` in the OneInteriors repo). This page
only asks. Nothing here needs a key.

The wider sequence (day 2, day 5, weekly, launch) is in `LAUNCH-KIT.md` §5. Only
the day-0 welcome is automatic today; the rest are sent by the team.

---

## WhatsApp — template `oi_waitlist_welcome`

Submit in Meta Business Manager → WhatsApp Manager → Message templates.

| Field | Value |
|---|---|
| Name | `oi_waitlist_welcome` (or set `WHATSAPP_WAITLIST_TEMPLATE` in the product to another name) |
| Category | **Utility** — it confirms something they just did |
| Language | English (`en`) |
| Variables | `{{1}}` first name · `{{2}}` their place, sent as `#141` (or `saved` if the place could not be read) · `{{3}}` their link |

**Body** — copy exactly; the product sends `{{2}}` with its own `#`:

```
Hi {{1}}, you're on the One Interiors Pune list. Your place in the queue: {{2}}.

Pune opens when 2,000 people have joined, and invites go out in queue order.

Move up: every friend who joins through your link moves you up 25 places. Three friends make your ₹5,000 architect call free; five get you a free cab to the studio.

Your link: {{3}}

Reply STOP to stop messages.
```

Sample values for Meta's review: `Asha`, `#141`, `https://oneinteriors.in/?r=ABCD234`.

Until the template is approved, WhatsApp welcomes fail quietly and the signup is
still stored; `/ops/waitlist` shows who was not welcomed (the **Welcomed** column
is empty), so they can be sent by hand later.

**STOP replies are not automated.** Someone must read the WhatsApp Business inbox
and honour a STOP within 24 hours (LAUNCH-KIT §9).

---

## Email (Resend)

Sent from the product's Resend sender. Subject: *You're #141 on the One Interiors
list* (or *You're on the One Interiors list*). Plain text:

```
Hi Asha,

You are #141 on the One Interiors founding list for Pune.
Pune opens when 2,000 people have joined, and invites go out in queue order.

Move up the queue: every friend who joins through your link moves you up 25 places.
Your link: https://oneinteriors.in/?r=ABCD234

Three friends make your ₹5,000 call with our architect free, wherever you are in the
queue (it is free anyway for the first 1,000 to join). Five friends get you a free
cab to the studio.

We will only write about your place on the list and the launch. To stop, reply to
this email.

One Interiors
```

The last line asks people to **reply** to stop. That only works if the sender
address can receive mail — `hello@oneinteriors.in` has no MX record today (see the
product's `docs/CLOUDFLARE.md`). Turn on Cloudflare Email Routing for it before the
first email goes out, or opt-outs vanish.

---

## Product settings that shape these

| Variable (product project) | Default |
|---|---|
| `WHATSAPP_WAITLIST_TEMPLATE` | `oi_waitlist_welcome` |
| `WAITLIST_SITE_URL` | `https://oneinteriors.in` — the base of `{{3}}` |
| WhatsApp Cloud API + Resend keys | as already set for sign-in codes |
