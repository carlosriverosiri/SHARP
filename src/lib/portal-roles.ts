export type PortalRole = 'personal' | 'admin' | 'superadmin';

const PORTAL_ROLE_RANK: Record<PortalRole, number> = {
  personal: 1,
  admin: 2,
  superadmin: 3
};

export function normalizePortalRole(value: unknown): PortalRole {
  if (value === 'superadmin') return 'superadmin';
  if (value === 'admin') return 'admin';
  return 'personal';
}

export function portalRoleLabel(role: PortalRole): string {
  switch (role) {
    case 'superadmin':
      return 'Superadmin';
    case 'admin':
      return 'Administratör';
    default:
      return 'Personal';
  }
}

export function portalRoleRank(role: PortalRole): number {
  return PORTAL_ROLE_RANK[role];
}

export function harMinstPortalRoll(role: unknown, minimumRole: PortalRole): boolean {
  const normalizedRole = normalizePortalRole(role);
  return portalRoleRank(normalizedRole) >= portalRoleRank(minimumRole);
}
