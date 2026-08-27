import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  BarChart3,
  Bell,
  Building2,
  Check,
  CreditCard,
  Database,
  DollarSign,
  FileDown,
  FileText,
  Globe,
  Layers,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Tag,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { AXIOM } from '../../../styles/axiom-tokens';
import { organizationService } from '@/services/organizationService';
import { departmentService } from '@/services/departmentService';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { useMutation, useServiceArray, useService } from '@/hooks/useService';
import type { Organization, Department as OrgDepartment } from '@/services/types';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { ActiveSessionsView } from './ActiveSessionsView';
import { AuditLogView } from './AuditLogView';
import { DataExportCenter } from './DataExportCenter';

type SettingsView = 'general' | 'financial' | 'team' | 'notifications' | 'security' | 'audit' | 'data' | 'billing';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  enabled: boolean;
}

const DEFAULT_ENABLED_CURRENCY_CODES = ['USD', 'PKR', 'AED'];

interface Department {
  id: string;
  name: string;
  color: string;
}

interface FeatureToggle {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: any;
  category: 'financial' | 'automation' | 'team' | 'reporting';
}

// Mock data
const currencies: Currency[] = SUPPORTED_CURRENCIES.map(c => ({
  ...c,
  enabled: DEFAULT_ENABLED_CURRENCY_CODES.includes(c.code),
}));

const featureToggles: FeatureToggle[] = [
  {
    id: 'personal_finance',
    name: 'Personal Finance',
    description: 'Track personal and business transactions separately',
    enabled: true,
    icon: DollarSign,
    category: 'financial',
  },
  {
    id: 'auto_categorization',
    name: 'Auto-Categorization',
    description: 'Automatically categorize transactions using AI',
    enabled: true,
    icon: Zap,
    category: 'automation',
  },
  {
    id: 'profit_intelligence',
    name: 'Profit Intelligence',
    description: 'Advanced profit analysis and insights',
    enabled: true,
    icon: BarChart3,
    category: 'financial',
  },
  {
    id: 'multi_currency',
    name: 'Multi-Currency Support',
    description: 'Handle transactions in multiple currencies',
    enabled: true,
    icon: Globe,
    category: 'financial',
  },
  {
    id: 'team_collaboration',
    name: 'Team Collaboration',
    description: 'Enable team members to collaborate on transactions',
    enabled: true,
    icon: Users,
    category: 'team',
  },
  {
    id: 'automated_reports',
    name: 'Automated Reports',
    description: 'Schedule and receive automated financial reports',
    enabled: false,
    icon: FileText,
    category: 'reporting',
  },
  {
    id: 'budget_alerts',
    name: 'Budget Alerts',
    description: 'Get notified when approaching budget limits',
    enabled: true,
    icon: Bell,
    category: 'automation',
  },
  {
    id: 'recurring_transactions',
    name: 'Recurring Transactions',
    description: 'Automatically create recurring transactions',
    enabled: true,
    icon: RefreshCw,
    category: 'automation',
  },
];

const COLORS = {
  purple: '#a855f7',
  cyan: '#06b6d4',
  pink: '#ec4899',
  green: '#10b981',
  amber: '#f59e0b',
  blue: '#3b82f6',
  red: '#ef4444',
  orange: '#f97316',
};

const DEPT_DOT_KEYS = ['purple', 'cyan', 'pink', 'green', 'amber', 'blue'] as const;

