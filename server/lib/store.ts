/**
 * Server-side in-memory data store — mirrors the browser `dataStore` (src/services/dataStore.ts)
 * but backed by the SQLite `app_bundle` row (server/db/schema.ts) instead of localStorage.
 *
 * All REST routes under `/api/v1/organizations/...` etc. read/write this singleton directly
 * (same array mutation patterns as the client services' `dataStore` branch), then persist to
 * SQLite. This keeps business logic identical between mock (`dataStore`) mode and HTTP mode.
 */

import { eq } from 'drizzle-orm';
import { db, sqlite } from '../db/client.js';
import { appBundle } from '../db/schema.js';
import { buildPersistedBundleFromMocks } from '../../src/services/initialBundle.js';

sqlite.exec(`
CREATE TABLE IF NOT EXISTS app_bundle (
  id INTEGER PRIMARY KEY,
  schema_version INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);
import type {
  Organization, User, OrganizationMember, Account, BankAccount,
  Transaction, Category, Department, Project, Asset, DepreciationSchedule,
  InventoryItem, InventoryTransaction, OverheadAllocation,
  RecurringTransaction, Budget, Loan, CashFlowForecast, ActiveSession, Notification,
  EmployeeExpense, EmployeePayslip, TimesheetEntry, EmployeeTeamMember, CompanyAnnouncement,
} from '../../src/services/types.js';

const SERIALIZABLE_KEYS = [
  'organizations', 'users', 'organizationMembers', 'accounts', 'bankAccounts',
  'transactions', 'categories', 'departments', 'projects', 'assets',
  'depreciationSchedules', 'inventoryItems', 'inventoryTransactions',
  'overheadAllocations', 'recurringTransactions', 'budgets', 'loans', 'cashFlowForecasts',
  'activeSessions', 'notifications',
  'expenses', 'payslips', 'timesheets', 'teamMembers', 'announcements',
] as const;

type SerializableKey = (typeof SERIALIZABLE_KEYS)[number];

class ServerStore {
  organizations: Organization[] = [];
  users: User[] = [];
  organizationMembers: OrganizationMember[] = [];
  accounts: Account[] = [];
  bankAccounts: BankAccount[] = [];
  transactions: Transaction[] = [];
  categories: Category[] = [];
  departments: Department[] = [];
  projects: Project[] = [];
  assets: Asset[] = [];
  depreciationSchedules: DepreciationSchedule[] = [];
  inventoryItems: InventoryItem[] = [];
  inventoryTransactions: InventoryTransaction[] = [];
  overheadAllocations: OverheadAllocation[] = [];
  recurringTransactions: RecurringTransaction[] = [];
  budgets: Budget[] = [];
  loans: Loan[] = [];
  cashFlowForecasts: CashFlowForecast[] = [];
  activeSessions: ActiveSession[] = [];
  notifications: Notification[] = [];

  expenses: EmployeeExpense[] = [];
  payslips: EmployeePayslip[] = [];
  timesheets: TimesheetEntry[] = [];
  teamMembers: EmployeeTeamMember[] = [];
  announcements: CompanyAnnouncement[] = [];

  schemaVersion = 1;
  private idCounter = Date.now();
  private loaded = false;

  load(): void {
    if (this.loaded) return;
    const rows = db.select().from(appBundle).where(eq(appBundle.id, 1)).all();
    const row = rows[0];

    let schemaVersion: number;
    let payload: Record<string, unknown>;

    if (row) {
      schemaVersion = row.schemaVersion;
      try {
        payload = JSON.parse(row.payloadJson) as Record<string, unknown>;
      } catch {
        const b = buildPersistedBundleFromMocks();
        schemaVersion = b.schemaVersion;
        payload = b.payload;
      }
    } else {
      const b = buildPersistedBundleFromMocks();
      schemaVersion = b.schemaVersion;
      payload = b.payload;
      db.insert(appBundle)
        .values({
          id: 1,
          schemaVersion,
          payloadJson: JSON.stringify(payload),
          updatedAt: new Date().toISOString(),
        })
        .run();
    }

    this.schemaVersion = schemaVersion;
    for (const k of SERIALIZABLE_KEYS) {
      (this as unknown as Record<string, unknown>)[k] = (payload[k] as unknown[]) ?? [];
    }
    this.loaded = true;
  }

  generateId(prefix: string): string {
    return `${prefix}-${++this.idCounter}`;
  }

  /** Full bundle snapshot (same shape as browser localStorage bundle). */
  toBundle(): { schemaVersion: number; payload: Record<string, unknown> } {
    const payload: Record<string, unknown> = {};
    for (const k of SERIALIZABLE_KEYS) {
      payload[k] = (this as unknown as Record<string, unknown>)[k];
    }
    return { schemaVersion: this.schemaVersion, payload };
  }

  /** Replace the whole bundle (used by PUT /api/bundle from the browser dataStore). */
  replaceFromBundle(schemaVersion: number, payload: Record<string, unknown>): void {
    this.schemaVersion = schemaVersion;
    for (const k of SERIALIZABLE_KEYS) {
      (this as unknown as Record<string, unknown>)[k] = (payload[k] as unknown[]) ?? [];
    }
    this.persist();
  }

  /** Persist current in-memory state to SQLite. */
  persist(): void {
    const { schemaVersion, payload } = this.toBundle();
    const payloadJson = JSON.stringify(payload);
    const updatedAt = new Date().toISOString();
    db.insert(appBundle)
      .values({ id: 1, schemaVersion, payloadJson, updatedAt })
      .onConflictDoUpdate({
        target: appBundle.id,
        set: { schemaVersion, payloadJson, updatedAt },
      })
      .run();
  }
}

export const store = new ServerStore();
store.load();

export type { SerializableKey };
