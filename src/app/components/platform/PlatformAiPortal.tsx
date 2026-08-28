import { useState } from 'react';
import { motion } from 'motion/react';
import { AXIOM } from '../../../styles/axiom-tokens';
import { Brain, MessageCircle, Sparkles, AlertCircle, Clock, Database, Users, ChevronRight, Loader2 } from 'lucide-react';
import { AiChatPanel } from '@/app/components/shared/AiChatPanel';
import { useService } from '@/hooks/useService';
import { platformService } from '@/services/platformService';

/**
 * Platform-wide AI Portal (QA fix: platform admins previously had no AI surface at all —
 * only the org workspace had one). Two tabs:
 *  - Ask: shared `AiChatPanel` chat mechanics with platform-flavored demo content (unchanged,
 *    still no real LLM/API wiring — explicitly deferred).
 *  - Insights: real cards derived from `platformService.getStats()` — no fabricated data.
 *
 * No Activity tab here: unlike the org workspace, this codebase has no platform-wide audit
 * trail/activity log to surface, so one isn't invented.
 */

const PLATFORM_SAMPLE_RESPONSES: {
  trigger: string[];
  response: string;
  suggestions?: string[];
}[] = [
  {
    trigger: ['mrr', 'arr', 'revenue'],
    response:
      'Demo answer: MRR and ARR trends would summarize here from platformService.getStats(). Connect live data to personalize this.',
    suggestions: ['Which orgs grew MRR the most this quarter?', 'Show ARR by plan tier'],
  },
  {
    trigger: ['churn', 'risk', 'at risk'],
    response:
      'Churn-risk orgs are typically flagged by falling usage or failed payments. This is a mock response until the API is wired — in production it would list the at-risk organizations from your stats.',
    suggestions: ['List organizations flagged as churn risk', 'What usually causes churn risk?'],
  },
  {
    trigger: ['trial', 'trials'],
    response:
      'Trial organizations would appear here with signup date and days remaining. This is demo text — live answers will use your platform data when connected.',
    suggestions: ['How many trials convert to paid?', 'Show trial orgs nearing expiry'],
  },
  {
    trigger: ['user', 'users', 'seat'],
    response:
      'Total users and new signups this month would summarize here from your platform stats. Demo reply for now.',
    suggestions: ['Show user growth by organization', 'Which orgs added the most seats?'],
  },
];

const PLATFORM_QUICK_PROMPTS = [
  'Summarize MRR and ARR trends',
  'Which organizations are churn risks?',
  'How are trial organizations converting?',
];

function matchPlatformDemoReply(text: string): { response: string; suggestions?: string[] } {
  const lower = text.toLowerCase();
  const hit = PLATFORM_SAMPLE_RESPONSES.find((r) => r.trigger.some((k) => lower.includes(k)));
  if (hit) return { response: hit.response, suggestions: hit.suggestions };
  return {
    response:
      'I can help with MRR/ARR trends, churn risk, trial organizations, and platform-wide usage. This reply is a demo — in production it would use your platform data. Try the quick prompts or ask something specific.',
    suggestions: ['Summarize MRR and ARR trends', 'Which organizations are churn risks?'],
  };
}

type InsightColor = 'red' | 'blue' | 'amber' | 'purple';

function InsightCard({
  icon: Icon,
  color,
  title,
  description,
  actionLabel,
  onAction,
  delay = 0,
}: {
  icon: any;
  color: InsightColor;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  delay?: number;
}) {
  const iconShadowKey = `icon${color.charAt(0).toUpperCase()}${color.slice(1)}` as keyof typeof AXIOM.shadows;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap"
      style={{
        background: AXIOM.backgrounds.chartContainer,
        border: AXIOM.borders[color],
        boxShadow: AXIOM.shadows[color],
      }}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div
          className="size-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: AXIOM.iconBoxes[color], boxShadow: AXIOM.shadows[iconShadowKey] }}
        >
          <Icon className="size-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-white font-medium">{title}</p>
          {description && <p className="text-xs text-slate-400 font-mono mt-0.5">{description}</p>}
        </div>
      </div>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-1.5 shrink-0 text-xs font-mono px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: AXIOM.charts.colors[color] }}
        >
          {actionLabel ?? 'Review'}
          <ChevronRight className="size-4" />
        </button>
      )}
    </motion.div>
  );
}

