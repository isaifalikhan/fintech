import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import {
  Download,
  Package,
  FileText,
  Database,
  Users,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardDrive,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService, useServiceArray } from '@/hooks/useService';
import { organizationService } from '@/services/organizationService';
import { auditService, type AuditLogEntry } from '@/services/auditService';
import { exportToCSV, exportTransactions, downloadJson } from '@/lib/exportUtils';
import { formatDate } from '@/lib/formatters';
import type { OrganizationMember, User, BankAccount, Organization, Transaction } from '@/services/types';
import type { ClassificationRule } from '@/lib/classificationEngine';

type ExportOptionId = 'transactions' | 'accounts' | 'rules' | 'team' | 'audit' | 'settings';

interface ExportOptionMeta {
  id: ExportOptionId;
  name: string;
  description: string;
  icon: typeof FileText;
}

const EXPORT_OPTION_META: ExportOptionMeta[] = [
  { id: 'transactions', name: 'Transactions', description: 'All income and expense entries', icon: FileText },
  { id: 'accounts', name: 'Accounts & Wallets', description: 'Bank accounts, cash, and balances', icon: Database },
  { id: 'rules', name: 'Logic Rules', description: 'Auto-classification and learning rules', icon: Shield },
  { id: 'team', name: 'Team Members', description: 'Users, roles, and permissions', icon: Users },
  { id: 'audit', name: 'Audit Logs', description: 'Complete activity history', icon: Clock },
  { id: 'settings', name: 'Settings & Configuration', description: 'Organization preferences and setup', icon: Settings },
];

const UNIT_LABEL: Record<ExportOptionId, string> = {
  transactions: 'transactions',
  accounts: 'accounts',
  rules: 'rules',
  team: 'members',
  audit: 'entries',
  settings: 'configuration',
};

const DEFAULT_ENABLED: Record<ExportOptionId, boolean> = {
  transactions: true,
  accounts: true,
  rules: true,
  team: true,
  audit: false,
  settings: true,
};

// Column mappings used by both the CSV branch (exportToCSV) and the Excel branch
// (XLSX.utils.json_to_sheet) so every format produces the same columns.
const ACCOUNT_HEADERS = ['Name', 'Type', 'Currency', 'Balance'];
const TEAM_HEADERS = ['Name', 'Email', 'Role', 'Status', 'Joined'];
const AUDIT_HEADERS = ['Timestamp', 'User', 'Action', 'Resource', 'Details', 'Severity'];
const SETTINGS_HEADERS = ['Organization Name', 'Currency', 'Fiscal Year Start'];
const RULES_HEADERS = ['Pattern', 'Category ID', 'Confidence', 'Match Count', 'Created From', 'Last Used'];

type EnrichedTransaction = Transaction & { category: string; scope: string; accountName: string; department: string };

function buildAccountRows(accounts: BankAccount[]) {
  return accounts.map(a => ({
    Name: a.bankName,
    Type: a.accountType,
    Currency: a.currency,
    Balance: a.balance,
  }));
}

function buildTeamRows(members: (OrganizationMember & { user?: User | null })[]) {
  return members.map(m => ({
    Name: m.user?.name ?? '',
    Email: m.user?.email ?? '',
    Role: m.role,
    Status: m.status ?? 'active',
    Joined: m.joinedAt ? formatDate(m.joinedAt) : '',
  }));
}

function buildAuditRows(logs: AuditLogEntry[]) {
  return logs.map(l => ({
    Timestamp: l.timestamp,
    User: l.userName,
    Action: l.action,
    Resource: l.resource,
    Details: l.details,
    Severity: l.severity,
  }));
}

function buildSettingsRows(org: Organization | null) {
  if (!org) return [];
  return [{
    'Organization Name': org.name,
    Currency: org.currency,
    'Fiscal Year Start': org.fiscalYearStart,
  }];
}

function buildRuleRows(rules: ClassificationRule[]) {
  return rules.map(r => ({
    Pattern: r.pattern,
    'Category ID': r.categoryId,
    Confidence: r.confidence,
    'Match Count': r.matchCount,
    'Created From': r.createdFrom,
    'Last Used': r.lastUsed ? formatDate(r.lastUsed) : '',
  }));
}

// Row shape kept identical to exportUtils.ts's exportTransactions() internal
// mapping, so the Excel sheet and the CSV file show the same columns.
function buildTransactionRows(txns: EnrichedTransaction[]) {
  return txns.map(t => ({
    Date: formatDate(t.date),
    Narration: t.narration,
    Category: t.category,
    Type: t.type,
    Scope: t.scope,
    Amount: t.amount,
    Currency: t.currency,
    Account: t.accountName,
    Department: t.department || '',
    Status: t.status || '',
  }));
}

