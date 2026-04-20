
import { PrismaClient } from '@prisma/client';
import { superAdminService } from './modules/super-admin/super-admin.service';
import { StockAlertService } from './modules/inventory/stock-alert/stock-alert.service';

const prisma = new PrismaClient();

async function debug() {
  console.log('--- Testing Monthly Analytics ---');
  try {
    const analytics = await superAdminService.getMonthlyAnalytics();
    console.log('Monthly Analytics Success:', analytics);
  } catch (error) {
    console.error('Monthly Analytics Failed:', error);
  }

  console.log('\n--- Testing Low Stock Products ---');
  try {
    const lowStock = await StockAlertService.getLowStockProducts(1, 10);
    console.log('Low Stock Products Success:', lowStock.data.products.length, 'items');
  } catch (error) {
    console.error('Low Stock Products Failed:', error);
  }
  
  await prisma.$disconnect();
}

debug();
