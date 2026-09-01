/**
 * Minimal server-side client for org-configured "bring your own key" AI providers
 * (see `OrgAiIntegrationSettings` / `IntegrationsSettings.tsx`). Only called when an org has
 * `useCustomKey: true` and a non-empty `apiKey` — otherwise the `/ai-chat` route falls back to
 * the server's own Groq key (`callGroq`), or an honest "not configured" error if neither is set.
 *
 * Deliberately dependency-free (plain `fetch`) rather than pulling in `@anthropic-ai/sdk` /
 * `openai` for a single call site.
 */

import type { AiChatTurn } from '../../src/services/types.js';

export interface AiProviderRequest {
  providerName: string;
  modelName: string;
  apiKey: string;
  systemPrompt: string;
  message: string;
  history: AiChatTurn[];
}

export type AiProviderResult =
  | { success: true; reply: string }
  | { success: false; error: string };

const MAX_HISTORY_TURNS = 12;

function recentHistory(history: AiChatTurn[]): AiChatTurn[] {
  return history.slice(-MAX_HISTORY_TURNS);
}

async function callAnthropic(req: AiProviderRequest): Promise<AiProviderResult> {
  const model = req.modelName?.trim() || 'claude-sonnet-4-5';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': req.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: req.systemPrompt,
        messages: [...recentHistory(req.history), { role: 'user', content: req.message }],
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (body && (body.error?.message || body.message)) || `Anthropic API error (${res.status})`;
      return { success: false, error: msg };
    }
    const text = body?.content?.find((b: { type: string }) => b.type === 'text')?.text;
    if (!text) return { success: false, error: 'Anthropic returned an empty response.' };
    return { success: true, reply: text };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Could not reach Anthropic API.' };
  }
}

async function callOpenAiCompatible(
  req: AiProviderRequest,
  baseUrl: string,
  defaultModel: string,
  providerLabel: string,
): Promise<AiProviderResult> {
  const model = req.modelName?.trim() || defaultModel;
  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${req.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: req.systemPrompt },
          ...recentHistory(req.history),
          { role: 'user', content: req.message },
        ],
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (body && body.error?.message) || `${providerLabel} API error (${res.status})`;
      return { success: false, error: msg };
    }
    const text = body?.choices?.[0]?.message?.content;
    if (!text) return { success: false, error: `${providerLabel} returned an empty response.` };
    return { success: true, reply: text };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : `Could not reach ${providerLabel} API.`,
    };
  }
}

/** Zero-config fallback tier: Groq's endpoint is OpenAI-request-shaped, so this reuses the same
 *  caller with Groq's base URL and free-tier model instead of a parallel implementation. */
export async function callGroq(req: AiProviderRequest): Promise<AiProviderResult> {
  return callOpenAiCompatible(
    req,
    'https://api.groq.com/openai/v1/chat/completions',
    'llama-3.3-70b-versatile',
    'Groq',
  );
}

/** Routes by provider name (free text, e.g. "Anthropic", "OpenAI", "Azure OpenAI"). Anything
 *  mentioning Anthropic/Claude goes to the Anthropic Messages API; everything else is treated
 *  as OpenAI-compatible (Chat Completions), matching the default model placeholder
 *  ("gpt-4o-mini") shown in the settings UI. */
export async function callConfiguredAiProvider(req: AiProviderRequest): Promise<AiProviderResult> {
  const name = req.providerName.toLowerCase();
  if (name.includes('anthropic') || name.includes('claude')) {
    return callAnthropic(req);
  }
  return callOpenAiCompatible(req, 'https://api.openai.com/v1/chat/completions', 'gpt-4o-mini', 'OpenAI');
}
