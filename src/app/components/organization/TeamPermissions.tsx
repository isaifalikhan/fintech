import * as React from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle,
  Crown,
  Database,
  DollarSign,
  Edit,
  Eye,
  FileText,
  Filter,
  GitBranch,
  Lock,
  Mail,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Shield,
  Trash2,
  Unlock,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { AXIOM } from '../../../styles/axiom-tokens';
// Wired to organizationService for member management
import { organizationService } from '@/services/organizationService';
import { auditService } from '@/services/auditService';
import { useServiceArray, useMutation } from '@/hooks/useService';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/formatters';
import type { OrganizationMember, User, UserRole } from '@/services/types';
import { useOrgWorkspaceNav } from './OrgWorkspaceNavContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Loader2 } from 'lucide-react';

type TeamView = 'members' | 'roles' | 'activity' | 'invitations';
type MemberRole = 'org_admin' | 'team_member' | 'accountant' | 'viewer';
type MemberStatus = 'active' | 'inactive' | 'pending';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: MemberStatus;
  permissions: string[];
  organizationId?: string;
  lastActive?: string;
  joinedDate?: string;
  avatar?: string;
  /** Source org role from `organizationService` — used when saving role changes. */
  orgRole: UserRole;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: 'financial' | 'team' | 'settings' | 'data';
}

const allPermissions: Permission[] = [
  { id: 'view_dashboard', name: 'View Dashboard', description: 'Access organization dashboard', icon: BarChart3, category: 'financial' },
  { id: 'view_reports', name: 'View Reports', description: 'Access financial reports', icon: FileText, category: 'financial' },
  { id: 'add_transaction', name: 'Add Transactions', description: 'Create new transactions', icon: Plus, category: 'financial' },
  { id: 'edit_transaction', name: 'Edit Transactions', description: 'Modify existing transactions', icon: Edit, category: 'financial' },
  { id: 'delete_transaction', name: 'Delete Transactions', description: 'Remove transactions', icon: Trash2, category: 'financial' },
  { id: 'categorize', name: 'Categorize', description: 'Assign categories to transactions', icon: GitBranch, category: 'financial' },
  { id: 'manage_accounts', name: 'Manage Accounts', description: 'Add/edit bank accounts and wallets', icon: DollarSign, category: 'financial' },
  { id: 'export_data', name: 'Export Data', description: 'Export financial data and reports', icon: Database, category: 'data' },
  { id: 'import_statements', name: 'Import Statements', description: 'Upload bank statements', icon: FileText, category: 'data' },
  { id: 'manage_team', name: 'Manage Team', description: 'Invite and manage team members', icon: Users, category: 'team' },
  { id: 'manage_permissions', name: 'Manage Permissions', description: 'Assign roles and permissions', icon: Shield, category: 'team' },
  { id: 'organization_settings', name: 'Organization Settings', description: 'Modify organization settings', icon: Settings, category: 'settings' },
];

const roleDefinitions = [
  {
    id: 'org_admin' as MemberRole,
    name: 'Organization Admin',
    description: 'Full access to all features and settings',
    color: 'purple',
    permissions: ['all'],
  },
  {
    id: 'accountant' as MemberRole,
    name: 'Accountant',
    description: 'Full financial access, limited team management',
    color: 'cyan',
    permissions: ['view_dashboard', 'view_reports', 'add_transaction', 'edit_transaction', 'categorize', 'export_data', 'manage_accounts', 'import_statements'],
  },
  {
    id: 'team_member' as MemberRole,
    name: 'Team Member',
    description: 'Add transactions and view reports',
    color: 'blue',
    permissions: ['view_dashboard', 'add_transaction', 'view_reports'],
  },
  {
    id: 'viewer' as MemberRole,
    name: 'Viewer',
    description: 'View-only access to reports and dashboard',
    color: 'green',
    permissions: ['view_dashboard', 'view_reports'],
  },
];

/** Editable roles only — matches `UserRole` round-trip via `memberRoleToUserRole`. */
const MEMBER_ROLE_SELECT: { value: MemberRole; label: string }[] = [
  { value: 'org_admin', label: 'Organization admin' },
  { value: 'team_member', label: 'Team member' },
  { value: 'viewer', label: 'Viewer' },
];

