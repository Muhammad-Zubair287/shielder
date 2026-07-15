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
import env from '@/config/env';
import { t } from '@/common/i18n';

export const formatSettingUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  const baseUrl = env.APP_URL.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

export const serializeSettings = (settings: any): any => {
  if (!settings) return settings;
  const serialized = { ...settings };
  
  const fileFields = ['companyLogo', 'favicon'];
  for (const field of fileFields) {
    if (serialized[field] && typeof serialized[field] === 'string') {
      serialized[field] = formatSettingUrl(serialized[field]);
    }
  }
  
  for (const key of Object.keys(serialized)) {
    const value = serialized[key];
    if (typeof value === 'string') {
      if (value.startsWith('/uploads/') || value.startsWith('/images/')) {
        serialized[key] = formatSettingUrl(value);
      }
    }
  }
  
  return serialized;
};

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
          req.ip || '',
          req.locale
        );
        res.json({ success: true, message: t('settings.logoUploaded', req.locale), data: serializeSettings({ companyLogo: logoPath }) });
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
    res.json({ success: true, data: serializeSettings(data) });
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

    res.json({ success: true, data: serializeSettings(publicPayload) });
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

    const updatePayload = { ...req.body };
    if (section === 'general' && req.files && typeof req.files === 'object') {
      const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (filesMap['companyLogo']?.[0]) {
        updatePayload.companyLogo = `/uploads/${filesMap['companyLogo'][0].filename}`;
      } else if (filesMap['logo']?.[0]) {
        updatePayload.companyLogo = `/uploads/${filesMap['logo'][0].filename}`;
      }
      if (filesMap['favicon']?.[0]) {
        updatePayload.favicon = `/uploads/${filesMap['favicon'][0].filename}`;
      }
    }

    const data = await SettingsService.updateSettings(userId, section, updatePayload, ipAddress, req.locale);
    res.json({ success: true, message: t('settings.updateSuccess', req.locale), data: serializeSettings(data) });
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
