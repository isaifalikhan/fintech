/**
 * Shared formatting utilities
 * ============================
 * Extracted from the legacy mockData.ts so every component can import
 * formatCurrency / formatDate without pulling in stale mock data arrays.
 *
 * These are PURE functions — safe to use in any context (components, services,
 * export utilities, etc.).
 */

// ── Currency symbols ─────────────────────────────────────────────────────────

export const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    PKR: 'Rs',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'AED',
    CAD: 'C$',
    AUD: 'A$',
    JPY: '¥',
    CHF: 'CHF',
    CNY: '¥',
    INR: '₹',
    SGD: 'S$',
  };
  return symbols[currency] ?? currency;
};

// ── formatCurrency ────────────────────────────────────────────────────────────

export interface FormatCurrencyOptions {
  /** Abbreviate large numbers: 1 500 000 → "$1.5M" */
  compact?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Format a numeric amount as a human-readable currency string.
 *
 * @param amount   - The numeric value to format
 * @param currency - ISO currency code (default: 'USD'). When provided, the
 *                   matching symbol is prepended instead of using Intl.
 * @param options  - { compact, minimumFractionDigits, maximumFractionDigits }
 *
 * @example
 *   formatCurrency(1500000)            // "$1,500,000"
 *   formatCurrency(1500000, 'PKR')     // "Rs 1,500,000"
 *   formatCurrency(1500000, 'USD', { compact: true }) // "$ 1.5M"
 */
export const formatCurrency = (
  amount: number,
  currency?: string,
  options: FormatCurrencyOptions = {}
): string => {
  if (amount == null || typeof amount !== 'number' || isNaN(amount)) {
    return currency ? `${getCurrencySymbol(currency)} 0` : '$0';
  }

  const { compact = false, minimumFractionDigits = 0, maximumFractionDigits = 0 } = options;
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (compact) {
    const sym = currency ? getCurrencySymbol(currency) : '$';
    if (absAmount >= 1_000_000) {
      return `${sign}${sym} ${(absAmount / 1_000_000).toFixed(1)}M`;
    }
    if (absAmount >= 1_000) {
      return `${sign}${sym} ${(absAmount / 1_000).toFixed(0)}K`;
    }
    return `${sign}${sym} ${absAmount.toLocaleString()}`;
  }

  // Multi-currency path: use symbol + toLocaleString (matches legacy mockData behaviour)
  if (currency) {
    const sym = getCurrencySymbol(currency);
    return `${sign}${sym} ${absAmount.toLocaleString(undefined, {
      minimumFractionDigits,
      maximumFractionDigits,
    })}`;
  }

  // USD default: use Intl for proper formatting
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
};

// ── formatDate ───────────────────────────────────────────────────────────────

/**
 * Format an ISO date string as a readable date.
 *
 * @example
 *   formatDate('2026-01-13')  // "Jan 13, 2026"
 */
export const formatDate = (date: string): string => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format an ISO date string as a short date (no year).
 *
 * @example
 *   formatDateShort('2026-01-13')  // "Jan 13"
 */
export const formatDateShort = (date: string): string => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format an ISO datetime string as a relative label ("2 days ago", "just now").
 */
export const formatRelativeTime = (dateStr: string): string => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return formatDate(dateStr);
};
