/**
 * Application Service
 * Business logic for mobile application management
 */

import { BadRequestError, NotFoundError } from '@/common/errors/api.error';
import { prisma } from '@/config/database';
import { ApplicationPlatform, ApplicationStatus } from '@prisma/client';

export interface ApplicationCreateInput {
  applicationName: string;
  platform: ApplicationPlatform;
  downloadUrl: string;
  description?: string;
  status?: ApplicationStatus;
  image?: string;
}

export interface ApplicationUpdateInput {
  applicationName?: string;
  platform?: ApplicationPlatform;
  downloadUrl?: string;
  description?: string;
  status?: ApplicationStatus;
  image?: string;
}

export class ApplicationService {
  async create(data: ApplicationCreateInput) {
    const applicationName = data.applicationName?.trim();
    if (!applicationName) throw new BadRequestError('Application name is required.');
    if (!data.platform) throw new BadRequestError('Platform is required.');
    if (!data.downloadUrl) throw new BadRequestError('Download URL is required.');

    return prisma.application.create({
      data: {
        applicationName,
        platform: data.platform,
        downloadUrl: data.downloadUrl,
        description: data.description?.trim() || null,
        image: data.image || null,
        status: data.status ?? 'ACTIVE',
      },
    });
  }

  async findAll() {
    return prisma.application.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive() {
    return prisma.application.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) throw new NotFoundError('Application not found.');
    return app;
  }

  async update(id: number, data: ApplicationUpdateInput) {
    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Application not found.');

    const payload: ApplicationUpdateInput = {};

    if (typeof data.applicationName !== 'undefined') {
      const name = data.applicationName.trim();
      if (!name) throw new BadRequestError('Application name cannot be empty.');
      payload.applicationName = name;
    }

    if (typeof data.platform !== 'undefined') {
      payload.platform = data.platform;
    }

    if (typeof data.downloadUrl !== 'undefined') {
      if (!data.downloadUrl) throw new BadRequestError('Download URL cannot be empty.');
      payload.downloadUrl = data.downloadUrl;
    }

    if (typeof data.description !== 'undefined') {
      payload.description = data.description?.trim() || undefined;
    }

    if (typeof data.status !== 'undefined') {
      payload.status = data.status;
    }

    if (typeof data.image !== 'undefined') {
      payload.image = data.image;
    }

    return prisma.application.update({
      where: { id },
      data: payload,
    });
  }

  async remove(id: number) {
    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Application not found.');
    await prisma.application.delete({ where: { id } });
    return { id, deleted: true };
  }

  async updateStatus(id: number, status: ApplicationStatus) {
    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Application not found.');
    return prisma.application.update({
      where: { id },
      data: { status },
    });
  }
}

export const applicationService = new ApplicationService();
