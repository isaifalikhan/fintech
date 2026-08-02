/**
 * Placeholder KPIs when org financial data is empty or still loading.
 * Single source for org dashboard surfaces — avoid duplicate inline constants.
 */
export const dashboardFallbackAnalytics = {
  netWorth: 2_940_000,
  cashInHand: 125_000,
  monthlyProfit: 450_000,
  weeklyProfit: 125_000,
  yearlyProfit: 4_800_000,
} as const;
