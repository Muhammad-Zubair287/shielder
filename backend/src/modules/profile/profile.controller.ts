import { Response, NextFunction } from 'express';
import { ProfileService } from './profile.service';
import { AuthRequest } from '../../types/global';

export class ProfileController {
  /**
   * Get own profile
   */
  static async getMyProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const profile = await ProfileService.getProfile(userId);
      
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update own profile
   */
  static async updateMyProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const profile = await ProfileService.updateProfile(userId, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update language
   */
  static async updateLanguage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { preferredLanguage } = req.body;
      const profile = await ProfileService.updateLanguage(userId, preferredLanguage);
      
      res.status(200).json({
        success: true,
        message: 'Language preference updated successfully',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get profile by ID (Admin/Super Admin only)
   */
  static async getProfileById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const profile = await ProfileService.getProfile(userId as string);
      
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
}
