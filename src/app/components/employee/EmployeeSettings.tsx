import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { AXIOM } from '../../../styles/axiom-tokens';
import { Settings, User, Bell, Shield, Globe, Palette, HelpCircle } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { employeeService } from '@/services/employeeService';
import { organizationService } from '@/services/organizationService';
import { useService, useServiceArray } from '@/hooks/useService';

interface EmployeeSettingsState {
  emailNotifications: boolean;
  expenseApprovals: boolean;
  timesheetReminders: boolean;
  projectUpdates: boolean;
  companyAnnouncements: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: string;
}

const DEFAULT_SETTINGS: EmployeeSettingsState = {
  emailNotifications: true,
  expenseApprovals: true,
  timesheetReminders: true,
  projectUpdates: false,
  companyAnnouncements: true,
  twoFactorAuth: true,
  sessionTimeout: '30 minutes',
};

const inputStyle = {
  background: AXIOM.inputs.background,
  border: AXIOM.inputs.border,
  color: AXIOM.inputs.color,
};

const SESSION_TIMEOUT_OPTIONS = ['15 minutes', '30 minutes', '60 minutes', 'Never'];

type ToggleKey = Exclude<keyof EmployeeSettingsState, 'sessionTimeout'>;

type SettingsItem =
  | { label: string; value: string; type: 'readonly' }
  | { label: string; value: boolean; type: 'toggle'; key: ToggleKey }
  | { label: string; value: string; type: 'select'; key: 'sessionTimeout' };

interface SettingsSection {
  title: string;
  icon: typeof User;
  color: string;
  items: SettingsItem[];
}

