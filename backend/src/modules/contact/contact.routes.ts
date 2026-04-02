import { Router } from 'express';
import multer from 'multer';
import contactController from './contact.controller';
import { validate } from '@/common/middleware/validation.middleware';
import { contactValidation } from './contact.validation';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post('/', upload.single('attachment'), validate(contactValidation.submit), contactController.submit);

export default router;
