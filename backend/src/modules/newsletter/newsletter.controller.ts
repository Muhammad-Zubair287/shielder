/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

import { Request, Response } from 'express';
import { asyncHandler } from '@/common/middleware/error.middleware';
import { newsletterService } from './newsletter.service';
import { t } from '@/common/i18n';

class NewsletterController {
  subscribe = asyncHandler(async (req: Request, res: Response) => {
    const result = await newsletterService.subscribe(req.body.email as string);
    res.status(201).json({
      success: true,
      message: t('newsletter.subscribeSuccess', req.locale),
      data: result,
    });
  });

  listSubscribers = asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const active =
      typeof req.query.active === 'string'
        ? req.query.active === 'true'
        : undefined;

    const result = await newsletterService.list({ page, limit, active });

    res.json({
      success: true,
      data: result,
    });
  });
}

export const newsletterController = new NewsletterController();
