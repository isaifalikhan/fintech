import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../../../contexts/AuthContext';
import { PlatformLayout } from './PlatformLayout';
import { PlatformHome } from './PlatformHome';
import { OrganizationsView } from './OrganizationsView';
import { PlansView } from './PlansView';
import { PlatformSettingsView } from './PlatformSettingsView';
import { PlatformAiPortal } from './PlatformAiPortal';
import { PlatformTeamView } from './PlatformTeamView';

type PlatformView = 'home' | 'organizations' | 'team' | 'plans' | 'ai' | 'settings';

const ALL_PLATFORM_VIEWS: readonly PlatformView[] = ['home', 'organizations', 'team', 'plans', 'ai', 'settings'];

function isPlatformView(v: unknown): v is PlatformView {
  return typeof v === 'string' && (ALL_PLATFORM_VIEWS as readonly string[]).includes(v);
}

/** `?view=` wins on first load so a login redirect (e.g. `/platform?view=ai`) can land on a specific tab. */
function initialViewFromSearch(): PlatformView {
  if (typeof window === 'undefined') return 'home';
  const v = new URLSearchParams(window.location.search).get('view');
  return v && isPlatformView(v) ? v : 'home';
}

export function PlatformDashboard() {
  const [searchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<PlatformView>(() => initialViewFromSearch());
  const { user } = useAuth();

  /** Keep state in sync with browser back/forward and direct URL edits. */
  useEffect(() => {
    const v = searchParams.get('view');
    if (v && isPlatformView(v)) setCurrentView(v);
  }, [searchParams]);

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <PlatformHome onNavigateToOrganizations={() => setCurrentView('organizations')} />;
      case 'organizations':
        return <OrganizationsView />;
      case 'team':
        return <PlatformTeamView />;
      case 'plans':
        return <PlansView />;
      case 'ai':
        return (
          <PlatformAiPortal
            onNavigateToOrganizations={() => setCurrentView('organizations')}
            onNavigateToSettings={() => setCurrentView('settings')}
          />
        );
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
