import { Request, Response } from 'express';
import { asyncHandler } from '@/common/utils/helpers';
import contactService from './contact.service';

class ContactController {
  private splitFullName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }

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
  *             required: [email, subject, message]
   *             properties:
  *               firstName: { type: string, description: Required if fullName is not provided }
  *               lastName: { type: string, description: Required if fullName is not provided }
  *               fullName: { type: string, description: Android/mobile compatibility field; backend auto-splits to first/last name }
   *               email: { type: string, format: email }
   *               phone: { type: string }
   *               subject: { type: string }
   *               message: { type: string }
  *               captchaToken: { type: string, description: Required for web/desktop clients; optional for phone clients }
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

    const providedFirstName = typeof req.body.firstName === 'string' ? req.body.firstName.trim() : '';
    const providedLastName = typeof req.body.lastName === 'string' ? req.body.lastName.trim() : '';
    const providedFullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
    const parsedFromFullName = providedFullName ? this.splitFullName(providedFullName) : { firstName: '', lastName: '' };

    const firstName = providedFirstName || parsedFromFullName.firstName;
    const lastName = providedLastName || parsedFromFullName.lastName;

    const result = await contactService.submitContactForm(
      {
        firstName,
        lastName,
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
