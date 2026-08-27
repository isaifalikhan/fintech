/**
 * Service Layer Type Contracts
 * ============================
 * These types define the interface between UI and data.
 * They stay the SAME whether data comes from in-memory store or real API.
 *
 * SINGLE SOURCE OF TRUTH for all domain types.
 * When migrating to Supabase, keep this file — only swap the data layer.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Domain Entity Types (moved from mockDatabase.ts)
// ═══════════════════════════════════════════════════════════════════════════

export type UserRole = 'owner' | 'admin' | 'viewer' | 'employee';
export type PlatformRole = 'platform_admin' | 'platform_manager' | 'organization_user';

export interface Organization {
  id: string;
  /** URL-safe tenant key (e.g. path `/login/employee/:orgSlug`). Optional until backfilled. */
  slug?: string;
  name: string;
  logo?: string;
  currency: string;
  fiscalYearStart: string; // MM-DD format
  createdAt: string;
  settings: {
    theme: string;
    notifications: boolean;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: PlatformRole; // Platform-level role
  createdAt: string;
  /**
   * Server-only bcrypt hash. Must NEVER reach the client — every response that includes a User
   * strips this via `server/lib/serialize.ts`'s `toPublicUser`/`toPublicUsers`. Optional so mock
   * data and any code constructing a `User` without a hash still compiles; the server backfills
   * it once via `server/lib/seedPasswords.ts`.
   */
  passwordHash?: string;
}

export interface OrganizationMember {
  userId: string;
  organizationId: string;
  role: UserRole;
  joinedAt: string;
  /** Optional so pre-existing seed/mock rows without it still type-check and are treated as active. */
  status?: 'active' | 'pending';
}

export interface Account {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  subtype: string;
  currency: string;
  balance: number;
  isActive: boolean;
  parentAccountId?: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  organizationId: string;
  accountId: string; // Links to Chart of Accounts
  bankName: string;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'credit_card' | 'line_of_credit' | 'cash' | 'online_wallet';
  currency: string;
  balance: number;
  lastSyncedAt?: string;
  isActive: boolean;
  iban?: string;
  swiftCode?: string;
  routingNumber?: string;
  /** Personal vs business — reporting and filters (defaults to business if omitted, e.g. older saves) */
  usage?: 'personal' | 'business';
}

export interface Transaction {
  id: string;
  organizationId: string;
  bankAccountId: string;
  date: string;
  description: string;
  narration: string;
  amount: number;
  currency: string;
  type: 'debit' | 'credit';
  categoryId?: string;
  departmentId?: string;
  projectId?: string;
  status: 'pending' | 'classified' | 'reviewed' | 'reconciled';
  confidence?: number; // AI classification confidence 0-100
  tags: string[];
  attachments: string[];
  createdAt: string;
  classifiedAt?: string;
  classifiedBy?: string; // user or 'auto'
}

export interface Category {
  id: string;
  organizationId: string;
  name: string;
  type: 'income' | 'expense';
  accountId: string; // Links to Chart of Accounts
  color: string;
  icon: string;
  patterns: string[]; // Learned patterns for auto-classification
  parentCategoryId?: string;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  budget?: number;
  headId?: string; // User ID of department head
  costCenter: string;
  isActive: boolean;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  clientName: string;
  departmentId: string;
  status: 'quoted' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  startDate: string;
  endDate?: string;
  quotedAmount: number;
  actualCost: number;
  currency: string;
}

export interface Asset {
  id: string;
  organizationId: string;
  name: string;
  assetCode: string;
  category: 'property' | 'equipment' | 'vehicle' | 'furniture' | 'software' | 'other';
  accountId: string;
  accumulatedDepreciationAccountId: string;
  depreciationExpenseAccountId: string;
  purchaseDate: string;
  purchasePrice: number;
  salvageValue: number;
  usefulLifeYears: number;
  depreciationMethod: 'straight_line' | 'declining_balance' | 'units_of_production';
  currentValue: number;
  accumulatedDepreciation: number;
  status: 'active' | 'disposed' | 'fully_depreciated';
  disposalDate?: string;
  disposalAmount?: number;
  departmentId?: string;
  locationDetails?: string;
}

