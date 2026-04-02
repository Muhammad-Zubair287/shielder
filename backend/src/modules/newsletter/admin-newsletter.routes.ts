import { Router } from 'express';
import { validate } from '@/common/middleware/validation.middleware';
import { newsletterController } from './newsletter.controller';
import { newsletterValidation } from './newsletter.validation';

const router = Router();

router.get(
  '/subscribers',
  validate(newsletterValidation.list, 'query'),
  newsletterController.listSubscribers
);

export default router;
