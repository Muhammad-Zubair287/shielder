import { Router } from 'express';
import { warehouseController } from './warehouse.controller';

const router = Router();

router.post('/', warehouseController.createWarehouse);
router.get('/', warehouseController.getWarehouses);
router.get('/:id', warehouseController.getWarehouseById);
router.patch('/:id', warehouseController.updateWarehouse);
router.delete('/:id', warehouseController.deleteWarehouse);

export default router;
