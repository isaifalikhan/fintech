-- ═══════════════════════════════════════════════════════════════════════════
-- Fix: organizations table has no UPDATE policy, so Settings → Save Changes
-- silently fails to sync the real `organizations` row (RLS denies it with 0
-- rows affected, no error surfaced). This is why an org name/currency/fiscal
-- year edit never showed up in the header or after a fresh login — the app's
-- session/login code reads this table (see src/services/supabaseAuth.ts),
-- while the edit only ever reached the separate `finance_os_app_bundle` blob.
--
-- Run this once in Supabase → SQL Editor → New query → Run.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists "organizations_update_member" on public.organizations;
create policy "organizations_update_member" on public.organizations
  for update using (public.is_org_member(id)) with check (public.is_org_member(id));
