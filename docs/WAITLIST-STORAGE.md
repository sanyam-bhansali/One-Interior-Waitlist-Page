# Where waitlist signups go

Into the **One Interiors product database** — the same Supabase project as
everything else — so ops sees the waitlist at `/ops/waitlist` beside
applications, verification and the funnel.

---

## The shape of it

```
oneinteriors.in (this repo — the waitlist page)
        │  POST, Bearer WAITLIST_INGEST_TOKEN
        ▼
ops.oneinteriors.in  ·  POST /api/waitlist   (the product app)
        │  Prisma
        ▼
Postgres  ·  waitlist_signups    →    /ops/waitlist
```

**This page holds a bearer token, not a database credential, and that is the
whole design.** A Supabase `service_role` key would let a marketing landing
page read every user, brief and quote in the product. A token scoped to one
route lets it add a name to one table. If it ever leaks, that is the entire
blast radius.

---

## Setup

### 1 · Generate a token

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### 2 · Product project (OneInteriors)

Add the model and migrate — this is a Prisma repo, so the table must come from
a migration, never from SQL typed into Supabase. An unmanaged table shows up
as schema drift and the next `migrate` will offer to reset it.

```bash
npm run db:migrate      # creates waitlist_signups
```

Then in **its** Vercel project → Settings → Environment Variables:

```
WAITLIST_INGEST_TOKEN   <the token>
```

### 3 · This project

Vercel → Settings → Environment Variables:

```
ONE_INTERIORS_INGEST_URL   https://ops.oneinteriors.in/api/waitlist
WAITLIST_INGEST_TOKEN      <the same token>
```

Redeploy **both**. Environment variables are read at boot, so an existing
deployment will not pick them up on its own.

### 4 · Check

Join the waitlist on the live page, then open `/ops/waitlist`. The row should
be there, tagged with whichever share link you used.

---

## Tracking which societies worked

The campaign is one WhatsApp message per society group. Give each its own link:

```
oneinteriors.in/?s=baner-greens
oneinteriors.in/?s=kothrud-orchid
```

The tag is captured, sanitised on both sides, stored on the row, and totalled
on the ops page under **Where they came from**. Without a tag the row reads
`no tag`.

This is the only way to know which groups are worth a second push.

---

## What the visitor is told

At the moment they type their number:

> We'll use your number to tell you when we go live, and to book your free
> architect consultation. Nothing else, and never passed on.

Every row stores the `policyVersion` that was in force when they agreed —
`POLICY_VERSION` in `src/modules/consent/policy.ts`. That is the same rule the
product's `Consent` model already follows, and it exists because **consent does
not survive a material change to the wording.** If that sentence above changes
in substance, bump `POLICY_VERSION`; rows stamped with the old one no longer
represent agreement to the new text.

---

## Behaviour

**Duplicates collapse.** The phone is normalised to E.164 by the same function
the product uses, and the column is unique — so a second signup updates the
existing row rather than adding another. `createdAt` keeps the first time they
joined. The total gets quoted to studios, so it has to mean people.

**Storage and notification are different things.** If `WAITLIST_WEBHOOK_URL`
or `WEB3FORMS_KEY` is also set, it is a *ping*. A lead safely in Postgres is
not reported as failed because Zapier was down — that would only make the
visitor submit again and leave you holding the same person twice. With no
ingest URL configured, the notifier becomes the store and its failure does
fail the request.

**Nothing disappears quietly.** If the ingest call fails, the whole lead is
written to the Vercel function log and can be recovered by hand.

---

## Phone numbers

Both ends accept the same forms, because they run the same rule:

| | |
|---|---|
| `9822011234` | ✅ |
| `+91 98220 11234` | ✅ |
| `09822011234` | ✅ — the STD-dialling habit, and very common on business cards |
| `919822011234` | ✅ |
| `020 2567 8900` | ❌ Pune landline — nothing can message it |

The leading-zero form used to be rejected here. `src/modules/studio/phone.ts`
in the product repo records what that cost on the studio side: people typing
their own number correctly were told it was wrong, and those signups never
reached anybody to be counted.

---

## If the token leaks

Generate a new one, set it in both projects, redeploy both. The old token
stops working the moment the product redeploys. Nothing else is exposed —
the token cannot read the table, only add to it.
