/**
 * RBAC Constants
 * Role-Based Access Control definitions
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Role Hierarchy
 * Higher number = higher privilege
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 3,
  [UserRole.ADMIN]: 2,
  [UserRole.USER]: 1,
};

/**
 * Permissions Matrix
 */
export const PERMISSIONS = {
  // User Management
  CREATE_USER: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  VIEW_USERS: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  UPDATE_USER: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  DELETE_USER: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  
  // Admin Management (Super Admin only)
  CREATE_ADMIN: [UserRole.SUPER_ADMIN],
  VIEW_ADMINS: [UserRole.SUPER_ADMIN],
  UPDATE_ADMIN: [UserRole.SUPER_ADMIN],
  DELETE_ADMIN: [UserRole.SUPER_ADMIN],
  
  // Role Management
  CHANGE_ROLE: [UserRole.SUPER_ADMIN],
  
  // System
  VIEW_AUDIT_LOGS: [UserRole.SUPER_ADMIN],
  SYSTEM_SETTINGS: [UserRole.SUPER_ADMIN],
} as const;

/**
 * Check if a role can manage another role
 */
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  // Super Admin can manage everyone
  if (managerRole === UserRole.SUPER_ADMIN) {
    return true;
  }
  
  // Admin can only manage USER
  if (managerRole === UserRole.ADMIN && targetRole === UserRole.USER) {
    return true;
  }
  
  return false;
}

/**
 * Validate role escalation attempt
 */
export function isRoleEscalation(currentRole: UserRole, newRole: UserRole): boolean {
  return ROLE_HIERARCHY[newRole] > ROLE_HIERARCHY[currentRole];
}
