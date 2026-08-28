import { motion } from 'motion/react';
import { AXIOM } from '../../../styles/axiom-tokens';
import { Brain } from 'lucide-react';
import { AiChatPanel } from '@/app/components/shared/AiChatPanel';

/**
 * Platform-wide AI Portal (QA fix: platform admins previously had no AI surface at all —
 * only the org workspace had one). Reuses the shared `AiChatPanel` chat mechanics with
 * platform-flavored demo content. No real LLM/API wiring here — explicitly deferred.
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

export function PlatformAiPortal() {
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

      {/* Chat panel */}
      <AiChatPanel
        title="Ask the platform assistant"
        subtitle="Demo replies for now — ask about MRR, ARR, churn risk, or trial organizations. Live answers will use platform-wide data when connected."
        quickPrompts={PLATFORM_QUICK_PROMPTS}
        getReply={matchPlatformDemoReply}
        placeholder="Ask about MRR, churn risk, or trial organizations…"
        emptyStateHint="Start a conversation about platform performance. Answers below are sample data until this is connected to a live backend."
      />
    </div>
  );
}
