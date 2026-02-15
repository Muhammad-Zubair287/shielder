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
    },
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.controller.ts'],
};
