import { Router } from 'express';
import { authenticate } from '@/modules/auth/auth.middleware';
import { warehouseController } from './warehouse.controller';

const router = Router();

// Authenticated users (including customers) can fetch active warehouses for pickup.
router.get('/active', authenticate, warehouseController.getActiveWarehouses);

export default router;