function mapOrgRoleToMemberRole(role: UserRole): MemberRole {
  switch (role) {
    case 'owner':
    case 'admin':
      return 'org_admin';
    case 'employee':
      return 'team_member';
    case 'viewer':
    default:
      return 'viewer';
  }
}

/**
 * A member's effective permission list for display purposes.
 * Reads from the live `rolePermissions` editor state (see `TeamPermissions`'s
 * `rolePermissions` state, seeded from/persisted to
 * `Organization.settings.rolePermissions`) when available, so this stays in
 * sync with whatever was last saved in the "Roles & Permissions" tab instead
 * of silently diverging from it. Falls back to these hardcoded defaults only
 * before that state is available.
 */
function permissionsForDisplayRole(role: MemberRole, rolePermissions?: Record<string, string[]>): string[] {
  const saved = rolePermissions?.[role];
  if (saved) return saved;
  if (role === 'org_admin') return ['all'];
  if (role === 'team_member') return ['add_transaction', 'view_reports', 'export_data'];
  return ['view_dashboard', 'view_reports'];
}

/** `getMembers` returns org rows with nested `user`; UI expects flat `TeamMember`. */
function mapOrgMemberRowToTeamMember(
  row: OrganizationMember & { user?: User | null },
  rolePermissions?: Record<string, string[]>,
): TeamMember | null {
  const u = row.user;
  if (!u) return null;
  const displayRole = mapOrgRoleToMemberRole(row.role);
  return {
    id: u.id,
    name: u.name ?? '',
    email: u.email ?? '',
    role: displayRole,
    status: row.status ?? 'active',
    permissions: permissionsForDisplayRole(displayRole, rolePermissions),
    organizationId: row.organizationId,
    joinedDate: row.joinedAt,
    avatar: u.avatar,
    orgRole: row.role,
  };
}

/**
 * Expands the `['all']` sentinel (used by `roleDefinitions`'s org_admin entry)
 * into the full permission-id list so per-permission checkbox UIs have a
 * concrete set to check against, instead of every box reading as unchecked.
 */
function effectivePermissionIds(roleId: string, rolePermissions: Record<string, string[]>): string[] {
  const list = rolePermissions[roleId];
  if (!list) return [];
  return list.includes('all') ? allPermissions.map((p) => p.id) : list;
}

/** Maps UI role to persisted `UserRole`, preserving `owner` when the member is org owner. */
function memberRoleToUserRole(memberRole: MemberRole, previousOrgRole: UserRole): UserRole {
  if (memberRole === 'org_admin') {
    return previousOrgRole === 'owner' ? 'owner' : 'admin';
  }
  if (memberRole === 'accountant') return 'admin';
  if (memberRole === 'team_member') return 'employee';
  return 'viewer';
}

