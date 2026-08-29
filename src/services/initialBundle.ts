/**
 * Canonical initial payload for dataStore and local SQLite seed (same shape as localStorage bundle).
 */

import {
  mockOrganizations,
  mockUsers,
  mockOrganizationMembers,
  mockAccounts,
  mockBankAccounts,
  mockTransactions,
  mockCategories,
  mockDepartments,
  mockProjects,
  mockAssets,
  mockDepreciationSchedule,
  mockInventoryItems,
  mockInventoryTransactions,
  mockOverheadAllocations,
  mockRecurringTransactions,
  mockBudgets,
  mockLoans,
  mockCashFlowForecasts,
  mockActiveSessions,
  mockNotifications,
  mockEmployeeExpenses,
  mockEmployeePayslips,
  mockEmployeeTimesheets,
  mockEmployeeTeamMembers,
  mockCompanyAnnouncements,
} from '@/data/mockDatabase';

/** Keep in sync with persisted bundles (`localStorage` / SQLite / Supabase bundle). Bump when seed shape changes. */
export const DATA_STORE_SCHEMA_VERSION = 6;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Seed data for `platformPlans` (multi-row collection, unlike the singleton `platformSettings`
 * row). Duplicated here rather than imported from `src/services/platformService.ts` to avoid a
 * circular import (platformService -> dataStore -> initialBundle) — same duplication convention
 * already used for `PLANS`/`PlatformOrgMeta` between the client service and
 * `server/routes/platform.ts`. Keep in sync with `DEFAULT_PLATFORM_PLANS` in platformService.ts
 * and `DEFAULT_PLATFORM_PLANS` in server/lib/store.ts.
 */
const PLATFORM_PLANS_SEED = [
  {
    id: 'plan-1',
    name: 'Basic',
    price: 0,
    currency: 'PKR',
    features: ['statement_import'],
    limits: { users: 5, statements: 100, currencies: 2, storage: 2048 },
    active: true,
  },
  {
    id: 'plan-2',
    name: 'Professional',
    price: 49900,
    currency: 'PKR',
    features: ['personal_finance', 'statement_import', 'profit_intelligence', 'team_management', 'costing_engine'],
    limits: { users: 10, statements: 500, currencies: 5, storage: 10240 },
    active: true,
  },
  {
    id: 'plan-3',
    name: 'Enterprise',
    price: 99900,
    currency: 'PKR',
    features: ['personal_finance', 'statement_import', 'profit_intelligence', 'team_management', 'costing_engine', 'api_access', 'white_label'],
    limits: { users: 50, statements: 2000, currencies: 10, storage: 51200 },
    active: true,
  },
];

export function buildPayloadFromMocks(): Record<string, unknown> {
  return {
    organizations: deepClone(mockOrganizations),
    users: deepClone(mockUsers),
    organizationMembers: deepClone(mockOrganizationMembers),
    accounts: deepClone(mockAccounts),
    bankAccounts: deepClone(mockBankAccounts),
    transactions: deepClone(mockTransactions),
    categories: deepClone(mockCategories),
    departments: deepClone(mockDepartments),
    projects: deepClone(mockProjects),
    assets: deepClone(mockAssets),
    depreciationSchedules: deepClone(mockDepreciationSchedule),
    inventoryItems: deepClone(mockInventoryItems),
    inventoryTransactions: deepClone(mockInventoryTransactions),
    overheadAllocations: deepClone(mockOverheadAllocations),
    recurringTransactions: deepClone(mockRecurringTransactions),
    budgets: deepClone(mockBudgets),
    loans: deepClone(mockLoans),
    cashFlowForecasts: deepClone(mockCashFlowForecasts),
    activeSessions: deepClone(mockActiveSessions),
    notifications: deepClone(mockNotifications),
    expenses: deepClone(mockEmployeeExpenses),
    payslips: deepClone(mockEmployeePayslips),
    timesheets: deepClone(mockEmployeeTimesheets),
    teamMembers: deepClone(mockEmployeeTeamMembers),
    announcements: deepClone(mockCompanyAnnouncements),
    // No mock seed — empty until an admin saves Platform Settings; services fall back to
    // DEFAULT_PLATFORM_SETTINGS (see src/services/platformService.ts) when this is empty.
    platformSettings: [],
    // Seeded with the real starter plans (unlike platformSettings above) — Plans & Billing
    // should show Basic/Professional/Enterprise out of the box, not an empty state.
    platformPlans: deepClone(PLATFORM_PLANS_SEED),
  };
}

export function buildPersistedBundleFromMocks(): {
  schemaVersion: number;
  payload: Record<string, unknown>;
} {
  return {
    schemaVersion: DATA_STORE_SCHEMA_VERSION,
    payload: buildPayloadFromMocks(),
  };
}
