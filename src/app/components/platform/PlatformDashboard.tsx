import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { PlatformLayout } from './PlatformLayout';
import { PlatformHome } from './PlatformHome';
import { OrganizationsView } from './OrganizationsView';
import { PlansView } from './PlansView';
import { PlatformSettingsView } from './PlatformSettingsView';

type PlatformView = 'home' | 'organizations' | 'plans' | 'settings';

export function PlatformDashboard() {
  const [currentView, setCurrentView] = useState<PlatformView>('home');
  const { user } = useAuth();

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <PlatformHome onNavigateToOrganizations={() => setCurrentView('organizations')} />;
      case 'organizations':
        return <OrganizationsView />;
      case 'plans':
        return <PlansView />;
      case 'settings':
        return <PlatformSettingsView />;
      default:
        return <PlatformHome />;
    }
  };

  return (
    <PlatformLayout currentView={currentView} onViewChange={setCurrentView}>
      {renderView()}
    </PlatformLayout>
  );
}
