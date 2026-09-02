-- ════════════════════════════════════════════════════════════════════
--   Let anonymous users exist at all
--   Migration: 0014_anon_profile_name
-- ════════════════════════════════════════════════════════════════════
--
-- handle_new_user() (0001_initial.sql) named a new profile from either the
-- signup metadata or the local part of the email address. An anonymous user
-- has NEITHER: email is NULL, raw_user_meta_data is empty. split_part(NULL,
-- '@', 1) is NULL, coalesce(NULL, NULL) is NULL, and profiles.display_name
-- is `not null` — so the trigger raised, and because it is an AFTER INSERT
-- trigger inside GoTrue's own transaction, the whole signup rolled back.
--
-- The symptom was NOT a permissions error and NOT the "Allow anonymous
-- sign-ins" toggle (which was on): POST /auth/v1/signup returned
--   500 {"error_code":"unexpected_failure",
--        "msg":"Database error creating anonymous user"}
-- and the Kout join screen showed only "تعذّر تسجيل الدخول". Nothing in the
-- client could have fixed it. Every Kout player is anonymous by design
-- (koutPlayerClient.js), so this blocked the entire join flow.
--
-- Fix: a final fallback name, so the chain can no longer produce NULL.
-- nullif() guards the empty-string cases too — a '' metadata name and an
-- email with no local part would both have failed the length>=2 check for
-- the same reason, just louder.
--
-- Deliberately still creating a profile row rather than skipping anonymous
-- users: "every auth.users row has a profile" is an invariant the rest of
-- the app already relies on, and the row is dropped by the existing
-- `on delete cascade` when the anonymous user is cleaned up.
-- ════════════════════════════════════════════════════════════════════

create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'لاعب'
    )
  );
  return new;
end;
$$;
