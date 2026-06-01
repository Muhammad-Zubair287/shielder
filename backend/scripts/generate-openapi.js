/**
 * Generate OpenAPI JSON using swagger-jsdoc and write to backend/docs/openapi.json
 * Run: node backend/scripts/generate-openapi.js
 */
const fs = require('fs');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const ROOT = path.resolve(__dirname, '..');
const outDir = path.join(ROOT, 'docs');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const swaggerConfig = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shielder API',
      version: '1.0.0',
      description: 'Enterprise Dynamic Product Filtering API Documentation',
    },
    servers: [{ url: 'http://localhost:5001', description: 'Development server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Internal server error' },
            errorId: { type: 'string', example: 'k1v8x-4g7a9c' },
          },
        },
      },
      responses: {
        InternalError: {
          description: 'Generic internal server error response',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
      },
    },
  },
  apis: [path.join(ROOT, 'src/modules/**/*.controller.ts'), path.join(ROOT, 'src/modules/**/*.routes.ts')],
};

const spec = swaggerJsdoc(swaggerConfig);
const outPath = path.join(outDir, 'openapi.json');
fs.writeFileSync(outPath, JSON.stringify(spec, null, 2), 'utf8');
console.log('OpenAPI JSON written to', outPath);
