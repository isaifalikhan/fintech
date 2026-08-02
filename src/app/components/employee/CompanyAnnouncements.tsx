import { motion } from 'motion/react';
import { AXIOM } from '../../../styles/axiom-tokens';
import { Megaphone, Calendar, AlertCircle, Bell, ChevronRight, Pin, Users, Star } from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import { useService } from '@/hooks/useService';
import { useAuth } from '@/contexts/AuthContext';

const typeConfig: Record<string, { color: string; bg: string; border: string; icon: any }> = {
  important: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', icon: AlertCircle },
  hr: { color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)', icon: Users },
  general: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.2)', icon: Megaphone },
  project: { color: '#c084fc', bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.2)', icon: Bell },
  recognition: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', icon: Star },
  policy: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', icon: Bell },
};

export function CompanyAnnouncements() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || 'org-001';

  // Service-backed announcements
  const { data: svcAnnouncements, loading, error } = useService(
    () => employeeService.getAnnouncements(orgId),
    [orgId]
  );

  const announcements = (svcAnnouncements ?? []).map(a => {
    const uiType =
      a.category === 'celebration' ? 'recognition'
        : a.category === 'general' ? 'important'
          : a.category === 'finance' ? 'policy'
            : a.category;
    return {
      id: a.id,
      title: a.title,
      body: a.content,
      date: new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      author: a.author,
      type: uiType as keyof typeof typeConfig,
      pinned: a.isPinned,
      department: 'All',
    };
  });

  return (
    <div className="p-8 space-y-8" style={{ background: AXIOM.backgrounds.main, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2" style={AXIOM.text.titleStyle as any}>Announcements</h1>
        <p className="text-slate-400 font-mono">Company news, updates, and important notices</p>
      </motion.div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-amber-200 text-sm font-mono border border-amber-500/30"
          style={{ background: 'rgba(245, 158, 11, 0.08)' }}
        >
          {error}
        </div>
      )}
      {svcAnnouncements === null && loading && (
        <p className="text-slate-400 font-mono text-sm">Loading announcements…</p>
      )}

      {/* Pinned */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {announcements.filter(a => a.pinned).map((item, i) => {
          const tc = typeConfig[item.type] ?? typeConfig.general;
          const TypeIcon = tc.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="rounded-2xl p-6 cursor-pointer hover:bg-white/5 transition-colors relative overflow-hidden"
              style={{
                background: AXIOM.backgrounds.chartContainer,
                border: `1px solid ${tc.border}`,
                boxShadow: `0 20px 60px -20px ${tc.color}40`,
              }}
            >
              <div className="absolute top-3 right-3">
                <Pin className="size-4 text-amber-400" />
              </div>
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-xl flex items-center justify-center shrink-0" style={{
                  background: tc.bg,
                  border: `1px solid ${tc.border}`,
                }}>
                  <TypeIcon className="size-6" style={{ color: tc.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2">{item.body}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-slate-500 font-mono">{item.date}</span>
                    <span className="text-xs font-mono" style={{ color: tc.color }}>{item.author}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded capitalize" style={{
                      background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color,
                    }}>{item.type}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* All Announcements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl overflow-hidden"
        style={{ ...AXIOM.containers.list, borderRadius: '1rem' }}
      >
        <div className="p-6 pb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Megaphone className="size-5 text-blue-400" />
            All Announcements
          </h3>
        </div>

        <div className="divide-y" style={{ borderColor: 'rgba(148, 163, 184, 0.1)' }}>
          {announcements.map((item, i) => {
            const tc = typeConfig[item.type] ?? typeConfig.general;
            const TypeIcon = tc.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="px-6 py-5 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-lg flex items-center justify-center shrink-0" style={{
                    background: tc.bg,
                    border: `1px solid ${tc.border}`,
                  }}>
                    <TypeIcon className="size-5" style={{ color: tc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-medium">{item.title}</h4>
                      {item.pinned && <Pin className="size-3 text-amber-400" />}
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-1 mb-2">{item.body}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 font-mono">{item.date}</span>
                      <span className="text-xs text-slate-500 font-mono">by {item.author}</span>
                      {item.department !== 'All' && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded" style={AXIOM.badges.info}>
                          {item.department}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-slate-600 shrink-0 mt-1" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}