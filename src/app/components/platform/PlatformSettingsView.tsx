import { motion } from 'motion/react';
import { AXIOM } from '../../../styles/axiom-tokens';
import { Globe, Shield, Database, Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { platformService, DEFAULT_PLATFORM_SETTINGS } from '@/services/platformService';
import type { PlatformSettings } from '@/services/platformService';
import { useService, useServiceArray, useMutation } from '@/hooks/useService';
import { isHttpBackendConfigured } from '@/lib/apiClient';
import { dataStore } from '@/services/dataStore';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const RETENTION_FIELDS: {
  label: string;
  key: 'transactionDataRetentionDays' | 'auditLogRetentionDays' | 'statementFilesRetentionDays' | 'deletedOrgDataRetentionDays';
}[] = [
  { label: 'Transaction Data Retention (days)', key: 'transactionDataRetentionDays' },
  { label: 'Audit Log Retention (days)', key: 'auditLogRetentionDays' },
  { label: 'Statement Files Retention (days)', key: 'statementFilesRetentionDays' },
  { label: 'Deleted Org Data Retention (days)', key: 'deletedOrgDataRetentionDays' },
];

const FULL_BACKUP_OPTIONS = ['Daily', 'Weekly', 'Monthly'] as const;
const INCREMENTAL_BACKUP_OPTIONS = ['Hourly', 'Every 6 hours', 'Every 12 hours'] as const;

const FEATURE_FLAG_NAMES = [
  'AI-Powered Category Suggestions',
  'Advanced What-If Simulations',
  'API Access (Beta)',
  'White Label Mode',
  'Multi-Currency Auto-Convert',
  'Export to QuickBooks',
] as const;

function formatBackupSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-12 h-6 rounded-full relative cursor-pointer transition-colors"
      style={{
        background: checked ? 'rgba(168, 85, 247, 0.5)' : 'rgba(100, 116, 139, 0.3)',
        border: checked ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(100, 116, 139, 0.3)',
      }}
    >
      <div
        className="absolute top-0.5 size-5 rounded-full transition-all"
        style={{
          left: checked ? '24px' : '2px',
          background: checked ? '#a855f7' : '#64748b',
          boxShadow: checked ? '0 0 10px rgba(168, 85, 247, 0.5)' : 'none',
        }}
      />
    </button>
  );
}

