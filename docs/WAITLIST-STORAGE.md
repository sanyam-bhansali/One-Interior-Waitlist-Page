# Waitlist storage — Supabase

Fifteen minutes, once. After this every signup lands in a table you can query,
export and count, instead of an inbox.

---

## 1 · Create the table

Supabase → your project → **SQL Editor** → **New query**. Paste the whole of
[`supabase/schema.sql`](../supabase/schema.sql) and press **Run**.

It is safe to run twice — every statement is guarded.

You should see `Success. No rows returned`. Check **Table Editor**: a
`waitlist` table, empty, with a padlock next to it. The padlock is the point.

---

## 2 · Get the keys

Supabase → **Project Settings** → **API**. You need two values:

| | |
|---|---|
| **Project URL** | `https://xxxxxxxx.supabase.co` |
| **service_role** key | the long one under "Project API keys", marked `secret` |

**Take the `service_role` key, not the `anon` key.** They look almost
identical and swapping them is the single most common way waitlist tables get
leaked — `anon` is designed to be public and would fail against this table
anyway, since RLS blocks it.

---

## 3 · Put them in Vercel

Vercel → your project → **Settings** → **Environment Variables**. Add two,
ticking **Production**, **Preview** and **Development**:

```
SUPABASE_URL                https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY   eyJhbGciOi…            (the service_role one)
```

Then **Deployments → ⋯ → Redeploy**. Environment variables are read at boot,
so an existing deployment will not pick them up on its own.

---

## 4 · Check it works

Open the live site, join the waitlist with a real number, then look in
Supabase → **Table Editor** → `waitlist`. Your row should be there within a
second or two.

If it is not, Vercel → **Deployments** → the latest → **Functions** →
`api/waitlist` shows the log. The function prints the exact PostgREST error,
so you get "relation does not exist" or "Invalid API key" rather than having
to guess.

**Nothing is lost while you debug.** If the insert fails, the whole lead is
written to the function log, so it can be recovered by hand.

---

## 5 · Reading it

There are ready-made queries at the bottom of `supabase/schema.sql`. The one
you will use most is the campaign scoreboard:

```sql
select coalesce(nullif(via, ''), '(direct)') as came_from,
       count(*) as signups,
       max(created_at) as latest
from public.waitlist
group by 1
order by signups desc;
```

`via` is filled from the share link — `oneinteriors.in/?s=baner-greens` stores
`baner-greens`. Give every society its own tag and this table tells you which
WhatsApp groups actually worked. Without the tag the column reads `(direct)`.

To export for calling: **Table Editor** → `waitlist` → **Export** → CSV.

---

## How the pieces fit

```
browser  →  /api/waitlist  →  Supabase  (the store of record)
                           ↘  webhook / email  (optional ping)
```

- **Supabase is the store.** If the insert fails the visitor sees an error and
  the lead is in the logs.
- **A webhook is only a notification.** If Zapier is down but the row is safely
  in Postgres, the visitor still sees success — telling them it failed would
  only make them submit again and you would have the same lead twice.
- With **no** Supabase configured, whichever notifier is set becomes the store
  and its failure does fail the request.
- With **nothing** configured the route runs in preview mode: validates, logs,
  stores nothing.

## Duplicates

Someone joining twice updates their existing row rather than adding a second.
The key is a normalised contact, so `9822011234`, `+91 98220 11234` and
`+919822011234` are recognised as one person. `created_at` keeps the first
time they joined; everything else takes the newest values.

This is worth having because the row count is a number you will quote to
studios and investors, and it should mean "people", not "form submissions".

---

## Two things to decide before launch

**1 · There is no privacy notice on the page.** You are collecting names and
phone numbers from Indian residents, which the DPDP Act 2023 covers, and it
requires telling people what you are collecting and why. One line under the
submit button is enough to be straight with people:

> We'll use your number only to book your consultation. Nothing else, no
> sharing.

Say the word and I'll add it — it's one line of copy and a link.

**2 · The IP address column.** `ip` and `user_agent` are stored for spotting a
bot flood from one address. They are also personal data, and you may prefer
not to hold them at all. To drop them:

```sql
alter table public.waitlist drop column ip, drop column user_agent;
```

and delete the two matching lines from the `lead` object in `api/waitlist.js`.
Everything else keeps working.

---

## If the key ever leaks

Supabase → **Settings** → **API** → **Reset** the `service_role` key, then
update `SUPABASE_SERVICE_ROLE_KEY` in Vercel and redeploy. The old key stops
working immediately.

Because RLS is on with no policies, a leaked **anon** key is harmless against
this table — it can neither read nor write. Only `service_role` matters.
