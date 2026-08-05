import { Router } from 'express';
import { warehouseController } from './warehouse.controller';
import { validate } from '@/common/middleware/validation.middleware';
import { warehouseValidation } from './warehouse.validation';

const router = Router();

router.post('/', validate(warehouseValidation.create), warehouseController.createWarehouse);
router.get('/', warehouseController.getWarehouses);
router.get('/:id', warehouseController.getWarehouseById);
router.patch('/:id', validate(warehouseValidation.update), warehouseController.updateWarehouse);
router.delete('/:id', warehouseController.deleteWarehouse);

export default router;
