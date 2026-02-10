import { Router } from 'express';
import { specificationController } from './specification.controller';
import { specificationValidation } from './specification.validation';
import { validate } from '@/common/middleware/validation.middleware';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireAdmin } from '@/common/middleware/rbac.middleware';

const router = Router();

router.get('/', specificationController.listDefinitions);

router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(specificationValidation.createDefinition),
  specificationController.createDefinition
);

router.post(
  '/bulk',
  authenticate,
  requireAdmin,
  validate(specificationValidation.bulkCreateDefinitions),
  specificationController.bulkCreateDefinitions
);

export default router;
