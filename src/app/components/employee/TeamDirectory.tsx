import { useState } from 'react';
import { motion } from 'motion/react';
import { AXIOM } from '../../../styles/axiom-tokens';
import { Users, Search, Mail, Phone, MapPin, Briefcase, Building2 } from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import { useAuth } from '@/contexts/AuthContext';
import { useService } from '@/hooks/useService';

const departments = ['All', 'Development', 'Design', 'Marketing', 'Operations', 'Management', 'Finance'];

export function TeamDirectory() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || 'org-001';

  // Service-backed team data
  const { data: svcTeam } = useService(
    () => employeeService.getTeamDirectory(orgId),
    [orgId]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  const teamMembers = (svcTeam ?? []).map((m, i) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role,
    department: m.department,
    avatar: m.name.split(' ').map(n => n[0]).join(''),
    color: ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444', '#f97316'][i % 8],
    phone: '',
    location: '',
  }));

  const filtered = teamMembers.filter(m => {
    if (selectedDept !== 'All' && m.department !== selectedDept) return false;
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase()) && !m.role.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-8 space-y-8" style={{ background: AXIOM.backgrounds.main, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2" style={AXIOM.text.titleStyle as any}>Team Directory</h1>
        <p className="text-slate-400 font-mono">
          {loading && svcTeam === null ? 'Loading directory…' : `${teamMembers.length} team members across ${departments.length - 1} departments`}
        </p>
      </motion.div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-amber-200 text-sm font-mono border border-amber-500/30"
          style={{ background: 'rgba(245, 158, 11, 0.08)' }}
        >
          {error}
        </div>
      )}

      {/* Search & Filter */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or role..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg text-white font-mono text-sm"
            style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
          />
        </div>
        <div className="flex gap-2">
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className="px-4 py-2.5 rounded-lg text-xs font-mono transition-all"
              style={selectedDept === dept ? AXIOM.buttons.primary : AXIOM.buttons.secondary}
            >
              {dept}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {svcTeam === null && loading && (
          <p className="text-slate-400 font-mono text-sm col-span-full">Loading team…</p>
        )}
        {!loading && !error && teamMembers.length === 0 && (
          <p className="text-slate-400 font-mono text-sm col-span-full">No team members to show.</p>
        )}
        {filtered.map((member, i) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="rounded-2xl p-6 hover:bg-white/5 transition-colors cursor-pointer group relative"
            style={{
              background: AXIOM.backgrounds.chartContainer,
              border: AXIOM.borders.default,
            }}
          >
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: member.color, opacity: 0.5 }} />
            
            <div className="flex items-start gap-4">
              <div className="size-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0" style={{
                background: `linear-gradient(135deg, ${member.color}, ${member.color}99)`,
                boxShadow: `0 10px 30px -10px ${member.color}80`,
              }}>
                {member.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold group-hover:text-blue-400 transition-colors">{member.name}</h3>
                <p className="text-sm text-slate-400 font-mono">{member.role}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <Building2 className="size-3.5 text-slate-500" />
                <span>{member.department}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <Mail className="size-3.5 text-slate-500" />
                <span className="truncate">{member.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <MapPin className="size-3.5 text-slate-500" />
                <span>{member.location}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 flex gap-2" style={{ borderTop: AXIOM.borders.default }}>
              <button className="flex-1 px-3 py-2 rounded-lg text-xs font-mono text-blue-400 transition-all hover:bg-blue-400/10" style={{
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}>
                <Mail className="size-3.5 inline mr-1.5" />Email
              </button>
              <button className="flex-1 px-3 py-2 rounded-lg text-xs font-mono text-slate-400 transition-all hover:bg-white/5" style={{
                border: AXIOM.borders.default,
              }}>
                <Phone className="size-3.5 inline mr-1.5" />Call
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}