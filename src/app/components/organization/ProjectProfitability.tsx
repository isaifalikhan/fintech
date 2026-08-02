import { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Briefcase, Plus, Target, TrendingUp, TrendingDown, DollarSign, AlertTriangle, Loader2, FolderOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { AXIOM } from '../../../styles/axiom-tokens';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useServiceArray } from '@/hooks/useService';
import { useAuth } from '@/contexts/AuthContext';
import type { Project as ServiceProject } from '@/services/types';

function profitFor(p: ServiceProject) {
  return p.quotedAmount - p.actualCost;
}

function marginPct(p: ServiceProject) {
  if (p.quotedAmount <= 0) return 0;
  return (profitFor(p) / p.quotedAmount) * 100;
}

function budgetVariancePct(p: ServiceProject) {
  if (p.quotedAmount <= 0) return 0;
  return ((p.actualCost - p.quotedAmount) / p.quotedAmount) * 100;
}

function statusBadgeStyle(status: ServiceProject['status']) {
  switch (status) {
    case 'active':
      return AXIOM.badges.info;
    case 'completed':
      return AXIOM.badges.success;
    case 'quoted':
      return AXIOM.badges.warning;
    case 'on_hold':
      return AXIOM.badges.purple;
    case 'cancelled':
      return AXIOM.badges.danger;
    default:
      return AXIOM.badges.info;
  }
}

function statusLabel(status: ServiceProject['status']) {
  switch (status) {
    case 'on_hold':
      return 'On hold';
    case 'quoted':
      return 'Quoted';
    default:
      return status;
  }
}