function PlatformAiInsights({
  onNavigateToOrganizations,
  onNavigateToSettings,
}: {
  onNavigateToOrganizations?: () => void;
  onNavigateToSettings?: () => void;
}) {
  const { data: stats, loading } = useService(() => platformService.getStats(), []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="size-6 text-purple-400 animate-spin" />
        <span className="ml-3 text-slate-400 font-mono text-sm">Loading platform insights…</span>
      </div>
    );
  }

  const storagePct = stats.storageLimit > 0 ? (stats.storageUsed / stats.storageLimit) * 100 : 0;

  const insights: {
    key: string;
    icon: any;
    color: InsightColor;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  }[] = [];

  if (stats.churnRiskOrgs > 0) {
    insights.push({
      key: 'churn',
      icon: AlertCircle,
      color: 'red',
      title: `${stats.churnRiskOrgs} organization${stats.churnRiskOrgs === 1 ? '' : 's'} at churn risk`,
      description: 'Review billing status and engagement',
      actionLabel: 'View organizations',
      onAction: onNavigateToOrganizations,
    });
  }

  if (stats.trialOrgs > 0) {
    insights.push({
      key: 'trial',
      icon: Clock,
      color: 'blue',
      title: `${stats.trialOrgs} organization${stats.trialOrgs === 1 ? '' : 's'} on trial`,
      description: 'Follow up before they end',
      actionLabel: 'View organizations',
      onAction: onNavigateToOrganizations,
    });
  }

  if (stats.storageLimit > 0 && storagePct > 80) {
    insights.push({
      key: 'storage',
      icon: Database,
      color: 'amber',
      title: `Platform storage is at ${storagePct.toFixed(1)}% capacity`,
      description: `${stats.storageUsed.toLocaleString()} / ${stats.storageLimit.toLocaleString()} MB used`,
      actionLabel: 'Open settings',
      onAction: onNavigateToSettings,
    });
  }

  const hasUrgent = insights.length > 0;

  return (
    <div className="space-y-4">
      {!hasUrgent && (
        <p className="text-sm text-slate-400 font-mono px-1">No urgent issues right now.</p>
      )}

      {insights.map((insight, i) => (
        <InsightCard
          key={insight.key}
          icon={insight.icon}
          color={insight.color}
          title={insight.title}
          description={insight.description}
          actionLabel={insight.actionLabel}
          onAction={insight.onAction}
          delay={i * 0.05}
        />
      ))}

      <InsightCard
        icon={Users}
        color="purple"
        title={`${stats.newUsersThisMonth} new user${stats.newUsersThisMonth === 1 ? '' : 's'} joined this month`}
        delay={insights.length * 0.05}
      />
    </div>
  );
}

export interface PlatformAiPortalProps {
  onNavigateToOrganizations?: () => void;
  onNavigateToSettings?: () => void;
}

type PlatformAiTab = 'ask' | 'insights';

export function PlatformAiPortal({ onNavigateToOrganizations, onNavigateToSettings }: PlatformAiPortalProps = {}) {
  const [activeTab, setActiveTab] = useState<PlatformAiTab>('ask');

  const tabButtons: { id: PlatformAiTab; label: string; icon: any }[] = [
    { id: 'ask', label: 'Ask', icon: MessageCircle },
    { id: 'insights', label: 'Insights', icon: Sparkles },
  ];

  return (
    <div className="p-8 space-y-8" style={{ background: AXIOM.backgrounds.main, minHeight: '100%' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div
            className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
            style={{ boxShadow: '0 10px 30px -10px rgba(168, 85, 247, 0.6)' }}
          >
            <Brain className="size-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold" style={AXIOM.text.titleStyle as any}>
            AI Portal
          </h1>
        </div>
        <p className="text-slate-400 font-mono">Platform-wide intelligence and insights across all organizations</p>
      </motion.div>

      {/* Tab Switcher */}
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

      {/* Ask tab: unchanged chat panel */}
      {activeTab === 'ask' && (
        <AiChatPanel
          title="Ask the platform assistant"
          subtitle="Demo replies for now — ask about MRR, ARR, churn risk, or trial organizations. Live answers will use platform-wide data when connected."
          quickPrompts={PLATFORM_QUICK_PROMPTS}
          getReply={matchPlatformDemoReply}
          placeholder="Ask about MRR, churn risk, or trial organizations…"
          emptyStateHint="Start a conversation about platform performance. Answers below are sample data until this is connected to a live backend."
        />
      )}

      {/* Insights tab: real cards from platformService.getStats() */}
      {activeTab === 'insights' && (
        <PlatformAiInsights
          onNavigateToOrganizations={onNavigateToOrganizations}
          onNavigateToSettings={onNavigateToSettings}
        />
      )}
    </div>
  );
}
