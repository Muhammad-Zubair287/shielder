/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

/**
 * Terms and Conditions Controller
 */

import { Request, Response } from 'express';
import { asyncHandler } from '@/common/middleware/error.middleware';
import { AuthRequest } from '@/types/global';
import TermsAndConditionsService from './terms-and-conditions.service';
import { t } from '@/common/i18n';

class TermsAndConditionsController {
  /**
   * @swagger
   * /api/terms-and-conditions:
   *   get:
   *     summary: Get the terms and conditions (Public)
   *     tags: [Terms and Conditions]
   *     responses:
   *       200:
   *         description: The terms and conditions content
   */
  getTermsAndConditions = asyncHandler(async (_req: Request, res: Response) => {
    const terms = await TermsAndConditionsService.getTermsAndConditions();
    res.json({
      success: true,
      data: {
        contentEn: terms.contentEn,
        contentAr: terms.contentAr,
        updatedAt: terms.updatedAt
      }
    });
  });

  /**
   * @swagger
   * /api/admin/terms-and-conditions:
   *   put:
   *     summary: Update terms and conditions (Super Admin only)
   *     tags: [Terms and Conditions]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [contentEn, contentAr]
   *             properties:
   *               contentEn: { type: string }
   *               contentAr: { type: string }
   *     responses:
   *       200:
   *         description: Terms and conditions updated successfully
   */
  updateTermsAndConditions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { contentEn, contentAr } = req.body;
    const userId = req.user?.id as string;

    const terms = await TermsAndConditionsService.updateTermsAndConditions(userId, contentEn, contentAr);

    res.json({
      success: true,
      message: t('termsAndConditions.updateSuccess', req.locale),
      data: terms
    });
  });
}

export default new TermsAndConditionsController();