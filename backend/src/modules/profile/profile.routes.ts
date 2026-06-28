import { NextFunction, Request, Response, Router } from 'express';
import { ProfileController } from './profile.controller';
import { authenticate, authorize } from '../auth/auth.middleware';
import { validate } from '../../common/middleware/validation.middleware';
import { profileValidation, PROFILE_UPDATE_FIELDS } from './profile.validation';
import { UserRole } from '../../types/rbac.types';
import multer from 'multer';
import { BadRequestError } from '../../common/errors/api.error';
import { getAllowedProfileImageMimeTypes, getMaxProfileImageSizeBytes } from '../../common/services/profile-image.service';

const router = Router();

// Keep multer in memory so image bytes can be signature-validated before storage.
const profileImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxProfileImageSizeBytes() },
  fileFilter: (_req, file, cb) => {
    if (getAllowedProfileImageMimeTypes().includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError('Invalid file type. Only JPG, JPEG, PNG and WEBP are allowed.'));
    }
  },
});

const handleProfileImageUpload = (req: Request, res: Response, next: NextFunction) => {
  profileImageUpload.single('profileImage')(req, res, (error: any) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new BadRequestError('Profile image must be 5MB or smaller.'));
      return;
    }

    next(error);
  });
};

/**
 * All profile routes require authentication
 */
router.use(authenticate);

const OWN_PROFILE_ROLES = [UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN] as const;

// FIX: Explicit null values (e.g. { profileImage: null }) represent an
// intentional "remove" action and must count as a valid update.
// The old check excluded null entirely ("value !== null"), which caused
// "Remove Photo" to always be rejected with 400 "No fields provided to update"
// before the request ever reached the controller/service.
const rejectEmptyProfileUpdate = (req: any, _res: any, next: any) => {
  const hasAllowedField = PROFILE_UPDATE_FIELDS.some((field) => {
    if (!Object.prototype.hasOwnProperty.call(req.body ?? {}, field)) {
      return false;
    }

    const value = req.body[field];

    // Explicit null is a valid "clear this field" update (e.g. remove photo)
     
// Allow null for profileImage to support photo removal
     if (field === 'profileImage' && value === null) return true;
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

// POST /api/profile/upload-image - Upload profile image and store only its public URL/path in DB
router.post('/upload-image', authorize(...OWN_PROFILE_ROLES), handleProfileImageUpload, ProfileController.uploadProfileImage);

// GET /api/profile/:userId - Admin view any profile (Read-only)
router.get('/:userId', authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), ProfileController.getProfileById);

export default router;
