import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { EmployeeLayout } from './EmployeeLayout';
import { EmployeeDashboard } from './EmployeeDashboard';
import { MyExpenses } from './MyExpenses';
import { MyTimesheet } from './MyTimesheet';
import { MyProjects } from './MyProjects';
import { MyPayslips } from './MyPayslips';
import { TeamDirectory } from './TeamDirectory';
import { CompanyAnnouncements } from './CompanyAnnouncements';
import { EmployeeSettings, EmployeeHelp } from './EmployeeSettings';
import { EmployeeAiAssistant } from './EmployeeAiAssistant';

export type EmployeeView =
  | 'dashboard'
  | 'expenses'
  | 'timesheet'
  | 'projects'
  | 'payslips'
  | 'team'
  | 'announcements'
  | 'help'
  | 'settings'
  | 'ai';

const ALL_EMPLOYEE_VIEWS: readonly EmployeeView[] = [
  'dashboard', 'expenses', 'timesheet', 'projects', 'payslips', 'team',
  'announcements', 'help', 'settings', 'ai',
];

function isEmployeeView(v: unknown): v is EmployeeView {
  return typeof v === 'string' && (ALL_EMPLOYEE_VIEWS as readonly string[]).includes(v);
}

/** `?view=` wins on first load so a login redirect (e.g. `/employee?view=ai`) can land on a specific tab. */
function initialViewFromSearch(): EmployeeView {
  if (typeof window === 'undefined') return 'dashboard';
  const v = new URLSearchParams(window.location.search).get('view');
  return v && isEmployeeView(v) ? v : 'dashboard';
}

export function EmployeeWorkspace() {
  const [searchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<EmployeeView>(() => initialViewFromSearch());

  /** Keep state in sync with browser back/forward and direct URL edits. */
  useEffect(() => {
    const v = searchParams.get('view');
    if (v && isEmployeeView(v)) setCurrentView(v);
  }, [searchParams]);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <EmployeeDashboard />;
      case 'expenses':
        return <MyExpenses />;
      case 'timesheet':
        return <MyTimesheet />;
      case 'projects':
        return <MyProjects />;
      case 'payslips':
        return <MyPayslips />;
      case 'team':
        return <TeamDirectory />;
      case 'announcements':
        return <CompanyAnnouncements />;
      case 'help':
        return <EmployeeHelp />;
      case 'settings':
        return <EmployeeSettings />;
      case 'ai':
        return <EmployeeAiAssistant onNavigate={setCurrentView} />;
      default:
        return <EmployeeDashboard />;
    }
  };

  return (
    <EmployeeLayout currentView={currentView} onViewChange={setCurrentView}>
      {renderView()}
    </EmployeeLayout>
  );
}
