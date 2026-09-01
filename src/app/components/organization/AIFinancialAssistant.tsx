import { motion } from 'motion/react';
<<<<<<< HEAD
import { useEffect, useMemo, useRef, useState } from 'react';
=======
import { useCallback, useEffect, useMemo, useState } from 'react';
>>>>>>> fffd0e898e03d9f1d4ab20001149b15c2c9339d5
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService, useServiceArray } from '@/hooks/useService';
import { fetchOrgAiSettings } from '@/services/aiSettingsService';
import { sendAiChatMessage } from '@/services/aiAssistantService';
import { organizationService } from '@/services/organizationService';
import { auditService } from '@/services/auditService';
<<<<<<< HEAD
import { isHttpBackendConfigured } from '@/lib/apiClient';
import type { OrgAiIntegrationSettings } from '@/services/types';
import { AiChatPanel, type AiChatPanelHandle } from '@/app/components/shared/AiChatPanel';
=======
import type { AiChatTurn, OrgAiIntegrationSettings } from '@/services/types';
import { AiChatPanel } from '@/app/components/shared/AiChatPanel';
>>>>>>> fffd0e898e03d9f1d4ab20001149b15c2c9339d5
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
  const chatPanelRef = useRef<AiChatPanelHandle>(null);

  const takeAction = (recommendation: string) => {
    setActiveTab('ask');
    chatPanelRef.current?.sendMessage(`Help me act on this recommendation: ${recommendation}`);
  };

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

<<<<<<< HEAD
  /** In local-HTTP mode, always sends to the real `/ai-chat` route — it resolves to the org's own
   *  configured provider key if set, otherwise the server's built-in Groq fallback, so a reply is
   *  "live" either way; a genuine failure (bad key, provider outage, nothing configured at all) is
   *  surfaced as an honest error rather than silently swapped for a canned reply. Mock/Supabase mode
   *  has no server to proxy through, so it keeps using the local demo replies. */
=======
<<<<<<< HEAD
  /** Tries the org's configured provider (server-side proxy) first; falls back to the local
   *  demo reply on any failure — missing/invalid key, provider outage, or mock/Supabase mode
   *  where there's no server to proxy through. Never throws: the fallback IS the error handling. */
