import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Plus, Trash2, Wallet, FileText, X } from 'lucide-react';
import { AXIOM } from '../../../styles/axiom-tokens';
import { employeeService } from '@/services/employeeService';
import { organizationService } from '@/services/organizationService';
import { accountService } from '@/services/accountService';
import { useServiceArray, useMutation } from '@/hooks/useService';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import type { EmployeePayslip } from '@/services/types';

interface PayrollViewProps {
  /** Defaults to the signed-in admin's own org. Platform Console passes another org's id explicitly. */
  orgId?: string;
}

interface DeductionRow {
  name: string;
  amount: string;
}

export function PayrollView({ orgId: orgIdProp }: PayrollViewProps) {
  const { userRole, currentOrganization } = useAuth();
  const orgId = orgIdProp ?? currentOrganization?.id ?? '';
  const canManagePayroll = userRole === 'owner' || userRole === 'admin';

  // The "team directory" collection (`getTeamDirectory`) is a decorative, seed-only list that's
  // never populated when a real employee is invited — it left every real org's payslip dropdown
  // empty. Org membership (`getMembers`) is the real, always-populated source of who's in the org.
  const { data: orgMembers, loading: membersLoading } = useServiceArray(
    () => organizationService.getMembers(orgId),
    [orgId],
    ['organizationMembers'],
  );
  const members = useMemo(
    () => orgMembers.filter(m => m.status !== 'pending').map(m => ({ id: m.userId, name: m.user.name })),
    [orgMembers],
  );
  const { data: accounts } = useServiceArray(
    () => accountService.getBankAccounts(orgId),
    [orgId],
    ['bankAccounts'],
  );
  const { data: payslips, loading, error, refetch } = useServiceArray(
    () => employeeService.listOrgPayslips(orgId, userRole),
    [orgId, userRole],
    ['payslips'],
  );

  const issueMutation = useMutation(
    (data: Parameters<typeof employeeService.issuePayslip>[1]) =>
      employeeService.issuePayslip(orgId, data, userRole),
  );
  const voidMutation = useMutation((id: string) => employeeService.voidPayslip(orgId, id, userRole));

  const [showForm, setShowForm] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [period, setPeriod] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [gross, setGross] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [deductions, setDeductions] = useState<DeductionRow[]>([]);

  const netPreview = useMemo(() => {
    const g = parseFloat(gross) || 0;
    const d = deductions.reduce((s, row) => s + (parseFloat(row.amount) || 0), 0);
    return g - d;
  }, [gross, deductions]);

  // Net pay is always paid out of the selected account, so its currency — not the viewing
  // admin's own org currency — is authoritative (matters when Platform Console opens this for
  // a different org than the admin's own).
  const previewCurrency = accounts.find(a => a.id === bankAccountId)?.currency;

  const resetForm = () => {
    setEmployeeId('');
    setPeriod('');
    setIssueDate(new Date().toISOString().slice(0, 10));
    setGross('');
    setBankAccountId('');
    setDeductions([]);
  };

  const handleIssue = async () => {
    const result = await issueMutation.execute({
      userId: employeeId,
      period,
      issueDate,
      gross: parseFloat(gross) || 0,
      deductions: deductions
        .filter(d => d.name.trim())
        .map(d => ({ name: d.name.trim(), amount: parseFloat(d.amount) || 0 })),
      bankAccountId,
    });
    if (result.success) {
      toast.success('Payslip issued');
      resetForm();
      setShowForm(false);
      refetch();
    } else {
      toast.error(result.error || 'Could not issue payslip');
    }
  };

  const handleVoid = async (payslip: EmployeePayslip) => {
    if (!window.confirm('Void this payslip? This will restore the account balance and cannot be undone.')) {
      return;
    }
    const result = await voidMutation.execute(payslip.id);
    if (result.success) {
      toast.success('Payslip voided');
      refetch();
    } else {
      toast.error(result.error || 'Could not void payslip');
    }
  };

  const nameFor = (userId: string) => members.find(m => m.id === userId)?.name ?? userId;

  if (!canManagePayroll) {
    return (
      <div className="p-8" style={{ background: AXIOM.backgrounds.main, minHeight: '100%' }}>
        <div className="rounded-2xl p-8 text-center" style={{ ...AXIOM.containers.list, borderRadius: '1rem' }}>
          <h1 className="text-2xl font-bold text-white mb-2">Access denied</h1>
          <p className="text-slate-400 font-mono text-sm">
            Payroll is only available to organization owners and admins.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8" style={{ background: AXIOM.backgrounds.main, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={AXIOM.text.titleStyle as any}>Payroll</h1>
          <p className="text-slate-400 font-mono">Issue and manage employee payslips</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium"
          style={{ background: AXIOM.iconBoxes.blue }}
        >
          <Plus className="size-4" /> Issue Payslip
        </button>
      </motion.div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-2xl p-6 space-y-4"
          style={{ ...AXIOM.containers.list, borderRadius: '1rem' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold">New Payslip</h3>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-white/10">
              <X className="size-4 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-mono text-slate-300 space-y-1 block">
              Employee
              <select
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10"
              >
                <option value="">Select employee…</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {!membersLoading && !members.length && (
                <p className="mt-1.5 text-xs text-amber-200/90">No employees found for this organization.</p>
              )}
            </label>

            <label className="text-sm font-mono text-slate-300 space-y-1 block">
              Pay period
              <input
                type="text"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                placeholder="e.g. August 2026"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10"
              />
            </label>

            <label className="text-sm font-mono text-slate-300 space-y-1 block">
              Issue date
              <input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10"
              />
            </label>

            <label className="text-sm font-mono text-slate-300 space-y-1 block">
              Gross pay
              <input
                type="number"
                min="0"
                step="0.01"
                value={gross}
                onChange={e => setGross(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10"
              />
            </label>

            <label className="text-sm font-mono text-slate-300 space-y-1 block md:col-span-2">
              Paying account
              <select
                value={bankAccountId}
                onChange={e => setBankAccountId(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10"
              >
                <option value="">Select account…</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.bankName} — {formatCurrency(a.balance, a.currency, { compact: true })}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-mono text-slate-300">Deductions</p>
              <button
                type="button"
                onClick={() => setDeductions(rows => [...rows, { name: '', amount: '' }])}
                className="text-xs text-blue-400 font-mono hover:underline"
              >
                + Add deduction
              </button>
            </div>
            {deductions.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Name (e.g. Tax)"
                  value={row.name}
                  onChange={e => setDeductions(rows => rows.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)))}
                  className="flex-1 px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={row.amount}
                  onChange={e => setDeductions(rows => rows.map((r, idx) => (idx === i ? { ...r, amount: e.target.value } : r)))}
                  className="w-32 px-3 py-2 rounded-lg bg-black/30 text-white border border-white/10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setDeductions(rows => rows.filter((_, idx) => idx !== i))}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <Trash2 className="size-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <p className="text-sm font-mono text-slate-300">
              Net pay:{' '}
              <span className="text-green-400 font-bold">
                {previewCurrency ? formatCurrency(netPreview, previewCurrency) : netPreview.toLocaleString()}
              </span>
              {!previewCurrency && <span className="text-xs text-slate-500"> (pick a paying account for currency)</span>}
            </p>
            <button
              type="button"
              disabled={issueMutation.loading || !employeeId || !period || !gross || !bankAccountId}
              onClick={() => void handleIssue()}
              className="px-4 py-2 rounded-xl text-white font-medium disabled:opacity-50"
              style={{ background: AXIOM.iconBoxes.green }}
            >
              {issueMutation.loading ? 'Issuing…' : 'Issue Payslip'}
            </button>
          </div>
        </motion.div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ ...AXIOM.containers.list, borderRadius: '1rem' }}>
        <div className="p-6 pb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <FileText className="size-5 text-blue-400" /> Issued Payslips
          </h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(148, 163, 184, 0.1)' }}>
          {loading && <div className="p-12 text-center text-slate-400 font-mono text-sm">Loading…</div>}
          {error && <div className="p-12 text-center text-slate-400 font-mono text-sm">Could not load payslips.</div>}
          {!loading && !error && payslips.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-mono text-sm">No payslips issued yet.</div>
          )}
          {payslips.map(p => (
            <div key={p.id} className="flex items-center gap-6 px-6 py-4">
              <Wallet className="size-5 text-blue-400 shrink-0" />
              <div className="flex-1">
                <p className="text-white font-medium">{nameFor(p.userId)} — {p.period}</p>
                <p className="text-xs text-slate-400 font-mono">{p.issueDate} · {p.status}</p>
              </div>
              <p className="text-sm font-mono text-green-400 font-bold">
                {formatCurrency(p.net, p.currency, { compact: false })}
              </p>
              {p.transactionId && (
                <button
                  type="button"
                  disabled={voidMutation.loading}
                  onClick={() => void handleVoid(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono text-red-400 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50"
                >
                  Void
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
