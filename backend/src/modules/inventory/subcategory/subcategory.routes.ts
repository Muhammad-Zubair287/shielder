import { Router } from 'express';
import { subcategoryController } from './subcategory.controller';
import { subcategoryValidation } from './subcategory.validation';
import { validate } from '@/common/middleware/validation.middleware';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireAdmin } from '@/common/middleware/rbac.middleware';
import { upload } from '@/common/middleware/upload.middleware';

const router = Router();

router.get('/', subcategoryController.list);
router.get('/summary', authenticate, requireAdmin, subcategoryController.getSummary);
router.get('/:id', subcategoryController.getById);

router.post(
  '/',
  authenticate,
  requireAdmin,
  upload.single('image'),
  validate(subcategoryValidation.create),
  subcategoryController.create
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  upload.single('image'),
  validate(subcategoryValidation.update),
  subcategoryController.update
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  subcategoryController.delete
);

router.post(
  '/bulk-delete',
  authenticate,
  requireAdmin,
  validate(subcategoryValidation.bulkDelete),
  subcategoryController.bulkDelete
);

export default router;
