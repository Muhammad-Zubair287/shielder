/**
 * EPG Payment Controller
 */

import { Request, Response, NextFunction } from 'express';
import { epgService } from './epg.service';
import { MockEpgDevService } from './mock-epg.dev.service';
import { env } from '../../config/env';
import { logger } from '../../common/logger/logger';
import { t } from '../../common/i18n';
import { isMockEpgEnabled } from './providers/payment-provider.config';

const frontendUrl = () => env.FRONTEND_URL as string;

const mockDevService = new MockEpgDevService(epgService);

export class EPGController {
  /**
   * POST /api/epg/initialize
   */
  async initialize(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id as string;
      if (!userId) {
        res.status(401).json({ success: false, message: t('common.unauthorized', req.locale) });
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
   * GET /api/epg/callback — public redirect from gateway (real or mock trigger)
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

      const messageKey =
        result.reason === 'insufficient_stock_after_payment'
          ? 'payment.insufficientStockAfterPayment'
          : result.reason === 'cancelled'
            ? 'payment.cancelled'
            : 'payment.failed';

      return res.redirect(
        `${base}/checkout?payment=failed&messageKey=${encodeURIComponent(messageKey)}`,
      );
    } catch (err) {
      logger.error('[EPG] Callback handler error:', err);
      res.redirect(
        `${frontendUrl()}/checkout?payment=failed&messageKey=${encodeURIComponent('payment.verificationFailed')}`,
      );
    }
  }

  /**
   * POST /api/epg/webhook
   */
  async webhook(req: Request, res: Response) {
    try {
      const signature = (req.headers['x-epg-signature'] ||
                         req.headers['x-signature']     || '') as string;
      const result = await epgService.handleWebhook(req.body, signature);
      res.status(200).json(result);
    } catch (err) {
      logger.error('[EPG] Webhook handler error:', err);
      res.status(200).json({ received: true });
    }
  }

  /**
   * GET /api/epg/mock/session/:sessionId — development only
   */
  async getMockSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id as string;
      const sessionId = String(req.params.sessionId || '');
      const data = await mockDevService.getSessionForUser(sessionId, userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/epg/mock/trigger — development only; runs scenario through handleCallback
   */
  async triggerMockScenario(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id as string;
      const { sessionId, scenario } = req.body as { sessionId: string; scenario: string };
      const result = await mockDevService.triggerScenario(sessionId, scenario, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/epg/provider — safe provider info (no secrets)
   */
  async getProviderInfo(_req: Request, res: Response) {
    res.json({
      success: true,
      data: {
        mockEnabled: isMockEpgEnabled(),
        // Never expose credentials
      },
    });
  }
}

export const epgController = new EPGController();
