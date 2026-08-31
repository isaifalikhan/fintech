import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService, useServiceArray } from '@/hooks/useService';
import { fetchOrgAiSettings } from '@/services/aiSettingsService';
import { sendAiChatMessage } from '@/services/aiAssistantService';
import { organizationService } from '@/services/organizationService';
import { auditService } from '@/services/auditService';
import type { AiChatTurn, OrgAiIntegrationSettings } from '@/services/types';
import { AiChatPanel } from '@/app/components/shared/AiChatPanel';
import { useOrgWorkspaceNav } from './OrgWorkspaceNavContext';
import { AXIOM } from '../../../styles/axiom-tokens';
import {
  Brain,
  Lightbulb,
  Activity,
  MessageCircle,
  Search,
  ArrowRight,
  Receipt,
  Landmark,
  Wallet,
  Mail,
  Crown,
  Shield,
} from 'lucide-react';

const CHAT_QUICK_PROMPTS = [
  'How is my cash position?',
  'What are my biggest expenses?',
  'Explain profit margin trends',
  'How do I invite a team member?',
];

type AIPortalTab = 'ask' | 'insights' | 'activity';

/** Simple case-insensitive substring → OrgView lookup for the command bar (Task 4). Not an LLM. */
const COMMAND_BAR_ROUTES: { keywords: string[]; view: string; label: string }[] = [
  { keywords: ['transaction', 'ledger', 'invoice'], view: 'transactions', label: 'Transactions' },
  { keywords: ['loan'], view: 'loans', label: 'Loans' },
  { keywords: ['budget'], view: 'budgets', label: 'Budgets' },
  { keywords: ['team', 'invite', 'member'], view: 'team', label: 'Team' },
  { keywords: ['payroll', 'salary'], view: 'payroll', label: 'Payroll' },
  { keywords: ['report'], view: 'reports', label: 'Reports' },
  { keywords: ['setting'], view: 'settings', label: 'Settings' },
  { keywords: ['expense', 'add expense', 'quick add'], view: 'quick-add', label: 'Quick Add' },
  { keywords: ['import', 'statement', 'upload'], view: 'import', label: 'Import' },
  { keywords: ['account', 'bank'], view: 'accounts', label: 'Accounts' },
  { keywords: ['asset'], view: 'assets', label: 'Assets' },
  { keywords: ['inventory'], view: 'inventory', label: 'Inventory' },
  { keywords: ['project'], view: 'projects', label: 'Projects' },
  { keywords: ['forecast'], view: 'forecast', label: 'Forecast' },
  { keywords: ['dashboard'], view: 'dashboard', label: 'Dashboard' },
];

function matchCommandBarRoute(text: string): { view: string; label: string } | null {
  const lower = text.toLowerCase();
  const hit = COMMAND_BAR_ROUTES.find((r) => r.keywords.some((k) => lower.includes(k)));
  return hit ? { view: hit.view, label: hit.label } : null;
}

