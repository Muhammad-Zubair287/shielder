/**
 * RBAC Middleware
 * Role-Based Access Control enforcement
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole, canManageRole } from '../constants/roles';
import { ApiError } from '../errors/api.error';

/**
 * Require specific roles
 */
export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      throw new ApiError('Authentication required', 401);
    }

    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new ApiError(
        `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
        403
      );
    }

    next();
  };
};

/**
 * Require Super Admin role
 */
export const requireSuperAdmin = requireRoles(UserRole.SUPER_ADMIN);

/**
 * Require Admin or Super Admin role
 */
export const requireAdmin = requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN);

/**
 * Check if user can manage target user
 */
export const canManageUser = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const currentUser = req.user;
  const targetRole = req.body.role as UserRole;

  if (!currentUser) {
    throw new ApiError('Authentication required', 401);
  }

  // If no role change, allow admins to proceed
  if (!targetRole) {
    return next();
  }

  // Validate if current user can manage target role
  if (!canManageRole(currentUser.role as UserRole, targetRole)) {
    throw new ApiError(
      'You cannot manage users with this role',
      403
    );
  }

  next();
};

/**
 * Prevent role escalation
 */
export const preventRoleEscalation = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const currentUser = req.user;
  const newRole = req.body.role as UserRole;

  if (!newRole) {
    return next();
  }

  // Only Super Admin can change roles
  if (currentUser?.role !== UserRole.SUPER_ADMIN) {
    throw new ApiError(
      'Only Super Admin can change user roles',
      403
    );
  }

  next();
};

/**
 * Restrict Admin to USER role only
 * Admin can only create/manage USER accounts
 */
export const restrictAdminToUsers = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const currentUser = req.user;

  if (currentUser?.role === UserRole.ADMIN) {
    // Force role to USER for Admin operations
    if (req.body.role && req.body.role !== UserRole.USER) {
      throw new ApiError(
        'Admins can only manage USER accounts',
        403
      );
    }
    
    // Auto-set role to USER if not specified
    if (!req.body.role) {
      req.body.role = UserRole.USER;
    }
  }

  next();
};