function estimateSizeBytes(data: unknown): number {
  try {
    return new Blob([JSON.stringify(data ?? [])]).size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function DataExportCenter() {
  const svc = useOrgServices();
  const orgId = svc.orgId;

  const [enabledIds, setEnabledIds] = useState<Record<ExportOptionId, boolean>>(DEFAULT_ENABLED);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  // Defaults span "everything up to today" so the date filter (now wired into a real
  // fetch, see below) doesn't silently truncate current data if left untouched.
  const [dateFrom, setDateFrom] = useState('2020-01-01');
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ── Real data, fetched via the service-layer hooks (never straight from a component) ──
  const { data: txnPage, loading: txnLoading } = useService(
    () => svc.transactions.getAll({ pageSize: 5000, dateFrom, dateTo }),
    [svc.orgId, dateFrom, dateTo],
    ['transactions'],
  );
  const transactions = useMemo(() => txnPage?.items ?? [], [txnPage]);

  const { data: bankAccounts, loading: accountsLoading } = useServiceArray(
    () => svc.accounts.getBankAccounts(),
    [svc.orgId],
    ['bankAccounts'],
  );

  const { data: categories } = useServiceArray(
    () => svc.categories.getAll(),
    [svc.orgId],
    ['categories'],
  );

  const { data: departments } = useServiceArray(
    () => svc.departments.getAll(),
    [svc.orgId],
    ['departments'],
  );

  const { data: rules, loading: rulesLoading } = useServiceArray(
    () => svc.classification.getRules(),
    [svc.orgId],
    ['classification-rules'],
  );

  const { data: memberRows, loading: teamLoading } = useServiceArray(
    () => organizationService.getMembers(orgId),
    [orgId],
    ['organizationMembers'],
  );

  const { data: auditLogs, loading: auditLoading } = useServiceArray(
    () => auditService.getAll(orgId),
    [orgId],
    ['auditLogs'],
  );

  const { data: org, loading: orgLoading } = useService(
    () => svc.org.get(),
    [svc.orgId],
    ['organizations'],
  );

  // Resolve category/department/account names onto raw transactions so the export
  // shows real labels instead of blank cells or raw ids (same idea as the
  // adaptTransaction() helper in TransactionsLedger.tsx).
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);
  const departmentMap = useMemo(() => new Map(departments.map(d => [d.id, d.name])), [departments]);
  const bankMap = useMemo(() => new Map(bankAccounts.map(b => [b.id, b.bankName])), [bankAccounts]);

  const adaptedTransactions = useMemo<EnrichedTransaction[]>(() => transactions.map(t => ({
    ...t,
    category: categoryMap.get(t.categoryId ?? '') ?? 'Uncategorized',
    scope: (t.tags ?? []).includes('personal') ? 'personal' : 'business',
    accountName: bankMap.get(t.bankAccountId) ?? '—',
    department: t.departmentId ? (departmentMap.get(t.departmentId) ?? '') : '',
  })), [transactions, categoryMap, bankMap, departmentMap]);

  const exportOptions = useMemo(() => {
    const datasetsById: Record<ExportOptionId, unknown[]> = {
      transactions,
      accounts: bankAccounts,
      rules,
      team: memberRows,
      audit: auditLogs,
      settings: org ? [org] : [],
    };
    const loadingById: Record<ExportOptionId, boolean> = {
      transactions: txnLoading,
      accounts: accountsLoading,
      rules: rulesLoading,
      team: teamLoading,
      audit: auditLoading,
      settings: orgLoading,
    };
    return EXPORT_OPTION_META.map(meta => {
      const data = datasetsById[meta.id];
      const sizeBytes = estimateSizeBytes(data);
      return {
        ...meta,
        enabled: enabledIds[meta.id],
        loading: loadingById[meta.id],
        itemCount: meta.id === 'settings' ? '1 configuration' : `${data.length} ${UNIT_LABEL[meta.id]}`,
        estimatedSize: formatBytes(sizeBytes),
        sizeBytes,
      };
    });
  }, [transactions, bankAccounts, rules, memberRows, auditLogs, org, enabledIds,
      txnLoading, accountsLoading, rulesLoading, teamLoading, auditLoading, orgLoading]);

  const toggleOption = (id: ExportOptionId) => {
    setEnabledIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const calculateTotalSize = () => {
    const totalBytes = exportOptions.filter(opt => opt.enabled).reduce((sum, opt) => sum + opt.sizeBytes, 0);
    return formatBytes(totalBytes);
  };

  const handleExport = () => {
    const enabled = exportOptions.filter(opt => opt.enabled);
    if (enabled.length === 0) {
      toast.error('Please select at least one data type to export');
      return;
    }
    if (enabled.some(opt => opt.loading)) {
      toast.error('Still loading data — please wait a moment and try again');
      return;
    }

    setIsExporting(true);
    const enabled_ids = new Set(enabled.map(opt => opt.id));
    const ts = Date.now();

    try {
      if (exportFormat === 'json') {
        const bundle: Record<string, unknown> = {};
        if (enabled_ids.has('transactions')) bundle.transactions = transactions;
        if (enabled_ids.has('accounts')) bundle.accounts = bankAccounts;
        if (enabled_ids.has('rules')) bundle.rules = rules;
        if (enabled_ids.has('team')) bundle.team = memberRows;
        if (enabled_ids.has('audit')) bundle.audit = auditLogs;
        if (enabled_ids.has('settings') && org) bundle.settings = org;

        const result = downloadJson(bundle, `finance-os-export-${ts}`);
        if (result.success) {
          toast.success(`Export complete! Downloaded finance-os-export-${ts}.json`);
        } else {
          toast.error(result.message);
        }
      } else if (exportFormat === 'excel') {
        const wb = XLSX.utils.book_new();
        if (enabled_ids.has('transactions')) {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildTransactionRows(adaptedTransactions)), 'Transactions');
        }
        if (enabled_ids.has('accounts')) {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildAccountRows(bankAccounts)), 'Accounts');
        }
        if (enabled_ids.has('rules')) {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildRuleRows(rules)), 'Logic Rules');
        }
        if (enabled_ids.has('team')) {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildTeamRows(memberRows)), 'Team');
        }
        if (enabled_ids.has('audit')) {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildAuditRows(auditLogs)), 'Audit Logs');
        }
        if (enabled_ids.has('settings')) {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildSettingsRows(org)), 'Settings');
        }
        XLSX.writeFile(wb, `finance-os-export-${ts}.xlsx`);
        toast.success(`Export complete! Downloaded finance-os-export-${ts}.xlsx`);
      } else {
        // CSV: one file per enabled data type
        const results: { label: string; success: boolean }[] = [];

        if (enabled_ids.has('transactions')) {
          const r = exportTransactions(adaptedTransactions, { filename: `finance-os-transactions-${ts}` });
          results.push({ label: 'Transactions', success: r.success });
        }
        if (enabled_ids.has('accounts')) {
          const r = exportToCSV(buildAccountRows(bankAccounts), ACCOUNT_HEADERS, `finance-os-accounts-${ts}`);
          results.push({ label: 'Accounts', success: r.success });
        }
        if (enabled_ids.has('rules')) {
          const r = exportToCSV(buildRuleRows(rules), RULES_HEADERS, `finance-os-rules-${ts}`);
          results.push({ label: 'Logic Rules', success: r.success });
        }
        if (enabled_ids.has('team')) {
          const r = exportToCSV(buildTeamRows(memberRows), TEAM_HEADERS, `finance-os-team-${ts}`);
          results.push({ label: 'Team', success: r.success });
        }
        if (enabled_ids.has('audit')) {
          const r = exportToCSV(buildAuditRows(auditLogs), AUDIT_HEADERS, `finance-os-audit-${ts}`);
          results.push({ label: 'Audit Logs', success: r.success });
        }
        if (enabled_ids.has('settings')) {
          const r = exportToCSV(buildSettingsRows(org), SETTINGS_HEADERS, `finance-os-settings-${ts}`);
          results.push({ label: 'Settings', success: r.success });
        }

        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
          toast.error(`Failed to export: ${failed.map(f => f.label).join(', ')}`);
        } else {
          toast.success(`Downloaded ${results.length} CSV file${results.length === 1 ? '' : 's'}`);
        }
      }
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExitPlatform = () => {
    toast.error('Exit platform feature requires confirmation from platform admin');
    setShowExitDialog(false);
  };

  const anyEnabledLoading = exportOptions.some(opt => opt.enabled && opt.loading);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Data Export Center</h2>
        <p className="text-slate-400">Export all your data or leave the platform</p>
      </div>

      {/* Export Package Builder */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="size-5 text-blue-400" />
            <div>
              <CardTitle className="text-white">Build Export Package</CardTitle>
              <CardDescription>Select what data to include in your export</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Data Type Selection */}
          <div className="space-y-3">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.id}
                  className={`p-4 rounded-lg border transition-all ${
                    option.enabled
                      ? 'bg-slate-950 border-blue-900/50'
                      : 'bg-slate-950/50 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        option.enabled ? 'bg-blue-500/20' : 'bg-slate-900'
                      }`}>
                        <Icon className={`size-5 ${
                          option.enabled ? 'text-blue-400' : 'text-slate-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">{option.name}</h4>
                        <p className="text-sm text-slate-400 mb-2">{option.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {option.loading ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="size-3 animate-spin" /> Loading…
                            </span>
                          ) : (
                            <>
                              <span>{option.itemCount}</span>
                              <span>•</span>
                              <span>{option.estimatedSize}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={option.enabled}
                      onCheckedChange={() => toggleOption(option.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Export Options */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Export Format</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['csv', 'json', 'excel'] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => setExportFormat(format)}
                      className={`p-3 rounded-lg border transition-all ${
                        exportFormat === format
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-medium uppercase text-xs">{format}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-white mb-2 block">Date Range (for transactions)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-10 px-3 rounded-md bg-slate-950 border border-slate-700 text-white text-sm"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-10 px-3 rounded-md bg-slate-950 border border-slate-700 text-white text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg">
              <div>
                <Label className="text-white mb-1">Include Attachments</Label>
                <p className="text-xs text-slate-400">
                  Not available yet — statement files and receipts aren't bundled into exports in this build
                </p>
              </div>
              <Switch
                checked={false}
                disabled
                title="Attachment export isn't available yet"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview & Summary */}
      <Card className="bg-gradient-to-br from-blue-950/20 to-cyan-950/20 border-blue-900/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <HardDrive className="size-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium mb-1">Export Preview</h4>
              <p className="text-sm text-slate-400 mb-3">Your package will include:</p>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Data Types:</span>
                  <span className="text-white ml-2">
                    {exportOptions.filter(opt => opt.enabled).length} selected
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Estimated Size:</span>
                  <span className="text-white ml-2">{calculateTotalSize()}</span>
                </div>
                <div>
                  <span className="text-slate-500">Format:</span>
                  <span className="text-white ml-2 uppercase">{exportFormat}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Action */}
      <div className="flex items-center justify-between p-6 bg-slate-900 rounded-lg border border-slate-800">
        <div>
          <h4 className="text-white font-medium mb-1">Ready to Export</h4>
          <p className="text-sm text-slate-400">
            {exportFormat === 'csv' && 'Each selected data type downloads as its own CSV file'}
            {exportFormat === 'json' && 'All selected data downloads as a single JSON file'}
            {exportFormat === 'excel' && 'All selected data downloads as a single Excel workbook, one sheet per data type'}
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting || anyEnabledLoading}
          className="bg-gradient-to-r from-blue-600 to-cyan-600"
        >
          {isExporting ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Download className="size-4 mr-2" />
          )}
          {isExporting ? 'Generating…' : 'Generate & Download'}
        </Button>
      </div>

      {/* Danger Zone - Exit Platform */}
      <Card className="bg-red-950/10 border-red-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-400" />
            <div>
              <CardTitle className="text-white">Danger Zone</CardTitle>
              <CardDescription>Permanently leave Finance OS</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-slate-950 rounded-lg border border-red-900/30">
            <h4 className="text-white font-medium mb-2">Exit Platform</h4>
            <p className="text-sm text-slate-400 mb-4">
              If you want to leave Finance OS, you can export all your data and request account closure.
              This action requires approval from the platform administrator.
            </p>
            <div className="space-y-2 text-sm text-slate-400 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-400" />
                <span>Your data will be exported in full</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-400" />
                <span>You can re-import to another system</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-400" />
                <span>Your account will be deactivated</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-400" />
                <span>This cannot be undone without admin approval</span>
              </div>
            </div>

            {!showExitDialog ? (
              <Button
                variant="outline"
                onClick={() => setShowExitDialog(true)}
                className="border-red-900/50 text-red-400 hover:bg-red-950/20"
              >
                I Want to Leave
              </Button>
            ) : (
              <div className="p-4 bg-red-950/20 rounded-lg border border-red-900/50">
                <p className="text-sm text-red-300 mb-3">
                  Are you sure? This will export all your data and request account closure.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleExitPlatform}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Yes, Export & Request Exit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowExitDialog(false)}
                    className="border-slate-700 hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
        <h4 className="text-sm font-medium text-white mb-2">What You'll Get</h4>
        <div className="text-xs text-slate-400 space-y-1">
          {exportOptions.filter(opt => opt.enabled).length === 0 && (
            <p>Select at least one data type above to see what will be generated.</p>
          )}
          {exportFormat === 'csv' && exportOptions.filter(opt => opt.enabled).map(opt => (
            <p key={opt.id}>
              • <strong>finance-os-{opt.id}-*.csv</strong> — {opt.description}
            </p>
          ))}
          {exportFormat === 'json' && exportOptions.some(opt => opt.enabled) && (
            <p>
              • <strong>finance-os-export-*.json</strong> — one file containing:{' '}
              {exportOptions.filter(opt => opt.enabled).map(opt => opt.name).join(', ')}
            </p>
          )}
          {exportFormat === 'excel' && exportOptions.some(opt => opt.enabled) && (
            <p>
              • <strong>finance-os-export-*.xlsx</strong> — one workbook, one sheet each for:{' '}
              {exportOptions.filter(opt => opt.enabled).map(opt => opt.name).join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
