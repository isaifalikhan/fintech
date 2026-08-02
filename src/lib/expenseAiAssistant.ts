/**
 * Rule-based Expenses AI (Elite 0.1) — no network calls.
 * Suggestions include confidence + short "why" for explainability.
 */

import type { EmployeeExpense } from '@/services/types';

export type AiConfidence = 'high' | 'medium' | 'low';

export interface CategorySuggestion {
  category: string;
  confidence: AiConfidence;
  reason: string;
}

export interface DuplicateMatch {
  id: string;
  description: string;
  amount: number;
  date: string;
  confidence: AiConfidence;
  reason: string;
}

export interface PolicyNote {
  severity: 'info' | 'warning';
  confidence: AiConfidence;
  message: string;
  reason: string;
}

const CATEGORY_KEYWORDS: { category: string; words: string[]; confidence: AiConfidence }[] = [
  { category: 'Transportation', words: ['uber', 'lyft', 'taxi', 'parking', 'transit', 'metro', 'train ticket', 'gas', 'fuel'], confidence: 'high' },
  { category: 'Travel', words: ['flight', 'hotel', 'airbnb', 'lodging', 'airline', 'baggage'], confidence: 'high' },
  { category: 'Software', words: ['figma', 'adobe', 'license', 'software', 'aws', 'jetbrains', 'subscription', 'saas', 'hosting'], confidence: 'high' },
  { category: 'Office Supplies', words: ['office', 'supplies', 'staples', 'printer', 'paper', 'ink'], confidence: 'medium' },
  { category: 'Training', words: ['conference', 'training', 'course', 'workshop', 'certification', 'summit'], confidence: 'high' },
  { category: 'Meals & Entertainment', words: ['dinner', 'lunch', 'meal', 'restaurant', 'catering', 'client dinner', 'team lunch', 'coffee'], confidence: 'medium' },
  { category: 'Marketing', words: ['ads', 'campaign', 'google ads', 'linkedin', 'sponsor', 'booth'], confidence: 'high' },
  { category: 'Hardware', words: ['laptop', 'monitor', 'keyboard', 'mouse', 'headset', 'dock'], confidence: 'medium' },
  { category: 'Utilities', words: ['internet', 'utilities', 'electric', 'phone bill'], confidence: 'medium' },
];

const MEAL_POLICY_MAX_USD = 75;

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function tokenSet(s: string): Set<string> {
  return new Set(
    norm(s)
      .split(/[^a-z0-9]+/i)
      .filter(t => t.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter++;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T12:00:00').getTime();
  const db = new Date(b + 'T12:00:00').getTime();
  return Math.abs(da - db) / (24 * 3600 * 1000);
}

export function suggestCategoryFromNarration(description: string): CategorySuggestion | null {
  const n = norm(description);
  if (n.length < 3) return null;

  for (const row of CATEGORY_KEYWORDS) {
    for (const w of row.words) {
      if (n.includes(w)) {
        return {
          category: row.category,
          confidence: row.confidence,
          reason: `Matched “${w}” in your description — similar claims are usually ${row.category}.`,
        };
      }
    }
  }
  return null;
}

export function findLikelyDuplicates(
  draft: { description: string; amount: number; date: string; currency: string },
  existing: EmployeeExpense[],
): DuplicateMatch[] {
  const out: DuplicateMatch[] = [];
  const dTokens = tokenSet(draft.description);
  const windowDays = 14;

  for (const e of existing) {
    if (e.currency !== draft.currency) continue;
    const dayDiff = daysBetween(draft.date, e.date);
    if (dayDiff > windowDays) continue;

    const sameAmount = Math.abs(e.amount - draft.amount) < 0.01;
    const closeAmount =
      draft.amount > 0 && Math.abs(e.amount - draft.amount) / draft.amount <= 0.02;
    const ej = jaccard(dTokens, tokenSet(e.description));

    if (sameAmount && ej >= 0.35) {
      out.push({
        id: e.id,
        description: e.description,
        amount: e.amount,
        date: e.date,
        confidence: ej >= 0.55 ? 'high' : 'medium',
        reason: `Same amount ($${e.amount.toFixed(2)}) and similar wording to a claim from ${e.date}.`,
      });
    } else if (closeAmount && ej >= 0.5 && dayDiff <= 7) {
      out.push({
        id: e.id,
        description: e.description,
        amount: e.amount,
        date: e.date,
        confidence: 'medium',
        reason: `Very similar description and close amount to entry on ${e.date}.`,
      });
    }
  }

  out.sort((a, b) => (b.confidence === 'high' ? 1 : 0) - (a.confidence === 'high' ? 1 : 0));
  return out.slice(0, 3);
}

export function policyNotesForDraft(draft: {
  category: string;
  amount: number;
  currency: string;
}): PolicyNote[] {
  const notes: PolicyNote[] = [];
  if (draft.currency === 'USD' && draft.category === 'Meals & Entertainment' && draft.amount > MEAL_POLICY_MAX_USD) {
    notes.push({
      severity: 'warning',
      confidence: 'high',
      message: `Meal total is above the typical $${MEAL_POLICY_MAX_USD} per-person guideline.`,
      reason: 'Company policy flags larger meal claims for manager review — add a note if this was a group bill.',
    });
  }
  if (draft.amount >= 2500) {
    notes.push({
      severity: 'info',
      confidence: 'medium',
      message: 'Large claim amount — finance may ask for extra documentation.',
      reason: 'Unusually high single expenses are often double-checked before approval.',
    });
  }
  return notes;
}

export function confidenceLabel(c: AiConfidence): string {
  if (c === 'high') return 'High confidence';
  if (c === 'medium') return 'Medium confidence';
  return 'Low confidence';
}
