# Meta setup — pixel, Conversions API, first campaign

What is built (this repo), what you do in Meta, and how to check it before
spending. Plan and budget: `LAUNCH-KIT.md` §2 and the 15-day plan.

## What the page does

- **No banner** (the owner, 1 Oct 2026). The pixel and Google Analytics run for
  every visitor; `/privacy` says so.
- **Browser event** (`public/meta.js`): `PageView`, then `Lead` on a real, new
  signup, with an `eventID`.
- **Server event** (`api/waitlist.js` → `sendMetaLead` in `api/_lib.js`): the same
  `Lead` with the same `event_id`, so Meta counts one lead, not two, and still
  counts it when an ad blocker ate the browser's copy. It carries personal data
  (hashed), so it is sent only with the signup's consent box ticked, and that box
  names ad measurement. Phone (as `91XXXXXXXXXX`),
  email and first name are SHA-256 hashed before they leave the server. Best
  effort, 4-second cap; it never fails a signup.
- A person joining again (same number) is not sent as a new lead.


## You do, in Meta (about 30 minutes)

1. **Business portfolio** — business.facebook.com → create or open *One Interiors*.
   Add the Facebook Page and Instagram account.
2. **Ad account** — Business settings → Accounts → Ad accounts → Add. INR, Asia/Kolkata.
   Add your payment method yourself.
3. **Verify the domain** — Business settings → Brand safety → Domains → Add
   `oneinteriors.in` → **DNS TXT record**. Add the TXT record in Cloudflare DNS,
   then press Verify. (DNS keeps the page code clean; no meta tag needed.)
4. **Create the dataset (pixel)** — Events Manager → Connect data → Web → name it
   *One Interiors website* → "Set up manually" → stop after it shows the **ID**.
   Don't paste Meta's code snippet anywhere; the page already has it.
5. **Conversions API token** — Events Manager → the dataset → Settings →
   Conversions API → **Generate access token**. Copy it once.

## Then put the values in

| Where | What |
|---|---|
| `public/config.js` → `metaPixelId` | the dataset ID (public) |
| Vercel → waitlist project → Environment Variables, **Production** | `META_PIXEL_ID` = same ID; `META_CAPI_TOKEN` = the token (mark Sensitive) |
| While testing only | `META_TEST_EVENT_CODE` = the code from Events Manager → Test events |

Commit `config.js`, push, and redeploy (env changes need a redeploy).

## Check before spending

1. Events Manager → Test events → copy the test code into `META_TEST_EVENT_CODE`,
   redeploy.
2. Open `https://oneinteriors.in/?utm_source=meta&utm_content=test` in a private
   window and join with a real number of yours.
3. Test events should show **PageView** (browser), **Lead** (browser) and **Lead**
   (server), the two Leads marked *deduplicated*.
4. Remove `META_TEST_EVENT_CODE`, redeploy, and delete the test signup at
   `/ops/waitlist`.

If the server Lead is missing, the waitlist project's function log says why
(`[meta] CAPI refused: …` — usually the token or the pixel ID).

## First campaign (15-day plan, days 1–4)

- **Objective:** Leads → conversion location *Website* → event **Lead**.
- **Budget:** ₹10,000 over 4 days — three ad sets at about ₹830/day.
- **Audience:** Advantage+ audience, location = pins with 3–5 km radius around
  Kharadi, Wagholi, Hinjewadi, Baner, Wakad, Undri, Hadapsar, Pimpri-Chinchwad;
  age 25–50. Special ad category **Housing** if Meta asks — it limits targeting,
  and the plan above already fits within it.
- **Ad sets = creatives** (copy in `LAUNCH-KIT.md` §2):
  `PW_D1_A_advance`, `PW_D1_B_archcall`, `PW_D1_C_linebyline`.
- **URL:** `https://oneinteriors.in/?utm_source=meta&utm_medium=paid&utm_campaign=pune_waitlist&utm_content=<A_advance|B_archcall|C_linebyline>`
- **Day 4:** keep ≤ ₹60 per signup, fix ₹60–100, kill > ₹100 (LAUNCH-KIT §2).

## Settings

| Variable | Default |
|---|---|
| `META_GRAPH_VERSION` | `v22.0` — set a newer one when Meta retires it |