>>>>>>> fffd0e898e03d9f1d4ab20001149b15c2c9339d5
  const getChatReply = async (text: string): Promise<{ response: string; suggestions?: string[] }> => {
    if (isHttpBackendConfigured()) {
      const res = await sendAiChatMessage(orgId, text, [], 'org');
      if (res.success) return { response: res.data.reply };
      throw new Error(res.error || 'Assistant is unavailable right now. Try again in a moment.');
    }
    return matchDemoReply(text);
  };

  // ── Task 2: real, computed insights (Ask tab's KPI/insights below stay demo — out of scope) ──
  const { data: txnResult, loading: txnLoading } = useService(
=======
  // ── Task 2: real, computed insights ──
  const { data: txnResult } = useService(
>>>>>>> worktree-ai-assistant-groq-v2
    () => svc.transactions.getAll({ pageSize: 500 }),
    [svc.orgId],
    ['transactions'],
  );
  const pendingTransactionsCount = useMemo(
    () => (txnResult?.items ?? []).filter((t) => t.status === 'pending').length,
    [txnResult],
  );

  const { data: loans, loading: loansLoading } = useServiceArray(
    () => svc.loans.getAll(),
    [svc.orgId],
    ['loans'],
  );
  const overdueLoansCount = useMemo(
    () => loans.filter((l) => l.status === 'overdue').length,
    [loans],
  );

  const { data: budgets, loading: budgetsLoading } = useServiceArray(
    () => svc.budgets.getAll(),
    [svc.orgId],
    ['budgets'],
  );
  const overBudgetCount = useMemo(
    () => budgets.filter((b) => b.spentAmount > b.budgetedAmount).length,
    [budgets],
  );

  const { data: memberRows, loading: memberRowsLoading } = useServiceArray(
    () => organizationService.getMembers(orgId),
    [orgId],
    ['organizationMembers'],
  );
  const insightsLoading = txnLoading || loansLoading || budgetsLoading || memberRowsLoading;
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
<<<<<<< HEAD
      <>
      {/* ORG-P04: chat panel — send path + empty state + errors in UI */}
      <AiChatPanel
        ref={chatPanelRef}
        title="Ask the assistant"
        subtitle={
          isHttpBackendConfigured()
            ? hasLiveAiProvider
              ? `Connected to ${aiSettings?.providerName.trim() || 'your configured provider'} — replies come from the org's live AI connection (Integrations).`
              : 'Live replies from the built-in assistant. Connect your own provider under AI Assistant → Integrations to use a custom model.'
            : "Demo replies for now — the local API server isn't running, so there's no backend to send live messages to."
        }
        quickPrompts={CHAT_QUICK_PROMPTS}
        getReply={getChatReply}
        placeholder="Ask about cash flow, expenses, or margins…"
        emptyStateHint="Start a conversation about your finances. Answers below the fold are sample dashboards until your data is connected."
      />

      {/* Current Situation - Dashboard Style */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-8 rounded-3xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 15, 50, 0.6) 0%, rgba(10, 5, 20, 0.8) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          boxShadow: '0 20px 60px -20px rgba(6, 182, 212, 0.5)',
        }}
      >
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.3), transparent 70%)',
          }}
        />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center"
              style={{ boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)' }}
            >
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Current Financial Situation</h2>
              <p className="text-slate-400 text-sm">AI-powered analysis of your business health</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-2xl"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Cash Position</span>
                <CheckCircle2 className="size-4 text-green-400" />
              </div>
              <p className="font-bold text-white text-xl capitalize">{currentSituation.cashPosition}</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="p-4 rounded-2xl"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Monthly Burn Rate</span>
                <TrendingDown className="size-4 text-orange-400" />
              </div>
              <p className="font-bold text-white text-xl">{currentSituation.burnRate}</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-2xl"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Runway</span>
                <Target className="size-4 text-cyan-400" />
              </div>
              <p className="font-bold text-white text-xl">{currentSituation.runway}</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="p-4 rounded-2xl"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Profit Margin</span>
                <TrendingUp className="size-4 text-green-400" />
              </div>
              <p className="font-bold text-white text-xl">{currentSituation.profitMargin}</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4 rounded-2xl"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Personal Drawings</span>
                <AlertTriangle className="size-4 text-red-400" />
              </div>
              <p className="font-bold text-white text-xl">{currentSituation.personalDrawings}</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
              className="p-4 rounded-2xl"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Team Utilization</span>
                <Users className="size-4 text-blue-400" />
              </div>
              <p className="font-bold text-white text-xl">{currentSituation.teamUtilization}</p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Future Projections - Dashboard Style */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-8 rounded-3xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 15, 50, 0.6) 0%, rgba(10, 5, 20, 0.8) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            boxShadow: '0 20px 60px -20px rgba(16, 185, 129, 0.5)',
          }}
        >
          <div 
            className="absolute inset-0 opacity-40"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.3), transparent 70%)',
            }}
          />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center"
                style={{ boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.6)' }}
              >
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Next Quarter Projection</h2>
                <p className="text-slate-400 text-sm">AI-powered forecast based on patterns</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl" style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
              }}>
                <div className="text-xs text-slate-400 mb-2">Expected Revenue</div>
                <p className="text-3xl font-bold text-white mb-3">{futureProjections.nextQuarter.revenue}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-800 rounded-full h-2">
                    <motion.div 
                      className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${futureProjections.nextQuarter.confidence}%` }}
                      transition={{ duration: 1.5, delay: 0.7 }}
                      style={{ boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)' }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{futureProjections.nextQuarter.confidence}% confidence</span>
                </div>
              </div>
              <div className="p-4 bg-green-600/20 border border-green-500/30 rounded-2xl">
                <div className="text-xs text-green-400 mb-2">Expected Profit</div>
                <p className="text-3xl font-bold text-white">{futureProjections.nextQuarter.profit}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-8 rounded-3xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 15, 50, 0.6) 0%, rgba(10, 5, 20, 0.8) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 20px 60px -20px rgba(59, 130, 246, 0.5)',
          }}
        >
          <div 
            className="absolute inset-0 opacity-40"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.3), transparent 70%)',
            }}
          />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"
                style={{ boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.6)' }}
              >
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Next Year Projection</h2>
                <p className="text-slate-400 text-sm">Long-term forecast</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl" style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
              }}>
                <div className="text-xs text-slate-400 mb-2">Expected Revenue</div>
                <p className="text-3xl font-bold text-white mb-3">{futureProjections.nextYear.revenue}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-800 rounded-full h-2">
                    <motion.div 
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${futureProjections.nextYear.confidence}%` }}
                      transition={{ duration: 1.5, delay: 0.8 }}
                      style={{ boxShadow: '0 0 10px rgba(59, 130, 246, 0.6)' }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{futureProjections.nextYear.confidence}% confidence</span>
                </div>
              </div>
              <div className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-2xl">
                <div className="text-xs text-blue-400 mb-2">Expected Profit</div>
                <p className="text-3xl font-bold text-white">{futureProjections.nextYear.profit}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* AI Insights - Dashboard Style */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="p-8 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5) 0%, rgba(0, 0, 0, 0.3) 100%)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.8)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div 
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center"
            style={{ boxShadow: '0 10px 30px -10px rgba(245, 158, 11, 0.6)' }}
          >
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">AI-Generated Insights & Recommendations</h2>
            <p className="text-slate-400 text-sm">Actionable intelligence from your financial data</p>
          </div>
        </div>

        <div className="space-y-3">
          {aiInsights.map((insight, idx) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + idx * 0.1 }}
              className={`p-5 rounded-2xl border ${
                insight.type === 'warning'
                  ? 'bg-red-900/10 border-red-600/30'
                  : insight.type === 'opportunity'
                  ? 'bg-cyan-900/10 border-cyan-600/30'
                  : insight.type === 'success'
                  ? 'bg-green-900/10 border-green-600/30'
                  : 'bg-blue-900/10 border-blue-600/30'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${
                    insight.type === 'warning'
                      ? 'bg-red-600/20'
                      : insight.type === 'opportunity'
                      ? 'bg-cyan-600/20'
                      : insight.type === 'success'
                      ? 'bg-green-600/20'
                      : 'bg-blue-600/20'
                  }`}>
                    {insight.type === 'warning' && <AlertTriangle className="size-4 text-red-400" />}
                    {insight.type === 'opportunity' && <TrendingUp className="size-4 text-cyan-400" />}
                    {insight.type === 'success' && <CheckCircle2 className="size-4 text-green-400" />}
                    {insight.type === 'info' && <Brain className="size-4 text-blue-400" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{insight.title}</h3>
                      <div className="px-2 py-1 rounded text-xs text-slate-300 border border-slate-600">
                        {insight.category}
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        insight.impact === 'high' 
                          ? 'bg-red-500/20 text-red-300 border border-red-400/30' 
                          : insight.impact === 'medium' 
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30' 
                          : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                      }`}>
                        {insight.impact} impact
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{insight.description}</p>
                    {insight.recommendation && (
                      <div className={`p-3 rounded-lg mt-2 ${
                        insight.type === 'warning'
                          ? 'bg-red-950/50'
                          : insight.type === 'opportunity'
                          ? 'bg-cyan-950/50'
                          : 'bg-green-950/50'
                      }`}>
                        <div
                          className={`mb-1 flex items-center gap-1.5 text-xs ${
                            insight.type === 'warning'
                              ? 'text-red-400'
                              : insight.type === 'opportunity'
                                ? 'text-cyan-400'
                                : 'text-green-400'
                          }`}
                        >
                          <Lightbulb className="size-3.5 shrink-0" aria-hidden />
                          AI recommendation
                        </div>
                        <p className="text-sm text-white">{insight.recommendation}</p>
                      </div>
                    )}
                  </div>
                </div>
                {insight.actionable && (
                  <button
                    type="button"
                    disabled={!hasLiveAiProvider}
                    title={
                      hasLiveAiProvider
                        ? undefined
                        : 'Connect a live AI provider under AI Assistant → Integrations to enable actions on insights'
                    }
                    onClick={
                      hasLiveAiProvider
                        ? () => takeAction(insight.recommendation ?? insight.description)
                        : undefined
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium ml-4 ${
                      hasLiveAiProvider
                        ? 'text-white hover:opacity-90 transition-opacity'
                        : 'text-white/50 cursor-not-allowed opacity-50'
                    }`}
                    style={{
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3))',
                      border: '1px solid rgba(168, 85, 247, 0.5)',
                    }}
                  >
                    Take Action
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Financial Patterns - Dashboard Style */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="p-8 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5) 0%, rgba(0, 0, 0, 0.3) 100%)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.8)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div 
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
            style={{ boxShadow: '0 10px 30px -10px rgba(168, 85, 247, 0.6)' }}
          >
            <PieChart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Detected Financial Patterns</h2>
            <p className="text-slate-400 text-sm">AI learns your business rhythm</p>
          </div>
        </div>

        <div className="space-y-3">
          {financialPatterns.map((pattern, idx) => (
            <motion.div 
              key={pattern.id} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 + idx * 0.1 }}
              className="p-5 rounded-2xl"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{pattern.pattern}</h3>
                    <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                      pattern.trend === 'increasing' 
                        ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
                        : pattern.trend === 'decreasing' 
                        ? 'bg-red-500/20 text-red-300 border border-red-400/30' 
                        : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                    }`}>
                      {pattern.trend === 'increasing' && <TrendingUp className="size-3" />}
                      {pattern.trend === 'decreasing' && <TrendingDown className="size-3" />}
                      {pattern.trend}
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">Occurs: {pattern.frequency}</p>
                  <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-600/30">
                    <p className="text-sm text-purple-300">{pattern.suggestion}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* How AI Works - Dashboard Style */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="p-8 rounded-3xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 15, 50, 0.6) 0%, rgba(10, 5, 20, 0.8) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          boxShadow: '0 20px 60px -20px rgba(168, 85, 247, 0.5)',
        }}
      >
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.3), transparent 70%)',
          }}
        />
        
        <div className="relative z-10">
          <div className="flex items-start gap-4">
            <div 
              className="p-3 rounded-xl bg-purple-600/20"
              style={{ border: '1px solid rgba(168, 85, 247, 0.3)' }}
            >
              <Brain className="size-6 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3 text-xl">How AI Financial Assistant Works</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5 font-bold">•</span>
                  <span><strong className="text-white">Pattern Recognition:</strong> Analyzes your spending, revenue, and timing patterns</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5 font-bold">•</span>
                  <span><strong className="text-white">Benchmarking:</strong> Compares your metrics against industry standards</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5 font-bold">•</span>
                  <span><strong className="text-white">Predictive Analytics:</strong> Forecasts future scenarios based on historical data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5 font-bold">•</span>
                  <span><strong className="text-white">Proactive Alerts:</strong> Warns you before problems become critical</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5 font-bold">•</span>
                  <span><strong className="text-white">Continuous Learning:</strong> Gets smarter as you use the system more</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
      </>
=======
        <AiChatPanel
          title="Ask the assistant"
          subtitle="Real answers grounded in your organization's data — ask about cash flow, expenses, margins, how to use Finance OS, or general finance questions."
          quickPrompts={CHAT_QUICK_PROMPTS}
          getReply={getChatReply}
          placeholder="Ask about cash flow, expenses, margins, or how to use Finance OS…"
          emptyStateHint="Start a conversation about your organization's finances or Finance OS itself."
        />
>>>>>>> fffd0e898e03d9f1d4ab20001149b15c2c9339d5
      )}

      {/* Task 2: real, computed Insights tab */}
      {activeTab === 'insights' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {insightsLoading && insightCards.length === 0 ? (
            <div
              className="p-10 rounded-2xl text-center text-slate-400 text-sm"
              style={AXIOM.containers.list}
            >
              Checking your transactions, loans, budgets and invites…
            </div>
          ) : insightCards.length === 0 ? (
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
