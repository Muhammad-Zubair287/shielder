import { Router } from 'express';
import { subcategoryController } from './subcategory.controller';
import { subcategoryValidation } from './subcategory.validation';
import { validate } from '@/common/middleware/validation.middleware';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireAdmin } from '@/common/middleware/rbac.middleware';

const router = Router();

router.get('/', subcategoryController.list);

router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(subcategoryValidation.create),
  subcategoryController.create
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate(subcategoryValidation.update),
  subcategoryController.update
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  subcategoryController.delete
);

export default router;
