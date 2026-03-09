/**
 * EPG Payment Routes
 *
 * POST /api/epg/initialize  — customer initiates card payment (auth required)
 * GET  /api/epg/callback    — EPG redirects customer here after payment (public)
 * POST /api/epg/webhook     — EPG server-to-server notification (public)
 */

import { Router } from 'express';
import Joi from 'joi';
import { epgController } from './epg.controller';
import { authenticate } from '../auth/auth.middleware';
import { validate } from '../../common/middleware/validation.middleware';

const router = Router();

const initializeSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity:  Joi.number().integer().min(1).required(),
      }),
    )
    .min(1)
    .required(),
  customerName:    Joi.string().trim().min(2).required(),
  phoneNumber:     Joi.string().trim().min(7).required(),
  shippingAddress: Joi.string().trim().min(5).required(),
  notes:           Joi.string().allow('', null).optional(),
});

// Initialize EPG payment (customer must be authenticated)
router.post(
  '/initialize',
  authenticate,
  validate(initializeSchema),
  epgController.initialize.bind(epgController),
);

// EPG redirects the customer back here — public, no auth
router.get('/callback', epgController.callback.bind(epgController));

// EPG server-to-server webhook — public, verified by HMAC in service
router.post('/webhook', epgController.webhook.bind(epgController));

export default router;
