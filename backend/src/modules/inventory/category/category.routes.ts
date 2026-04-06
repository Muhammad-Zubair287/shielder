import { Router } from 'express';
import { categoryController } from './category.controller';
import { categoryValidation } from './category.validation';
import { validate } from '@/common/middleware/validation.middleware';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireAdmin } from '@/common/middleware/rbac.middleware';
import { upload } from '@/common/middleware/upload.middleware';

const router = Router();

router.get('/', categoryController.list);
router.get('/summary', categoryController.getSummary);
router.get('/:id', categoryController.getById);

router.post(
  '/',
  authenticate,
  requireAdmin,
  upload.single('image'),
  validate(categoryValidation.create),
  categoryController.create
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  upload.single('image'),
  validate(categoryValidation.update),
  categoryController.update
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  categoryController.delete
);

router.post(
  '/bulk-delete',
  authenticate,
  requireAdmin,
  validate(categoryValidation.bulkDelete),
  categoryController.bulkDelete
);

export default router;