export function TeamPermissions() {
  const { user, currentOrganization, switchOrganization } = useAuth();
  const orgId = currentOrganization?.id || 'org-001';
  const goToOrgView = useOrgWorkspaceNav();

  const {
    data: orgMemberRows,
    loading: membersLoading,
    error: membersError,
    refetch: refetchMembers,
  } = useServiceArray(
    () => organizationService.getMembers(orgId),
    [orgId],
    ['organizationMembers'],
  );

  const {
    data: activityEntries,
    refetch: refetchActivity,
  } = useServiceArray(
    () => auditService.getAll(orgId),
    [orgId],
    ['auditLogs'],
  );

  const roleMutation = useMutation(
    (input: { userId: string; newRole: UserRole }) =>
      organizationService.updateMemberRole(orgId, input.userId, input.newRole),
  );

  const inviteMutation = useMutation(
    (input: { email: string; name: string; role: UserRole }) =>
      organizationService.inviteMember(orgId, input.email, input.role, input.name),
  );

  // Per-org custom permission catalog for the "Roles & Permissions" editor below.
  // Seeded from the persisted org setting if present, else from the static role
  // definitions. Persisted via `organizationService.update()` -> `settings.rolePermissions`.
  const [rolePermissions, setRolePermissions] = React.useState<Record<string, string[]>>(() => {
    const saved = currentOrganization?.settings?.rolePermissions;
    if (saved) return saved;
    return Object.fromEntries(roleDefinitions.map(r => [r.id, r.permissions]));
  });

  // Re-sync when `currentOrganization` (re)loads with a persisted value — e.g. on
  // first mount before auth/org data has arrived, or after switching orgs.
  React.useEffect(() => {
    const saved = currentOrganization?.settings?.rolePermissions;
    if (saved) setRolePermissions(saved);
  }, [currentOrganization]);

  const rolePermissionsMutation = useMutation(
    (input: { rolePermissions: Record<string, string[]> }) =>
      organizationService.update(orgId, {
        settings: {
          theme: currentOrganization?.settings?.theme ?? 'dark',
          notifications: currentOrganization?.settings?.notifications ?? true,
          rolePermissions: input.rolePermissions,
        },
      }),
  );

  const [activeView, setActiveView] = React.useState<TeamView>('members');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterRole, setFilterRole] = React.useState<string>('all');
  const [updatingMemberId, setUpdatingMemberId] = React.useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteName, setInviteName] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<MemberRole>('team_member');
  const [editingRoleId, setEditingRoleId] = React.useState<MemberRole | null>(null);

  const teamMembers = React.useMemo(
    () =>
      orgMemberRows
        .map((row) => mapOrgMemberRowToTeamMember(row, rolePermissions))
        .filter((m): m is TeamMember => m != null),
    [orgMemberRows, rolePermissions],
  );

  /** Toggle one permission for one role, optimistically, then persist and roll back on failure. */
  const toggleRolePermission = async (roleId: MemberRole, permissionId: string) => {
    const previous = rolePermissions;
    const currentIds = effectivePermissionIds(roleId, rolePermissions);
    const has = currentIds.includes(permissionId);
    const nextIds = has ? currentIds.filter((id) => id !== permissionId) : [...currentIds, permissionId];
    const next = { ...rolePermissions, [roleId]: nextIds };
    setRolePermissions(next);
    const res = await rolePermissionsMutation.execute({ rolePermissions: next });
    if (res.success) {
      toast.success('Permissions updated');
    } else {
      setRolePermissions(previous);
      toast.error(res.error ?? 'Could not update permissions');
    }
  };

  const roleMemberCounts = React.useMemo(() => {
    const counts: Partial<Record<MemberRole, number>> = {};
    for (const m of teamMembers) {
      const r = m.role as MemberRole;
      counts[r] = (counts[r] ?? 0) + 1;
    }
    return counts;
  }, [teamMembers]);

  const saveMemberRole = async (member: TeamMember, nextDisplay: MemberRole) => {
    if (nextDisplay === member.role) return;
    const newOrgRole = memberRoleToUserRole(nextDisplay, member.orgRole);
    setUpdatingMemberId(member.id);
    try {
      const res = await roleMutation.execute({ userId: member.id, newRole: newOrgRole });
      if (res.success) {
        toast.success(res.message ?? 'Role updated');
        const nextLabel = MEMBER_ROLE_SELECT.find((opt) => opt.value === nextDisplay)?.label ?? nextDisplay;
        void auditService.create({
          organizationId: orgId,
          userId: user?.id ?? '',
          userName: user?.name ?? 'Unknown',
          action: 'Changed role',
          resource: 'organization_member',
          resourceId: member.id,
          details: `${member.name} → ${nextLabel}`,
          ipAddress: '',
          severity: 'info',
        }).then(() => refetchActivity());
        await refetchMembers();
        if (user?.id === member.id && currentOrganization?.id) {
          switchOrganization(currentOrganization.id);
        }
      } else {
        toast.error(res.error ?? 'Could not update role');
      }
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) {
      toast.error('Enter an email address.');
      return;
    }
    const orgRole = memberRoleToUserRole(inviteRole, 'viewer');
    const res = await inviteMutation.execute({ email, name: inviteName.trim(), role: orgRole });
    if (res.success) {
      toast.success(res.message ?? 'Member invited');
      void auditService.create({
        organizationId: orgId,
        userId: user?.id ?? '',
        userName: user?.name ?? 'Unknown',
        action: 'Invited new member',
        resource: 'organization_member',
        resourceId: email,
        details: `Invited ${email} as ${inviteRole}`,
        ipAddress: '',
        severity: 'info',
      }).then(() => refetchActivity());
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('team_member');
      await refetchMembers();
    } else {
      toast.error(res.error ?? 'Could not invite member');
    }
  };

  const activeMembers = teamMembers.filter(m => m.status === 'active').length;
  const pendingMembers = teamMembers.filter(m => m.status === 'pending').length;
  const totalPermissions = allPermissions.length;

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, any> = {
      org_admin: AXIOM.badges.purple,
      accountant: AXIOM.badges.cyan,
      team_member: AXIOM.badges.info,
      viewer: AXIOM.badges.success,
    };
    return styles[role] || AXIOM.badges.info;
  };

  const getStatusBadge = (status: MemberStatus) => {
    const styles: Record<string, any> = {
      active: AXIOM.badges.success,
      inactive: AXIOM.badges.danger,
      pending: AXIOM.badges.warning,
    };
    return styles[status] || AXIOM.badges.info;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'org_admin':
        return <Crown className="size-4" />;
      case 'accountant':
        return <DollarSign className="size-4" />;
      case 'team_member':
        return <Users className="size-4" />;
      case 'viewer':
        return <Eye className="size-4" />;
      default:
        return <UserCheck className="size-4" />;
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch =
      (member.name ?? '').toLowerCase().includes(q) || (member.email ?? '').toLowerCase().includes(q);
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const viewButtons = [
    { id: 'members' as const, label: 'Team Members', icon: Users },
    { id: 'roles' as const, label: 'Roles & Permissions', icon: Shield },
    { id: 'activity' as const, label: 'Activity Log', icon: Activity },
    { id: 'invitations' as const, label: 'Pending Invites', icon: Mail },
  ];

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ background: AXIOM.backgrounds.main }}>
      {/* Header */}
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
              <Users className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={AXIOM.text.titleStyle}>
                Team & Permissions
              </h1>
              <p className="text-slate-400 text-sm">Manage team members and access control</p>
            </div>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => goToOrgView?.('settings')}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={AXIOM.buttons.secondary}
            >
              <Settings className="size-4" />
              Settings
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setInviteDialogOpen(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                color: '#ffffff',
              }}
            >
              <Plus className="size-4" />
              Invite Member
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.chartGreen}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Active Members</p>
              <p className="text-3xl font-bold text-white">{activeMembers}</p>
              <p className="text-xs text-green-400 mt-1">Currently online</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.green,
                boxShadow: AXIOM.shadows.iconGreen,
              }}
            >
              <UserCheck className="size-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.chartAmber}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Pending Invites</p>
              <p className="text-3xl font-bold text-white">{pendingMembers}</p>
              <p className="text-xs text-amber-400 mt-1">Awaiting acceptance</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.amber,
                boxShadow: AXIOM.shadows.iconAmber,
              }}
            >
              <Mail className="size-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.chartPurple}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Roles</p>
              <p className="text-3xl font-bold text-white">{roleDefinitions.length}</p>
              <p className="text-xs text-purple-400 mt-1">Permission groups</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.purple,
                boxShadow: AXIOM.shadows.iconPurple,
              }}
            >
              <Shield className="size-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.chartCyan}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Permissions</p>
              <p className="text-3xl font-bold text-white">{totalPermissions}</p>
              <p className="text-xs text-cyan-400 mt-1">Available controls</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.cyan,
                boxShadow: AXIOM.shadows.iconCyan,
              }}
            >
              <Lock className="size-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* View Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-2 p-2 rounded-2xl"
        style={AXIOM.containers.list}
      >
        {viewButtons.map((btn) => (
          <motion.button
            key={btn.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveView(btn.id)}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
            style={activeView === btn.id ? AXIOM.buttons.primary : AXIOM.buttons.secondary}
          >
            <btn.icon className="size-4" />
            {btn.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Search and Filter */}
      {activeView === 'members' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col gap-3"
        >
          {membersError && (
            <div
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fecaca',
              }}
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                {membersError}
              </span>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => void refetchMembers()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={AXIOM.buttons.secondary}
              >
                Try again
              </motion.button>
            </div>
          )}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                style={{
                  background: AXIOM.inputs.background,
                  border: AXIOM.inputs.border,
                  color: AXIOM.inputs.color,
                }}
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-3 rounded-xl text-sm font-medium"
              style={AXIOM.buttons.secondary}
            >
            <option value="all">All Roles</option>
            <option value="org_admin">Organization Admin</option>
            <option value="team_member">Team Member</option>
            <option value="viewer">Viewer</option>
            </select>
          </div>
        </motion.div>
      )}

      {/* Content Views */}
      {activeView === 'members' && membersLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl animate-pulse"
              style={{ ...AXIOM.containers.list, minHeight: 220 }}
            >
              <div className="flex gap-3 mb-4">
                <div className="size-12 rounded-xl bg-slate-700/80" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-700/80 rounded w-2/3" />
                  <div className="h-3 bg-slate-700/60 rounded w-full" />
                </div>
              </div>
              <div className="h-9 bg-slate-700/50 rounded-lg w-full mb-3" />
              <div className="h-20 bg-slate-700/40 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {activeView === 'members' && !membersLoading && filteredMembers.length === 0 && (
        <div
          className="p-10 rounded-2xl text-center text-slate-400 text-sm"
          style={AXIOM.containers.list}
        >
          {membersError ? 'Could not load team members.' : 'No team members match your filters.'}
        </div>
      )}

      {activeView === 'members' && !membersLoading && filteredMembers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="p-6 rounded-2xl group"
              style={AXIOM.containers.list}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="size-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: member.role === 'org_admin' ? AXIOM.iconBoxes.purple :
                                 member.role === 'accountant' ? AXIOM.iconBoxes.cyan :
                                 member.role === 'viewer' ? AXIOM.iconBoxes.green :
                                 AXIOM.iconBoxes.blue,
                      boxShadow: member.role === 'org_admin' ? AXIOM.shadows.iconPurple :
                                 member.role === 'accountant' ? AXIOM.shadows.iconCyan :
                                 member.role === 'viewer' ? AXIOM.shadows.iconGreen :
                                 AXIOM.shadows.iconBlue,
                    }}
                  >
                    <span className="text-white font-bold text-lg">{(member.name || '?')[0]}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={AXIOM.buttons.secondary}
                  onClick={() => toast.success('Member options')}
                >
                  <MoreVertical className="size-4" />
                </motion.button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span 
                  className="px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                  style={getStatusBadge(member.status)}
                >
                  {member.status === 'active' ? <CheckCircle className="size-3" /> :
                   member.status === 'pending' ? <AlertCircle className="size-3" /> :
                   <XCircle className="size-3" />}
                  {member.status}
                </span>
              </div>

              <div className="mb-4">
                <label htmlFor={`member-role-${member.id}`} className="text-xs text-slate-500 mb-1 block">
                  Role
                </label>
                <select
                  id={`member-role-${member.id}`}
                  value={member.role as MemberRole}
                  disabled={updatingMemberId === member.id}
                  onChange={(e) => void saveMemberRole(member, e.target.value as MemberRole)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                    color: AXIOM.inputs.color,
                  }}
                >
                  {MEMBER_ROLE_SELECT.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {updatingMemberId === member.id && (
                  <p className="text-xs text-slate-500 mt-1">Saving…</p>
                )}
              </div>

              <div className="space-y-2 mb-4 pb-4" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Joined</span>
                  <span className="text-slate-300">{member.joinedDate ? formatDate(member.joinedDate) : 'N/A'}</span>
                </div>
                {member.lastActive && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Last active</span>
                    <span className="text-green-400">{getRelativeTime(member.lastActive)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Permissions</span>
                  <span className="text-cyan-400">{member.permissions.includes('all') ? 'All' : member.permissions.length}</span>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Updating the role saves immediately and updates access for that person.
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {activeView === 'roles' && (
        <div className="space-y-4">
          {/* Role Definitions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleDefinitions.map((role, index) => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="p-6 rounded-2xl"
                style={AXIOM.containers.list}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: role.color === 'purple' ? AXIOM.iconBoxes.purple :
                                   role.color === 'cyan' ? AXIOM.iconBoxes.cyan :
                                   role.color === 'blue' ? AXIOM.iconBoxes.blue :
                                   AXIOM.iconBoxes.green,
                        boxShadow: role.color === 'purple' ? AXIOM.shadows.iconPurple :
                                   role.color === 'cyan' ? AXIOM.shadows.iconCyan :
                                   role.color === 'blue' ? AXIOM.shadows.iconBlue :
                                   AXIOM.shadows.iconGreen,
                      }}
                    >
                      {role.id === 'org_admin' && <Crown className="size-6 text-white" />}
                      {role.id === 'accountant' && <DollarSign className="size-6 text-white" />}
                      {role.id === 'team_member' && <Users className="size-6 text-white" />}
                      {role.id === 'viewer' && <Eye className="size-6 text-white" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{role.name}</h3>
                      <p className="text-sm text-slate-400">{role.description}</p>
                    </div>
                  </div>
                  <span 
                    className="px-3 py-1 rounded-lg text-xs font-medium"
                    style={AXIOM.badges.info}
                  >
                    {roleMemberCounts[role.id] ?? 0}{' '}
                    {(roleMemberCounts[role.id] ?? 0) === 1 ? 'member' : 'members'}
                  </span>
                </div>

                {(() => {
                  const roleIds = effectivePermissionIds(role.id, rolePermissions);
                  const isEditing = editingRoleId === role.id;
                  const isFullAccess = (rolePermissions[role.id] ?? []).includes('all');

                  if (isEditing) {
                    return (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500 font-medium uppercase">
                          Permissions ({roleIds.length}/{allPermissions.length})
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {allPermissions.map((permission) => {
                            const checked = roleIds.includes(permission.id);
                            const inputId = `perm-${role.id}-${permission.id}`;
                            return (
                              <label
                                key={permission.id}
                                htmlFor={inputId}
                                className="p-2 rounded-lg text-xs flex items-center gap-2 cursor-pointer"
                                style={AXIOM.containers.item}
                              >
                                <input
                                  id={inputId}
                                  type="checkbox"
                                  checked={checked}
                                  disabled={rolePermissionsMutation.loading}
                                  onChange={() => void toggleRolePermission(role.id, permission.id)}
                                  className="size-4 rounded border-2 border-white/20 bg-slate-800 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer disabled:opacity-50"
                                />
                                <span className="text-slate-300">{permission.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 font-medium uppercase">Permissions</p>
                      {isFullAccess ? (
                        <div className="p-3 rounded-lg" style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                          <div className="flex items-center gap-2">
                            <Unlock className="size-4 text-purple-400" />
                            <span className="text-sm text-purple-400 font-medium">Full Access - All Permissions</span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {roleIds.slice(0, 6).map((permId) => {
                            const permission = allPermissions.find(p => p.id === permId);
                            if (!permission) return null;
                            return (
                              <div
                                key={permId}
                                className="p-2 rounded-lg text-xs flex items-center gap-2"
                                style={AXIOM.containers.item}
                              >
                                <CheckCircle className="size-3 text-green-400" />
                                <span className="text-slate-300">{permission.name}</span>
                              </div>
                            );
                          })}
                          {roleIds.length > 6 && (
                            <div className="p-2 rounded-lg text-xs flex items-center gap-2" style={AXIOM.containers.item}>
                              <span className="text-cyan-400">+{roleIds.length - 6} more</span>
                            </div>
                          )}
                          {roleIds.length === 0 && (
                            <div className="p-2 rounded-lg text-xs col-span-2" style={AXIOM.containers.item}>
                              <span className="text-slate-500">No permissions assigned</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-4 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                  style={AXIOM.buttons.secondary}
                  onClick={() => setEditingRoleId(editingRoleId === role.id ? null : role.id)}
                >
                  {editingRoleId === role.id ? (
                    <>
                      <CheckCircle className="size-4" />
                      Done
                    </>
                  ) : (
                    <>
                      <Edit className="size-4" />
                      Edit Role
                    </>
                  )}
                </motion.button>
              </motion.div>
            ))}
          </div>

          {/* All Permissions Matrix.
              Read-only by design: this is a summary cross-referencing every permission
              against every role, driven by the same `rolePermissions` state as the cards
              above. Actual editing happens per-role via "Edit Role" on those cards —
              editing a 12x4 grid inline here would be much fussier UX for no real gain. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.list}
          >
            <h3 className="text-xl font-bold text-white mb-1">All Permissions</h3>
            <p className="text-xs text-slate-500 mb-4">
              What each role currently grants. Edit a role's permissions from its card above.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-xs text-slate-500 font-medium uppercase pb-3 pr-4">
                      Permission
                    </th>
                    {roleDefinitions.map((role) => (
                      <th key={role.id} className="text-center text-xs text-slate-400 font-medium pb-3 px-3 whitespace-nowrap">
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allPermissions.map((permission) => {
                    const Icon = permission.icon;
                    return (
                      <tr key={permission.id} style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Icon className="size-4 text-slate-400 flex-shrink-0" />
                            <div>
                              <p className="text-slate-200">{permission.name}</p>
                              <p className="text-xs text-slate-500">{permission.description}</p>
                            </div>
                          </div>
                        </td>
                        {roleDefinitions.map((role) => {
                          const granted = effectivePermissionIds(role.id, rolePermissions).includes(permission.id);
                          return (
                            <td key={role.id} className="text-center py-3 px-3">
                              {granted ? (
                                <CheckCircle className="size-4 text-green-400 inline-block" />
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {activeView === 'activity' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Recent Activity</h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={AXIOM.buttons.secondary}
            >
              <Filter className="size-4" />
              Filter
            </motion.button>
          </div>

          {activityEntries.length === 0 ? (
            <div
              className="p-10 rounded-2xl text-center text-slate-400 text-sm"
              style={AXIOM.containers.item}
            >
              No activity yet.
            </div>
          ) : (
            <div className="space-y-3">
              {activityEntries.map((entry) => {
                const actionLower = entry.action.toLowerCase();
                const category = actionLower.includes('invit')
                  ? 'invite'
                  : actionLower.includes('role')
                  ? 'role'
                  : actionLower.includes('permission')
                  ? 'permission'
                  : 'default';
                return (
                  <div
                    key={entry.id}
                    className="p-4 rounded-xl flex items-start gap-4"
                    style={AXIOM.containers.item}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: category === 'invite' ? AXIOM.iconBoxes.cyan :
                                   category === 'permission' ? AXIOM.iconBoxes.purple :
                                   category === 'role' ? AXIOM.iconBoxes.amber :
                                   AXIOM.iconBoxes.green,
                        boxShadow: category === 'invite' ? AXIOM.shadows.iconCyan :
                                  category === 'permission' ? AXIOM.shadows.iconPurple :
                                  category === 'role' ? AXIOM.shadows.iconAmber :
                                  AXIOM.shadows.iconGreen,
                      }}
                    >
                      {category === 'invite' && <Mail className="size-5 text-white" />}
                      {category === 'permission' && <Shield className="size-5 text-white" />}
                      {category === 'role' && <Crown className="size-5 text-white" />}
                      {category === 'default' && <Activity className="size-5 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-medium">{entry.userName}</p>
                          <p className="text-sm text-slate-400">{entry.action}</p>
                          <p className="text-xs text-slate-500 mt-1">{entry.details}</p>
                        </div>
                        <span className="text-xs text-slate-500">{formatDateTime(entry.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {activeView === 'invitations' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Pending Invitations</h3>
              <p className="text-sm text-slate-400 mt-1">Team members awaiting acceptance</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setInviteDialogOpen(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                color: '#ffffff',
              }}
            >
              <Plus className="size-4" />
              New Invite
            </motion.button>
          </div>

          <div className="space-y-3">
            {teamMembers.filter(m => m.status === 'pending').map((member) => (
              <div
                key={member.id}
                className="p-6 rounded-xl"
                style={AXIOM.containers.item}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: AXIOM.iconBoxes.amber,
                        boxShadow: AXIOM.shadows.iconAmber,
                      }}
                    >
                      <span className="text-white font-bold text-lg">{(member.name || '?')[0]}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{member.name}</p>
                      <p className="text-sm text-slate-400">{member.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span 
                          className="px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                          style={getRoleBadge(member.role)}
                        >
                          {getRoleIcon(member.role)}
                          {member.role.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-500">
                          Invited {member.joinedDate ? formatDate(member.joinedDate) : 'recently'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                      style={AXIOM.buttons.secondary}
                      onClick={() => toast.success('Invitation resent')}
                    >
                      <Mail className="size-4" />
                      Resend
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                      style={AXIOM.buttons.danger}
                      onClick={() => toast.success('Invitation cancelled')}
                    >
                      <Trash2 className="size-4" />
                      Cancel
                    </motion.button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              They'll be added to this organization and, if the server has invite emails
              configured, sent a real sign-in invite.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="jane@company.com"
                className="w-full px-3 py-2 rounded-lg text-sm text-white"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Name (optional)</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 rounded-lg text-sm text-white"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
              >
                <option value="org_admin">Org Admin</option>
                <option value="accountant">Accountant</option>
                <option value="team_member">Team Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setInviteDialogOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 text-sm"
              style={AXIOM.buttons.outline}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleInvite()}
              disabled={inviteMutation.loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={AXIOM.buttons.success}
            >
              {inviteMutation.loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Send Invite
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}