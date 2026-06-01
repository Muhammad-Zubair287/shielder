import { Router } from 'express';
import { ProfileController } from './profile.controller';
import { authenticate, authorize } from '../auth/auth.middleware';
import { validate } from '../../common/middleware/validation.middleware';
import { profileValidation, PROFILE_UPDATE_FIELDS } from './profile.validation';
import { UserRole } from '../../types/rbac.types';
import multer from 'multer';
import { BadRequestError } from '../../common/errors/api.error';

const router = Router();

// Separate in-memory multer for profile images — avoids Railway ephemeral filesystem
const profileImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG and WebP files are allowed'));
    }
  },
});

/**
 * All profile routes require authentication
 */
router.use(authenticate);

const OWN_PROFILE_ROLES = [UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN] as const;

const rejectEmptyProfileUpdate = (req: any, _res: any, next: any) => {
  const hasAllowedField = PROFILE_UPDATE_FIELDS.some((field) => {
    if (!Object.prototype.hasOwnProperty.call(req.body ?? {}, field)) {
      return false;
    }

    const value = req.body[field];
    return value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');
  });

  if (!hasAllowedField) {
    next(new BadRequestError('No fields provided to update'));
    return;
  }

  next();
};

// GET /api/profile - Get own profile
router.get('/', authorize(...OWN_PROFILE_ROLES), ProfileController.getMyProfile);

// PUT /api/profile - Update own profile
router.put('/', authorize(...OWN_PROFILE_ROLES), rejectEmptyProfileUpdate, validate(profileValidation.updateProfile), ProfileController.updateMyProfile);

// PATCH /api/profile/language - Update language preference
router.patch('/language', authorize(...OWN_PROFILE_ROLES), validate(profileValidation.updateLanguage), ProfileController.updateLanguage);

// PATCH /api/profile/preferences - Update theme/other preferences
router.patch('/preferences', authorize(...OWN_PROFILE_ROLES), ProfileController.updatePreferences);

// POST /api/profile/upload-image - Upload profile image (stored as base64 in DB)
router.post('/upload-image', authorize(...OWN_PROFILE_ROLES), profileImageUpload.single('profileImage'), ProfileController.uploadProfileImage);

// GET /api/profile/:userId - Admin view any profile (Read-only)
router.get('/:userId', authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), ProfileController.getProfileById);

export default router;
