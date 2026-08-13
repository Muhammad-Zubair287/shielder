/**
 * EPG Payment Routes
 *
 * POST /api/epg/initialize  — customer initiates card payment (auth required)
 * GET  /api/epg/callback    — EPG redirects customer here after payment (public)
 * POST /api/epg/webhook     — EPG server-to-server notification (public)
 */

import { Router } from 'express';
import Joi from 'joi';
import { sharedValidationSchemas } from '../../common/validation/shared.schemas';
import { epgController } from './epg.controller';
import { authenticate } from '../auth/auth.middleware';
import { validate } from '../../common/middleware/validation.middleware';
import { isMockEpgEnabled } from './providers/payment-provider.config';
import { NotFoundError } from '../../common/errors/api.error';

const router = Router();

/** Reject mock-only routes in production / when mock provider is disabled */
const requireMockEpgMode = (_req: unknown, _res: unknown, next: (err?: unknown) => void) => {
  if (!isMockEpgEnabled()) {
    next(new NotFoundError('payment.mockNotAvailable'));
    return;
  }
  next();
};

const mockTriggerSchema = Joi.object({
  sessionId: Joi.string().trim().min(8).required(),
  scenario: Joi.string()
    .valid(
      'success',
      'failed',
      'cancelled',
      'pending',
      'timeout',
      'duplicate_callback',
      'refund_success',
      'refund_failure',
      'already_refunded',
    )
    .required(),
});

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
  customerName:    sharedValidationSchemas.textNoHtml.min(2).required(),
  phoneNumber:     Joi.string().trim().min(7).required(),
  shippingAddress: Joi.when('deliveryType', {
    is: 'DELIVERY',
    then: sharedValidationSchemas.textNoHtml.min(5).max(200).required().messages({
      'any.required': 'validation.required',
      'string.min': 'validation.shippingAddressMin',
      'string.empty': 'validation.required',
    }),
    otherwise: sharedValidationSchemas.textNoHtml.allow('', null).optional(),
  }),
  notes:           sharedValidationSchemas.textNoHtml.allow('', null).optional(),
  deliveryType:    Joi.string().valid('DELIVERY', 'PICKUP').default('DELIVERY'),
  // Optional: backend resolves the single authoritative pickup warehouse.
  warehouseId:     Joi.string().uuid().optional().allow(null),
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

// Safe provider metadata (no secrets)
router.get('/provider', epgController.getProviderInfo.bind(epgController));

// ── Development-only mock EPG controls ─────────────────────────────────────
router.get(
  '/mock/session/:sessionId',
  requireMockEpgMode,
  authenticate,
  epgController.getMockSession.bind(epgController),
);

router.post(
  '/mock/trigger',
  requireMockEpgMode,
  authenticate,
  validate(mockTriggerSchema),
  epgController.triggerMockScenario.bind(epgController),
);

export default router;
