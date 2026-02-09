/**
 * Super Admin Controller
 */

import { Request, Response, NextFunction } from 'express';
import { superAdminService } from './super-admin.service';
import { getPaginationParams, getSearchFilters } from '../../common/utils/pagination';

export class SuperAdminController {
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = getPaginationParams(req);
      const filters = getSearchFilters(req);

      const result = await superAdminService.getAllUsers(filters, pagination);

      res.json({ success: true, message: 'All users retrieved', ...result });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = getPaginationParams(req);
      const filters = getSearchFilters(req);

      const result = await superAdminService.getUsers(filters, pagination);

      res.json({ success: true, message: 'Users retrieved', ...result });
    } catch (error) {
      next(error);
    }
  }

  async getAdmins(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = getPaginationParams(req);
      const filters = getSearchFilters(req);

      const result = await superAdminService.getAdmins(filters, pagination);

      res.json({ success: true, message: 'Admins retrieved', ...result });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await superAdminService.getUserById(String(req.params.id));
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const createdBy = req.user?.id!;
      const admin = await superAdminService.createAdmin(req.body, createdBy);

      res.status(201).json({ success: true, message: 'Admin created', data: admin });
    } catch (error) {
      next(error);
    }
  }

  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const updatedBy = req.user?.id!;
      const user = await superAdminService.updateUserRole(
        String(req.params.id),
        req.body.role,
        updatedBy
      );

      res.json({ success: true, message: 'Role updated', data: user });
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const updatedBy = req.user?.id!;
      const user = await superAdminService.updateUserStatus(
        String(req.params.id),
        req.body.isActive,
        updatedBy
      );

      res.json({ success: true, message: 'Status updated', data: user });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const deletedBy = req.user?.id!;
      const result = await superAdminService.deleteUser(String(req.params.id), deletedBy);

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await superAdminService.getStatistics();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

export const superAdminController = new SuperAdminController();
