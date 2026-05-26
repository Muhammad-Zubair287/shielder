/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

/**
 * System Settings Controller
 */

import { Request, Response } from 'express';
import SettingsService from './settings.service';
import { asyncHandler } from '@/common/middleware/error.middleware';
import { AuthRequest } from '@/types/global';
import { upload } from '@/common/middleware/upload.middleware';

class SettingsController {
  /**
   * @swagger
   * /api/settings/logo:
   *   post:
   *     summary: Upload and update company logo (Admin/SuperAdmin)
   *     tags: [Settings]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               logo:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Logo updated
   */
    uploadCompanyLogo = [
      upload.single('logo'),
      asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.file) {
          res.status(400).json({ success: false, message: 'No file uploaded' });
          return;
        }
        // Save file path (relative to uploads/)
        const logoPath = `/uploads/${req.file.filename}`;
        // Update settings
        await SettingsService.updateSettings(
          req.user?.id as string,
          'general',
          { companyLogo: logoPath },
          req.ip || ''
        );
        res.json({ success: true, message: 'Company logo updated', data: { companyLogo: logoPath } });
      })
    ];
  /**
   * @swagger
   * /api/settings:
   *   get:
   *     summary: Get all system settings (Admin/SuperAdmin)
   *     tags: [Settings]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Current system settings
   */
  getSettings = asyncHandler(async (_req: Request, res: Response) => {
    const data = await SettingsService.getSettings();
    res.json({ success: true, data });
  });

  /**
   * Public settings endpoint for customer-facing pages.
   * Returns a minimal, non-sensitive subset of settings suitable for public consumption.
   */
  getPublicSettings = asyncHandler(async (_req: Request, res: Response) => {
    const s = await SettingsService.getSettings();

    // Map to a stable public shape. If localized fields are not present
    // we fall back to existing companyName / companyAddress values.
    const publicPayload = {
      company_name_en: (s as any).companyNameEn || (s as any).companyName || null,
      company_name_ar: (s as any).companyNameAr || (s as any).companyName || null,
      company_email: (s as any).companyEmail || null,
      company_phone: (s as any).companyPhone || null,
      company_location_en: (s as any).companyLocationEn || (s as any).companyAddress || null,
      company_location_ar: (s as any).companyLocationAr || (s as any).companyAddress || null,
      mapEmbedUrl: (s as any).mapEmbedUrl || null,
      whatsAppHref: (s as any).whatsAppHref || null,
    };

    res.json({ success: true, data: publicPayload });
  });

  /**
   * @swagger
   * /api/settings/general:
   *   put:
   *     summary: Update a specific settings section (general/notification/security/order/payment)
   *     tags: [Settings]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200:
   *         description: Settings updated
   */
  updateSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = (req.user?.id as string) || '';
    // Derive section from URL path (e.g., /general → 'general')
    const section = req.path.split('/').filter(Boolean)[0] || (req.params.section as string) || '';
    const ipAddress = req.ip || '';

    const data = await SettingsService.updateSettings(userId, section, req.body, ipAddress);
    res.json({ success: true, message: `${section} settings updated successfully`, data });
  });

  /**
   * @swagger
   * /api/settings/logs:
   *   get:
   *     summary: Get settings change audit logs (Super Admin only)
   *     tags: [Settings]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *       - in: query
   *         name: module
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Settings audit log entries
   */
  getLogs = asyncHandler(async (req: Request, res: Response) => {
    const window = req.query.window as string || 'all';
    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      module: req.query.module as string,
      adminId: req.query.adminId as string,
      date: req.query.date as string,
      window: window as 'all' | 'today' | '7d' | '30d',
    };

    const data = await SettingsService.getSettingsLogs(filters);
    res.json({ success: true, data });
  });

  /**
   * @swagger
   * /api/settings/verify:
   *   post:
   *     summary: Verify admin password for sensitive actions
   *     tags: [Settings]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [password]
   *             properties:
   *               password: { type: string }
   *     responses:
   *       200:
   *         description: Identity verified
   *       401:
   *         description: Invalid password
   */
  verifySensitiveAction = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const { password } = req.body;

    await SettingsService.verifyAdminPassword(userId, password);
    res.json({ success: true, message: 'Identity verified' });
  });

  /**
   * @swagger
   * /api/settings/backup:
   *   post:
   *     summary: Trigger a manual system backup (Super Admin only)
   *     tags: [Settings]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Backup triggered
   */
  triggerBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id!;
    const result = await SettingsService.triggerBackup(userId);
    res.json(result);
  });

  /**
   * @swagger
   * /api/settings/snapshots:
   *   get:
   *     summary: Get configuration snapshots (Super Admin only)
   *     tags: [Settings]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Config snapshots
   */
  getSnapshots = asyncHandler(async (_req: Request, res: Response) => {
    const data = await SettingsService.getSnapshots();
    res.json({ success: true, data });
  });
}

export default new SettingsController();
