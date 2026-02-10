import { Router } from 'express';
import { categoryController } from './category.controller';
import { categoryValidation } from './category.validation';
import { validate } from '@/common/middleware/validation.middleware';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireAdmin } from '@/common/middleware/rbac.middleware';

const router = Router();

router.get('/', categoryController.list);

router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(categoryValidation.create),
  categoryController.create
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate(categoryValidation.update),
  categoryController.update
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  categoryController.delete
);

export default router;