export interface DepreciationSchedule {
  id: string;
  assetId: string;
  organizationId: string;
  period: string; // YYYY-MM format
  openingValue: number;
  depreciationAmount: number;
  closingValue: number;
  status: 'scheduled' | 'posted' | 'reversed';
  journalEntryId?: string;
}

export interface InventoryItem {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  costingMethod: 'fifo' | 'lifo' | 'weighted_average';
  currentStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  averageCost: number;
  lastCost: number;
  sellingPrice: number;
  assetAccountId: string;
  cogsAccountId: string;
  isActive: boolean;
}

export interface InventoryTransaction {
  id: string;
  organizationId: string;
  inventoryItemId: string;
  date: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'transfer';
  quantity: number;
  unitCost: number;
  totalAmount: number;
  referenceNumber?: string;
  notes?: string;
  departmentId?: string;
  projectId?: string;
}

export interface OverheadAllocation {
  id: string;
  organizationId: string;
  name: string;
  allocationBase: 'revenue' | 'headcount' | 'direct_cost' | 'equal';
  accountIds: string[]; // Overhead expense accounts to allocate
  departments: {
    departmentId: string;
    percentage: number;
  }[];
}

export interface RecurringTransaction {
  id: string;
  organizationId: string;
  description: string;
  amount: number;
  currency: string;
  type: 'debit' | 'credit';
  categoryId: string;
  bankAccountId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate?: string;
  nextOccurrence: string;
  isActive: boolean;
  departmentId?: string;
  projectId?: string;
  /** When both are set, list UI can show real run progress (e.g. posted vs cap). */
  generatedOccurrenceCount?: number;
  totalOccurrencesExpected?: number;
}

export interface Budget {
  id: string;
  organizationId: string;
  name: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  categoryId?: string;
  departmentId?: string;
  projectId?: string;
  budgetedAmount: number;
  spentAmount: number;
  currency: string;
  status: 'active' | 'exceeded' | 'completed';
}

/** Org-scoped loan / liability record (receivable or payable). */
export type LoanDirection = 'to_receive' | 'to_pay';
export type LoanRecordStatus =
  | 'active'
  | 'pending'
  | 'overdue'
  | 'partially_paid'
  | 'paid'
  | 'defaulted';

export interface Loan {
  id: string;
  organizationId: string;
  type: LoanDirection;
  party: string;
  amount: number;
  currency: string;
  principal: number;
  interestRate?: number;
  totalInterest?: number;
  amountPaid?: number;
  remainingBalance?: number;
  dueDate: string;
  startDate?: string;
  status: LoanRecordStatus;
  description: string;
  installmentAmount?: number;
  frequency?: 'monthly' | 'quarterly' | 'annual';
  nextPaymentDate?: string;
  paymentsCount?: number;
  paymentsCompleted?: number;
}

export interface CashFlowForecast {
  id: string;
  organizationId: string;
  date: string;
  forecastedIncome: number;
  forecastedExpenses: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  currency: string;
  confidence: number; // 0-100
}

export interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  deviceType: string;
  browser: string;
  ipAddress: string;
  location: string;
  loginTime: string;
  lastActivity: string;
  isCurrentSession: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  organizationId: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Employee portal entities (shared store — see dataStore.ts)
// ═══════════════════════════════════════════════════════════════════════════