export function PlatformSettingsView() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const initializedRef = useRef(false);

  const { data: loadedSettings } = useService(() => platformService.getSettings(), []);

  // Initialize local state from the server/dataStore once, on first successful load — never again,
  // so this doesn't clobber in-progress edits on background refetches.
  useEffect(() => {
    if (!initializedRef.current && loadedSettings) {
      setSettings(loadedSettings);
      initializedRef.current = true;
    }
  }, [loadedSettings]);

  const { execute: executeUpdateSettings, loading: savingSettings } = useMutation(
    (updates: Partial<PlatformSettings>) => platformService.updateSettings(updates),
  );

  const handleSaveAll = async () => {
    const res = await executeUpdateSettings(settings);
    if (res.success && res.data) {
      setSettings(res.data);
      toast.success(res.message || 'Settings saved');
    } else {
      toast.error(res.error || 'Could not save settings');
    }
  };

  const [backingUp, setBackingUp] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [addCurrencyOpen, setAddCurrencyOpen] = useState(false);

  // Rows shown in "Global Currencies" are driven by whatever is actually persisted in
  // settings.enabledCurrencies, not a hardcoded list — so a currency added here sticks
  // around (and survives reload) the same way every other control on this page does.
  const currencyRows = Object.keys(settings.enabledCurrencies).sort();
  const addableCurrencies = SUPPORTED_CURRENCIES.filter((c) => !(c.code in settings.enabledCurrencies));

  const handleAddCurrency = (code: string) => {
    setSettings((s) => ({
      ...s,
      enabledCurrencies: { ...s.enabledCurrencies, [code]: true },
    }));
    toast.success(`${code} added — click "Save All Changes" to persist it`);
  };
  const {
    data: backupHistoryEntries,
    loading: historyLoading,
    refetch: refetchHistory,
  } = useServiceArray(() => platformService.getBackupHistory(), []);

  const handleTriggerBackup = async () => {
    setBackingUp(true);
    try {
      let bundle: { schemaVersion: number; payload: Record<string, unknown> };
      if (isHttpBackendConfigured()) {
        // /api/bundle sits outside the versioned /api/v1 router apiGet() targets, so it needs a
        // raw fetch — same base-URL resolution as dataStore.ts's own /api/bundle calls.
        const base = (import.meta.env.VITE_LOCAL_API_BASE ?? '').replace(/\/$/, '');
        const res = await fetch(`${base}/api/bundle`, { credentials: 'include' });
        if (!res.ok) throw new Error(`Backup request failed (HTTP ${res.status})`);
        bundle = await res.json();
      } else {
        bundle = dataStore.getSnapshot();
      }

      const json = JSON.stringify(bundle, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const filename = `finance-os-backup-${Date.now()}.json`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await platformService.recordBackup(blob.size);
      await refetchHistory();
      toast.success('Backup downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Backup failed');
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <div className="p-8 space-y-8" style={{ background: AXIOM.backgrounds.main, minHeight: '100%' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2" style={AXIOM.text.titleStyle as any}>Platform Settings</h1>
        <p className="text-slate-400 font-mono">Configure system-wide settings and policies</p>
      </motion.div>

      {/* Global Currencies */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-6"
        style={{ ...AXIOM.containers.chartBlue, borderRadius: '1rem' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-lg flex items-center justify-center" style={{
            background: AXIOM.iconBoxes.blue,
          }}>
            <Globe className="size-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold">Global Currencies</h3>
            <p className="text-xs text-slate-400 font-mono">Manage supported currencies system-wide</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {currencyRows.map((currency) => (
            <div
              key={currency}
              className="flex items-center justify-between p-4 rounded-lg"
              style={AXIOM.containers.item}
            >
              <span className="text-white font-mono font-medium">{currency}</span>
              <ToggleSwitch
                checked={!!settings.enabledCurrencies[currency]}
                onChange={(checked) =>
                  setSettings((s) => ({
                    ...s,
                    enabledCurrencies: { ...s.enabledCurrencies, [currency]: checked },
                  }))
                }
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => setAddCurrencyOpen(true)}
          disabled={addableCurrencies.length === 0}
          title={addableCurrencies.length === 0 ? 'All supported currencies are already listed above' : undefined}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono disabled:opacity-40 disabled:cursor-not-allowed"
          style={AXIOM.buttons.outline}
        >
          + Add Currency
        </button>
      </motion.div>

      {/* Data Retention */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-6"
        style={{ ...AXIOM.containers.chartCyan, borderRadius: '1rem' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-lg flex items-center justify-center" style={{
            background: AXIOM.iconBoxes.cyan,
          }}>
            <Database className="size-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold">Data Retention & Privacy</h3>
            <p className="text-xs text-slate-400 font-mono">Define how long data is retained across organizations</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {RETENTION_FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="text-xs text-slate-400 font-mono">{field.label}</label>
              <input
                type="number"
                value={settings.dataRetention[field.key]}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setSettings((s) => ({
                    ...s,
                    dataRetention: { ...s.dataRetention, [field.key]: Number.isNaN(value) ? 0 : value },
                  }));
                }}
                className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg" style={AXIOM.containers.item}>
          <div>
            <p className="text-sm text-white font-medium">Auto-delete expired data</p>
            <p className="text-xs text-slate-400 font-mono">Automatically remove data after retention period</p>
          </div>
          <ToggleSwitch
            checked={settings.dataRetention.autoDeleteExpiredData}
            onChange={(checked) =>
              setSettings((s) => ({
                ...s,
                dataRetention: { ...s.dataRetention, autoDeleteExpiredData: checked },
              }))
            }
          />
        </div>
      </motion.div>

      {/* Backup & Restore */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-6"
        style={{ ...AXIOM.containers.chartPurple, borderRadius: '1rem' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-lg flex items-center justify-center" style={{
            background: AXIOM.iconBoxes.purple,
          }}>
            <Shield className="size-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold">Backup & Restore Policies</h3>
            <p className="text-xs text-slate-400 font-mono">System-wide backup frequency and restore controls</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-mono">Full Backup Frequency</label>
            <select
              value={settings.backup.fullBackupFrequency}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  backup: {
                    ...s.backup,
                    fullBackupFrequency: e.target.value as PlatformSettings['backup']['fullBackupFrequency'],
                  },
                }))
              }
              className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm"
              style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
            >
              {FULL_BACKUP_OPTIONS.map((opt) => <option key={opt}>{opt}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-mono">Incremental Backup Frequency</label>
            <select
              value={settings.backup.incrementalBackupFrequency}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  backup: {
                    ...s.backup,
                    incrementalBackupFrequency: e.target.value as PlatformSettings['backup']['incrementalBackupFrequency'],
                  },
                }))
              }
              className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm"
              style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
            >
              {INCREMENTAL_BACKUP_OPTIONS.map((opt) => <option key={opt}>{opt}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-mono">Backup Retention (days)</label>
            <input
              type="number"
              value={settings.backup.backupRetentionDays}
              onChange={(e) => {
                const value = Number(e.target.value);
                setSettings((s) => ({
                  ...s,
                  backup: { ...s.backup, backupRetentionDays: Number.isNaN(value) ? 0 : value },
                }));
              }}
              className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm"
              style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-mono">Backup Storage Location</label>
            <input
              type="text"
              defaultValue="AWS S3 - us-east-1"
              disabled
              className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm opacity-60"
              style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleTriggerBackup}
            disabled={backingUp}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-mono disabled:opacity-60 disabled:cursor-not-allowed"
            style={AXIOM.buttons.info}
          >
            {backingUp ? 'Backing up…' : 'Trigger Manual Backup'}
          </button>
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-mono"
            style={AXIOM.buttons.outline}
          >
            View Backup History
          </button>
        </div>
      </motion.div>

      {/* Global Feature Flags */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl p-6"
        style={{ ...AXIOM.containers.chartAmber, borderRadius: '1rem' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-lg flex items-center justify-center" style={{
            background: AXIOM.iconBoxes.amber,
          }}>
            <Bell className="size-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold">Global Feature Flags</h3>
            <p className="text-xs text-slate-400 font-mono">Enable or disable features system-wide</p>
          </div>
        </div>

        <div className="space-y-3">
          {FEATURE_FLAG_NAMES.map((name, idx) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + idx * 0.03 }}
              className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors"
              style={AXIOM.containers.item}
            >
              <p className="text-sm text-white font-medium">{name}</p>
              <ToggleSwitch
                checked={!!settings.featureFlags[name]}
                onChange={(checked) =>
                  setSettings((s) => ({
                    ...s,
                    featureFlags: { ...s.featureFlags, [name]: checked },
                  }))
                }
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-end"
      >
        <button
          onClick={handleSaveAll}
          disabled={savingSettings}
          className="px-8 py-3 rounded-xl text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          style={AXIOM.buttons.action}
        >
          {savingSettings ? 'Saving…' : 'Save All Changes'}
        </button>
      </motion.div>

      {/* Add Currency Dialog */}
      <Dialog open={addCurrencyOpen} onOpenChange={setAddCurrencyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Currency</DialogTitle>
            <DialogDescription>
              Pick a currency to enable system-wide. It's added to the list above (enabled by
              default) — remember to hit "Save All Changes" to persist it.
            </DialogDescription>
          </DialogHeader>
          {addableCurrencies.length === 0 ? (
            <p className="text-sm text-slate-400 font-mono py-4">
              Every supported currency is already listed above.
            </p>
          ) : (
            <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
              {addableCurrencies.map((c) => (
                <button
                  key={c.code}
                  onClick={() => handleAddCurrency(c.code)}
                  className="w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors hover:brightness-110"
                  style={AXIOM.containers.item}
                >
                  <span className="text-white font-mono font-medium">
                    {c.code} <span className="text-slate-400 font-normal">— {c.name}</span>
                  </span>
                  <span className="text-slate-400 font-mono">{c.symbol}</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Backup History Dialog */}
      <Dialog
        open={historyOpen}
        onOpenChange={(open) => {
          setHistoryOpen(open);
          if (open) refetchHistory();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Backup History</DialogTitle>
            <DialogDescription>Manual backups triggered from this page, this session.</DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <p className="text-sm text-slate-400 font-mono py-4">Loading…</p>
          ) : backupHistoryEntries.length === 0 ? (
            <p className="text-sm text-slate-400 font-mono py-4">No backups triggered yet.</p>
          ) : (
            <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
              {backupHistoryEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={AXIOM.containers.item}
                >
                  <span className="text-sm text-white font-mono">
                    {new Date(entry.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{formatBackupSize(entry.sizeBytes)}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
