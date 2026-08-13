/**
 * Application Controller
 * Request/response handling for mobile application management
 */

import { Request, Response } from 'express';
import { asyncHandler } from '@/common/middleware/error.middleware';
import { applicationService } from './application.service';
import { ApplicationPlatform, ApplicationStatus } from '@prisma/client';
import { t } from '@/common/i18n';
import {
  deleteStoredRefSafe,
  replaceStoredImage,
  storeUploadedImageFile,
} from '@/common/storage/storage-image.helper';

export class ApplicationController {
  /**
   * GET /applications/active
   * Public — returns active apps only
   */
  getActiveApplications = asyncHandler(async (_req: Request, res: Response) => {
    const apps = await applicationService.findActive();
    res.json({ success: true, data: apps });
  });

  /**
   * GET /applications
   * SUPER_ADMIN only
   */
  getApplications = asyncHandler(async (_req: Request, res: Response) => {
    const apps = await applicationService.findAll();
    res.json({ success: true, data: apps });
  });

  /**
   * GET /applications/:id
   * SUPER_ADMIN only
   */
  getApplicationById = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const app = await applicationService.findById(id);
    res.json({ success: true, data: app });
  });

  /**
   * POST /applications
   * SUPER_ADMIN only — with optional file upload
   */
  createApplication = asyncHandler(async (req: Request, res: Response) => {
    let storedImageRef: string | undefined;
    try {
      if (req.file) {
        const storedRef = await storeUploadedImageFile(req.file, 'applications');
        storedImageRef = storedRef.replace(/^\/+/, '');
      }

      const app = await applicationService.create({
        applicationName: req.body.applicationName,
        platform: req.body.platform as ApplicationPlatform,
        downloadUrl: req.body.downloadUrl,
        description: req.body.description,
        status: req.body.status as ApplicationStatus | undefined,
        image: storedImageRef,
      });

      res.status(201).json({
        success: true,
        message: t('application.createSuccess', req.locale),
        data: app,
      });
    } catch (error) {
      if (storedImageRef) {
        await deleteStoredRefSafe(storedImageRef);
      }
      throw error;
    }
  });

  /**
   * PUT /applications/:id
   * SUPER_ADMIN only — with optional file upload
   */
  updateApplication = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = await applicationService.findById(id);

    const updateData: Record<string, unknown> = { ...req.body };

    if (req.file) {
      await replaceStoredImage({
        file: req.file,
        scope: 'applications',
        ownerId: String(id),
        oldRef: existing.image,
        updateDb: async (newRef) => {
          updateData.image = newRef.replace(/^\/+/, '');
          await applicationService.update(id, updateData as any);
        },
      });

      const app = await applicationService.findById(id);
      res.json({
        success: true,
        message: t('application.updateSuccess', req.locale),
        data: app,
      });
      return;
    }

    const app = await applicationService.update(id, updateData as any);

    res.json({
      success: true,
      message: t('application.updateSuccess', req.locale),
      data: app,
    });
  });

  /**
   * DELETE /applications/:id
   * SUPER_ADMIN only
   */
  deleteApplication = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await applicationService.remove(id);
    res.json({
      success: true,
      message: t('application.deleteSuccess', req.locale),
      data: result,
    });
  });

  /**
   * PATCH /applications/:id/status
   * SUPER_ADMIN only
   */
  updateApplicationStatus = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { status } = req.body;
    const app = await applicationService.updateStatus(id, status as ApplicationStatus);
    res.json({
      success: true,
      message: t('application.statusUpdated', req.locale),
      data: app,
    });
  });
}

export const applicationController = new ApplicationController();
