/**
 * Application Controller
 * Request/response handling for mobile application management
 */

import { Request, Response } from 'express';
import { asyncHandler } from '@/common/middleware/error.middleware';
import { applicationService } from './application.service';
import { ApplicationPlatform, ApplicationStatus } from '@prisma/client';
import path from 'path';

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
    const imagePath = req.file
      ? path.join('uploads', 'applications', req.file.filename).replace(/\\/g, '/')
      : undefined;

    const app = await applicationService.create({
      applicationName: req.body.applicationName,
      platform: req.body.platform as ApplicationPlatform,
      downloadUrl: req.body.downloadUrl,
      description: req.body.description,
      status: req.body.status as ApplicationStatus | undefined,
      image: imagePath,
    });

    res.status(201).json({
      success: true,
      message: 'Application created successfully.',
      data: app,
    });
  });

  /**
   * PUT /applications/:id
   * SUPER_ADMIN only — with optional file upload
   */
  updateApplication = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const updateData: Record<string, unknown> = { ...req.body };

    if (req.file) {
      updateData.image = path.join('uploads', 'applications', req.file.filename).replace(/\\/g, '/');
    }

    const app = await applicationService.update(id, updateData as any);

    res.json({
      success: true,
      message: 'Application updated successfully.',
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
      message: 'Application deleted successfully.',
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
      message: 'Application status updated successfully.',
      data: app,
    });
  });
}

export const applicationController = new ApplicationController();
