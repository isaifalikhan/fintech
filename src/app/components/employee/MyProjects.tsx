import { useMemo } from 'react';
import { motion } from 'motion/react';
import { AXIOM } from '../../../styles/axiom-tokens';
import { Briefcase, Clock, Users, TrendingUp, CheckCircle, ChevronRight } from 'lucide-react';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService } from '@/hooks/useService';
import type { Project } from '@/services/types';

type ProjectCardVM = {
  id: string;
  name: string;
  client: string;
  role: string;
  status: string;
  progress: number;
  hoursLogged: number;
  hoursEstimated: number;
  dueDate: string;
  team: string[];
  tasks: { total: number; completed: number; inProgress: number; todo: number };
  recentMilestones: string[];
};

export function MyProjects() {
  const svc = useOrgServices();

  const { data: projectsData, loading, error } = useService(
    () => svc.projects.getAll(),
    [svc.orgId],
  );

  const projects: ProjectCardVM[] = useMemo(() => {
    const list = projectsData as Project[] | null | undefined;
    if (!list?.length) return [];
    return list.map(p => ({
      id: p.id,
      name: p.name,
      client: p.clientName || 'Client',
      role: 'Contributor',
      status: p.status,
      progress: p.quotedAmount > 0 ? Math.min(Math.round((p.actualCost / p.quotedAmount) * 100), 100) : 0,
      hoursLogged: p.actualCost || 0,
      hoursEstimated: p.quotedAmount || 0,
      dueDate: p.endDate || 'TBD',
      team: [],
      tasks: { total: 0, completed: 0, inProgress: 0, todo: 0 },
      recentMilestones: [],
    }));
  }, [projectsData]);

  const activeCount = projects.filter(p => p.status === 'active').length;
  const totalHoursLogged = projects.reduce((s, p) => s + p.hoursLogged, 0);
  const tasksInProgress = projects.reduce((s, p) => s + p.tasks.inProgress, 0);
  const tasksCompleted = projects.reduce((s, p) => s + p.tasks.completed, 0);

  const summary = [
    { label: 'Active Projects', value: String(activeCount), color: 'blue', icon: Briefcase },
    { label: 'Hours Logged (est.)', value: `${totalHoursLogged.toLocaleString()}`, color: 'green', icon: Clock },
    { label: 'Tasks In Progress', value: String(tasksInProgress), color: 'purple', icon: TrendingUp },
    { label: 'Completed Tasks', value: String(tasksCompleted), color: 'cyan', icon: CheckCircle },
  ];

  return (
    <div className="p-8 space-y-8" style={{ background: AXIOM.backgrounds.main, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2" style={AXIOM.text.titleStyle as any}>My Projects</h1>
        <p className="text-slate-400 font-mono">Projects assigned to you and their progress</p>
      </motion.div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-amber-200 text-sm font-mono border border-amber-500/30"
          style={{ background: 'rgba(245, 158, 11, 0.08)' }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {summary.map((item, i) => (
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
                <p className="text-2xl font-bold text-white">{item.value}</p>
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

      {projectsData === null && loading && (
        <p className="text-slate-400 font-mono text-sm">Loading projects…</p>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="rounded-2xl p-12 text-center" style={{ ...AXIOM.containers.list, borderRadius: '1rem' }}>
          <Briefcase className="size-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-mono">No projects in this organization yet.</p>
        </div>
      )}

      <div className="space-y-6">
        {projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="rounded-2xl p-6"
            style={{
              background: AXIOM.backgrounds.chartContainer,
              border: project.status === 'active' ? AXIOM.borders.blue : AXIOM.borders.default,
              boxShadow: project.status === 'active' ? AXIOM.shadows.blue : AXIOM.shadows.default,
            }}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl text-white font-bold">{project.name}</h3>
                  <span className="text-xs font-mono px-2 py-1 rounded capitalize" style={{
                    ...(project.status === 'active' ? AXIOM.badges.success : AXIOM.badges.warning),
                  }}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-slate-400 font-mono">{project.client} - Role: {project.role}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-mono">Due</p>
                <p className="text-sm text-white font-mono">{project.dueDate}</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-mono">Progress</span>
                <span className="text-xs text-blue-400 font-mono">{project.progress}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress}%` }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{
                    background: project.progress >= 70 ? 'linear-gradient(to right, #10b981, #06b6d4)' :
                      project.progress >= 40 ? 'linear-gradient(to right, #3b82f6, #8b5cf6)' :
                      'linear-gradient(to right, #f59e0b, #ef4444)',
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 rounded-lg" style={{ ...AXIOM.containers.item }}>
                <p className="text-xs text-slate-400 font-mono">Hours</p>
                <p className="text-lg font-bold text-white">{project.hoursLogged}<span className="text-xs text-slate-500">/{project.hoursEstimated}</span></p>
              </div>
              <div className="p-3 rounded-lg" style={{ ...AXIOM.containers.item }}>
                <p className="text-xs text-slate-400 font-mono">Completed</p>
                <p className="text-lg font-bold text-green-400">{project.tasks.completed}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ ...AXIOM.containers.item }}>
                <p className="text-xs text-slate-400 font-mono">In Progress</p>
                <p className="text-lg font-bold text-blue-400">{project.tasks.inProgress}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ ...AXIOM.containers.item }}>
                <p className="text-xs text-slate-400 font-mono">To Do</p>
                <p className="text-lg font-bold text-slate-400">{project.tasks.todo}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-slate-400" />
                <div className="flex -space-x-2">
                  {project.team.map((member, j) => (
                    <div key={j} className="size-7 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{
                      background: ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'][j % 4],
                      border: '2px solid rgba(10, 10, 10, 0.8)',
                    }}>
                      {member.split(' ').map(n => n[0]).join('')}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-slate-400 font-mono">{project.team.length} members</span>
              </div>
              <div className="flex items-center gap-2">
                {project.recentMilestones.slice(0, 2).map((m, j) => (
                  <span key={j} className="text-[10px] font-mono px-2 py-1 rounded" style={AXIOM.badges.info}>
                    {m}
                  </span>
                ))}
                <ChevronRight className="size-4 text-slate-500" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
