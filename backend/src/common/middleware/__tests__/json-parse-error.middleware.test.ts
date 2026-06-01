// Ensure required env vars for module load
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '5001';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refreshsecret';

import { jsonParseErrorHandler } from '../json-parse-error.middleware';
import { BadRequestError } from '@/common/errors/api.error';
import { Request, Response, NextFunction } from 'express';

describe('jsonParseErrorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let nextCalled = false;
  let nextError: any = null;

  beforeEach(() => {
    mockReq = {
      path: '/api/test',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    };

    mockRes = {};

    mockNext = jest.fn((err?: any) => {
      nextCalled = true;
      if (err) nextError = err;
    });
  });

  describe('JSON parsing errors', () => {
    it('should catch SyntaxError with body property and convert to BadRequestError', () => {
      const syntaxErr = new SyntaxError('Unexpected token } in JSON at position 0');
      (syntaxErr as any).body = true;

      mockReq.is = () => 'application/json';

      jsonParseErrorHandler(syntaxErr, mockReq as Request, mockRes as Response, mockNext);

      expect(nextCalled).toBe(true);
      expect(nextError).toBeInstanceOf(BadRequestError);
      expect(nextError.statusCode).toBe(400);
      expect(nextError.message).toContain('Invalid JSON');
    });

    it('should include error details in the message', () => {
      const syntaxErr = new SyntaxError('Unexpected token ] in JSON at position 10');
      (syntaxErr as any).body = true;

      mockReq.is = () => 'application/json';

      jsonParseErrorHandler(syntaxErr, mockReq as Request, mockRes as Response, mockNext);

      expect(nextError.message).toContain('Unexpected token ]');
    });

    it('should identify JSON format in message', () => {
      const syntaxErr = new SyntaxError('Unexpected end of JSON input');
      (syntaxErr as any).body = true;

      mockReq.is = () => 'application/json';

      jsonParseErrorHandler(syntaxErr, mockReq as Request, mockRes as Response, mockNext);

      expect(nextError.message).toContain('JSON');
      expect(nextError.message).not.toContain('URL-encoded');
    });
  });

  describe('URL-encoded parsing errors', () => {
    it('should identify URL-encoded format in error message', () => {
      const syntaxErr = new SyntaxError('Invalid URL encoding');
      (syntaxErr as any).body = true;

      mockReq.is = () => 'application/x-www-form-urlencoded';

      jsonParseErrorHandler(syntaxErr, mockReq as Request, mockRes as Response, mockNext);

        expect(nextError.message).toContain('Invalid');
        expect(nextError).toBeInstanceOf(BadRequestError);
    });
  });

  describe('Non-body parsing errors', () => {
    it('should pass through non-body SyntaxErrors to next handler', () => {
      const syntaxErr = new SyntaxError('Some other syntax error');
      // Note: body property is NOT set

      jsonParseErrorHandler(syntaxErr, mockReq as Request, mockRes as Response, mockNext);

      expect(nextCalled).toBe(true);
      expect(nextError).toBe(syntaxErr);
      expect(nextError).not.toBeInstanceOf(BadRequestError);
    });

    it('should pass through non-SyntaxErrors to next handler', () => {
      const regularErr = new Error('Some regular error');

      jsonParseErrorHandler(regularErr, mockReq as Request, mockRes as Response, mockNext);

      expect(nextCalled).toBe(true);
      expect(nextError).toBe(regularErr);
    });

    it('should pass through TypeErrors to next handler', () => {
      const typeErr = new TypeError('Cannot read property x of undefined');

      jsonParseErrorHandler(typeErr, mockReq as Request, mockRes as Response, mockNext);

      expect(nextCalled).toBe(true);
      expect(nextError).toBe(typeErr);
    });
  });

  describe('Error properties', () => {
    it('should create BadRequestError with 400 status code', () => {
      const syntaxErr = new SyntaxError('Unexpected token');
      (syntaxErr as any).body = true;

      mockReq.is = () => 'application/json';

      jsonParseErrorHandler(syntaxErr, mockReq as Request, mockRes as Response, mockNext);

      expect(nextError.statusCode).toBe(400);
    });

    it('should mark error as operational', () => {
      const syntaxErr = new SyntaxError('Unexpected token');
      (syntaxErr as any).body = true;

      mockReq.is = () => 'application/json';

      jsonParseErrorHandler(syntaxErr, mockReq as Request, mockRes as Response, mockNext);

      expect(nextError.isOperational).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle errors with minimal message', () => {
      const syntaxErr = new SyntaxError('');
      (syntaxErr as any).body = true;

      mockReq.is = () => 'application/json';

      jsonParseErrorHandler(syntaxErr, mockReq as Request, mockRes as Response, mockNext);

      expect(nextError).toBeInstanceOf(BadRequestError);
      expect(nextError.message).toContain('Invalid JSON');
    });

    it('should handle req.is() returning falsy value', () => {
      const syntaxErr = new SyntaxError('Parse error');
      (syntaxErr as any).body = true;

      mockReq.is = () => null;

      jsonParseErrorHandler(syntaxErr, mockReq as Request, mockRes as Response, mockNext);

      expect(nextError).toBeInstanceOf(BadRequestError);
      expect(nextError.message).toContain('Invalid');
    });
  });
});