export interface EmployeeExpense {
  id: string;
  organizationId: string;
  userId: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';
  receiptUrl?: string;
  notes?: string;
  projectId?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface EmployeePayslip {
  id: string;
  organizationId: string;
  userId: string;
  period: string;
  issueDate: string;
  gross: number;
  deductions: { name: string; amount: number }[];
  net: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid';
  issuedBy?: string;       // user id of the admin who issued it
  bankAccountId?: string;  // paying account
  transactionId?: string;  // linked ledger transaction, set when a transaction was posted
}

export interface TimesheetEntry {
  id: string;
  organizationId: string;
  userId: string;
  date: string;
  projectId: string;
  projectName: string;
  hours: number;
  description: string;
  billable: boolean;
  status: 'draft' | 'submitted' | 'approved';
}

export interface EmployeeTeamMember {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string;
  joinedAt: string;
  status: 'active' | 'away' | 'offline';
}

export interface CompanyAnnouncement {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  author: string;
  category: 'general' | 'hr' | 'finance' | 'project' | 'celebration';
  createdAt: string;
  isPinned: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Service Layer Contracts
// ═══════════════════════════════════════════════════════════════════════════

// Standard API response wrapper
export interface ServiceResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Paginated response
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// Common filter/query params
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeFilter {
  dateFrom?: string;
  dateTo?: string;
}

// Transaction-specific filters
export interface TransactionFilters extends PaginationParams, DateRangeFilter {
  search?: string;
  categoryId?: string;
  departmentId?: string;
  projectId?: string;
  bankAccountId?: string;
  status?: string;
  type?: 'debit' | 'credit';
  minAmount?: number;
  maxAmount?: number;
  tags?: string[];
}

// Dashboard summary types
export interface DashboardSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  cashOnHand: number;
  accountsReceivable: number;
  accountsPayable: number;
  pendingTransactions: number;
  revenueChange: number; // percentage
  expenseChange: number;
  profitChange: number;
}

export interface CashFlowSummary {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

// Report types
export interface ProfitLossReport {
  period: string;
  revenue: { accountId: string; name: string; amount: number }[];
  cogs: { accountId: string; name: string; amount: number }[];
  operatingExpenses: { accountId: string; name: string; amount: number }[];
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalOperatingExpenses: number;
  operatingIncome: number;
  netIncome: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: { accountId: string; name: string; balance: number; type: string }[];
  liabilities: { accountId: string; name: string; balance: number; type: string }[];
  equity: { accountId: string; name: string; balance: number; type: string }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface DepartmentProfitability {
  departmentId: string;
  departmentName: string;
  revenue: number;
  directCosts: number;
  allocatedOverhead: number;
  netProfit: number;
  profitMargin: number;
  headcount: number;
  revenuePerHead: number;
  /** Total hours available (headcount × standard work month) */
  totalHours: number;
  /** Hours spent on billable/client work */
  billableHours: number;
  /** billableHours / totalHours × 100 */
  utilization: number;
  /** directCosts / totalHours — effective cost rate per hour */
  costPerHour: number;
}

export interface ProjectProfitability {
  projectId: string;
  projectName: string;
  clientName: string;
  quotedAmount: number;
  actualCost: number;
  profit: number;
  profitMargin: number;
  status: string;
  budgetVariance: number; // percentage over/under
}

// Bulk operation result
export interface BulkOperationResult {
  succeeded: number;
  failed: number;
  errors: { id: string; error: string }[];
}

// Import types
export interface ImportPreview {
  uploadId: string;
  fileName: string;
  totalRows: number;
  columns: { name: string; type: string; sampleValues: string[] }[];
  suggestedMapping: Record<string, string>;
  duplicatesDetected: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  duplicates: number;
  errors: { row: number; error: string }[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    autoClassified: number;
    needsReview: number;
  };
}

/** Single import history entry — enriched with classification stats */
export interface ImportHistoryRecord {
  id: string;
  fileName: string;
  importedAt: string;
  transactionCount: number;
  status: string;
  /** Display name of the bank account that was imported into */
  accountName: string;
  /** Number of transactions auto-classified with sufficient confidence */
  autoPlaced: number;
  /** Number of transactions flagged for manual review */
  needsReview: number;
  /** Number of duplicate transactions detected */
  duplicatesFound: number;
}

/** Optional per-org AI provider settings (see aiSettingsService — browser storage for demo) */
export interface OrgAiIntegrationSettings {
  /** User opts in to supplying their own API key */
  useCustomKey: boolean;
  /** Display name, e.g. OpenAI, Anthropic */
  providerName: string;
  /** Model id, e.g. gpt-4o-mini */
  modelName: string;
  /** Secret — never log; in production store server-side only */
  apiKey: string;
}