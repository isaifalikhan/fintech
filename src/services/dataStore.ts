/**
 * In-Memory Data Store
 * =====================
 * Single source of truth for application data. Initializes from minimal seed data,
 * hydrates from localStorage when valid, and persists changes (debounced by default;
 * optional synchronous flush on `notify(..., true)` and on `beforeunload` for pending writes).
 *
 * Optional **local SQLite** (via small Express API): set `VITE_USE_LOCAL_DB=true` and run
 * `npm run dev:full`. The same JSON bundle is stored in `data/finance-os.db`.
 *
 * Optional **Supabase** (`VITE_USE_SUPABASE_DATA=true` + `VITE_SUPABASE_URL` / anon key): after
 * Supabase Auth session exists, the bundle syncs to table `finance_os_app_bundle` (see `supabase/schema.sql`).
 */

import {
  Organization, User, OrganizationMember, Account, BankAccount,
  Transaction, Category, Department, Project, Asset, DepreciationSchedule,
  InventoryItem, InventoryTransaction, OverheadAllocation,
  RecurringTransaction, Budget, Loan, CashFlowForecast, ActiveSession, Notification,
  EmployeeExpense, EmployeePayslip, TimesheetEntry, EmployeeTeamMember, CompanyAnnouncement,
} from '@/services/types';

import {
  DATA_STORE_SCHEMA_VERSION,
  buildPayloadFromMocks,
} from '@/services/initialBundle';
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabaseClient';
import {
  fetchBundleFromSupabase,
  upsertBundleToSupabase,
  seedBundleIfEmpty,
} from '@/services/supabaseBundle';
import type { AuditLogEntry } from '@/services/auditService';
import type { PlatformSettings, PlatformPlan } from '@/services/platformService';

/** Re-export for services/tests that imported version from dataStore. */
export { DATA_STORE_SCHEMA_VERSION };

const LOCAL_STORAGE_KEY = 'finance_os_data_v1';
const PERSIST_DEBOUNCE_MS = 400;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

let idCounter = Date.now();
export function generateId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

const SIMULATE_DELAY = true;
const BASE_DELAY_MS = 150;

export async function simulateDelay(ms?: number): Promise<void> {
  if (!SIMULATE_DELAY) return;
  const delay = ms ?? BASE_DELAY_MS + Math.random() * 100;
  return new Promise(resolve => setTimeout(resolve, delay));
}

const SERIALIZABLE_KEYS = [
  'organizations', 'users', 'organizationMembers', 'accounts', 'bankAccounts',
  'transactions', 'categories', 'departments', 'projects', 'assets',
  'depreciationSchedules', 'inventoryItems', 'inventoryTransactions',
  'overheadAllocations', 'recurringTransactions', 'budgets', 'loans', 'cashFlowForecasts',
  'activeSessions', 'notifications',
  'expenses', 'payslips', 'timesheets', 'teamMembers', 'announcements',
  'platformSettings', 'platformPlans',
] as const;

type SerializableKey = (typeof SERIALIZABLE_KEYS)[number];

/**
 * Basic shape check only — deliberately does NOT require `schemaVersion` to match
 * `DATA_STORE_SCHEMA_VERSION`, nor every current `SERIALIZABLE_KEYS` entry to already be present.
 * A bundle from an older schema version legitimately won't have fields added since; rejecting it
 * outright used to delete every real collection (transactions, accounts, everything) on the very
 * next schema bump. Per-field backfill from the fresh seed happens in `hydrateBundlePayload()`.
 */
export function isValidPersistedBundle(raw: unknown): raw is {
  schemaVersion: number;
  payload: Record<string, unknown>;
} {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  if (typeof o.schemaVersion !== 'number') return false;
  const payload = o.payload;
  if (!payload || typeof payload !== 'object') return false;
  return true;
}

function localDbApiBase(): string {
  const base = import.meta.env.VITE_LOCAL_API_BASE;
  return typeof base === 'string' ? base.replace(/\/$/, '') : '';
}

