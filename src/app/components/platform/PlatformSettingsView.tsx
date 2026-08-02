import { motion } from 'motion/react';
import { AXIOM } from '../../../styles/axiom-tokens';
import { Globe, Shield, Database, Bell, Settings, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState } from 'react';

interface ToggleSwitchProps {
  defaultChecked?: boolean;
}

function ToggleSwitch({ defaultChecked = false }: ToggleSwitchProps) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      onClick={() => setChecked(!checked)}
      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${checked ? '' : ''}`}
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
          {['PKR', 'USD', 'EUR', 'GBP', 'AED', 'CAD', 'AUD', 'SGD'].map((currency) => (
            <div
              key={currency}
              className="flex items-center justify-between p-4 rounded-lg"
              style={AXIOM.containers.item}
            >
              <span className="text-white font-mono font-medium">{currency}</span>
              <ToggleSwitch defaultChecked />
            </div>
          ))}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono" style={AXIOM.buttons.outline}>
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
          {[
            { label: 'Transaction Data Retention (days)', value: '730' },
            { label: 'Audit Log Retention (days)', value: '365' },
            { label: 'Statement Files Retention (days)', value: '365' },
            { label: 'Deleted Org Data Retention (days)', value: '90' },
          ].map((field) => (
            <div key={field.label} className="space-y-2">
              <label className="text-xs text-slate-400 font-mono">{field.label}</label>
              <input
                type="number"
                defaultValue={field.value}
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
          <ToggleSwitch defaultChecked />
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
          {[
            { label: 'Full Backup Frequency', type: 'select', options: ['Daily', 'Weekly', 'Monthly'] },
            { label: 'Incremental Backup Frequency', type: 'select', options: ['Hourly', 'Every 6 hours', 'Every 12 hours'] },
            { label: 'Backup Retention (days)', type: 'number', value: '30' },
            { label: 'Backup Storage Location', type: 'text', value: 'AWS S3 - us-east-1', disabled: true },
          ].map((field) => (
            <div key={field.label} className="space-y-2">
              <label className="text-xs text-slate-400 font-mono">{field.label}</label>
              {field.type === 'select' ? (
                <select className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm" style={{
                  background: AXIOM.inputs.background,
                  border: AXIOM.inputs.border,
                }}>
                  {field.options?.map(opt => <option key={opt}>{opt}</option>)}
                </select>
              ) : (
                <input
                  type={field.type}
                  defaultValue={field.value}
                  disabled={field.disabled}
                  className={`w-full px-4 py-3 rounded-lg text-white font-mono text-sm ${field.disabled ? 'opacity-60' : ''}`}
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-mono" style={AXIOM.buttons.info}>
            Trigger Manual Backup
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-mono" style={AXIOM.buttons.outline}>
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
          {[
            { name: 'AI-Powered Category Suggestions', enabled: true },
            { name: 'Advanced What-If Simulations', enabled: true },
            { name: 'API Access (Beta)', enabled: false },
            { name: 'White Label Mode', enabled: false },
            { name: 'Multi-Currency Auto-Convert', enabled: true },
            { name: 'Export to QuickBooks', enabled: false },
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + idx * 0.03 }}
              className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors"
              style={AXIOM.containers.item}
            >
              <p className="text-sm text-white font-medium">{feature.name}</p>
              <ToggleSwitch defaultChecked={feature.enabled} />
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
        <button className="px-8 py-3 rounded-xl text-white font-medium" style={AXIOM.buttons.action}>
          Save All Changes
        </button>
      </motion.div>
    </div>
  );
}