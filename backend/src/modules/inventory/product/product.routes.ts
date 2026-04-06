import { Router } from 'express';
import { productController } from './product.controller';
import { productValidation } from './product.validation';
import { validate } from '@/common/middleware/validation.middleware';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireAdmin } from '@/common/middleware/rbac.middleware';
import { upload } from '@/common/middleware/upload.middleware';
import multer from 'multer';

const router = Router();
const multerMemory = multer({ storage: multer.memoryStorage() });

// Public routes (order matters: specific paths before dynamic /:id)
router.get('/', validate(productValidation.list, 'query'), productController.list);
router.get('/filters', validate(productValidation.filters, 'query'), productController.getFilters);
router.get('/summary', authenticate, requireAdmin, productController.getSummary);
router.get('/management', authenticate, requireAdmin, productController.listForManagement);
router.get('/template', authenticate, requireAdmin, productController.downloadTemplate);
router.get('/pending', authenticate, requireAdmin, productController.getPending);

// Dynamic public routes (after all specific GET paths)
router.get('/:id', productController.getById);
router.get('/:id/attachments', productController.listAttachments);

// Protected routes (Admin only)
router.use(authenticate, requireAdmin);

router.post('/bulk-upload', multerMemory.single('file'), productController.bulkUpload);
router.post('/bulk-delete', validate(productValidation.bulkDelete), productController.bulkDelete);
router.patch('/:id/approve', productController.approve);
router.patch('/:id/reject', productController.reject);

router.post('/', validate(productValidation.create), productController.create);
router.put('/:id', validate(productValidation.update), productController.update);
router.delete('/:id', productController.delete);

// Product image upload
router.post('/:id/images', upload.single('productImage'), productController.uploadImage);

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
