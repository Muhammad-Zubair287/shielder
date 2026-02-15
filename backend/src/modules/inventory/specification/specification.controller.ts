import { Request, Response, NextFunction } from 'express';
import { specificationService } from './specification.service';

export class SpecificationController {
  /**
   * @swagger
   * /api/inventory/specifications:
   *   post:
   *     summary: Create a specification definition
   *     tags: [Inventory - Specifications]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [key, dataType]
   *             properties:
   *               key: { type: string }
   *               unit: { type: string }
   *               dataType: { type: string, enum: [TEXT, NUMBER, BOOLEAN] }
   *               translations:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     locale: { type: string }
   *                     label: { type: string }
   *     responses:
   *       201:
   *         description: Specification created
   */
  async createDefinition(req: Request, res: Response, next: NextFunction) {
    try {
      const definition = await specificationService.createDefinition(req.body);
      res.status(201).json({ success: true, data: definition });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/specifications:
   *   get:
   *     summary: List specification definitions
   *     tags: [Inventory - Specifications]
   *     parameters:
   *       - in: query
   *         name: locale
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: List of specifications
   */
  async listDefinitions(req: Request, res: Response, next: NextFunction) {
    try {
      const { locale } = req.query;
      const definitions = await specificationService.listDefinitions(locale as string);
      res.json({ success: true, data: definitions });
    } catch (error) {
      next(error);
    }
  }

  async bulkCreateDefinitions(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await specificationService.bulkCreateDefinitions(req.body);
      res.status(201).json({ success: true, count: results.length, data: results });
    } catch (error) {
      next(error);
    }
  }
}

export const specificationController = new SpecificationController();