export function AIFinancialAssistant() {
  const svc = useOrgServices();
  const { orgId } = svc;
  const goToOrgView = useOrgWorkspaceNav();
  const [aiSettings, setAiSettings] = useState<OrgAiIntegrationSettings | null>(null);
  const [activeTab, setActiveTab] = useState<AIPortalTab>('ask');
  const [commandInput, setCommandInput] = useState('');
  const [commandMessage, setCommandMessage] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      void (async () => {
        const res = await fetchOrgAiSettings(orgId);
        setAiSettings(res.success ? res.data ?? null : null);
      })();
    };
    sync();
    window.addEventListener('finance-os-ai-settings', sync);
    return () => window.removeEventListener('finance-os-ai-settings', sync);
  }, [orgId]);

  /** Server resolves the org's own configured provider key first, then the free Groq fallback,
   *  then an honest "not configured" error — this component doesn't need to know which. */
  const getChatReply = useCallback(
    async (text: string, history: AiChatTurn[]): Promise<{ response: string }> => {
      const res = await sendAiChatMessage(orgId, text, history, 'org');
      if (!res.success) throw new Error(res.error || 'Something went wrong. Try again.');
      return { response: res.data.reply };
    },
    [orgId],
  );

  // ── Task 2: real, computed insights (Ask tab's KPI/insights below stay demo — out of scope) ──
  const { data: txnResult } = useService(
    () => svc.transactions.getAll({ pageSize: 500 }),
    [svc.orgId],
    ['transactions'],
  );
  const pendingTransactionsCount = useMemo(
    () => (txnResult?.items ?? []).filter((t) => t.status === 'pending').length,
    [txnResult],
  );

  const { data: loans } = useServiceArray(
    () => svc.loans.getAll(),
    [svc.orgId],
    ['loans'],
  );
  const overdueLoansCount = useMemo(
    () => loans.filter((l) => l.status === 'overdue').length,
    [loans],
  );

  const { data: budgets } = useServiceArray(
    () => svc.budgets.getAll(),
    [svc.orgId],
    ['budgets'],
  );
  const overBudgetCount = useMemo(
    () => budgets.filter((b) => b.spentAmount > b.budgetedAmount).length,
    [budgets],
  );

  const { data: memberRows } = useServiceArray(
    () => organizationService.getMembers(orgId),
    [orgId],
    ['organizationMembers'],
  );
  const pendingInvitesCount = useMemo(
    () => memberRows.filter((m) => m.status === 'pending').length,
    [memberRows],
  );

  const insightCards = useMemo(() => {
    const cards: {
      id: string;
      icon: typeof Brain;
      color: 'red' | 'amber' | 'purple' | 'cyan';
      title: string;
      description: string;
      actionLabel: string;
      view: string;
    }[] = [];
    if (pendingTransactionsCount > 0) {
      cards.push({
        id: 'unclassified-transactions',
        icon: Receipt,
        color: 'amber',
        title: `${pendingTransactionsCount} transaction${pendingTransactionsCount === 1 ? '' : 's'} need classification`,
        description: 'These transactions are still pending review in your ledger.',
        actionLabel: 'Transactions',
        view: 'transactions',
      });
    }
    if (overdueLoansCount > 0) {
      cards.push({
        id: 'overdue-loans',
        icon: Landmark,
        color: 'red',
        title: `${overdueLoansCount} overdue loan${overdueLoansCount === 1 ? '' : 's'} ${overdueLoansCount === 1 ? 'needs' : 'need'} attention`,
        description: 'One or more loan records have passed their due date.',
        actionLabel: 'Loans',
        view: 'loans',
      });
    }
    if (overBudgetCount > 0) {
      cards.push({
        id: 'over-budget',
        icon: Wallet,
        color: 'purple',
        title: `${overBudgetCount} budget${overBudgetCount === 1 ? '' : 's'} over limit`,
        description: 'Spending has exceeded the budgeted amount for this period.',
        actionLabel: 'Budgets',
        view: 'budgets',
      });
    }
    if (pendingInvitesCount > 0) {
      cards.push({
        id: 'pending-invites',
        icon: Mail,
        color: 'cyan',
        title: `${pendingInvitesCount} pending invite${pendingInvitesCount === 1 ? '' : 's'} awaiting acceptance`,
        description: 'These team invitations have not been accepted yet.',
        actionLabel: 'Team',
        view: 'team',
      });
    }
    return cards;
  }, [pendingTransactionsCount, overdueLoansCount, overBudgetCount, pendingInvitesCount]);

  // ── Task 3: real activity feed ──────────────────────────────────────────
  const { data: activityEntries, loading: activityLoading } = useServiceArray(
    () => auditService.getAll(orgId),
    [orgId],
    ['auditLogs'],
  );

  const formatActivityTimestamp = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  // ── Task 4: command bar (keyword lookup, not a real LLM) ────────────────
  const handleCommandSubmit = () => {
    const text = commandInput.trim();
    if (!text) return;
    const match = matchCommandBarRoute(text);
    if (match && goToOrgView) {
      goToOrgView(match.view);
      setCommandInput('');
      setCommandMessage(null);
    } else {
      setCommandMessage("Try navigating from the sidebar, or ask the chat below.");
    }
  };

  const tabButtons: { id: AIPortalTab; label: string; icon: typeof Brain }[] = [
    { id: 'ask', label: 'Ask', icon: MessageCircle },
    { id: 'insights', label: 'Insights', icon: Lightbulb },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ background: '#0a0a0a' }}>
      {/* Header with Dashboard Gradient */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div 
            className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
            style={{ boxShadow: '0 10px 30px -10px rgba(168, 85, 247, 0.6)' }}
          >
            <Brain className="size-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold" style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>AI Financial Assistant</h1>
        </div>
        <p className="text-slate-400 text-xs">Pattern recognition, insights, and intelligent recommendations</p>
        {aiSettings && (aiSettings.providerName.trim() || aiSettings.modelName.trim()) && (
          <p className="text-slate-500 text-xs mt-2 max-w-2xl leading-relaxed">
            Integration: {aiSettings.providerName.trim() || 'Custom provider'}
            {aiSettings.modelName.trim() ? ` · Model: ${aiSettings.modelName.trim()}` : ''}
            {aiSettings.useCustomKey && aiSettings.apiKey
              ? ' · This key powers the chat below.'
              : ''}
          </p>
        )}
      </motion.div>

      {/* Task 4: command bar — keyword lookup only, not an LLM. Visible on every tab. */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div
          className="flex flex-col gap-2 p-2 rounded-2xl sm:flex-row sm:items-center"
          style={AXIOM.containers.list}
        >
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={commandInput}
              onChange={(e) => {
                setCommandInput(e.target.value);
                if (commandMessage) setCommandMessage(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCommandSubmit();
                }
              }}
              placeholder="Try 'loans' or 'add expense'..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
              style={{
                background: AXIOM.inputs.background,
                border: AXIOM.inputs.border,
                color: AXIOM.inputs.color,
              }}
            />
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCommandSubmit}
            className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            style={AXIOM.buttons.primary}
          >
            Go
            <ArrowRight className="size-4" />
          </motion.button>
        </div>
        <p className="text-xs text-slate-500 mt-1.5 px-1">
          {commandMessage ?? "Keyword search across common pages — not an AI, just text matching."}
        </p>
      </motion.div>

      {/* 3-tab structure (Task 1) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 p-2 rounded-2xl"
        style={AXIOM.containers.list}
      >
        {tabButtons.map((btn) => (
          <motion.button
            key={btn.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(btn.id)}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
            style={activeTab === btn.id ? AXIOM.buttons.primary : AXIOM.buttons.secondary}
          >
            <btn.icon className="size-4" />
            {btn.label}
          </motion.button>
        ))}
      </motion.div>

      {activeTab === 'ask' && (
        <AiChatPanel
          title="Ask the assistant"
          subtitle="Real answers grounded in your organization's data — ask about cash flow, expenses, margins, how to use Finance OS, or general finance questions."
          quickPrompts={CHAT_QUICK_PROMPTS}
          getReply={getChatReply}
          placeholder="Ask about cash flow, expenses, margins, or how to use Finance OS…"
          emptyStateHint="Start a conversation about your organization's finances or Finance OS itself."
        />
      )}

      {/* Task 2: real, computed Insights tab */}
      {activeTab === 'insights' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {insightCards.length === 0 ? (
            <div
              className="p-10 rounded-2xl text-center text-slate-400 text-sm"
              style={AXIOM.containers.list}
            >
              Nothing needs your attention right now.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {insightCards.map((card, idx) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.08 }}
                  className="p-6 rounded-2xl"
                  style={AXIOM.containers.list}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: AXIOM.iconBoxes[card.color],
                        boxShadow:
                          card.color === 'red' ? AXIOM.shadows.iconRed :
                          card.color === 'amber' ? AXIOM.shadows.iconAmber :
                          card.color === 'purple' ? AXIOM.shadows.iconPurple :
                          AXIOM.shadows.iconCyan,
                      }}
                    >
                      <card.icon className="size-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1">{card.title}</h3>
                      <p className="text-sm text-slate-400 mb-4">{card.description}</p>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => goToOrgView?.(card.view)}
                        className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                        style={AXIOM.buttons.secondary}
                      >
                        Go to {card.actionLabel}
                        <ArrowRight className="size-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Task 3: real Activity tab, backed by auditService */}
      {activeTab === 'activity' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Recent Activity</h3>
          </div>

          {activityLoading && activityEntries.length === 0 ? (
            <div className="p-10 rounded-2xl text-center text-slate-400 text-sm" style={AXIOM.containers.item}>
              Loading activity…
            </div>
          ) : activityEntries.length === 0 ? (
            <div className="p-10 rounded-2xl text-center text-slate-400 text-sm" style={AXIOM.containers.item}>
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
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-white font-medium">{entry.userName}</p>
                          <p className="text-sm text-slate-400">{entry.action}</p>
                          <p className="text-xs text-slate-500 mt-1">{entry.details}</p>
                        </div>
                        <span className="text-xs text-slate-500 shrink-0">{formatActivityTimestamp(entry.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
