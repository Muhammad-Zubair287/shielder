import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { errorHandler } from '../../../../common/middleware/error.middleware';
import { prisma } from '../../../../config/database';
import { specTemplateService } from '../spec-template.service';

jest.mock('../../../auth/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../../../common/middleware/rbac.middleware', () => ({
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

import specTemplateRoutes from '../spec-template.routes';

describe('POST /api/inventory/spec-templates', () => {
  const app = express();
  const categoryId = '550e8400-e29b-41d4-a716-446655440000';
  let createSpy: any;
  let findFirstSpy: any;
  let createRecordSpy: any;

  app.use(express.json());
  app.use('/api/inventory/spec-templates', specTemplateRoutes);
  app.use(errorHandler);

  beforeEach(async () => {
    createSpy = jest.spyOn(specTemplateService, 'create');
    findFirstSpy = jest.spyOn(prisma.category_spec_templates, 'findFirst');
    createRecordSpy = jest.spyOn(prisma.category_spec_templates, 'create');
  });

  afterAll(async () => {
    createSpy?.mockRestore?.();
    findFirstSpy?.mockRestore?.();
    createRecordSpy?.mockRestore?.();
  });

  it('returns 400 for an empty body before service execution', async () => {
    const response = await request(app).post('/api/inventory/spec-templates').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Required fields are missing');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('returns 400 when required fields are missing', async () => {
    const response = await request(app)
      .post('/api/inventory/spec-templates')
      .send({
        categoryId,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Required fields are missing');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'specKey' }),
        expect.objectContaining({ field: 'isRequired' }),
      ]),
    );
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('creates a spec template with valid input', async () => {
    findFirstSpy.mockResolvedValueOnce(null);
    createRecordSpy.mockResolvedValueOnce({
      id: 'spec-template-1',
      category_id: categoryId,
      subcategory_id: null,
      spec_key: 'Thread Size',
      is_required: true,
      created_at: new Date('2026-05-31T00:00:00.000Z'),
      updated_at: new Date('2026-05-31T00:00:00.000Z'),
    });

    const response = await request(app)
      .post('/api/inventory/spec-templates')
      .send({
        categoryId,
        specKey: 'Thread Size',
        isRequired: true,
        unit: 'mm',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        category_id: categoryId,
        spec_key: 'Thread Size',
        is_required: true,
      }),
    );
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(findFirstSpy).toHaveBeenCalledTimes(1);
    expect(createRecordSpy).toHaveBeenCalledTimes(1);
  });

  it('returns 409 when a duplicate spec template is created', async () => {
    const payload = {
      categoryId,
      specKey: 'Thread Size',
      isRequired: true,
      unit: 'mm',
    };

    findFirstSpy.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'existing-spec-template',
      category_id: categoryId,
      subcategory_id: null,
      spec_key: 'Thread Size',
      is_required: true,
      created_at: new Date('2026-05-31T00:00:00.000Z'),
      updated_at: new Date('2026-05-31T00:00:00.000Z'),
    });
    createRecordSpy.mockResolvedValueOnce({
      id: 'spec-template-1',
      category_id: categoryId,
      subcategory_id: null,
      spec_key: 'Thread Size',
      is_required: true,
      created_at: new Date('2026-05-31T00:00:00.000Z'),
      updated_at: new Date('2026-05-31T00:00:00.000Z'),
    });

    const firstResponse = await request(app).post('/api/inventory/spec-templates').send(payload);
    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app).post('/api/inventory/spec-templates').send(payload);

    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body.success).toBe(false);
    expect(String(secondResponse.body.message)).toContain('already exists');
    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(findFirstSpy).toHaveBeenCalledTimes(2);
    expect(createRecordSpy).toHaveBeenCalledTimes(1);
  });
});