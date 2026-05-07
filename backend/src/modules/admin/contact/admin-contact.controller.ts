import { Request, Response } from 'express';
import { asyncHandler } from '@/common/utils/helpers';
import { adminContactService } from './admin-contact.service';

class AdminContactController {
  listContacts = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminContactService.listContacts({
      status: req.query.status as 'PENDING' | 'RESOLVED' | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  });

  getInquiryStats = asyncHandler(async (_req: Request, res: Response) => {
    const result = await adminContactService.getInquiryStats();
    return res.status(200).json({
      success: true,
      data: result,
    });
  });

  resolveContact = asyncHandler(async (req: Request, res: Response) => {
    const userIdRaw = req.user?.id || req.user?.userId;
    const userId = Array.isArray(userIdRaw) ? userIdRaw[0] : userIdRaw;
    const contactIdRaw = req.params.id;
    const contactId = Array.isArray(contactIdRaw) ? contactIdRaw[0] : contactIdRaw;

    const result = await adminContactService.resolveContact(contactId || '', userId || '');

    return res.status(200).json({
      success: true,
      message: 'Contact marked as resolved',
      data: result,
    });
  });
}

export const adminContactController = new AdminContactController();
