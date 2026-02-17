/**
 * Reports Controller
 * Handles HTTP requests for enterprise reports
 */

import { Response } from 'express';
import { ReportsService } from './reports.service';
import { asyncHandler } from '@/common/utils/helpers';
import { AuthRequest } from '@/types/global';

const reportsService = new ReportsService();

class ReportsController {
  /**
   * Get Overview Summary
   */
  getOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { from, to } = req.query;
    
    // Default to last 30 days if not provided
    const dateTo = to ? new Date(to as string) : new Date();
    const dateFrom = from ? new Date(from as string) : new Date();
    if (!from) dateFrom.setDate(dateTo.getDate() - 30);

    const data = await reportsService.getOverviewSummary({ from: dateFrom, to: dateTo });
    
    res.json({
      success: true,
      data
    });
  });

  /**
   * Get Sales Report
   */
  getSalesReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { from, to, categoryId, paymentStatus, orderStatus } = req.query;
    const dateTo = to ? new Date(to as string) : new Date();
    const dateFrom = from ? new Date(from as string) : new Date();
    if (!from) dateFrom.setDate(dateTo.getDate() - 30);

    const data = await reportsService.getSalesReport({
      from: dateFrom,
      to: dateTo,
      categoryId: categoryId as string,
      paymentStatus: paymentStatus as any,
      orderStatus: orderStatus as any
    });
    
    res.json({
      success: true,
      data
    });
  });

  /**
   * Export Sales Report
   */
  exportSalesReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { from, to, categoryId, paymentStatus, orderStatus, format = 'excel' } = req.query;
    const dateTo = to ? new Date(to as string) : new Date();
    const dateFrom = from ? new Date(from as string) : new Date();
    if (!from) dateFrom.setDate(dateTo.getDate() - 30);

    const data = await reportsService.getSalesReport({
      from: dateFrom,
      to: dateTo,
      categoryId: categoryId as string,
      paymentStatus: paymentStatus as any,
      orderStatus: orderStatus as any
    });

    const buffer = await reportsService.exportSalesReport(data, format as any);

    const filename = `sales-report-${new Date().getTime()}.${format === 'excel' ? 'xlsx' : format}`;
    const contentType = format === 'pdf' ? 'application/pdf' : 
                        format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
                        'text/csv';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);

    // Log the export action
    await reportsService.logExport(req.user?.id || 'system', 'SALES_REPORT', format as string);
  });

  /**
   * Get Order Report
   */
  getOrderReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { from, to } = req.query;
    const dateTo = to ? new Date(to as string) : new Date();
    const dateFrom = from ? new Date(from as string) : new Date();
    if (!from) dateFrom.setDate(dateTo.getDate() - 30);

    const data = await reportsService.getOrderReport(dateFrom, dateTo);
    
    res.json({
      success: true,
      data
    });
  });

  /**
   * Get Inventory Report
   */
  getInventoryReport = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const data = await reportsService.getInventoryReport();
    
    res.json({
      success: true,
      data
    });
  });

  /**
   * Get Payment Report
   */
  getPaymentReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { from, to } = req.query;
    const dateTo = to ? new Date(to as string) : new Date();
    const dateFrom = from ? new Date(from as string) : new Date();
    if (!from) dateFrom.setDate(dateTo.getDate() - 30);

    const data = await reportsService.getPaymentReport(dateFrom, dateTo);
    
    res.json({
      success: true,
      data
    });
  });

  /**
   * Get P&L Report
   */
  getProfitLossReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { from, to } = req.query;
    const dateTo = to ? new Date(to as string) : new Date();
    const dateFrom = from ? new Date(from as string) : new Date();
    if (!from) dateFrom.setDate(dateTo.getDate() - 30);

    const data = await reportsService.getProfitLossReport(dateFrom, dateTo);
    
    res.json({
      success: true,
      data
    });
  });

  /**
   * Log Export Action
   */
  logExport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { reportType, format } = req.body;
    const userId = req.user?.id || 'system';

    await reportsService.logExport(userId, reportType, format);
    
    res.json({
      success: true,
      message: 'Export action logged'
    });
  });
}

export default new ReportsController();
