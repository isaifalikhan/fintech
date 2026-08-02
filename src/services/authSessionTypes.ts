import type { User, Organization, OrganizationMember } from '@/services/types';

export interface AuthSession {
  user: User;
  organization: Organization | null;
  membership: OrganizationMember | null;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  orgSlug?: string;
}
