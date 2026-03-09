/**
 * EPG Payment Controller
 */

import { Request, Response, NextFunction } from 'express';
import { epgService } from './epg.service';
import { env } from '../../config/env';
import { logger } from '../../common/logger/logger';

const frontendUrl = () => env.FRONTEND_URL as string;

export class EPGController {
  /**
   * POST /api/epg/initialize
   * Authenticated customer calls this to start a card payment.
   * Creates the order and returns the EPG hosted-payment URL.
   */
  async initialize(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id as string;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const base = frontendUrl();
      const result = await epgService.initializePayment(userId, {
        ...req.body,
        successUrl: `${base}/order-confirmation`,
        failureUrl: `${base}/checkout?payment=failed`,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/epg/callback
   * EPG redirects the customer here after payment.
   * Public endpoint — no auth required (EPG calls it).
   */
  async callback(req: Request, res: Response) {
    try {
      const query = req.query as Record<string, string>;
      const result = await epgService.handleCallback(query);

      const base = frontendUrl();
      if (result.success && result.orderId) {
        return res.redirect(
          `${base}/order-confirmation/${result.orderId}?payment=success`,
        );
      }
      return res.redirect(
        `${base}/checkout?payment=failed&msg=${encodeURIComponent('Payment was not completed')}`,
      );
    } catch (err) {
      logger.error('[EPG] Callback handler error:', err);
      res.redirect(`${frontendUrl()}/checkout?payment=failed`);
    }
  }

  /**
   * POST /api/epg/webhook
   * Server-to-server notification from the EPG gateway.
   * Always responds with 200 to acknowledge receipt.
   */
  async webhook(req: Request, res: Response) {
    try {
      const signature = (req.headers['x-epg-signature'] ||
                         req.headers['x-signature']     || '') as string;
      const result = await epgService.handleWebhook(req.body, signature);
      res.status(200).json(result);
    } catch (err) {
      logger.error('[EPG] Webhook handler error:', err);
      // Always 200 so EPG does not retry endlessly
      res.status(200).json({ received: true });
    }
  }
}

export const epgController = new EPGController();
