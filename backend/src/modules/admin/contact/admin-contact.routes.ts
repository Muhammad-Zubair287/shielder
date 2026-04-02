import { Router } from 'express';
import { validate } from '@/common/middleware/validation.middleware';
import { adminContactController } from './admin-contact.controller';
import { adminContactValidation } from './admin-contact.validation';

const router = Router();

router.get('/', validate(adminContactValidation.list, 'query'), adminContactController.listContacts);
router.patch(
  '/:id/resolve',
  validate(adminContactValidation.resolve, 'params'),
  adminContactController.resolveContact
);

export default router;