class DataStore {
  organizations: Organization[];
  users: User[];
  organizationMembers: OrganizationMember[];
  accounts: Account[];
  bankAccounts: BankAccount[];
  transactions: Transaction[];
  categories: Category[];
  departments: Department[];
  projects: Project[];
  assets: Asset[];
  depreciationSchedules: DepreciationSchedule[];
  inventoryItems: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  overheadAllocations: OverheadAllocation[];
  recurringTransactions: RecurringTransaction[];
  budgets: Budget[];
  loans: Loan[];
  cashFlowForecasts: CashFlowForecast[];
  activeSessions: ActiveSession[];
  notifications: Notification[];
  /** Session-only, not persisted (not in SERIALIZABLE_KEYS) — mirrors server's in-memory audit log. */
  auditLogs: AuditLogEntry[] = [];
  /**
   * Singleton row (array-of-one), matching the array-based collection pattern — the
   * hydrate/persist loop assumes arrays. In SERIALIZABLE_KEYS, so unlike auditLogs/backupHistory
   * this SHOULD persist across reloads.
   */
  platformSettings: PlatformSettings[] = [];
  /** Session-only, not persisted (not in SERIALIZABLE_KEYS) — mirrors server's in-memory backup-history log, same reasoning as auditLogs above. */
  backupHistory: { id: string; timestamp: string; sizeBytes: number }[] = [];
  /**
   * Subscription plan definitions, editable from PlansView (Platform Console → Plans & Billing).
   * Unlike `platformSettings`, this is a real multi-row collection (like `departments`) — seeded
   * from the starter Basic/Professional/Enterprise plans in `initialBundle.ts`, not a singleton.
   */
  platformPlans: PlatformPlan[];

  expenses: EmployeeExpense[];
  payslips: EmployeePayslip[];
  timesheets: TimesheetEntry[];
  teamMembers: EmployeeTeamMember[];
  announcements: CompanyAnnouncement[];

  private listeners: Map<string, Set<() => void>> = new Map();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private hydrating = false;
  /** When true, persist goes to SQLite API only (not localStorage). */
  private useRemotePersistence = false;
  /** When true, persist goes to Supabase `finance_os_app_bundle` (requires Supabase session). */
  private useSupabasePersistence = false;

