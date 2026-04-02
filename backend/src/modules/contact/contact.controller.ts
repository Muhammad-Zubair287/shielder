import { Request, Response } from 'express';
import { asyncHandler } from '@/common/utils/helpers';
import contactService from './contact.service';

class ContactController {
  /**
   * @swagger
   * /api/contact:
   *   post:
   *     summary: Submit contact form message
   *     tags: [Contact]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [firstName, lastName, email, subject, message, captchaToken]
   *             properties:
   *               firstName: { type: string }
   *               lastName: { type: string }
   *               email: { type: string, format: email }
   *               phone: { type: string }
   *               subject: { type: string }
   *               message: { type: string }
   *               captchaToken: { type: string }
   *               attachment:
   *                 type: string
   *                 format: binary
   *     responses:
   *       201:
   *         description: Contact message submitted successfully
   *       400:
   *         description: Validation failed or captcha verification failed
   */
  submit = asyncHandler(async (req: Request, res: Response) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    const remoteIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : (forwardedFor?.split(',')[0]?.trim() || req.ip);

    const result = await contactService.submitContactForm(
      {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        subject: req.body.subject,
        message: req.body.message,
        captchaToken: req.body.captchaToken,
      },
      remoteIp,
      req.headers['user-agent'],
      req.file
    );

    return res.status(201).json({
      success: true,
      message: 'Contact message submitted successfully.',
      data: {
        id: result.id,
      },
    });
  });
}

export default new ContactController();
