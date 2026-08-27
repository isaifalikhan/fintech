export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
];
