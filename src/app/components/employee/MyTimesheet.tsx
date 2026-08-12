import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AXIOM } from '../../../styles/axiom-tokens';
import { PageShell, PageHeader } from '../layout';
import {
  Clock, Plus, ChevronLeft, ChevronRight, Play, Pause,
  Check, Calendar, Send, X, CheckCircle, AlertCircle,
  Zap, DollarSign,
} from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import type { TimesheetEntry } from '@/services/employeeService';
import { useService, useServiceArray, useMutation } from '@/hooks/useService';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useAuth } from '@/contexts/AuthContext';

// ── Constants ──────────────────────────────────────────────────────────

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// ── View-model type (for component rendering) ──────────────────────────

interface TimesheetVM {
  id: string;
  date: string;
  project: string;
  task: string;
  hours: number;
  status: 'logged' | 'submitted' | 'approved';
  billable?: boolean;
}

function mondayOfWeek(ref: Date): Date {
  const d = new Date(ref);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Main Component ──────────────────────────────────────────────────────

export function MyTimesheet() {
  const { user, currentOrganization } = useAuth();
  const orgId  = currentOrganization?.id ?? 'org-001';
  const userId = user?.id ?? '';

  // ── Service data ──
  const { data: svcTimesheets, loading, error, refetch } = useService(
    () => employeeService.getTimesheets(orgId, userId),
    [orgId, userId],
    ['timesheets'],
  );

  // ── Mutations ──
  const createMutation = useMutation(
    (data: Omit<TimesheetEntry, 'id' | 'organizationId' | 'userId'>) =>
      employeeService.createTimesheetEntry(orgId, userId, data),
  );
  const submitWeekMutation = useMutation(
    (ids: string[]) => employeeService.submitTimesheet(ids, orgId),
  );

  // The org's real projects — hours used to be tagged against a hardcoded list
  // ("Brand Refresh - TechCorp" etc.) that had nothing to do with this organization.
  const orgSvc = useOrgServices();
  const { data: orgProjects } = useServiceArray(
    () => orgSvc.projects.getAll(),
    [orgSvc.orgId],
    ['projects'],
  );
  const TIMER_PROJECTS = useMemo(
    () => orgProjects.map(p => ({ id: p.id, name: p.name })),
    [orgProjects],
  );

  // ── Timer state ──
  const [isTimerRunning, setIsTimerRunning]   = useState(false);
  const [elapsedSeconds, setElapsedSeconds]   = useState(0);
  const [timerProjectId, setTimerProjectId]   = useState('');
  const [timerTask,      setTimerTask]         = useState('');
  const [timerBillable,  setTimerBillable]     = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timesheetActionLockRef = useRef(false);
  const toastDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Manual entry form ──
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    date: todayDate(),
    projectId: '',
    task: '',
    hours: '',
    billable: true,
  });

  // Default both selectors to the first real project once it loads.
  useEffect(() => {
    const first = TIMER_PROJECTS[0]?.id;
    if (!first) return;
    setTimerProjectId(prev => (prev ? prev : first));
    setManualForm(prev => (prev.projectId ? prev : { ...prev, projectId: first }));
  }, [TIMER_PROJECTS]);

  // ── Toast ──
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    if (toastDismissRef.current) clearTimeout(toastDismissRef.current);
    setToast(msg);
    toastDismissRef.current = setTimeout(() => {
      setToast('');
      toastDismissRef.current = null;
    }, 3000);
  };

  // ── Cleanup interval + toast timer on unmount ──
  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (toastDismissRef.current) clearTimeout(toastDismissRef.current);
    },
    [],
  );

  // ── Timer control ──
  const startTimer = () => {
    setIsTimerRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = async () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsTimerRunning(false);

    if (elapsedSeconds < 60) {
      // Less than a minute — discard silently
      setElapsedSeconds(0);
      return;
    }

    if (timesheetActionLockRef.current) return;
    timesheetActionLockRef.current = true;
    try {
      const hours = Math.round((elapsedSeconds / 3600) * 100) / 100;
      const project = TIMER_PROJECTS.find(p => p.id === timerProjectId);
      if (!project) {
        showToast('Pick a project before logging time.');
        return;
      }

      const result = await createMutation.execute({
        date: todayDate(),
        projectId: timerProjectId,
        projectName: project.name,
        hours,
        description: timerTask.trim() || 'Timer entry',
        billable: timerBillable,
        status: 'draft',
      });

      if (result.success) {
        await refetch();
        setElapsedSeconds(0);
        setTimerTask('');
        showToast(`Logged ${hours}h on ${project.name}`);
      }
    } finally {
      timesheetActionLockRef.current = false;
    }
  };

  const handleToggleTimer = () => {
    if (isTimerRunning) stopTimer();
    else startTimer();
  };

  // ── Manual entry ──
  const handleAddManual = async () => {
    const hrs = parseFloat(manualForm.hours);
    if (!manualForm.task.trim() || isNaN(hrs) || hrs <= 0) return;
    if (timesheetActionLockRef.current) return;
    timesheetActionLockRef.current = true;
    try {
      const project = TIMER_PROJECTS.find(p => p.id === manualForm.projectId);
      if (!project) {
        showToast('Pick a project before logging time.');
        return;
      }

      const result = await createMutation.execute({
        date: manualForm.date,
        projectId: manualForm.projectId,
        projectName: project.name,
        hours: hrs,
        description: manualForm.task.trim(),
        billable: manualForm.billable,
        status: 'draft',
      });

      if (result.success) {
        await refetch();
        setShowManualForm(false);
        setManualForm({ date: todayDate(), projectId: TIMER_PROJECTS[0]?.id ?? '', task: '', hours: '', billable: true });
        showToast(`Logged ${hrs}h on ${project.name}`);
      }
    } finally {
      timesheetActionLockRef.current = false;
    }
  };

  // ── Submit week ──
  const handleSubmitWeek = async () => {
    const draftIds = (svcTimesheets ?? []).filter(t => t.status === 'draft').map(t => t.id);

    if (draftIds.length === 0) { showToast('No draft entries to submit'); return; }
    if (timesheetActionLockRef.current) return;

    timesheetActionLockRef.current = true;
    try {
      const result = await submitWeekMutation.execute(draftIds);
      if (result.success) {
        await refetch();
        showToast(`${draftIds.length} entr${draftIds.length === 1 ? 'y' : 'ies'} submitted for approval`);
      }
    } finally {
      timesheetActionLockRef.current = false;
    }
  };

  const isTimesheetMutating = createMutation.loading || submitWeekMutation.loading;

  // ── View model ──
  const timesheetData: TimesheetVM[] = useMemo(
    () =>
      (svcTimesheets ?? []).map(t => ({
        id: t.id,
        date: t.date,
        project: t.projectName,
        task: t.description,
        hours: t.hours,
        status: t.status === 'draft' ? 'logged' as const : t.status as TimesheetVM['status'],
        billable: t.billable,
      })),
    [svcTimesheets],
  );

  const todayEntries = timesheetData.filter(e => e.date === todayDate());
  const todayTotal   = todayEntries.reduce((s, e) => s + e.hours, 0);
  const weekTotal    = timesheetData.reduce((s, e) => s + e.hours, 0);
  const draftCount   = timesheetData.filter(e => e.status === 'logged').length;

  const weekData = useMemo(() => {
    const mon = mondayOfWeek(new Date());
    return weekDays.map((day, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const date = toYMD(d);
      const entries = timesheetData.filter(e => e.date === date);
      return { day, date, hours: entries.reduce((s, e) => s + e.hours, 0), entries };
    });
  }, [timesheetData]);

  const weekLabel = useMemo(() => {
    if (!weekData.length) return 'This week';
    const first = weekData[0].date;
    const last = weekData[weekData.length - 1].date;
    const a = new Date(first + 'T12:00:00');
    const b = new Date(last + 'T12:00:00');
    const fmt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${a.toLocaleDateString(undefined, fmt)} – ${b.toLocaleDateString(undefined, { ...fmt, year: 'numeric' })}`;
  }, [weekData]);

  const inputStyle = { background: AXIOM.inputs.background, border: AXIOM.inputs.border, color: '#fff' };

  return (
    <PageShell>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl"
            style={{
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.4)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 10px 40px -10px rgba(16,185,129,0.4)',
            }}
          >
            <CheckCircle className="size-5 text-green-400 shrink-0" />
            <span className="text-white text-sm font-mono">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <PageHeader
          title="My Timesheet"
          description="Track your working hours and project time"
          actions={
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
          <button type="button" className="flex items-center gap-2 min-h-10 px-4 py-2 rounded-lg text-sm touch-manipulation" style={AXIOM.buttons.outline}>
            <ChevronLeft className="size-4" /> Prev Week
          </button>
          <span className="text-white font-mono text-sm px-3 sm:px-4 py-2 rounded-lg min-h-10 inline-flex items-center" style={{
            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
          }}>
            <Calendar className="size-4 inline mr-2 shrink-0" />{weekLabel}
          </span>
          <button type="button" className="flex items-center gap-2 min-h-10 px-4 py-2 rounded-lg text-sm touch-manipulation" style={AXIOM.buttons.outline}>
            Next Week <ChevronRight className="size-4" />
          </button>
          {draftCount > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              onClick={handleSubmitWeek}
              disabled={isTimesheetMutating}
              className="flex items-center gap-2 min-h-10 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-all touch-manipulation"
              style={AXIOM.buttons.success}
            >
              {isTimesheetMutating
                ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send className="size-4" />}
              Submit Week ({draftCount})
            </motion.button>
          )}
            </div>
          }
        />
      </motion.div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-amber-200 text-sm font-mono border border-amber-500/30"
          style={{ background: 'rgba(245, 158, 11, 0.08)' }}
        >
          {error}
        </div>
      )}
      {svcTimesheets === null && loading && (
        <p className="text-slate-400 font-mono text-sm">Loading timesheet…</p>
      )}

      {/* Timer + Summary Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Live Timer ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-6"
          style={{ ...AXIOM.containers.chartBlue, borderRadius: '1rem' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="size-5 text-blue-400" />
            <h3 className="text-white font-bold">Live Timer</h3>
          </div>

          {/* Project selector */}
          <div className="mb-3">
            <label className="text-[10px] text-slate-400 font-mono tracking-widest block mb-1.5">PROJECT</label>
            <select
              value={timerProjectId}
              onChange={e => setTimerProjectId(e.target.value)}
              disabled={isTimerRunning}
              className="w-full px-3 py-2 rounded-lg text-xs font-mono disabled:opacity-50"
              style={inputStyle}
            >
              {TIMER_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Task input */}
          <div className="mb-4">
            <label className="text-[10px] text-slate-400 font-mono tracking-widest block mb-1.5">TASK DESCRIPTION</label>
            <input
              type="text"
              placeholder="What are you working on?"
              value={timerTask}
              onChange={e => setTimerTask(e.target.value)}
              disabled={isTimerRunning}
              className="w-full px-3 py-2 rounded-lg text-xs font-mono disabled:opacity-50"
              style={inputStyle}
            />
          </div>

          {/* Billable toggle */}
          <div className="flex items-center gap-2 mb-5">
            <button
              onClick={() => !isTimerRunning && setTimerBillable(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={timerBillable ? AXIOM.buttons.action : AXIOM.buttons.outline}
            >
              <DollarSign className="size-3" />
              {timerBillable ? 'Billable' : 'Non-billable'}
            </button>
          </div>

          {/* Elapsed display */}
          <div className="text-center mb-5">
            <motion.p
              className="text-5xl font-bold font-mono text-white mb-1"
              animate={isTimerRunning ? { opacity: [1, 0.6, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {formatElapsed(elapsedSeconds)}
            </motion.p>
            <p className="text-xs text-blue-400/70 font-mono">
              {isTimerRunning ? 'Recording…' : 'Ready to start'}
            </p>
          </div>

          {/* Start / Stop */}
          <div className="flex gap-3">
            <button
              onClick={handleToggleTimer}
              disabled={isTimesheetMutating}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-medium disabled:opacity-50 transition-all"
              style={isTimerRunning ? AXIOM.buttons.danger : AXIOM.buttons.success}
            >
              {isTimesheetMutating
                ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : isTimerRunning ? <Pause className="size-5" /> : <Play className="size-5" />}
              {isTimesheetMutating ? 'Saving…' : isTimerRunning ? 'Stop & Save' : 'Start Timer'}
            </button>

            {/* Manual entry toggle */}
            <button
              onClick={() => setShowManualForm(v => !v)}
              title="Log time manually"
              className="px-4 py-3 rounded-xl transition-all"
              style={showManualForm ? AXIOM.buttons.primary : AXIOM.buttons.outline}
            >
              <Plus className="size-5 text-slate-400" />
            </button>
          </div>
        </motion.div>

        {/* Today Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-6"
          style={{ ...AXIOM.containers.chartGreen, borderRadius: '1rem' }}
        >
          <p className="text-xs text-slate-400 font-mono mb-2">TODAY</p>
          <p className="text-4xl font-bold text-white mb-1">{todayTotal}h</p>
          <p className="text-sm text-green-400 font-mono mb-4">{todayEntries.length} entries logged</p>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((todayTotal / 8) * 100, 100)}%` }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(to right, #10b981, #06b6d4)' }}
            />
          </div>
          <p className="text-xs text-slate-400 font-mono mt-2">{todayTotal}/8h target</p>

          {/* Today entries preview */}
          {todayEntries.length > 0 && (
            <div className="mt-4 space-y-2">
              {todayEntries.slice(0, 3).map(e => (
                <div key={e.id} className="flex items-center justify-between text-xs font-mono" style={{ color: 'rgba(148,163,184,0.8)' }}>
                  <span className="truncate max-w-28">{e.task}</span>
                  <span className="text-green-400 shrink-0 ml-2">{e.hours}h</span>
                </div>
              ))}
              {todayEntries.length > 3 && (
                <p className="text-xs text-slate-500 font-mono">+{todayEntries.length - 3} more</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Week Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-6"
          style={{ ...AXIOM.containers.chartPurple, borderRadius: '1rem' }}
        >
          <p className="text-xs text-slate-400 font-mono mb-2">THIS WEEK</p>
          <p className="text-4xl font-bold text-white mb-1">{weekTotal}h</p>
          <p className="text-sm text-purple-400 font-mono mb-4">{timesheetData.length} total entries</p>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((weekTotal / 40) * 100, 100)}%` }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(to right, #a855f7, #ec4899)' }}
            />
          </div>
          <p className="text-xs text-slate-400 font-mono mt-2">{weekTotal}/40h target</p>

          {/* Draft count badge */}
          {draftCount > 0 && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg" style={{
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
            }}>
              <AlertCircle className="size-4 text-amber-400 shrink-0" />
              <span className="text-xs text-amber-400 font-mono">{draftCount} draft{draftCount !== 1 ? 's' : ''} not submitted</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Manual Entry Form ── */}
      <AnimatePresence>
        {showManualForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl p-6" style={{
              background: AXIOM.backgrounds.chartContainer,
              border: '1px solid rgba(168,85,247,0.3)',
              boxShadow: '0 20px 60px -20px rgba(168,85,247,0.3)',
            }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Zap className="size-4 text-purple-400" />
                  Log Time Manually
                </h3>
                <button onClick={() => setShowManualForm(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X className="size-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-mono tracking-widest">DATE</label>
                  <input type="date" value={manualForm.date}
                    onChange={e => setManualForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm font-mono"
                    style={{ ...inputStyle, colorScheme: 'dark' }} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-mono tracking-widest">PROJECT</label>
                  <select value={manualForm.projectId}
                    onChange={e => setManualForm(f => ({ ...f, projectId: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm font-mono" style={inputStyle}>
                    {TIMER_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-mono tracking-widest">HOURS</label>
                  <input type="number" placeholder="e.g. 2.5" min="0.25" step="0.25"
                    value={manualForm.hours}
                    onChange={e => setManualForm(f => ({ ...f, hours: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm font-mono" style={inputStyle} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-mono tracking-widest">BILLABLE</label>
                  <button
                    onClick={() => setManualForm(f => ({ ...f, billable: !f.billable }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm font-mono flex items-center justify-center gap-2 transition-all"
                    style={manualForm.billable ? AXIOM.buttons.action : AXIOM.buttons.outline}
                  >
                    <DollarSign className="size-4" />
                    {manualForm.billable ? 'Billable' : 'Non-billable'}
                  </button>
                </div>

                <div className="md:col-span-2 lg:col-span-4 space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-mono tracking-widest">TASK DESCRIPTION *</label>
                  <input type="text" placeholder="What did you work on?"
                    value={manualForm.task}
                    onChange={e => setManualForm(f => ({ ...f, task: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm font-mono" style={inputStyle} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddManual}
                  disabled={isTimesheetMutating || !manualForm.task.trim() || !manualForm.hours}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-all"
                  style={AXIOM.buttons.success}
                >
                  {isTimesheetMutating
                    ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Check className="size-4" />}
                  Log Entry
                </button>
                <button onClick={() => setShowManualForm(false)}
                  className="px-4 py-2.5 rounded-lg text-slate-400 text-sm" style={AXIOM.buttons.secondary}>
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Week Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl p-6"
        style={{ ...AXIOM.containers.list, borderRadius: '1rem' }}
      >
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <Calendar className="size-5 text-blue-400" />
          Weekly Overview
        </h3>
        <div className="grid grid-cols-5 gap-4">
          {weekData.map((day, i) => (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="rounded-xl p-4"
              style={{
                background: day.hours >= 8 ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.3)',
                border: day.date === todayDate()
                  ? '1px solid rgba(59,130,246,0.4)'
                  : day.hours >= 8
                    ? '1px solid rgba(16,185,129,0.2)'
                    : AXIOM.borders.default,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-400 font-mono">{day.day}</span>
                {day.date === todayDate() && (
                  <span className="text-[10px] text-blue-400 font-mono px-1.5 py-0.5 rounded" style={{
                    background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                  }}>TODAY</span>
                )}
              </div>
              <p className="text-2xl font-bold text-white font-mono mb-2">{day.hours}h</p>
              <div className="space-y-1">
                {day.entries.map(entry => (
                  <div key={entry.id} className="text-[10px] text-slate-400 font-mono truncate">
                    {entry.hours}h – {entry.task}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Time Entries List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl overflow-hidden"
        style={{ ...AXIOM.containers.list, borderRadius: '1rem' }}
      >
        <div className="p-6 pb-4 flex items-center justify-between">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Clock className="size-5 text-blue-400" />
            Time Entries
          </h3>
          {draftCount > 0 && (
            <button
              onClick={handleSubmitWeek}
              disabled={isTimesheetMutating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono disabled:opacity-50 transition-all"
              style={AXIOM.buttons.success}
            >
              {isTimesheetMutating
                ? <div className="size-3 border border-white/30 border-t-white rounded-full animate-spin" />
                : <Send className="size-3" />}
              Submit {draftCount} Draft{draftCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        <div className="divide-y" style={{ borderColor: 'rgba(148,163,184,0.1)' }}>
          {error ? (
            <div className="p-12 text-center text-slate-400 font-mono text-sm">
              Could not load time entries. Try refreshing the page.
            </div>
          ) : svcTimesheets === null && loading ? (
            <div className="p-12 text-center text-slate-400 font-mono text-sm">Loading entries…</div>
          ) : timesheetData.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="size-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-mono">No time entries yet</p>
              <p className="text-slate-500 font-mono text-xs mt-1">Start the timer or log manually</p>
            </div>
          ) : (
            timesheetData.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.03 }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors"
              >
                <div className="size-10 rounded-lg flex items-center justify-center shrink-0" style={{
                  background: entry.status === 'approved'  ? 'rgba(16,185,129,0.15)'  :
                              entry.status === 'submitted' ? 'rgba(245,158,11,0.15)'  : 'rgba(59,130,246,0.15)',
                  border: `1px solid ${
                    entry.status === 'approved'  ? 'rgba(16,185,129,0.3)'  :
                    entry.status === 'submitted' ? 'rgba(245,158,11,0.3)'  : 'rgba(59,130,246,0.3)'
                  }`,
                }}>
                  {entry.status === 'approved'
                    ? <Check  className="size-5 text-green-400" />
                    : entry.status === 'submitted'
                      ? <Clock  className="size-5 text-amber-400" />
                      : <Play   className="size-5 text-blue-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{entry.task}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-slate-400 font-mono">{entry.project}</p>
                    <p className="text-xs text-slate-500 font-mono">{entry.date}</p>
                    {entry.billable === false && (
                      <span className="text-[10px] text-slate-500 font-mono">non-billable</span>
                    )}
                  </div>
                </div>

                <span className="text-lg font-bold text-white font-mono shrink-0">{entry.hours}h</span>

                <span className="text-xs font-mono px-2 py-1 rounded capitalize shrink-0" style={{
                  background: entry.status === 'approved'  ? 'rgba(16,185,129,0.1)'  :
                              entry.status === 'submitted' ? 'rgba(245,158,11,0.1)'  : 'rgba(59,130,246,0.1)',
                  border: `1px solid ${
                    entry.status === 'approved'  ? 'rgba(16,185,129,0.2)'  :
                    entry.status === 'submitted' ? 'rgba(245,158,11,0.2)'  : 'rgba(59,130,246,0.2)'
                  }`,
                  color: entry.status === 'approved'  ? '#34d399' :
                         entry.status === 'submitted' ? '#fbbf24' : '#60a5fa',
                }}>
                  {entry.status}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </PageShell>
  );
}