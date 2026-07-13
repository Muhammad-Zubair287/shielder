/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

/**
 * Privacy Policy Controller
 */

import { Request, Response } from 'express';
import { asyncHandler } from '@/common/middleware/error.middleware';
import { AuthRequest } from '@/types/global';
import PrivacyPolicyService from './privacy-policy.service';
import { t } from '@/common/i18n';

class PrivacyPolicyController {
  /**
   * @swagger
   * /api/privacy-policy:
   *   get:
   *     summary: Get the privacy policy (Public)
   *     tags: [Privacy Policy]
   *     responses:
   *       200:
   *         description: The privacy policy content
   */
  getPolicy = asyncHandler(async (_req: Request, res: Response) => {
    const policy = await PrivacyPolicyService.getPrivacyPolicy();
    res.json({
      success: true,
      data: {
        contentEn: policy.contentEn,
        contentAr: policy.contentAr,
        updatedAt: policy.updatedAt
      }
    });
  });

  /**
   * @swagger
   * /api/admin/privacy-policy:
   *   put:
   *     summary: Update privacy policy (Super Admin only)
   *     tags: [Privacy Policy]
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
   *         description: Policy updated successfully
   */
  updatePolicy = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { contentEn, contentAr } = req.body;
    const userId = req.user?.id as string;

    const policy = await PrivacyPolicyService.updatePrivacyPolicy(userId, contentEn, contentAr);

    res.json({
      success: true,
      message: t('privacyPolicy.updateSuccess', req.locale),
      data: policy
    });
  });
}

export default new PrivacyPolicyController();
