import { useState } from 'react';
import { motion } from 'motion/react';
import { AXIOM } from '../../../styles/axiom-tokens';
import { platformService } from '@/services/platformService';
import { useServiceArray } from '@/hooks/useService';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Shield, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function PlatformTeamView() {
  const { user: currentUser } = useAuth();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'platform_admin' | 'platform_manager'>('platform_manager');
  const [inviting, setInviting] = useState(false);

  const canInviteAdmin = currentUser?.role === 'platform_admin';

  const { data: staff, loading, error, refetch } = useServiceArray(
    () => platformService.getStaff(),
    [],
    ['users'],
  );

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) {
      toast.error('Enter an email address.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Enter a valid email address.');
      return;
    }
    setInviting(true);
    const res = await platformService.inviteStaff(email, inviteRole, inviteName.trim());
    setInviting(false);
    if (!res.success) {
      toast.error(res.error || 'Could not invite platform staff.');
      return;
    }
    toast.success(res.message || `${email} invited as ${inviteRole === 'platform_admin' ? 'Platform Admin' : 'Platform Manager'}.`);
    setShowInviteForm(false);
    setInviteName('');
    setInviteEmail('');
    setInviteRole('platform_manager');
    await refetch();
  };

  return (
    <div className="p-8 space-y-8" style={{ background: AXIOM.backgrounds.main, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={AXIOM.text.titleStyle as any}>Platform Team</h1>
          <p className="text-slate-400 font-mono">Manage platform admins and managers</p>
        </div>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium"
          style={AXIOM.buttons.action}
        >
          <Plus className="size-5" />
          Invite Platform Staff
        </button>
      </motion.div>

      {showInviteForm && (
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
            Invite Platform Staff
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono">Name</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="jane@financeos.com"
                className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'platform_admin' | 'platform_manager')}
                className="w-full px-4 py-3 rounded-lg text-white font-mono text-sm"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
              >
                <option value="platform_manager">Platform Manager</option>
                {canInviteAdmin && <option value="platform_admin">Platform Admin</option>}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => void handleInvite()}
              disabled={inviting}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={AXIOM.buttons.success}
            >
              {inviting ? <Loader2 className="size-4 animate-spin" /> : null}
              Send Invite
            </button>
            <button onClick={() => setShowInviteForm(false)} className="px-4 py-2 rounded-lg text-slate-400 text-sm" style={AXIOM.buttons.outline}>
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: AXIOM.backgrounds.chartContainer, border: '1px solid rgba(168, 85, 247, 0.15)' }}
      >
        {loading ? (
          <div className="p-8 text-center text-slate-400 font-mono">Loading platform staff…</div>
        ) : error ? (
          <div
            className="flex flex-wrap items-center justify-between gap-3 m-6 px-4 py-3 rounded-xl text-sm"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fecaca',
            }}
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </span>
            <button
              type="button"
              onClick={() => void refetch()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={AXIOM.buttons.outline}
            >
              Retry
            </button>
          </div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-mono">No platform staff found.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(168, 85, 247, 0.1)' }}>
            {staff.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg flex items-center justify-center" style={{ background: AXIOM.iconBoxes.purple }}>
                    <Shield className="size-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{member.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-mono"
                    style={{
                      color: member.role === 'platform_admin' ? '#c084fc' : '#60a5fa',
                      background: member.role === 'platform_admin' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      border: `1px solid ${member.role === 'platform_admin' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                    }}
                  >
                    {member.role === 'platform_admin' ? 'Admin' : 'Manager'}
                  </span>
                  {member.platformStatus === 'pending' && (
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-mono"
                      style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                    >
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
