import { useAuth } from '@/contexts/AuthContext';

/**
 * The active organization's reporting currency.
 *
 * Views must never hardcode a currency literal: several pages passed `'PKR'` straight to
 * `formatCurrency`, so an org configured in USD saw its real dollar figures rendered as rupees.
 * Falls back to PKR only when no org is loaded yet (matches the historical default).
 */
export function useOrgCurrency(): string {
  const { currentOrganization } = useAuth();
  return currentOrganization?.currency || 'PKR';
}