export function OrgSettings() {
  const { currentOrganization, applyOrganizationUpdate, hasPermission } = useAuth();
  const orgId = currentOrganization?.id ?? '';
  const canWrite = hasPermission('write');

  const { data: orgRecord, loading: orgLoading, error: orgLoadError, refetch: refetchOrg } = useService(
    () =>
      orgId
        ? organizationService.getById(orgId)
        : Promise.resolve({ success: true as const, data: null }),
    [orgId],
    orgId ? (['organizations'] as const) : undefined,
  );

  const { data: deptRows, loading: deptsLoading } = useServiceArray(
    () =>
      orgId
        ? departmentService.getAll(orgId)
        : Promise.resolve({ success: true as const, data: [] }),
    [orgId],
    orgId ? (['departments'] as const) : undefined,
  );

  const { execute: executeUpdate } = useMutation((updates: Partial<Organization>) =>
    organizationService.update(orgId, updates),
  );

  const [activeView, setActiveView] = useState<SettingsView>('general');
  const [orgName, setOrgName] = useState(() => currentOrganization?.name ?? '');
  const [fiscalYearStart, setFiscalYearStart] = useState(
    () => currentOrganization?.fiscalYearStart ?? '01-01',
  );
  const [defaultCurrency, setDefaultCurrency] = useState(() => currentOrganization?.currency ?? 'USD');
  const [enabledCurrencies, setEnabledCurrencies] = useState(currencies.filter(c => c.enabled));
  const [emailNotifications, setEmailNotifications] = useState(
    () => currentOrganization?.settings.notifications ?? true,
  );
  const [features, setFeatures] = useState(featureToggles);
  const [savePending, setSavePending] = useState(false);
  const [teamRequireApproval, setTeamRequireApproval] = useState(true);
  const [teamComments, setTeamComments] = useState(true);
  const [teamActivityNotify, setTeamActivityNotify] = useState(true);
  const [notifTransaction, setNotifTransaction] = useState(true);
  const [notifBudget, setNotifBudget] = useState(true);
  const [notifReport, setNotifReport] = useState(false);
  const [addDeptDialogOpen, setAddDeptDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');

  useEffect(() => {
    if (!orgRecord) return;
    setOrgName(orgRecord.name);
    setFiscalYearStart(orgRecord.fiscalYearStart);
    setDefaultCurrency(orgRecord.currency);
    setEmailNotifications(orgRecord.settings.notifications);
    const base = currencies.filter((c) => c.enabled);
    const code = orgRecord.currency;
    if (!base.some((c) => c.code === code)) {
      const extra = currencies.find((c) => c.code === code);
      if (extra) base.push(extra);
    }
    setEnabledCurrencies(base);
  }, [orgRecord]);

  const resetFromSaved = useCallback(async () => {
    await refetchOrg();
    toast.message('Restored saved values');
  }, [refetchOrg]);

  const saveSettings = useCallback(async () => {
    if (!orgId || !orgRecord) {
      toast.error('Organization not loaded');
      return;
    }
    if (!canWrite) {
      toast.error('You do not have permission to change organization settings');
      return;
    }
    setSavePending(true);
    const res = await executeUpdate({
      name: orgName.trim() || orgRecord.name,
      fiscalYearStart,
      currency: defaultCurrency,
      settings: {
        ...orgRecord.settings,
        notifications: emailNotifications,
      },
    });
    setSavePending(false);
    if (res.success && res.data) {
      applyOrganizationUpdate(res.data);
      toast.success(res.message || 'Settings saved');
    } else {
      toast.error(res.error || 'Could not save settings');
    }
  }, [
    orgId,
    orgRecord,
    canWrite,
    orgName,
    fiscalYearStart,
    defaultCurrency,
    emailNotifications,
    executeUpdate,
    applyOrganizationUpdate,
  ]);

  const viewButtons = [
    { id: 'general' as const, label: 'General', icon: Building2 },
    { id: 'financial' as const, label: 'Financial', icon: DollarSign },
    { id: 'team' as const, label: 'Team', icon: Users },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'audit' as const, label: 'Audit Log', icon: FileText },
    { id: 'data' as const, label: 'Data & Export', icon: Database },
    { id: 'billing' as const, label: 'Billing', icon: CreditCard },
  ];

  const toggleFeature = (featureId: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? { ...f, enabled: !f.enabled } : f)),
    );
    toast.success('Feature updated');
  };

  const addCurrency = (currency: Currency) => {
    setEnabledCurrencies([...enabledCurrencies, currency]);
    toast.success(`${currency.code} enabled`);
  };

  const removeCurrency = (code: string) => {
    setEnabledCurrencies(enabledCurrencies.filter(c => c.code !== code));
    toast.success('Currency removed');
  };

  const addDepartment = async (name: string) => {
    if (!orgId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Department name is required');
      return;
    }
    const res = await departmentService.create(orgId, {
      name: trimmed,
      code: `D-${Date.now().toString(36)}`,
      costCenter: 'MAIN',
      isActive: true,
    });
    if (res.success) {
      toast.success('Department added');
      setAddDeptDialogOpen(false);
      setNewDeptName('');
    } else {
      toast.error(res.error || 'Could not add department');
    }
  };

  const removeDepartment = async (id: string) => {
    if (!orgId) return;
    const res = await departmentService.delete(id, orgId);
    if (res.success) toast.success('Department removed');
    else toast.error(res.error || 'Could not remove department');
  };

  if (!orgId) {
    return (
      <div className="min-h-screen p-8 space-y-6" style={{ background: AXIOM.backgrounds.main }}>
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-xl flex items-center justify-center"
            style={{
              background: AXIOM.iconBoxes.purple,
              boxShadow: AXIOM.shadows.iconPurple,
            }}
          >
            <Settings className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={AXIOM.text.titleStyle}>
              Organization Settings
            </h1>
            <p className="text-slate-400 text-sm">Select an organization to manage settings.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ background: AXIOM.backgrounds.main }}>
      {/* Header */}
      <motion.div {...AXIOM.animations.fadeInTop}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.purple,
                boxShadow: AXIOM.shadows.iconPurple,
              }}
            >
              <Settings className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={AXIOM.text.titleStyle}>
                Organization Settings
              </h1>
              <p className="text-slate-400 text-sm">Configure your organization preferences and features</p>
            </div>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => void resetFromSaved()}
              disabled={orgLoading || !orgId}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              style={AXIOM.buttons.secondary}
            >
              <RefreshCw className="size-4" />
              Reset
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => void saveSettings()}
              disabled={savePending || orgLoading || !orgId || !!orgLoadError || !canWrite}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                color: '#ffffff',
              }}
            >
              <Save className="size-4" />
              {savePending ? 'Saving…' : 'Save Changes'}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {orgId && orgLoading && (
        <p className="text-sm text-slate-400" role="status">
          Loading organization…
        </p>
      )}
      {orgId && orgLoadError && (
        <p className="text-sm text-amber-400/90" role="alert">
          {orgLoadError}. Some fields may be out of date until this loads.
        </p>
      )}

      {/* View Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-2 p-2 rounded-2xl"
        style={AXIOM.containers.list}
      >
        {viewButtons.map((btn) => (
          <motion.button
            key={btn.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveView(btn.id)}
            className="px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
            style={activeView === btn.id ? AXIOM.buttons.primary : AXIOM.buttons.secondary}
          >
            <btn.icon className="size-4" />
            {btn.label}
          </motion.button>
        ))}
      </motion.div>

      {/* General Settings */}
      {activeView === 'general' && (
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.list}
          >
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: AXIOM.iconBoxes.cyan,
                  boxShadow: AXIOM.shadows.iconCyan,
                }}
              >
                <Building2 className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Organization Information</h3>
                <p className="text-sm text-slate-400">Basic details about your organization</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-slate-400 block mb-2">Organization Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                    color: AXIOM.inputs.color,
                  }}
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-2">Fiscal Year Start (MM-DD)</label>
                <input
                  type="text"
                  value={fiscalYearStart}
                  onChange={(e) => setFiscalYearStart(e.target.value)}
                  placeholder="01-01"
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                    color: AXIOM.inputs.color,
                  }}
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-2">Time Zone</label>
                <select
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                    color: AXIOM.inputs.color,
                  }}
                >
                  <option>UTC+05:00 - Pakistan Standard Time</option>
                  <option>UTC+04:00 - Gulf Standard Time</option>
                  <option>UTC+00:00 - Coordinated Universal Time</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-2">Date Format</label>
                <select
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                    color: AXIOM.inputs.color,
                  }}
                >
                  <option>MM/DD/YYYY</option>
                  <option>DD/MM/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.list}
          >
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: AXIOM.iconBoxes.purple,
                  boxShadow: AXIOM.shadows.iconPurple,
                }}
              >
                <Layers className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Departments</h3>
                <p className="text-sm text-slate-400">Organize your team into departments</p>
              </div>
            </div>

            {deptsLoading && (
              <p className="text-xs text-slate-500 mb-3" role="status">
                Loading departments…
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {deptRows.map((dept: OrgDepartment, i: number) => (
                <div
                  key={dept.id}
                  className="p-3 rounded-xl flex items-center justify-between group"
                  style={AXIOM.containers.item}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        background: COLORS[DEPT_DOT_KEYS[i % DEPT_DOT_KEYS.length]],
                      }}
                    />
                    <span className="text-sm text-white truncate">{dept.name}</span>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => void removeDepartment(dept.id)}
                    disabled={!canWrite}
                    className="opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                  >
                    <X className="size-3 text-red-400" />
                  </motion.button>
                </div>
              ))}
            </div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setNewDeptName(''); setAddDeptDialogOpen(true); }}
              disabled={!canWrite || !orgId}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              style={AXIOM.buttons.secondary}
            >
              <Plus className="size-4" />
              Add Department
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.list}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: AXIOM.iconBoxes.amber,
                  boxShadow: AXIOM.shadows.iconAmber,
                }}
              >
                <Zap className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Workspace features</h3>
                <p className="text-sm text-slate-400">Turn features on or off for this session. Organization name, dates, currency, and email alerts save with Save Changes.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {features.map((f) => (
                <div
                  key={f.id}
                  className="p-4 rounded-xl flex items-start justify-between gap-3"
                  style={AXIOM.containers.item}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-slate-700/50">
                      <f.icon className="size-5 text-cyan-300" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{f.name}</p>
                      <p className="text-sm text-slate-400">{f.description}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={f.enabled}
                      onChange={() => toggleFeature(f.id)}
                    />
                    <div className="w-11 h-6 rounded-full peer bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-purple-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Financial Settings */}
      {activeView === 'financial' && (
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.list}
          >
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: AXIOM.iconBoxes.green,
                  boxShadow: AXIOM.shadows.iconGreen,
                }}
              >
                <Globe className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Currency Settings</h3>
                <p className="text-sm text-slate-400">Manage enabled currencies and default currency</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-sm text-slate-400 block mb-2">Default Currency</label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full md:w-1/2 px-4 py-3 rounded-xl text-sm"
                style={{
                  background: AXIOM.inputs.background,
                  border: AXIOM.inputs.border,
                  color: AXIOM.inputs.color,
                }}
              >
                {enabledCurrencies.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.code} - {curr.name} ({curr.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-3">Enabled Currencies</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {enabledCurrencies.map((curr) => (
                  <div
                    key={curr.code}
                    className="p-4 rounded-xl flex items-center justify-between"
                    style={AXIOM.containers.item}
                  >
                    <div>
                      <p className="text-white font-medium">{curr.code}</p>
                      <p className="text-xs text-slate-400">{curr.name}</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeCurrency(curr.code)}
                      className="text-red-400"
                    >
                      <X className="size-4" />
                    </motion.button>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="text-sm text-slate-400 block mb-3">Available Currencies</label>
                <div className="flex flex-wrap gap-2">
                  {currencies.filter(c => !enabledCurrencies.find(ec => ec.code === c.code)).map((curr) => (
                    <motion.button
                      key={curr.code}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => addCurrency(curr)}
                      className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                      style={AXIOM.buttons.secondary}
                    >
                      <Plus className="size-3" />
                      {curr.code}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.list}
          >
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: AXIOM.iconBoxes.amber,
                  boxShadow: AXIOM.shadows.iconAmber,
                }}
              >
                <Tag className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Tax & Compliance</h3>
                <p className="text-sm text-slate-400">Configure tax rates and compliance settings</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-slate-400 block mb-2">Default Tax Rate (%)</label>
                <input
                  type="number"
                  defaultValue="18"
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                    color: AXIOM.inputs.color,
                  }}
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-2">Tax Registration Number</label>
                <input
                  type="text"
                  placeholder="Enter tax ID"
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                    color: AXIOM.inputs.color,
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Team Settings */}
      {activeView === 'team' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.purple,
                boxShadow: AXIOM.shadows.iconPurple,
              }}
            >
              <Users className="size-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Team Preferences</h3>
              <p className="text-sm text-slate-400">Configure team collaboration settings</p>
            </div>
          </div>

            <div className="space-y-3">
            <div className="p-4 rounded-xl flex items-center justify-between" style={AXIOM.containers.item}>
              <div>
                <p className="text-white font-medium">Require Approval for Transactions</p>
                <p className="text-sm text-slate-400 mt-1">Team members need admin approval for new transactions</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={teamRequireApproval}
                  onChange={(e) => setTeamRequireApproval(e.target.checked)}
                />
                <div className="w-11 h-6 rounded-full peer bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-purple-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>

            <div className="p-4 rounded-xl flex items-center justify-between" style={AXIOM.containers.item}>
              <div>
                <p className="text-white font-medium">Enable Team Comments</p>
                <p className="text-sm text-slate-400 mt-1">Allow team members to add comments on transactions</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={teamComments}
                  onChange={(e) => setTeamComments(e.target.checked)}
                />
                <div className="w-11 h-6 rounded-full peer bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-purple-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>

            <div className="p-4 rounded-xl flex items-center justify-between" style={AXIOM.containers.item}>
              <div>
                <p className="text-white font-medium">Activity Notifications</p>
                <p className="text-sm text-slate-400 mt-1">Notify admins of team member activities</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={teamActivityNotify}
                  onChange={(e) => setTeamActivityNotify(e.target.checked)}
                />
                <div className="w-11 h-6 rounded-full peer bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-purple-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {/* Notifications */}
      {activeView === 'notifications' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.amber,
                boxShadow: AXIOM.shadows.iconAmber,
              }}
            >
              <Bell className="size-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Notification Preferences</h3>
              <p className="text-sm text-slate-400">Control how and when you receive notifications</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl flex items-center justify-between" style={AXIOM.containers.item}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: AXIOM.iconBoxes.cyan }}>
                  <Mail className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">Email Notifications</p>
                  <p className="text-sm text-slate-400">Receive updates via email (included when you save)</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                />
                <div className="w-11 h-6 rounded-full peer bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-purple-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>

            <div className="p-4 rounded-xl flex items-center justify-between" style={AXIOM.containers.item}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: AXIOM.iconBoxes.green }}>
                  <DollarSign className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">Transaction Alerts</p>
                  <p className="text-sm text-slate-400">Notify on new transactions</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notifTransaction}
                  onChange={(e) => setNotifTransaction(e.target.checked)}
                />
                <div className="w-11 h-6 rounded-full peer bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-purple-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>

            <div className="p-4 rounded-xl flex items-center justify-between" style={AXIOM.containers.item}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: AXIOM.iconBoxes.amber }}>
                  <AlertCircle className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">Budget Warnings</p>
                  <p className="text-sm text-slate-400">Alert when approaching budget limits</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notifBudget}
                  onChange={(e) => setNotifBudget(e.target.checked)}
                />
                <div className="w-11 h-6 rounded-full peer bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-purple-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>

            <div className="p-4 rounded-xl flex items-center justify-between" style={AXIOM.containers.item}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: AXIOM.iconBoxes.blue }}>
                  <FileText className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">Report Reminders</p>
                  <p className="text-sm text-slate-400">Weekly/monthly report summaries</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notifReport}
                  onChange={(e) => setNotifReport(e.target.checked)}
                />
                <div className="w-11 h-6 rounded-full peer bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-purple-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {/* Security Settings */}
      {activeView === 'security' && <ActiveSessionsView />}

      {/* Audit Log */}
      {activeView === 'audit' && <AuditLogView />}

      {/* Data & Export */}
      {activeView === 'data' && <DataExportCenter />}

      {/* Billing */}
      {activeView === 'billing' && (
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.chartPurple}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: AXIOM.iconBoxes.purple,
                    boxShadow: AXIOM.shadows.iconPurple,
                  }}
                >
                  <CreditCard className="size-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Current Plan: Professional</h3>
                  <p className="text-sm text-slate-400">$499/month - Billed annually</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={AXIOM.buttons.secondary}
              >
                Upgrade Plan
              </motion.button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Users</p>
                <p className="text-2xl font-bold text-white">5/10</p>
                <div className="mt-2 h-2 rounded-full" style={{ background: 'rgba(148, 163, 184, 0.1)' }}>
                  <div className="h-full rounded-full" style={{ width: '50%', background: AXIOM.iconBoxes.cyan }} />
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Storage</p>
                <p className="text-2xl font-bold text-white">3.4/10 GB</p>
                <div className="mt-2 h-2 rounded-full" style={{ background: 'rgba(148, 163, 184, 0.1)' }}>
                  <div className="h-full rounded-full" style={{ width: '34%', background: AXIOM.iconBoxes.green }} />
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Statements</p>
                <p className="text-2xl font-bold text-white">248/500</p>
                <div className="mt-2 h-2 rounded-full" style={{ background: 'rgba(148, 163, 184, 0.1)' }}>
                  <div className="h-full rounded-full" style={{ width: '49.6%', background: AXIOM.iconBoxes.amber }} />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.list}
          >
            <h3 className="text-lg font-bold text-white mb-4">Billing History</h3>
            <div className="space-y-2">
              {[
                { date: '2026-02-01', amount: '$499.00', status: 'Paid', invoice: 'INV-2026-02' },
                { date: '2026-01-01', amount: '$499.00', status: 'Paid', invoice: 'INV-2026-01' },
                { date: '2025-12-01', amount: '$499.00', status: 'Paid', invoice: 'INV-2025-12' },
              ].map((bill) => (
                <div
                  key={bill.invoice}
                  className="p-4 rounded-xl flex items-center justify-between"
                  style={AXIOM.containers.item}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: AXIOM.iconBoxes.green }}>
                      <Check className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{bill.invoice}</p>
                      <p className="text-sm text-slate-400">{bill.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white font-bold">{bill.amount}</p>
                      <span className="text-xs px-2 py-1 rounded" style={AXIOM.badges.success}>
                        {bill.status}
                      </span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-lg"
                      style={AXIOM.buttons.secondary}
                    >
                      <FileDown className="size-4" />
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      <Dialog open={addDeptDialogOpen} onOpenChange={setAddDeptDialogOpen}>
        <DialogContent
          className="max-w-md border-slate-700/80 text-slate-100"
          style={{ background: 'rgba(15, 23, 42, 0.98)' }}
        >
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
            <DialogDescription className="text-slate-400">
              Give the new department a name.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Department name</label>
              <input
                type="text"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Marketing"
                className="w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border, color: AXIOM.inputs.color }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setAddDeptDialogOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium"
              style={AXIOM.buttons.secondary}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void addDepartment(newDeptName)}
              disabled={!newDeptName.trim()}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={AXIOM.buttons.primary}
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}