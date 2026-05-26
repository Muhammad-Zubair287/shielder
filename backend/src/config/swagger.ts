export const swaggerConfig = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shielder API',
      version: '1.0.0',
      description: 'Enterprise Dynamic Product Filtering API Documentation',
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
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
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    },
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.controller.ts'],
};
