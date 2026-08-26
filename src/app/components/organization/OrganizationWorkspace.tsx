import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { OrganizationLayout } from './OrganizationLayout';
import { OrgWorkspaceNavContext } from './OrgWorkspaceNavContext';
import { FinanceOSView } from './FinanceOSView';
import { OrgDashboard } from './OrgDashboard';
import { QuickAdd } from './QuickAdd';
import { TransactionsLedger } from './TransactionsLedger';
import { AccountsWallets } from './AccountsWallets';
import { PaymentMethods } from './PaymentMethods';
import { EnhancedStatementImport } from './EnhancedStatementImport';
import { EnhancedLogicLearning } from './EnhancedLogicLearning';
import { AIFinancialAssistant } from './AIFinancialAssistant';
import { CostingPricing } from './CostingPricing';
import { ReportsView } from './ReportsView';
import { LoansView } from './LoansView';
import { TeamPermissions } from './TeamPermissions';
import { PayrollView } from './PayrollView';
import { OrgSettings } from './OrgSettings';
import { IntegrationsSettings } from './IntegrationsSettings';
import { RecurringTransactions } from './RecurringTransactions';
import { BudgetPlanning } from './BudgetPlanning';
import { CashFlowForecast } from './CashFlowForecast';
import { ProjectProfitability } from './ProjectProfitability';
import { WhatIfSimulator } from './WhatIfSimulator';
import { ProfitIntelligenceView } from './ProfitIntelligenceView';
import { AssetsDepreciationView } from './AssetsDepreciationView';
import { InventoryManagementView } from './InventoryManagementView';
import { ActiveSessionsView } from './ActiveSessionsView';
import { AuditLogView } from './AuditLogView';

export type OrgView = 
  | 'finance-os'
  | 'dashboard' 
  | 'quick-add'
  | 'transactions' 
  | 'recurring'
  | 'accounts'
  | 'payment-methods'
  | 'import' 
  | 'logic'
  | 'ai-assistant'
  | 'profit-intelligence'
  | 'budgets'
  | 'forecast'
  | 'projects'
  | 'simulator'
  | 'costing' 
  | 'reports' 
  | 'loans' 
  | 'assets'
  | 'inventory'
  | 'team'
  | 'payroll'
  | 'settings'
  | 'integrations'
  | 'active-sessions'
  | 'audit-log';

const ALL_ORG_VIEWS: readonly OrgView[] = [
  'finance-os', 'dashboard', 'quick-add', 'transactions', 'recurring', 'accounts', 'payment-methods',
  'import', 'logic', 'ai-assistant', 'profit-intelligence', 'budgets', 'forecast', 'projects', 'simulator',
  'costing', 'reports', 'loans', 'assets', 'inventory', 'team', 'payroll', 'settings', 'integrations',
  'active-sessions', 'audit-log',
];

function isOrgView(v: unknown): v is OrgView {
  return typeof v === 'string' && (ALL_ORG_VIEWS as readonly string[]).includes(v);
}

/** `?view=` wins; `/dashboard` with no param opens the sidebar **Dashboard** (ORG-P02), not Finance OS. */
function initialViewFromPathAndSearch(pathname: string): OrgView {
  if (typeof window === 'undefined') return 'finance-os';
  const v = new URLSearchParams(window.location.search).get('view');
  if (v && isOrgView(v)) return v;
  if (pathname === '/dashboard') return 'dashboard';
  return 'finance-os';
}

export function OrganizationWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<OrgView>(() => initialViewFromPathAndSearch(location.pathname));

  /** Single handler: state + `?view=` so CTAs work even if context is missed, and URL is bookmarkable. */
  const applyView = useCallback(
    (view: OrgView) => {
      setCurrentView(view);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('view', view);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  /** Keep state in sync with browser back/forward and direct URL edits. */
  useEffect(() => {
    const v = searchParams.get('view');
    if (v && isOrgView(v)) setCurrentView(v);
  }, [searchParams]);

  /** Deep links from routes without nav context (e.g. legacy `/organization` dashboard CTAs). */
  useEffect(() => {
    const raw = (location.state as { orgView?: unknown } | null)?.orgView;
    if (!isOrgView(raw)) return;
    applyView(raw);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate, applyView]);

  const renderView = () => {
    switch (currentView) {
      case 'finance-os':
        return <OrgDashboard />;
      case 'dashboard':
        return <FinanceOSView />;
      case 'quick-add':
        return <QuickAdd />;
      case 'transactions':
        return <TransactionsLedger />;
      case 'recurring':
        return <RecurringTransactions />;
      case 'accounts':
        return <AccountsWallets />;
      case 'payment-methods':
        return <PaymentMethods />;
      case 'import':
        return <EnhancedStatementImport />;
      case 'logic':
        return <EnhancedLogicLearning />;
      case 'ai-assistant':
        return <AIFinancialAssistant />;
      case 'profit-intelligence':
        return <ProfitIntelligenceView />;
      case 'budgets':
        return <BudgetPlanning />;
      case 'forecast':
        return <CashFlowForecast />;
      case 'projects':
        return <ProjectProfitability />;
      case 'simulator':
        return <WhatIfSimulator />;
      case 'costing':
        return <CostingPricing />;
      case 'reports':
        return <ReportsView />;
      case 'loans':
        return <LoansView />;
      case 'assets':
        return <AssetsDepreciationView />;
      case 'inventory':
        return <InventoryManagementView />;
      case 'team':
        return <TeamPermissions />;
      case 'payroll':
        return <PayrollView />;
      case 'settings':
        return <OrgSettings />;
      case 'integrations':
        return <IntegrationsSettings />;
      case 'active-sessions':
        return <ActiveSessionsView />;
      case 'audit-log':
        return <AuditLogView />;
      default:
        return <OrgDashboard />;
    }
  };

  return (
    <OrgWorkspaceNavContext.Provider value={applyView}>
      <OrganizationLayout currentView={currentView} onViewChange={applyView}>
        {renderView()}
      </OrganizationLayout>
    </OrgWorkspaceNavContext.Provider>
  );
}