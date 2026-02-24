import { Response, NextFunction } from 'express';
import { ProfileService } from './profile.service';
import { AuthRequest } from '../../types/global';

export class ProfileController {
  /**
   * @swagger
   * /api/profile/me:
   *   get:
   *     summary: Get my own profile
   *     tags: [User Profile]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Profile data
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
   * @swagger
   * /api/profile/me:
   *   put:
   *     summary: Update my own profile
   *     tags: [User Profile]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               fullName: { type: string }
   *               address: { type: string }
   *               phoneNumber: { type: string }
   *     responses:
   *       200:
   *         description: Profile updated
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
   * @swagger
   * /api/profile/language:
   *   patch:
   *     summary: Update language preference
   *     tags: [User Profile]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               preferredLanguage: { type: string, enum: [en, ar] }
   *     responses:
   *       200:
   *         description: Language updated
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
   * @swagger
   * /api/profile/{userId}:
   *   get:
   *     summary: Get profile by ID (Admin only)
   *     tags: [User Profile]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Profile data
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

  /**
   * @swagger
   * /api/profile/preferences:
   *   patch:
   *     summary: Update profile preferences (theme etc)
   *     tags: [User Profile]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200:
   *         description: Preferences updated
   */
  static async updatePreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const profile = await ProfileService.updatePreferences(userId, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Preferences updated successfully',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/profile/upload-image:
   *   post:
   *     summary: Upload profile image
   *     tags: [User Profile]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               profileImage:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Profile image uploaded successfully
   */
  static async uploadProfileImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const file = req.file;

      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      // Generate URL for the uploaded file
      const profileImageUrl = `/uploads/profile/${file.filename}`;

      // Update profile with new image URL
      const profile = await ProfileService.updateProfile(userId, {
        profileImage: profileImageUrl,
      });

      res.status(200).json({
        success: true,
        message: 'Profile image uploaded successfully',
        data: {
          profileImage: profileImageUrl,
          profile,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
