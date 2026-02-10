import { Router } from 'express';
import { productController } from './product.controller';
import { productValidation } from './product.validation';
import { validate } from '@/common/middleware/validation.middleware';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireAdmin } from '@/common/middleware/rbac.middleware';

const router = Router();

// Public routes
router.get('/', productController.list);
router.get('/:id', productController.getById);
router.get('/:id/attachments', productController.listAttachments);

// Protected routes (Admin only)
router.use(authenticate, requireAdmin);

router.post('/', validate(productValidation.create), productController.create);
router.put('/:id', validate(productValidation.update), productController.update);
router.delete('/:id', productController.delete);

// Specifications
router.post(
  '/:id/specifications',
  validate(productValidation.assignSpecifications),
  productController.assignSpecifications
);

// Attachments
router.post(
  '/:id/attachments',
  validate(productValidation.addAttachment),
  productController.addAttachment
);

router.delete('/:id/attachments/:attachmentId', productController.deleteAttachment);

export default router;
