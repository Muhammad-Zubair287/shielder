import { Router } from 'express';
import { specTemplateController } from './spec-template.controller';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireAdmin } from '@/common/middleware/rbac.middleware';
import { validateWithOptions } from '@/common/middleware/validation.middleware';
import { specTemplateValidation } from './spec-template.validation';

const router = Router();

router.post(
  '/',
  authenticate,
  requireAdmin,
  validateWithOptions(specTemplateValidation.create, 'body', { requiredFieldsMessage: 'Required fields are missing' }),
  specTemplateController.create,
);
router.get('/', specTemplateController.getByCategory);
router.get('/category/:categoryId', specTemplateController.getByCategory);
router.delete('/:id', authenticate, requireAdmin, specTemplateController.delete);

export default router;
