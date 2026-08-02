/**
 * Legacy Mock Data (MINIMAL)
 * ===========================
 * This file is intentionally retained ONLY for LoginPage.tsx, which displays
 * dev-credential tiles from the OLD flat User type.
 *
 * ALL other consumers have been migrated to the service layer
 * (which reads from mockDatabase.ts → dataStore.ts).
 *
 * DO NOT add new exports here. Use /src/services/* instead.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'org_admin' | 'team_member';
  organizationId?: string;
  permissions?: string[];
}

// Mock Users — used by LoginPage.tsx for dev credential display
export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@platform.com',
    name: 'Platform Admin',
    role: 'super_admin',
  },
  {
    id: '2',
    email: 'john@acme.com',
    name: 'John Doe',
    role: 'org_admin',
    organizationId: 'org-1',
    permissions: ['all'],
  },
  {
    id: '3',
    email: 'jane@acme.com',
    name: 'Jane Smith',
    role: 'team_member',
    organizationId: 'org-1',
    permissions: ['add_transaction', 'view_reports'],
  },
  {
    id: '4',
    email: 'sarah@techstartup.com',
    name: 'Sarah Johnson',
    role: 'org_admin',
    organizationId: 'org-2',
    permissions: ['all'],
  },
];
