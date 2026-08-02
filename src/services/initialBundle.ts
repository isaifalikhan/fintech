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
export const DATA_STORE_SCHEMA_VERSION = 4;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

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