export function EmployeeSettings() {
  const { user, currentOrganization } = useAuth();
  // Real profile facts for THIS employee. Phone/department used to be literals
  // ('+1 555-0105' / 'Development'), so every employee saw one person's details.
  const { data: summary } = useService(
    () => employeeService.getDashboardSummary(currentOrganization?.id ?? '', user?.id ?? ''),
    [currentOrganization?.id, user?.id],
  );

  const settingsKey = user?.id ? `employee-settings:${user.id}` : null;
  const [settings, setSettings] = useState<EmployeeSettingsState>(() => {
    if (settingsKey) {
      try {
        const stored = localStorage.getItem(settingsKey);
        if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch {
        // Ignore malformed/blocked localStorage; fall back to defaults.
      }
    }
    return DEFAULT_SETTINGS;
  });

  const toggleSetting = (key: ToggleKey) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    if (settingsKey) {
      try {
        localStorage.setItem(settingsKey, JSON.stringify(settings));
      } catch {
        // Storage unavailable (e.g. private mode) — settings still hold for this session.
      }
    }
    toast.success('Settings saved');
  };

  const sections: SettingsSection[] = [
    { title: 'Profile Settings', icon: User, color: 'blue', items: [
      { label: 'Full Name', value: user?.name ?? '', type: 'readonly' },
      { label: 'Email', value: user?.email ?? '', type: 'readonly' },
      { label: 'Department', value: summary?.department ?? '—', type: 'readonly' },
      { label: 'Position', value: summary?.position ?? '—', type: 'readonly' },
    ]},
    { title: 'Notification Preferences', icon: Bell, color: 'purple', items: [
      { label: 'Email Notifications', value: settings.emailNotifications, type: 'toggle', key: 'emailNotifications' },
      { label: 'Expense Approvals', value: settings.expenseApprovals, type: 'toggle', key: 'expenseApprovals' },
      { label: 'Timesheet Reminders', value: settings.timesheetReminders, type: 'toggle', key: 'timesheetReminders' },
      { label: 'Project Updates', value: settings.projectUpdates, type: 'toggle', key: 'projectUpdates' },
      { label: 'Company Announcements', value: settings.companyAnnouncements, type: 'toggle', key: 'companyAnnouncements' },
    ]},
    { title: 'Security', icon: Shield, color: 'green', items: [
      { label: 'Two-Factor Authentication', value: settings.twoFactorAuth, type: 'toggle', key: 'twoFactorAuth' },
      { label: 'Session Timeout', value: settings.sessionTimeout, type: 'select', key: 'sessionTimeout' },
    ]},
  ];

  return (
    <div className="p-8 space-y-8" style={{ background: AXIOM.backgrounds.main, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2" style={AXIOM.text.titleStyle as any}>My Settings</h1>
        <p className="text-slate-400 font-mono">Manage your profile and preferences</p>
      </motion.div>

      {sections.map((section, si) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + si * 0.1 }}
          className="rounded-2xl p-6"
          style={{
            background: AXIOM.backgrounds.chartContainer,
            border: AXIOM.borders[section.color as keyof typeof AXIOM.borders],
            boxShadow: AXIOM.shadows[section.color as keyof typeof AXIOM.shadows],
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-lg flex items-center justify-center" style={{
              background: AXIOM.iconBoxes[section.color as keyof typeof AXIOM.iconBoxes],
            }}>
              <section.icon className="size-5 text-white" />
            </div>
            <h3 className="text-white font-bold">{section.title}</h3>
          </div>

          <div className="space-y-4">
            {section.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between p-4 rounded-lg" style={{
                ...AXIOM.containers.item,
              }}>
                <span className="text-sm text-slate-300 font-mono">{item.label}</span>
                {item.type === 'toggle' ? (
                  <div
                    role="switch"
                    aria-checked={item.value}
                    tabIndex={0}
                    onClick={() => toggleSetting(item.key)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSetting(item.key);
                      }
                    }}
                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${item.value ? 'bg-blue-500/50' : 'bg-slate-700/50'}`}
                  >
                    <div className={`absolute top-0.5 size-5 rounded-full transition-all ${item.value ? 'left-6 bg-blue-400' : 'left-0.5 bg-slate-500'}`} />
                  </div>
                ) : item.type === 'readonly' ? (
                  <span className="text-sm text-slate-500 font-mono">{String(item.value)}</span>
                ) : (
                  <select
                    value={item.value}
                    onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.value }))}
                    className="text-sm font-mono text-right rounded-lg px-3 py-1.5"
                    style={inputStyle}
                  >
                    {SESSION_TIMEOUT_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex justify-end"
      >
        <button
          onClick={handleSave}
          className="px-8 py-3 rounded-xl text-white font-medium"
          style={AXIOM.buttons.action}
        >
          Save Changes
        </button>
      </motion.div>
    </div>
  );
}

export function EmployeeHelp() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? '';
  const { data: members, loading: membersLoading } = useServiceArray(
    () => organizationService.getMembers(orgId),
    [orgId],
    ['organizationMembers'],
  );

  const adminEmail = useMemo(() => {
    const owner = members.find(m => m.role === 'owner');
    if (owner?.user?.email) return owner.user.email;
    const admin = members.find(m => m.role === 'admin');
    return admin?.user?.email ?? null;
  }, [members]);

  const handleContactSupport = () => {
    if (!adminEmail) return;
    window.location.href = `mailto:${adminEmail}?subject=${encodeURIComponent('Support request')}`;
  };

  const faqs = [
    { q: 'How do I submit an expense claim?', a: 'Go to My Expenses and click "New Expense". Fill in the details, attach a receipt, and submit.' },
    { q: 'How do I log my hours?', a: 'Use the Timesheet page to either start the live timer or manually add time entries.' },
    { q: 'When are payslips available?', a: 'Payslips are generated on the last day of each month and available on the Payslips page.' },
    { q: 'Who approves my expenses?', a: 'Your department head or the finance team reviews all expense claims.' },
    { q: 'How do I change my notification settings?', a: 'Go to My Settings > Notification Preferences to customize.' },
  ];

  return (
    <div className="p-8 space-y-8" style={{ background: AXIOM.backgrounds.main, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2" style={AXIOM.text.titleStyle as any}>Help & Support</h1>
        <p className="text-slate-400 font-mono">Frequently asked questions and support resources</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl overflow-hidden"
        style={{ ...AXIOM.containers.list, borderRadius: '1rem' }}
      >
        <div className="p-6 pb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <HelpCircle className="size-5 text-blue-400" />
            Frequently Asked Questions
          </h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(148, 163, 184, 0.1)' }}>
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="px-6 py-5"
            >
              <p className="text-white font-medium mb-2">{faq.q}</p>
              <p className="text-sm text-slate-400">{faq.a}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-6 text-center"
        style={{
          background: AXIOM.backgrounds.chartContainer,
          border: AXIOM.borders.blue,
        }}
      >
        <HelpCircle className="size-12 text-blue-400 mx-auto mb-4" />
        <h3 className="text-white font-bold mb-2">Need More Help?</h3>
        <p className="text-sm text-slate-400 mb-4">Contact your HR department or IT support team</p>
        <button
          onClick={handleContactSupport}
          disabled={!adminEmail}
          title={!adminEmail ? 'No support contact found for this organization yet' : undefined}
          className="px-6 py-3 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          style={AXIOM.buttons.action}
        >
          {membersLoading ? 'Loading…' : 'Contact Support'}
        </button>
      </motion.div>
    </div>
  );
}