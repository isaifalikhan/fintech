/**
 * AI Assistant chat — real replies via the Express server's `/ai-chat` route
 * (`server/routes/organizations.ts`), which resolves to the org's own configured provider key or
 * the server's free Groq fallback. Deliberately has no dataStore/mock-mode branch: an LLM call
 * needs the server (no key may ever reach the browser), so mock mode gets an honest "not
 * available" error, never a fake reply.
 */

import { isHttpBackendConfigured, apiPostJson } from '@/lib/apiClient';
import type { AiChatTurn, ServiceResponse } from './types';

const AI_CHAT_PATH = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/ai-chat`;

export async function sendAiChatMessage(
  organizationId: string,
  message: string,
  history: AiChatTurn[],
  surface: 'org' | 'employee',
): Promise<ServiceResponse<{ reply: string }>> {
  if (!organizationId.trim()) {
    return { success: false, data: { reply: '' }, error: 'organizationId required' };
  }

  if (!isHttpBackendConfigured()) {
    return {
      success: false,
      data: { reply: '' },
      error:
        'AI Assistant requires the app to be running with the local API server (pnpm run dev:full).',
    };
  }

  return apiPostJson<
    { message: string; history: AiChatTurn[]; surface: 'org' | 'employee' },
    { reply: string }
  >(AI_CHAT_PATH(organizationId), { message, history, surface });
}
