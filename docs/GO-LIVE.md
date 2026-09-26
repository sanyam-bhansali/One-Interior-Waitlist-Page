# Go live — step by step

Connecting the waitlist page to the product database, so signups appear in ops.

**Two folders are involved.** Open a PowerShell window in each and keep both
open — every step below says which one it belongs to.

| | Folder | What it is |
|---|---|---|
| **Terminal A** | `C:\Sanyam\OneInteriors` | the product app — database, ops console |
| **Terminal B** | `C:\Users\sanya\Downloads\One Interior Waitlist Page` | the waitlist page |

To open one: **File Explorer → navigate to the folder → click the address bar
→ type `powershell` → Enter.**

**Two Vercel projects are involved too**, and they are not the same thing:

| Vercel project | Serves | Needs |
|---|---|---|
| OneInteriors (the product) | `ops.oneinteriors.in`, `studio.oneinteriors.in` | `WAITLIST_INGEST_TOKEN` |
| the waitlist page | `oneinteriors.in` | `ONE_INTERIORS_INGEST_URL` + `WAITLIST_INGEST_TOKEN` |

> `oneinteriors.in` is the **waitlist page**, not the product. The product
> answers on the subdomains. Getting these the wrong way round makes the
> waitlist page post to itself.

---

## Step 1 · Make a token — Terminal A

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Copy the line it prints. You will paste the **same** value into both Vercel
projects. Keep it in a note for the next ten minutes; don't put it in any file
in either repo.

---

## Step 2 · Create the table — Terminal A

```powershell
npm run db:deploy
```

This applies the pending migration to your production Supabase. Expect
`1 migration found` and `Applied migration(s)`.

**Why `db:deploy` and not `db:migrate`.** `.env.local` holds the *production*
connection string, so the Prisma CLI in this repo points at the live database.
`npm run db:migrate` runs `migrate dev`, which offers to reset the schema when
it finds drift — that has already been a near miss in this repo, which is why
`guard-destructive.ts` exists and would refuse the command. `migrate deploy`
only applies migrations that have not run yet. It never drops anything.

The migration itself is one `CREATE TABLE` and four `CREATE INDEX`. Nothing is
altered, nothing is removed.

---

## Step 3 · Refresh the local Prisma client — Terminal A

```powershell
npm run db:generate
```

So `npm run dev` on your machine knows about the new model. Vercel does this
itself on every build.

---

## Step 4 · Push the product — Terminal A

```powershell
git push
```

One commit goes up: the migration file. The application code is already
deployed — `https://ops.oneinteriors.in/api/waitlist` already answers
`{"error":"Not for you."}`, which is the route refusing requests because no
token is set yet. That is the correct default.

---

## Step 5 · Give the product the token — browser

Vercel → the **OneInteriors** project → **Settings → Environment Variables → Add**

```
Name    WAITLIST_INGEST_TOKEN
Value   <the token from Step 1>
```

Tick **Production**, **Preview** and **Development**. Save.

Then **Deployments → ⋯ on the newest → Redeploy.** Environment variables are
read when the function boots, so a deployment already running will not pick it
up.

---

## Step 6 · Push the waitlist page — Terminal B

```powershell
git push
```

---

## Step 7 · Give the waitlist page the URL and token — browser

Vercel → the **waitlist** project → **Settings → Environment Variables**. Add
two:

```
Name    ONE_INTERIORS_INGEST_URL
Value   https://ops.oneinteriors.in/api/waitlist

Name    WAITLIST_INGEST_TOKEN
Value   <the same token from Step 1>
```

All three environments, save, then **Redeploy** as before.

---

## Step 8 · Check it — Terminal B

```powershell
curl.exe -s -X POST https://oneinteriors.in/api/waitlist `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"Test Person\",\"contact\":\"9822011234\",\"via\":\"setup-check\"}'
```

Expect `{"ok":true}`.

Then open **https://ops.oneinteriors.in/ops/waitlist**. The row should be
there, tagged `setup-check`.

Delete the test row afterwards from Supabase → Table Editor →
`waitlist_signups`.

Finally do it properly: open `https://oneinteriors.in/?s=setup-check` in a
private window and join for real, to confirm the whole path works from a
browser.

---

## When it doesn't work

Read the answer, not the vibe — each failure says something different.

| What you see | What it means |
|---|---|
| `{"ok":true,"mode":"preview"}` | The waitlist project has no `ONE_INTERIORS_INGEST_URL`. Step 7, then redeploy. |
| `{"error":"Could not reach the waitlist store"}` | It reached the product and was refused, or the table is missing. Check the two tokens match exactly, and that Step 2 ran. |
| `{"error":"Not for you."}` | You called the product route directly without the token. Expected. |
| Ops page says *"Nothing yet"* | Nothing has been stored. Check the Vercel function log on the **waitlist** project — a failed lead is written there in full and can be re-entered by hand. |
| `relation "waitlist_signups" does not exist` | Step 2 did not run, or ran against a different database. |

Nothing is ever lost quietly: if the ingest call fails, the whole signup is
written to the waitlist project's function log.

---

## Afterwards

Give each society its own link so you can tell which groups worked:

```
https://oneinteriors.in/?s=baner-greens
https://oneinteriors.in/?s=kothrud-orchid
```

`/ops/waitlist` totals signups by tag under **Where they came from**.
