import { useState } from 'react';
import { EmployeeLayout } from './EmployeeLayout';
import { EmployeeDashboard } from './EmployeeDashboard';
import { MyExpenses } from './MyExpenses';
import { MyTimesheet } from './MyTimesheet';
import { MyProjects } from './MyProjects';
import { MyPayslips } from './MyPayslips';
import { TeamDirectory } from './TeamDirectory';
import { CompanyAnnouncements } from './CompanyAnnouncements';
import { EmployeeSettings, EmployeeHelp } from './EmployeeSettings';

export type EmployeeView = 
  | 'dashboard'
  | 'expenses'
  | 'timesheet'
  | 'projects'
  | 'payslips'
  | 'team'
  | 'announcements'
  | 'help'
  | 'settings';

export function EmployeeWorkspace() {
  const [currentView, setCurrentView] = useState<EmployeeView>('dashboard');

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
