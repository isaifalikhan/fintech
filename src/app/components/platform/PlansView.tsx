import { useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { AXIOM } from '../../../styles/axiom-tokens';
// ── Phase 8: Wired to platformService ───────────────────────────────────────
import { platformService } from '@/services/platformService';
import type { PlatformPlan, BillingStats } from '@/services/platformService';
import { useService, useMutation } from '@/hooks/useService';
import { Check, Plus, Edit, Star, DollarSign, CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface PlanFormState {
  name: string;
  price: string;
  currency: string;
  features: string;
  users: string;
  statements: string;
  currencies: string;
  storage: string;
  active: boolean;
}

const EMPTY_PLAN_FORM: PlanFormState = {
  name: '',
  price: '',
  currency: 'PKR',
  features: '',
  users: '',
  statements: '',
  currencies: '',
  storage: '',
  active: true,
};

export function PlansView() {
  const planColors = ['cyan', 'blue', 'purple'];

  // Fetch plans and billing stats from platformService
  const { data: plans, loading: plansLoading, refetch: refetchPlans } = useService(
    () => platformService.getPlans(),
    [],
    ['platformPlans'], // auto-refresh when dataStore.notify('platformPlans') fires (mock/dataStore branch)
  );
  const { data: billingStats, loading: billingLoading } = useService(
    () => platformService.getBillingStats(),
    []
  );

  const loading = plansLoading || billingLoading;

  // ── Create / Edit Plan dialog ──────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null); // null while creating
  const [form, setForm] = useState<PlanFormState>(EMPTY_PLAN_FORM);

  const { execute: executeCreatePlan, loading: creatingPlan } = useMutation(
    (data: Omit<PlatformPlan, 'id'>) => platformService.createPlan(data),
  );
  const { execute: executeUpdatePlan, loading: updatingPlan } = useMutation(
    ({ id, updates }: { id: string; updates: Partial<PlatformPlan> }) => platformService.updatePlan(id, updates),
  );
  const savingPlan = creatingPlan || updatingPlan;

  const openCreatePlan = () => {
    setEditingPlanId(null);
    setForm(EMPTY_PLAN_FORM);
    setFormOpen(true);
  };

  const openEditPlan = (plan: PlatformPlan) => {
    setEditingPlanId(plan.id);
    setForm({
      name: plan.name,
      price: String(plan.price),
      currency: plan.currency,
      features: plan.features.map(f => f.replace(/_/g, ' ')).join(', '),
      users: String(plan.limits.users),
      statements: String(plan.limits.statements),
      currencies: String(plan.limits.currencies),
      storage: String(plan.limits.storage),
      active: plan.active,
    });
    setFormOpen(true);
  };

  const handleSavePlan = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('Enter a plan name.');
      return;
    }
    const price = Number(form.price);
    if (Number.isNaN(price) || price < 0) {
      toast.error('Enter a valid, non-negative price.');
      return;
    }
    const limits = {
      users: Math.max(0, Number(form.users) || 0),
      statements: Math.max(0, Number(form.statements) || 0),
      currencies: Math.max(0, Number(form.currencies) || 0),
      storage: Math.max(0, Number(form.storage) || 0),
    };
    const features = form.features
      .split(',')
      .map(f => f.trim().toLowerCase().replace(/\s+/g, '_'))
      .filter(Boolean);
    const currency = form.currency.trim().toUpperCase() || 'PKR';
    const payload = { name, price, currency, features, limits, active: form.active };

    const res = editingPlanId
      ? await executeUpdatePlan({ id: editingPlanId, updates: payload })
      : await executeCreatePlan(payload);

    if (!res.success) {
      toast.error(res.error || (editingPlanId ? 'Could not update plan.' : 'Could not create plan.'));
      return;
    }
    toast.success(res.message || (editingPlanId ? 'Plan updated.' : 'Plan created.'));
    setFormOpen(false);
    await refetchPlans();
  };

  if (loading || !plans || !billingStats) {
    return (
      <div className="flex items-center justify-center p-20" style={{ background: AXIOM.backgrounds.main, minHeight: '100%' }}>
        <Loader2 className="size-8 text-blue-400 animate-spin" />
        <span className="ml-3 text-slate-400 font-mono">Loading plans...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8" style={{ background: AXIOM.backgrounds.main, minHeight: '100%' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={AXIOM.text.titleStyle as any}>Plans & Billing</h1>
          <p className="text-slate-400 font-mono">Manage subscription plans and pricing tiers</p>
        </div>
        <button
          onClick={openCreatePlan}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium"
          style={AXIOM.buttons.action}
        >
          <Plus className="size-5" />
          Create Plan
        </button>
      </motion.div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, i) => {
          const color = planColors[i % planColors.length];
          const isPopular = plan.name === 'Professional';
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="rounded-2xl p-6 relative overflow-hidden"
              style={{
                background: AXIOM.backgrounds.chartContainer,
                border: isPopular
                  ? `2px solid ${AXIOM.charts.colors[color as keyof typeof AXIOM.charts.colors]}`
                  : AXIOM.borders[color as keyof typeof AXIOM.borders],
                boxShadow: AXIOM.shadows[color as keyof typeof AXIOM.shadows],
              }}
            >
              {/* Popular badge */}
              {isPopular && (
                <div className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono" style={AXIOM.badges.info}>
                  <Star className="size-3" />
                  Popular
                </div>
              )}

              {/* Corner glow */}
              <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{
                background: `radial-gradient(circle at 100% 0%, ${AXIOM.charts.colors[color as keyof typeof AXIOM.charts.colors]}20, transparent 70%)`,
              }} />

              <div className="relative z-10">
                <h3 className="text-xl text-white font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">
                    {plan.price === 0 ? 'Free' : `Rs ${plan.price.toLocaleString()}`}
                  </span>
                  {plan.price > 0 && <span className="text-sm text-slate-400 font-mono">/month</span>}
                </div>

                {/* Limits */}
                <div className="p-4 rounded-lg mb-6" style={AXIOM.containers.item}>
                  {[
                    { label: 'Users', value: plan.limits.users },
                    { label: 'Statements/month', value: plan.limits.statements },
                    { label: 'Currencies', value: plan.limits.currencies },
                    { label: 'Storage', value: `${plan.limits.storage} MB` },
                  ].map((limit) => (
                    <div key={limit.label} className="flex justify-between py-2" style={{ borderBottom: AXIOM.borders.default }}>
                      <span className="text-sm text-slate-400 font-mono">{limit.label}</span>
                      <span className="text-sm text-white font-mono font-medium">{limit.value}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <div className="mb-6">
                  <p className="text-xs text-slate-400 font-mono mb-3">FEATURES INCLUDED</p>
                  <div className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="size-5 rounded flex items-center justify-center" style={{
                          background: `${AXIOM.charts.colors[color as keyof typeof AXIOM.charts.colors]}20`,
                        }}>
                          <Check className="size-3" style={{ color: AXIOM.charts.colors[color as keyof typeof AXIOM.charts.colors] }} />
                        </div>
                        <span className="text-sm text-slate-300 capitalize font-mono">
                          {feature.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => openEditPlan(plan)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-mono"
                    style={AXIOM.buttons.outline}
                  >
                    <Edit className="size-4" />
                    Edit Plan
                  </button>
                  <div className="text-center">
                    <span className="text-xs font-mono px-3 py-1 rounded" style={
                      plan.active ? AXIOM.badges.success : AXIOM.badges.warning
                    }>
                      {plan.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Billing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'TOTAL MONTHLY REVENUE', value: `Rs ${billingStats.totalMonthlyRevenue.toLocaleString()}`, sub: `+${billingStats.revenueGrowthPct}% from last month`, icon: DollarSign, color: 'green' },
          { label: 'ACTIVE SUBSCRIPTIONS', value: `${billingStats.activeSubscriptions}`, sub: 'Across all plans', icon: CreditCard, color: 'blue' },
          { label: 'OVERDUE INVOICES', value: `${billingStats.overdueInvoices}`, sub: 'Requires attention', icon: AlertCircle, color: 'red' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            className="rounded-xl p-5"
            style={{
              background: AXIOM.backgrounds.chartContainer,
              border: AXIOM.borders[item.color as keyof typeof AXIOM.borders],
              boxShadow: AXIOM.shadows[item.color as keyof typeof AXIOM.shadows],
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-mono mb-1">{item.label}</p>
                <p className="text-2xl font-bold text-white">{item.value}</p>
                <p className="text-xs font-mono mt-1" style={{ color: AXIOM.charts.colors[item.color as keyof typeof AXIOM.charts.colors] || '#94a3b8' }}>
                  {item.sub}
                </p>
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

      {/* Create / Edit Plan Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) setFormOpen(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlanId ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlanId
                ? 'Changes save to this plan\'s real record and appear immediately in the grid above.'
                : 'New plans are added to the live plan list, same as Basic/Professional/Enterprise.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-mono">Plan name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Growth"
                  className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-mono">Currency</label>
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  maxLength={3}
                  className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm uppercase"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono">Price / month (0 for Free)</label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono">Features (comma-separated)</label>
              <input
                type="text"
                value={form.features}
                onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
                placeholder="statement import, team management, api access"
                className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-mono">Users</label>
                <input
                  type="number"
                  min={0}
                  value={form.users}
                  onChange={(e) => setForm((f) => ({ ...f, users: e.target.value }))}
                  className="w-full px-3 py-3 rounded-lg text-white font-mono text-sm"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-mono">Statements/mo</label>
                <input
                  type="number"
                  min={0}
                  value={form.statements}
                  onChange={(e) => setForm((f) => ({ ...f, statements: e.target.value }))}
                  className="w-full px-3 py-3 rounded-lg text-white font-mono text-sm"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-mono">Currencies</label>
                <input
                  type="number"
                  min={0}
                  value={form.currencies}
                  onChange={(e) => setForm((f) => ({ ...f, currencies: e.target.value }))}
                  className="w-full px-3 py-3 rounded-lg text-white font-mono text-sm"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-mono">Storage (MB)</label>
                <input
                  type="number"
                  min={0}
                  value={form.storage}
                  onChange={(e) => setForm((f) => ({ ...f, storage: e.target.value }))}
                  className="w-full px-3 py-3 rounded-lg text-white font-mono text-sm"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg" style={AXIOM.containers.item}>
              <div>
                <p className="text-sm text-white font-medium">Active</p>
                <p className="text-xs text-slate-400 font-mono">Inactive plans stay saved but show as "Inactive" on the card</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                className="w-12 h-6 rounded-full relative cursor-pointer transition-colors"
                style={{
                  background: form.active ? 'rgba(34, 197, 94, 0.5)' : 'rgba(100, 116, 139, 0.3)',
                  border: form.active ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(100, 116, 139, 0.3)',
                }}
              >
                <div
                  className="absolute top-0.5 size-5 rounded-full transition-all"
                  style={{
                    left: form.active ? '24px' : '2px',
                    background: form.active ? '#22c55e' : '#64748b',
                  }}
                />
              </button>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 text-sm"
              style={AXIOM.buttons.outline}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSavePlan()}
              disabled={savingPlan}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={AXIOM.buttons.success}
            >
              {savingPlan ? <Loader2 className="size-4 animate-spin" /> : null}
              {editingPlanId ? 'Save Changes' : 'Create Plan'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}