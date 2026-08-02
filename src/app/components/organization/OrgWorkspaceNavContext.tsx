import { createContext, useContext } from 'react';

/** Set by `OrganizationWorkspace` so deep views (e.g. OrgDashboard) can switch sidebar views without prop drilling. */
export const OrgWorkspaceNavContext = createContext<null | ((view: string) => void)>(null);

export function useOrgWorkspaceNav() {
  return useContext(OrgWorkspaceNavContext);
}
