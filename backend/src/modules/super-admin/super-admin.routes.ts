/**
 * Super Admin Routes
 */

import { Router } from 'express';
import { superAdminController } from './super-admin.controller';
import { superAdminValidation } from './super-admin.validation';
import { authenticate } from '../auth/auth.middleware';
import { requireSuperAdmin } from '../../common/middleware/rbac.middleware';
import { validate } from '../../common/middleware/validation.middleware';
import { BadRequestError } from '../../common/errors/api.error';

const router = Router();

const rejectEmptyUpdateFields = (req: any, _res: any, next: any) => {
	const fields = [
		{ key: 'password', label: 'Password' },
		{ key: 'fullName', label: 'Full name' },
		{ key: 'phoneNumber', label: 'Phone number' },
		{ key: 'role', label: 'Role' },
		{ key: 'status', label: 'Status' },
	];

	for (const field of fields) {
		if (
			Object.prototype.hasOwnProperty.call(req.body, field.key) &&
			typeof req.body[field.key] === 'string' &&
			!req.body[field.key].trim()
		) {
			next(new BadRequestError(`${field.label} cannot be empty`));
			return;
		}
	}

	next();
};

// All routes require Super Admin
router.use(authenticate, requireSuperAdmin);

// User Management Statistics
router.get('/users/stats', superAdminController.getUserStats.bind(superAdminController));

// Get all users (with filters)
router.get('/users/all', superAdminController.getAllUsers.bind(superAdminController));

// Create a new user (of any permitted role)
router.post('/users/create', validate(superAdminValidation.createAdmin, 'body'), superAdminController.createUser.bind(superAdminController));

// Update user details, role, or status
router.put('/users/:id', rejectEmptyUpdateFields, validate(superAdminValidation.updateAdmin, 'body'), superAdminController.updateUser.bind(superAdminController));

// Delete user (Soft Delete)
router.delete('/users/:id', superAdminController.deleteUser.bind(superAdminController));

// Statistics & Dashboards
router.get('/statistics', superAdminController.getStatistics.bind(superAdminController));
router.get('/dashboard/summary', superAdminController.getDashboardSummary.bind(superAdminController));
router.get('/analytics/monthly', superAdminController.getMonthlyAnalytics.bind(superAdminController));
router.get('/activity', superAdminController.getRecentActivity.bind(superAdminController));

// Inquiry Management
router.get('/inquiries', superAdminController.getInquiries.bind(superAdminController));
router.get('/inquiries/stats', superAdminController.getInquiryStats.bind(superAdminController));
router.put('/inquiries/:id/resolve', validate(superAdminValidation.resolveInquiry, 'params'), superAdminController.resolveInquiry.bind(superAdminController));

export default router;
