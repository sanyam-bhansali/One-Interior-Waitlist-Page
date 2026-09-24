-- ============================================================
-- One Interiors — waitlist storage
-- ============================================================
-- Run this once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run: every statement is guarded.
--
-- Read docs/WAITLIST-STORAGE.md before running. The short version:
-- this table holds real people's names and phone numbers, so it is
-- locked to the service_role key only, and that key lives in Vercel's
-- environment variables and nowhere else. It must never appear in
-- public/, in config.js, or in a commit.
-- ============================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

create table if not exists public.waitlist (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  name          text not null,
  contact       text not null,          -- exactly as they typed it
  contact_kind  text not null check (contact_kind in ('phone', 'email')),

  -- The same person typing "9822011234", "+91 98220 11234" and
  -- "+919822011234" is ONE lead, not three. Normalised on the server
  -- and made unique here, so a second signup updates the first row
  -- instead of quietly duplicating it.
  contact_norm  text not null,

  style         text,
  city          text not null default 'Pune',

  -- Which share link they arrived through (?s=baner-greens). This is
  -- the only way to tell which society groups actually worked.
  via           text,
  source        text not null default 'waitlist-landing',

  -- Kept for spotting a bot flood from one address. See the privacy
  -- note in docs/WAITLIST-STORAGE.md before you decide to keep it —
  -- under the DPDP Act this is personal data like any other field.
  ip            text,
  user_agent    text
);

create unique index if not exists waitlist_contact_norm_key
  on public.waitlist (contact_norm);

create index if not exists waitlist_created_at_idx
  on public.waitlist (created_at desc);

create index if not exists waitlist_via_idx
  on public.waitlist (via)
  where via is not null and via <> '';

-- ---------- lock it down ------------------------------------
-- RLS on with NO policies means: anon and authenticated can do
-- nothing at all — not select, not insert. service_role bypasses RLS,
-- and that is the only key the serverless function uses.
--
-- This matters more than it looks. Supabase's anon key is designed to
-- ship to browsers and is trivially readable by anyone who opens the
-- network tab. Without RLS, that key would let a stranger download
-- every name and phone number in this table.
alter table public.waitlist enable row level security;

-- Belt and braces: revoke the default grants too, so the table is
-- unreachable even if a policy is added by accident later.
revoke all on public.waitlist from anon, authenticated;

-- ---------- keep updated_at honest --------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists waitlist_touch_updated_at on public.waitlist;
create trigger waitlist_touch_updated_at
  before update on public.waitlist
  for each row execute function public.touch_updated_at();


-- ============================================================
-- Queries you will actually want
-- ============================================================
-- Run these in the SQL editor; they are not part of the schema.

-- How many signups, and how fast?
--   select count(*) as total,
--          count(*) filter (where created_at > now() - interval '24 hours') as last_24h,
--          count(*) filter (where created_at > now() - interval '7 days')  as last_7d
--   from public.waitlist;

-- Which society groups are working? This is the campaign scoreboard.
--   select coalesce(nullif(via, ''), '(direct)') as came_from,
--          count(*) as signups,
--          min(created_at) as first_signup,
--          max(created_at) as latest
--   from public.waitlist
--   group by 1
--   order by signups desc;

-- Signups per day, for a quick sense of the curve.
--   select date_trunc('day', created_at at time zone 'Asia/Kolkata')::date as day,
--          count(*)
--   from public.waitlist
--   group by 1 order by 1 desc;

-- Which styles people pick — useful when recruiting studios.
--   select coalesce(nullif(style, ''), '(skipped)') as style, count(*)
--   from public.waitlist group by 1 order by 2 desc;

-- Export for calling: newest first.
--   select created_at at time zone 'Asia/Kolkata' as when_ist,
--          name, contact, style, coalesce(nullif(via,''),'(direct)') as came_from
--   from public.waitlist
--   order by created_at desc;
