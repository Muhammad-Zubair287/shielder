import { Request, Response, NextFunction } from 'express';
import { productService } from './product.service';

export class ProductController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.create(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryId, subcategoryId, locale } = req.query;
      const products = await productService.list({
        categoryId: categoryId as string,
        subcategoryId: subcategoryId as string,
        locale: locale as string,
      });
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { locale } = req.query;
      const product = await productService.getById(String(req.params.id), locale as string);
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.update(String(req.params.id), req.body);
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.delete(String(req.params.id));
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Specifications
  async assignSpecifications(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.assignSpecifications(String(req.params.id), req.body.specifications);
      res.json({ success: true, message: 'Specifications assigned successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Attachments
  async addAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const attachment = await productService.addAttachment(String(req.params.id), req.body);
      res.status(201).json({ success: true, data: attachment });
    } catch (error) {
      next(error);
    }
  }

  async listAttachments(req: Request, res: Response, next: NextFunction) {
    try {
      const attachments = await productService.listAttachments(String(req.params.id));
      res.json({ success: true, data: attachments });
    } catch (error) {
      next(error);
    }
  }

  async deleteAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.deleteAttachment(String(req.params.id), String(req.params.attachmentId));
      res.json({ success: true, message: 'Attachment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