  constructor() {
    this.loadFromMocks();
    this.tryHydrateFromLocalStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushPersist();
      });
    }
  }

  private loadFromMocks(): void {
    const p = buildPayloadFromMocks() as Record<SerializableKey, unknown>;
    for (const k of SERIALIZABLE_KEYS) {
      (this as unknown as Record<string, unknown>)[k] = deepClone(p[k]);
    }
  }

  /**
   * Applies a persisted bundle's payload onto this store, field by field. A key that's missing or
   * not an array (an older schema version's bundle predating that collection) is left at whatever
   * `loadFromMocks()` already seeded, instead of the whole bundle being discarded — mirrors the
   * per-field backfill `server/lib/store.ts`'s `load()` already does for `platformPlans`.
   */
  private hydrateBundlePayload(payload: Record<string, unknown>): void {
    for (const k of SERIALIZABLE_KEYS) {
      const v = payload[k];
      if (Array.isArray(v)) {
        (this as unknown as Record<string, unknown>)[k] = deepClone(v);
      }
    }
  }

  private tryHydrateFromLocalStorage(): void {
    if (typeof localStorage === 'undefined') return;
    if (this.useRemotePersistence || this.useSupabasePersistence) return;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!isValidPersistedBundle(parsed)) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return;
      }
      this.hydrating = true;
      this.hydrateBundlePayload(parsed.payload);
      this.hydrating = false;
    } catch {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }

  private getBundleObject(): { schemaVersion: number; payload: Record<string, unknown> } {
    const payload: Record<string, unknown> = {};
    for (const k of SERIALIZABLE_KEYS) {
      payload[k] = deepClone((this as unknown as Record<string, unknown>)[k]);
    }
    return { schemaVersion: DATA_STORE_SCHEMA_VERSION, payload };
  }

  /** Public snapshot of the full bundle (all real data collections) — used for manual backup downloads. */
  getSnapshot(): { schemaVersion: number; payload: Record<string, unknown> } {
    return this.getBundleObject();
  }

  private writePersistBundle(): void {
    if (this.hydrating) return;

    if (this.useSupabasePersistence) {
      void this.persistBundleSupabase(false);
      return;
    }

    if (this.useRemotePersistence) {
      void this.persistBundleRemote(false);
      return;
    }

    if (typeof localStorage === 'undefined') return;
    try {
      const bundle = this.getBundleObject();
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bundle));
    } catch {
      /* quota or private mode */
    }
  }

  /**
   * Remote persist to local SQLite API. Uses keepalive on unload so fast refresh does not drop writes.
   */
  private async persistBundleRemote(isUnload: boolean): Promise<void> {
    const base = localDbApiBase();
    const url = `${base}/api/bundle`;
    const body = JSON.stringify(this.getBundleObject());
    try {
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: isUnload,
      });
    } catch {
      /* network down — in-memory state remains */
    }
  }

  /** Cancel debounce and persist synchronously (BUG-004: survives fast refresh). */
  private flushPersist(): void {
    if (this.hydrating) return;
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    if (this.useSupabasePersistence) {
      void this.persistBundleSupabase(true);
      return;
    }
    if (this.useRemotePersistence) {
      void this.persistBundleRemote(true);
      return;
    }
    if (typeof localStorage === 'undefined') return;
    try {
      const bundle = this.getBundleObject();
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bundle));
    } catch {
      /* quota or private mode */
    }
  }

  private async persistBundleSupabase(isUnload: boolean): Promise<void> {
    const bundle = this.getBundleObject();
    await upsertBundleToSupabase(bundle, { keepalive: isUnload });
  }

  private schedulePersist(): void {
    if (this.hydrating) return;
    if (this.useSupabasePersistence) {
      if (this.persistTimer) clearTimeout(this.persistTimer);
      this.persistTimer = setTimeout(() => {
        this.persistTimer = null;
        void this.persistBundleSupabase(false);
      }, PERSIST_DEBOUNCE_MS);
      return;
    }
    if (this.useRemotePersistence) {
      if (this.persistTimer) clearTimeout(this.persistTimer);
      this.persistTimer = setTimeout(() => {
        this.persistTimer = null;
        void this.persistBundleRemote(false);
      }, PERSIST_DEBOUNCE_MS);
      return;
    }
    if (typeof localStorage === 'undefined') return;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.writePersistBundle();
    }, PERSIST_DEBOUNCE_MS);
  }

  /**
   * Load bundle from local SQLite API (dev: Vite proxies `/api` to the API server).
   */
  async initRemotePersistence(): Promise<void> {
    if (typeof window === 'undefined') return;
    const useSupabaseData = import.meta.env.VITE_USE_SUPABASE_DATA === 'true';
    const useDb = import.meta.env.VITE_USE_LOCAL_DB === 'true';
    if (useSupabaseData) return;
    if (!useDb) return;

    const base = localDbApiBase();
    const url = `${base}/api/bundle`;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return;
      const parsed: unknown = await res.json();
      if (!isValidPersistedBundle(parsed)) return;
      this.hydrating = true;
      this.hydrateBundlePayload(parsed.payload);
      this.hydrating = false;
      this.useRemotePersistence = true;
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      SERIALIZABLE_KEYS.forEach(k => this.notify(k));
    } catch {
      /* API not running — keep localStorage / mocks */
    } finally {
      clearTimeout(tid);
    }
  }

  subscribe(collection: string, listener: () => void): () => void {
    if (!this.listeners.has(collection)) {
      this.listeners.set(collection, new Set());
    }
    this.listeners.get(collection)!.add(listener);
    return () => {
      this.listeners.get(collection)?.delete(listener);
    };
  }

  /**
   * @param persistImmediately When true, writes the full bundle to localStorage now (no debounce).
   *   Use for critical employee mutations (expenses, timesheets) so fast refresh does not lose data.
   */
  notify(collection: string, persistImmediately = false): void {
    this.listeners.get(collection)?.forEach(fn => fn());
    if (persistImmediately) {
      this.flushPersist();
    } else {
      this.schedulePersist();
    }
  }

  /**
   * Load/save via Supabase after the user has a Supabase Auth session.
   * Call from AuthContext after session is ready (login or restore).
   */
  async hydrateFromSupabaseIfEnabled(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (import.meta.env.VITE_USE_SUPABASE_DATA !== 'true') return;
    if (!isSupabaseConfigured()) return;

    const sb = getSupabaseClient();
    if (!sb) return;

    const {
      data: { session },
    } = await sb.auth.getSession();
    if (!session) return;

    await seedBundleIfEmpty();
    const parsed = await fetchBundleFromSupabase();
    if (!parsed || !isValidPersistedBundle(parsed)) return;

    this.hydrating = true;
    this.hydrateBundlePayload(parsed.payload);
    this.hydrating = false;
    this.useSupabasePersistence = true;
    this.useRemotePersistence = false;
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    SERIALIZABLE_KEYS.forEach(k => this.notify(k));
  }

  reset(): void {
    this.loadFromMocks();
    this.useRemotePersistence = false;
    this.useSupabasePersistence = false;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }
}

export const dataStore = new DataStore();

/**
 * Call once before rendering the app when using `VITE_USE_LOCAL_DB=true`.
 */
export async function initDataStore(): Promise<void> {
  await dataStore.initRemotePersistence();
}

/** After Supabase Auth session is available — syncs in-memory store with `finance_os_app_bundle`. */
export async function hydrateDataStoreFromSupabase(): Promise<void> {
  await dataStore.hydrateFromSupabaseIfEnabled();
}
