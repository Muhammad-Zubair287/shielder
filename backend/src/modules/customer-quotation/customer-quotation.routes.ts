/**
 * Customer Quotation Routes
 * Self-service quotation generation — authenticated customers only.
 */

import { Router } from 'express';
import { CustomerQuotationController } from './customer-quotation.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// All routes require auth (we need a userId for createdById)
router.use(authenticate);

// POST  /api/customer-quotations/generate  → create quotation + return full data
router.post('/generate', CustomerQuotationController.generate);

// GET   /api/customer-quotations/:id        → fetch quotation by ID
router.get('/:id', CustomerQuotationController.getById);

// GET   /api/customer-quotations/:id/pdf    → stream PDF download
router.get('/:id/pdf', CustomerQuotationController.downloadPDF);

// POST  /api/customer-quotations/:id/accept → customer accepts quotation
router.post('/:id/accept', CustomerQuotationController.accept);

// POST  /api/customer-quotations/:id/reject → customer rejects quotation
router.post('/:id/reject', CustomerQuotationController.reject);

export default router;
