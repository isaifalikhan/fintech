import { motion } from 'motion/react';
import { AXIOM } from '../../../styles/axiom-tokens';
import { Settings, User, Bell, Shield, Globe, Palette, HelpCircle } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';

export function EmployeeSettings() {
  const { user } = useAuth();
  const sections = [
    { title: 'Profile Settings', icon: User, color: 'blue', items: [
      { label: 'Full Name', value: user?.name ?? '', type: 'text' },
      { label: 'Email', value: user?.email ?? '', type: 'text' },
      { label: 'Phone', value: '+1 555-0105', type: 'text' },
      { label: 'Department', value: 'Development', type: 'readonly' },
    ]},
    { title: 'Notification Preferences', icon: Bell, color: 'purple', items: [
      { label: 'Email Notifications', value: true, type: 'toggle' },
      { label: 'Expense Approvals', value: true, type: 'toggle' },
      { label: 'Timesheet Reminders', value: true, type: 'toggle' },
      { label: 'Project Updates', value: false, type: 'toggle' },
      { label: 'Company Announcements', value: true, type: 'toggle' },
    ]},
    { title: 'Security', icon: Shield, color: 'green', items: [
      { label: 'Two-Factor Authentication', value: true, type: 'toggle' },
      { label: 'Session Timeout', value: '30 minutes', type: 'select' },
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
                  <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${item.value ? 'bg-blue-500/50' : 'bg-slate-700/50'}`}>
                    <div className={`absolute top-0.5 size-5 rounded-full transition-all ${item.value ? 'left-6 bg-blue-400' : 'left-0.5 bg-slate-500'}`} />
                  </div>
                ) : item.type === 'readonly' ? (
                  <span className="text-sm text-slate-500 font-mono">{String(item.value)}</span>
                ) : (
                  <input
                    type="text"
                    defaultValue={String(item.value)}
                    className="text-sm text-white font-mono text-right bg-transparent border-none outline-none w-48"
                  />
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
        <button className="px-8 py-3 rounded-xl text-white font-medium" style={AXIOM.buttons.action}>
          Save Changes
        </button>
      </motion.div>
    </div>
  );
}

export function EmployeeHelp() {
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
        <button className="px-6 py-3 rounded-xl text-white font-medium" style={AXIOM.buttons.action}>
          Contact Support
        </button>
      </motion.div>
    </div>
  );
}