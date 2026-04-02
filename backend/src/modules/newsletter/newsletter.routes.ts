import { Router } from 'express';
import { validate } from '@/common/middleware/validation.middleware';
import { newsletterController } from './newsletter.controller';
import { newsletterValidation } from './newsletter.validation';

const router = Router();

router.post('/subscribe', validate(newsletterValidation.subscribe), newsletterController.subscribe);

export default router;
