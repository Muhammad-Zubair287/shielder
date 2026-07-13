import { Router, Request, Response } from 'express';
import { translate } from '@vitalets/google-translate-api';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireRoles } from '@/common/middleware/rbac.middleware';
import { UserRole } from '@/common/constants/roles';

const router = Router();

/**
 * POST /translate/to-arabic
 * Body: { text: string }
 * Returns: { translated: string } or 422 if translation fails/produces non-Arabic output
 */
router.post(
  '/to-arabic',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF),
  async (req: Request, res: Response) => {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ message: 'text is required' });
      return;
    }
    try {
      const { text: translated } = await translate(text.trim(), { to: 'ar' });
      if (translated && /[\u0600-\u06FF]/.test(translated)) {
        res.json({ translated });
        return;
      }
      res.status(422).json({ message: 'Translation service unavailable or produced non-Arabic output' });
    } catch {
      res.status(422).json({ message: 'Translation service unavailable' });
    }
  },
);

export default router;
