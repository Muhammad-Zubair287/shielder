import { Router } from 'express';
import SettingsController from './settings.controller';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireRoles } from '@/common/middleware/rbac.middleware';
import { validate } from '@/common/middleware/validation.middleware';
import { settingsValidation } from './settings.validation';
import { UserRole } from '@/common/constants/roles';
import { upload } from '@/common/middleware/upload.middleware';

const router = Router();

// Public settings (no auth) - used by customer-facing pages to read
// only non-sensitive configuration such as company contact info.
router.get('/public', SettingsController.getPublicSettings);

// All further settings routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/settings/logo
 * @desc    Upload and update company logo (Admin + Super Admin)
 */
router.post('/logo', requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), SettingsController.uploadCompanyLogo);

/**
 * @route   GET /api/settings
 * @desc    Get all system settings (Admin + Super Admin)
 */
router.get('/', requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), SettingsController.getSettings);

/**
 * @route   GET /api/settings/logs
 * @desc    Get settings change logs (Super Admin only)
 */
router.get('/logs', requireRoles(UserRole.SUPER_ADMIN), SettingsController.getLogs);

/**
 * @route   GET /api/settings/snapshots
 * @desc    Get config snapshots (Super Admin only)
 */
router.get('/snapshots', requireRoles(UserRole.SUPER_ADMIN), SettingsController.getSnapshots);

/**
 * @route   POST /api/settings/verify
 * @desc    Verify admin password for sensitive actions
 */
router.post('/verify', requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate(settingsValidation.verifyPassword), SettingsController.verifySensitiveAction);

/**
 * @route   POST /api/settings/backup
 * @desc    Manual backup trigger (Super Admin only)
 */
router.post('/backup', requireRoles(UserRole.SUPER_ADMIN), SettingsController.triggerBackup);

/**
 * @route   GET /api/settings/general
 * @desc    Get general settings section (Admin + Super Admin)
 */
router.get('/general', requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), SettingsController.getSettings);

/**
 * @route   PUT /api/settings/:section
 * @desc    Update specific settings sections
 */
router.put(
  '/general',
  requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  upload.fields([
    { name: 'companyLogo', maxCount: 1 },
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 },
  ]),
  validate(settingsValidation.updateGeneral),
  SettingsController.updateSettings
);
router.put('/notification',  requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate(settingsValidation.updateNotification), SettingsController.updateSettings);
router.put('/security',     requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate(settingsValidation.updateSecurity),     SettingsController.updateSettings);
router.put('/order',        requireRoles(UserRole.SUPER_ADMIN), validate(settingsValidation.updateOrder),        SettingsController.updateSettings);
router.put('/payment',      requireRoles(UserRole.SUPER_ADMIN), validate(settingsValidation.updatePayment),       SettingsController.updateSettings);

export default router;