export function ProjectProfitability() {
  const svc = useOrgServices();
  const { currentOrganization } = useAuth();
  const displayCurrency = currentOrganization?.currency ?? 'PKR';

  const { data: projects, loading, error } = useServiceArray(
    () => svc.projects.getAll(),
    [svc.orgId],
    ['projects'],
  );

  const { data: departments } = useServiceArray(
    () => svc.departments.getAll(),
    [svc.orgId],
    ['departments'],
  );

  const deptNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of departments) {
      m.set(d.id, d.name);
    }
    return m;
  }, [departments]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ServiceProject | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | ServiceProject['status']>('all');
  const [filterDepartmentId, setFilterDepartmentId] = useState('all');

  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    clientName: '',
    departmentId: '',
    status: 'quoted' as ServiceProject['status'],
    startDate: '',
    endDate: '',
    quotedAmount: '',
    actualCost: '0',
  });

  useEffect(() => {
    if (!createDialogOpen || departments.length === 0) return;
    setCreateForm(prev => {
      if (prev.departmentId) return prev;
      return { ...prev, departmentId: departments[0].id };
    });
  }, [createDialogOpen, departments]);

  const filteredProjects = projects.filter(project => {
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    const matchesDept = filterDepartmentId === 'all' || project.departmentId === filterDepartmentId;
    return matchesStatus && matchesDept;
  });

  const totalQuoted = filteredProjects.reduce((sum, p) => sum + p.quotedAmount, 0);
  const totalCost = filteredProjects.reduce((sum, p) => sum + p.actualCost, 0);
  const totalProfit = totalQuoted - totalCost;
  const avgMargin = totalQuoted > 0 ? (totalProfit / totalQuoted) * 100 : 0;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;

  const deptPerformance = useMemo(() => {
    const keys = [...new Set(projects.map(p => p.departmentId))];
    return keys.map(deptId => {
      const deptProjects = filteredProjects.filter(p => p.departmentId === deptId);
      const revenue = deptProjects.reduce((sum, p) => sum + p.quotedAmount, 0);
      const cost = deptProjects.reduce((sum, p) => sum + p.actualCost, 0);
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return {
        department: deptNameById.get(deptId) ?? 'Unknown',
        revenue,
        cost,
        profit,
        margin,
        projectCount: deptProjects.length,
      };
    });
  }, [projects, filteredProjects, deptNameById]);

  const handleViewDetails = (project: ServiceProject) => {
    setSelectedProject(project);
    setDetailsDialogOpen(true);
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      code: '',
      clientName: '',
      departmentId: departments[0]?.id ?? '',
      status: 'quoted',
      startDate: '',
      endDate: '',
      quotedAmount: '',
      actualCost: '0',
    });
  };

  const handleCreateProject = async () => {
    if (!createForm.name.trim() || !createForm.clientName.trim() || !createForm.startDate || !createForm.quotedAmount) {
      toast.error('Please fill in name, client, start date, and quoted amount.');
      return;
    }
    if (!createForm.departmentId) {
      toast.error('Add a department first, or pick one from the list.');
      return;
    }
    const quoted = parseFloat(createForm.quotedAmount);
    if (Number.isNaN(quoted)) {
      toast.error('Quoted amount must be a number.');
      return;
    }
    const actual = parseFloat(createForm.actualCost);
    const code =
      createForm.code.trim() ||
      createForm.name
        .trim()
        .slice(0, 8)
        .toUpperCase()
        .replace(/\s+/g, '-');

    const res = await svc.projects.create({
      name: createForm.name.trim(),
      code,
      clientName: createForm.clientName.trim(),
      departmentId: createForm.departmentId,
      status: createForm.status,
      startDate: createForm.startDate,
      endDate: createForm.endDate.trim() || undefined,
      quotedAmount: quoted,
      actualCost: Number.isNaN(actual) ? 0 : actual,
      currency: displayCurrency,
    });

    if (!res.success) {
      toast.error(res.error || 'Could not create project');
      return;
    }
    toast.success('Project created');
    setCreateDialogOpen(false);
    resetCreateForm();
  };

  const isOverBudget = (p: ServiceProject) => p.actualCost > p.quotedAmount;

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ background: AXIOM.backgrounds.main }}>
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
              <Briefcase className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={AXIOM.text.titleStyle}>
                Project Profitability
              </h1>
              <p className="text-slate-400 text-sm">Track quoted value, costs, and margin per project</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
              border: '1px solid rgba(6, 182, 212, 0.5)',
              boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
              color: '#ffffff',
            }}
            onClick={() => {
              resetCreateForm();
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            New project
          </motion.button>
        </div>
      </motion.div>

      {error && (
        <div
          className="p-4 rounded-xl text-sm text-amber-200"
          style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)' }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading projects…
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Quoted total</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalQuoted, displayCurrency)}</p>
              <p className="text-xs text-slate-400 mt-1">{filteredProjects.length} in view</p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.green,
                boxShadow: AXIOM.shadows.iconGreen,
              }}
            >
              <DollarSign className="size-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Actual cost</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalCost, displayCurrency)}</p>
              <p className="text-xs text-slate-400 mt-1">Recorded spend</p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.red,
                boxShadow: AXIOM.shadows.iconRed,
              }}
            >
              <TrendingDown className="size-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Profit (quoted − cost)</p>
              <p className="text-2xl font-bold text-cyan-400">{formatCurrency(totalProfit, displayCurrency)}</p>
              <p className="text-xs text-cyan-400 mt-1">{avgMargin.toFixed(1)}% of quoted</p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.cyan,
                boxShadow: AXIOM.shadows.iconCyan,
              }}
            >
              <TrendingUp className="size-6 text-white" />
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Active</p>
              <p className="text-2xl font-bold text-white">{activeProjects}</p>
              <p className="text-xs text-slate-400 mt-1">{completedProjects} completed</p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.purple,
                boxShadow: AXIOM.shadows.iconPurple,
              }}
            >
              <Briefcase className="size-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {!loading && projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl text-center"
          style={AXIOM.containers.list}
        >
          <FolderOpen className="size-12 text-slate-500 mb-4" />
          <h2 className="text-lg font-semibold text-white mb-1">No projects yet</h2>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            When you add projects, they show up here with quoted amounts, costs, and margin. Your list is stored with this organization.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.35), rgba(59, 130, 246, 0.35))',
              border: '1px solid rgba(6, 182, 212, 0.45)',
              color: '#fff',
            }}
            onClick={() => {
              resetCreateForm();
              setCreateDialogOpen(true);
            }}
          >
            Add your first project
          </motion.button>
        </motion.div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-2xl"
            style={AXIOM.containers.list}
          >
            <div className="flex flex-wrap gap-3">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
                className="px-4 py-2 rounded-xl text-white text-sm"
                style={{
                  background: AXIOM.inputs.background,
                  border: AXIOM.inputs.border,
                }}
              >
                <option value="all">All statuses</option>
                <option value="quoted">Quoted</option>
                <option value="active">Active</option>
                <option value="on_hold">On hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={filterDepartmentId}
                onChange={e => setFilterDepartmentId(e.target.value)}
                className="px-4 py-2 rounded-xl text-white text-sm"
                style={{
                  background: AXIOM.inputs.background,
                  border: AXIOM.inputs.border,
                }}
              >
                <option value="all">All departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>

          <div className="space-y-3">
            {filteredProjects.map((project, idx) => {
              const profit = profitFor(project);
              const margin = marginPct(project);
              const variancePct = budgetVariancePct(project);

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + idx * 0.05 }}
                  className="p-6 rounded-2xl"
                  style={AXIOM.containers.list}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-white font-semibold">{project.name}</h3>
                        <span className="px-2 py-1 rounded-lg text-xs font-medium capitalize" style={statusBadgeStyle(project.status)}>
                          {statusLabel(project.status)}
                        </span>
                        <span className="text-xs text-slate-500">{project.code}</span>
                      </div>
                      <p className="text-sm text-slate-400">
                        {project.clientName} • {deptNameById.get(project.departmentId) ?? 'Department'}
                      </p>
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
                      style={{ background: 'rgba(148, 163, 184, 0.1)' }}
                      onClick={() => handleViewDetails(project)}
                      aria-label="View project details"
                    >
                      <Target className="size-4" />
                    </motion.button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Quoted</p>
                      <p className="text-lg font-bold text-emerald-400">{formatCurrency(project.quotedAmount, displayCurrency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Actual cost</p>
                      <p className="text-lg font-bold text-red-400">{formatCurrency(project.actualCost, displayCurrency)}</p>
                      <p className={`text-xs ${isOverBudget(project) ? 'text-red-400' : 'text-slate-400'}`}>
                        {variancePct >= 0 ? '+' : ''}
                        {variancePct.toFixed(1)}% vs quoted
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Profit</p>
                      <p className={`text-lg font-bold ${profit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                        {formatCurrency(profit, displayCurrency)}
                      </p>
                      <p className="text-xs text-slate-400">{margin.toFixed(1)}% margin</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Timeline</p>
                      <p className="text-sm text-white">{formatDate(project.startDate)}</p>
                      <p className="text-xs text-slate-400">{project.endDate ? `to ${formatDate(project.endDate)}` : 'No end date'}</p>
                    </div>
                  </div>

                  {isOverBudget(project) && project.status === 'active' && (
                    <div
                      className="mt-4 p-3 rounded-xl flex items-start gap-2"
                      style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                      }}
                    >
                      <AlertTriangle className="size-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-400">
                        Cost is above quoted amount by {formatCurrency(project.actualCost - project.quotedAmount, displayCurrency)}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {deptPerformance.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-6 rounded-2xl"
              style={AXIOM.containers.chartBlue}
            >
              <h3 className="text-xl font-bold text-white mb-4">By department</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deptPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis dataKey="department" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={value => `${value / 1000}K`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0f',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                    formatter={(value: number) => formatCurrency(value, displayCurrency)}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Quoted" />
                  <Bar dataKey="cost" fill="#ef4444" name="Cost" />
                  <Bar dataKey="profit" fill="#06b6d4" name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </>
      )}

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent
          className="max-w-3xl text-white"
          style={{
            background: AXIOM.containers.list.background,
            border: AXIOM.containers.list.border,
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white">Project details</DialogTitle>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedProject.name}</h2>
                <p className="text-slate-400">{selectedProject.clientName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Status</label>
                  <span className="inline-block px-2 py-1 rounded-lg text-xs font-medium capitalize" style={statusBadgeStyle(selectedProject.status)}>
                    {statusLabel(selectedProject.status)}
                  </span>
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Code</label>
                  <p className="text-white text-sm">{selectedProject.code}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 rounded-xl" style={AXIOM.containers.item}>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Quoted</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(selectedProject.quotedAmount, displayCurrency)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Actual cost</p>
                  <p className="text-xl font-bold text-emerald-400">{formatCurrency(selectedProject.actualCost, displayCurrency)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Profit</p>
                  <p className={`text-xl font-bold ${profitFor(selectedProject) >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                    {formatCurrency(profitFor(selectedProject), displayCurrency)}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl" style={AXIOM.containers.item}>
                <p className="text-sm text-slate-400 mb-2">Cost vs quote</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Variance</span>
                  <span className={isOverBudget(selectedProject) ? 'text-red-400' : 'text-emerald-400'}>
                    {budgetVariancePct(selectedProject) >= 0 ? '+' : ''}
                    {budgetVariancePct(selectedProject).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Department</label>
                  <p className="text-white">{deptNameById.get(selectedProject.departmentId) ?? selectedProject.departmentId}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Currency</label>
                  <p className="text-white">{selectedProject.currency}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Start</label>
                  <p className="text-white">{formatDate(selectedProject.startDate)}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">End</label>
                  <p className="text-white">{selectedProject.endDate ? formatDate(selectedProject.endDate) : '—'}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-medium"
                  style={AXIOM.buttons.secondary}
                  onClick={() => setDetailsDialogOpen(false)}
                >
                  Close
                </motion.button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={open => { setCreateDialogOpen(open); if (open) resetCreateForm(); }}>
        <DialogContent
          className="max-w-2xl text-white max-h-[90vh] overflow-y-auto"
          style={{
            background: AXIOM.containers.list.background,
            border: AXIOM.containers.list.border,
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white">New project</DialogTitle>
            <DialogDescription className="text-slate-400">
              Projects are saved for this organization and used in profitability views.
            </DialogDescription>
          </DialogHeader>

          {departments.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">
              You need at least one department before creating a project. Add departments in your organization setup, then try again.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Project name *</label>
                  <input
                    value={createForm.name}
                    onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Client website rebuild"
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Client *</label>
                  <input
                    value={createForm.clientName}
                    onChange={e => setCreateForm(f => ({ ...f, clientName: e.target.value }))}
                    placeholder="Client name"
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Code (optional)</label>
                  <input
                    value={createForm.code}
                    onChange={e => setCreateForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="Auto-filled if empty"
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Department *</label>
                  <Select value={createForm.departmentId} onValueChange={v => setCreateForm(f => ({ ...f, departmentId: v }))}>
                    <SelectTrigger
                      className="w-full text-white"
                      style={{
                        background: AXIOM.inputs.background,
                        border: AXIOM.inputs.border,
                      }}
                    >
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        background: AXIOM.containers.list.background,
                        border: AXIOM.containers.list.border,
                      }}
                    >
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-white">
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Status</label>
                  <Select value={createForm.status} onValueChange={v => setCreateForm(f => ({ ...f, status: v as ServiceProject['status'] }))}>
                    <SelectTrigger
                      className="w-full text-white"
                      style={{
                        background: AXIOM.inputs.background,
                        border: AXIOM.inputs.border,
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        background: AXIOM.containers.list.background,
                        border: AXIOM.containers.list.border,
                      }}
                    >
                      <SelectItem value="quoted" className="text-white">
                        Quoted
                      </SelectItem>
                      <SelectItem value="active" className="text-white">
                        Active
                      </SelectItem>
                      <SelectItem value="on_hold" className="text-white">
                        On hold
                      </SelectItem>
                      <SelectItem value="completed" className="text-white">
                        Completed
                      </SelectItem>
                      <SelectItem value="cancelled" className="text-white">
                        Cancelled
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Quoted amount *</label>
                  <input
                    type="number"
                    min={0}
                    value={createForm.quotedAmount}
                    onChange={e => setCreateForm(f => ({ ...f, quotedAmount: e.target.value }))}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Actual cost</label>
                  <input
                    type="number"
                    min={0}
                    value={createForm.actualCost}
                    onChange={e => setCreateForm(f => ({ ...f, actualCost: e.target.value }))}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Start date *</label>
                  <input
                    type="date"
                    value={createForm.startDate}
                    onChange={e => setCreateForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">End date</label>
                  <input
                    type="date"
                    value={createForm.endDate}
                    onChange={e => setCreateForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-medium"
                  style={AXIOM.buttons.secondary}
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-medium"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                    border: '1px solid rgba(6, 182, 212, 0.5)',
                    color: '#ffffff',
                  }}
                  onClick={() => void handleCreateProject()}
                >
                  Create project
                </motion.button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
