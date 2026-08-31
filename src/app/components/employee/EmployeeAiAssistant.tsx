import { useCallback } from 'react';
import { motion } from 'motion/react';
import { Bot, DollarSign, Clock, FileText, ArrowRight } from 'lucide-react';
import { PageShell, PageHeader } from '../layout';
import { AiChatPanel } from '@/app/components/shared/AiChatPanel';
import { AXIOM } from '../../../styles/axiom-tokens';
import { useAuth } from '@/contexts/AuthContext';
import { sendAiChatMessage } from '@/services/aiAssistantService';
import type { AiChatTurn } from '@/services/types';
import type { EmployeeView } from './EmployeeWorkspace';

interface EmployeeAiAssistantProps {
  onNavigate: (view: EmployeeView) => void;
}

const CHAT_QUICK_PROMPTS = [
  'How many hours have I logged this week?',
  "What's the status of my last expense claim?",
  'When is my next payslip?',
];

const QUICK_ACTIONS: { id: EmployeeView; label: string; description: string; icon: typeof DollarSign; color: 'green' | 'blue' | 'purple' }[] = [
  { id: 'expenses', label: 'View My Expenses', description: 'Check claim status and submit new expenses', icon: DollarSign, color: 'green' },
  { id: 'timesheet', label: 'View My Timesheet', description: 'Review logged hours and entries', icon: Clock, color: 'blue' },
  { id: 'payslips', label: 'View My Payslips', description: 'See pay history and upcoming pay dates', icon: FileText, color: 'purple' },
];

export function EmployeeAiAssistant({ onNavigate }: EmployeeAiAssistantProps) {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? 'org-001';

  const getChatReply = useCallback(
    async (text: string, history: AiChatTurn[]): Promise<{ response: string }> => {
      const res = await sendAiChatMessage(orgId, text, history, 'employee');
      if (!res.success) throw new Error(res.error || 'Something went wrong. Try again.');
      return { response: res.data.reply };
    },
    [orgId],
  );

  return (
    <PageShell>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title="AI Assistant"
          description="Ask about your hours, expenses, and payslips"
        />
      </motion.div>

      <AiChatPanel
        title="AI Assistant"
        subtitle="Real answers grounded in your own timesheet, expenses, and payslips — or ask anything about how to use Finance OS."
        quickPrompts={CHAT_QUICK_PROMPTS}
        getReply={getChatReply}
        placeholder="Ask about your hours, expenses, or payslips…"
        emptyStateHint="Start a conversation about your work or Finance OS itself."
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="text-sm font-semibold text-slate-300 mb-3 px-1">Quick actions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {QUICK_ACTIONS.map((action, idx) => (
            <motion.button
              key={action.id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate(action.id)}
              className="p-5 rounded-2xl text-left flex flex-col gap-3"
              style={AXIOM.containers.list}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{
                  background: AXIOM.iconBoxes[action.color],
                  boxShadow: AXIOM.shadows[`icon${action.color[0].toUpperCase()}${action.color.slice(1)}` as keyof typeof AXIOM.shadows],
                }}
              >
                <action.icon className="size-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{action.label}</h3>
                  <ArrowRight className="size-4 text-slate-500" />
                </div>
                <p className="text-sm text-slate-400 mt-1">{action.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <div className="flex items-start gap-3 px-1 text-xs text-slate-500">
        <Bot className="size-4 shrink-0 mt-0.5" aria-hidden />
        <p>This assistant answers with sample data until it&apos;s connected to a live backend.</p>
      </div>
    </PageShell>
  );
}
