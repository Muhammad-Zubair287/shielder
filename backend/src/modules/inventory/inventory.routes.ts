import { Router } from 'express';
import categoryRoutes from './category/category.routes';
import subcategoryRoutes from './subcategory/subcategory.routes';
import productRoutes from './product/product.routes';
import specificationRoutes from './specification/specification.routes';

const router = Router();

router.use('/categories', categoryRoutes);
router.use('/subcategories', subcategoryRoutes);
router.use('/products', productRoutes);
router.use('/specifications', specificationRoutes);

export default router;
