/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_LOCAL_DB?: string;
  /**
   * When set, `apiRequest` uses this base (no trailing slash required).
   * Leave empty to keep mock/`dataStore`-backed services only.
   * Example dev: `/api/v1` (with Vite proxy) or `http://localhost:3001/api/v1`.
   */
  readonly VITE_API_BASE_URL?: string;
  /** @deprecated use VITE_API_BASE_URL — still supported as fallback */
  readonly VITE_LOCAL_API_BASE?: string;
  /** Supabase project URL (Settings → API). When set with anon key, auth uses Supabase. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon public key (Settings → API — legacy JWT starting with eyJ…). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Alternative name for newer “publishable” keys (sb_publishable_…). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /**
   * When true (with Supabase URL + key), sync in-memory dataStore JSON to `finance_os_app_bundle`
   * after Supabase Auth login. Requires SQL table from `supabase/schema.sql`.
   */
  readonly VITE_USE_SUPABASE_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
