import { useState } from 'react';
import { motion } from 'motion/react';
import { AXIOM } from '../../../styles/axiom-tokens';
// ── Phase 8: Wired to platformService for org metadata ──────────────────────
import { platformService } from '@/services/platformService';
import type { PlatformOrgMeta } from '@/services/platformService';
import { organizationService } from '@/services/organizationService';
import { useService } from '@/hooks/useService';
import type { Organization } from '@/services/types';
import { Search, Plus, Building2, Users, FileText, Settings, Eye, ChevronRight, Globe, Loader2 } from 'lucide-react';

type EnrichedOrg = Organization & PlatformOrgMeta;

export function OrganizationsView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch all orgs from the service layer (platform admin sees all)
  const { data: orgResult, loading: orgsLoading } = useService(
    () => organizationService.getAll({ page: 1, pageSize: 100 }),
    []
  );

  // Fetch platform-level metadata overlay from platformService
  const { data: orgMetaMap, loading: metaLoading } = useService(
    () => platformService.getAllOrgMeta(),
    []
  );

  const loading = orgsLoading || metaLoading;
  const defaultMeta = platformService.getDefaultOrgMeta();

  const allOrgs: EnrichedOrg[] = (orgResult?.items ?? []).map(org => ({
    ...org,
    ...((orgMetaMap && orgMetaMap[org.id]) || defaultMeta),
  }));

  const filteredOrgs = allOrgs.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusConfig: Record<string, { color: string; bg: string; border: string }> = {
    active: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' },
    trial: { color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' },
    suspended: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' },
    churn_risk: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' },
  };

  return (
    <div className="p-8 space-y-8" style={{ background: AXIOM.backgrounds.main, minHeight: '100%' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={AXIOM.text.titleStyle as any}>Organizations</h1>
          <p className="text-slate-400 font-mono">Manage all client organizations across the platform</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium"
          style={AXIOM.buttons.action}
        >
          <Plus className="size-5" />
          Create Organization
        </button>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active', count: filteredOrgs.filter(o => o.status === 'active').length, color: 'green', icon: Building2 },
          { label: 'Trial', count: filteredOrgs.filter(o => o.status === 'trial').length, color: 'blue', icon: Globe },
          { label: 'Suspended', count: filteredOrgs.filter(o => o.status === 'suspended').length, color: 'red', icon: Settings },
          { label: 'Churn Risk', count: filteredOrgs.filter(o => o.status === 'churn_risk').length, color: 'amber', icon: Users },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="rounded-xl p-5"
            style={{
              background: AXIOM.backgrounds.chartContainer,
              border: AXIOM.borders[item.color as keyof typeof AXIOM.borders],
              boxShadow: AXIOM.shadows[item.color as keyof typeof AXIOM.shadows],
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-mono mb-1">{item.label.toUpperCase()}</p>
                <p className="text-2xl font-bold text-white">{item.count}</p>
              </div>
              <div className="size-10 rounded-lg flex items-center justify-center" style={{
                background: AXIOM.iconBoxes[item.color as keyof typeof AXIOM.iconBoxes],
              }}>
                <item.icon className="size-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-2xl p-6"
          style={{
            background: AXIOM.backgrounds.chartContainer,
            border: '1px solid rgba(168, 85, 247, 0.3)',
            boxShadow: '0 20px 60px -20px rgba(168, 85, 247, 0.3)',
          }}
        >
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Plus className="size-5 text-purple-400" />
            New Organization
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Organization Name', 'Admin Email', 'Plan'].map((label) => (
              <div key={label} className="space-y-1">
                <label className="text-xs text-slate-400 font-mono">{label}</label>
                {label === 'Plan' ? (
                  <select className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm" style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                  }}>
                    <option>Basic (Trial)</option>
                    <option>Professional</option>
                    <option>Enterprise</option>
                  </select>
                ) : (
                  <input
                    type={label.includes('Email') ? 'email' : 'text'}
                    placeholder={label === 'Admin Email' ? 'admin@acme.com' : 'Acme Corporation'}
                    className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm"
                    style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button className="flex items-center gap-2 px-6 py-2 rounded-lg text-white text-sm font-medium" style={AXIOM.buttons.success}>
              Create & Send Invite
            </button>
            <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 rounded-lg text-slate-400 text-sm" style={AXIOM.buttons.outline}>
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg text-white font-mono text-sm"
            style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
          />
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 text-blue-400 animate-spin" />
          <span className="ml-3 text-slate-400 font-mono">Loading organizations...</span>
        </div>
      )}

      {/* Organizations Grid */}
      {!loading && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOrgs.map((org, i) => {
          const sc = statusConfig[org.status] || statusConfig.active;
          return (
            <motion.div
              key={org.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              className="rounded-2xl p-6 hover:bg-white/5 transition-colors cursor-pointer group"
              style={{
                background: AXIOM.backgrounds.chartContainer,
                border: `1px solid ${sc.border}`,
                boxShadow: `0 20px 60px -20px ${sc.color}30`,
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-xl flex items-center justify-center" style={{
                    background: AXIOM.iconBoxes.purple,
                    boxShadow: AXIOM.shadows.iconPurple,
                  }}>
                    <Building2 className="size-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold group-hover:text-purple-400 transition-colors">{org.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Created {new Date(org.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-1 rounded capitalize" style={{
                  background: sc.bg,
                  border: `1px solid ${sc.border}`,
                  color: sc.color,
                }}>
                  {org.status.replace('_', ' ')}
                </span>
              </div>

              {/* Plan & Billing */}
              <div className="flex items-center justify-between p-3 rounded-lg mb-4" style={{
                ...AXIOM.containers.item,
              }}>
                <div>
                  <p className="text-xs text-slate-400 font-mono">Plan</p>
                  <p className="text-sm text-white font-medium">{org.plan}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-mono">Next Invoice</p>
                  <p className="text-sm text-white font-medium font-mono">Rs {org.billing.amount.toLocaleString()}</p>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Users', value: `${org.limits.usersUsed}/${org.limits.users}`, icon: Users, color: 'blue' },
                  { label: 'Statements', value: `${org.limits.statementsUsed}/${org.limits.statements}`, icon: FileText, color: 'cyan' },
                  { label: 'Currencies', value: `${org.limits.currenciesUsed}/${org.limits.currencies}`, icon: Globe, color: 'purple' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-3 rounded-lg" style={AXIOM.containers.item}>
                    <stat.icon className="size-4 mx-auto mb-1" style={{ color: AXIOM.charts.colors[stat.color as keyof typeof AXIOM.charts.colors] }} />
                    <p className="text-[10px] text-slate-400 font-mono">{stat.label}</p>
                    <p className="text-sm text-white font-mono">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono transition-all" style={AXIOM.buttons.info}>
                  <Eye className="size-4" /> View Details
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono transition-all" style={AXIOM.buttons.outline}>
                  <Settings className="size-4" /> Manage
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
      )}
    </div>
  );
}