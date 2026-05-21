<<<<<<< HEAD
# amazoneInventryManagement
=======
# Shielder Backend API

Enterprise-grade backend API for the Shielder Digital Platform - Industrial Filters Management System.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Multilingual Support**: Arabic and English support at the database level
- **Enterprise Architecture**: Modular, scalable, and maintainable codebase
- **Type Safety**: Full TypeScript implementation with Prisma ORM
- **Security**: Helmet, CORS, input validation, password hashing
- **Logging & Monitoring**: Structured logging with request tracking
- **Database**: PostgreSQL with Prisma ORM
- **API Documentation**: RESTful API design with clear endpoints

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 15
- npm >= 9.0.0

## 🛠️ Installation

1. **Clone the repository**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Generate Prisma Client**
```bash
npm run prisma:generate
```

5. **Run database migrations**
```bash
npm run prisma:migrate
```

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Using Docker
```bash
cd docker
docker-compose up -d
```

## 📡 API Endpoints

### Health Check
- `GET /health` - API health check

### Email Provider Health
- `GET /health/email` - Verifies configured email provider connectivity (Brevo REST or SMTP). Returns 200 when mail provider is reachable and configured, 502 when unreachable/not configured, and 500 on internal error.

### Testing Brevo Delivery (manual)
If you're troubleshooting Brevo delivery, you can run a quick curl-based test from the host you want to validate. A helper script is provided at `backend/scripts/test-brevo.sh`.

Usage:
```bash
# From the `backend/` directory
BREVO_API_KEY=your_brevo_rest_api_key ./scripts/test-brevo.sh recipient@example.com
```

Expected outcomes:
- HTTP 2xx and a Brevo response body: request accepted (check email inbox/spam).
- HTTP 401/403: authorization error (key invalid or IP-restricted).
- HTTP 4xx/5xx with explanation: Brevo returned an error — check logs and Brevo dashboard for restrictions or sender verification.

Troubleshooting tips:
- Ensure `EMAIL_FROM_ADDRESS` and `BREVO_FROM_EMAIL` match a verified sender in your Brevo account.
- If you see IP-restriction errors, create a REST API key in Brevo without IP restrictions, or add your host IP to Brevo's allowed IP list.
- Use `/health/email` to programmatically verify connectivity from your server.

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `GET /api/v1/auth/me` - Get current user (protected)
- `POST /api/v1/auth/logout` - Logout user (protected)
- `GET /api/v1/auth/verify-email/:token` - Verify email

## 🗄️ Database Schema

The application uses PostgreSQL with the following main models:
- **Users**: User accounts with authentication
- **UserProfiles**: User profile information with locale preferences
- **Products**: Product catalog with multilingual support
- **ProductTranslations**: Product translations (en, ar)
- **Categories**: Product categories with hierarchy
- **CategoryTranslations**: Category translations
- **Orders**: Order management
- **OrderItems**: Order line items
- **AuditLogs**: Activity tracking

## 🔒 Security

- Password hashing with bcrypt
- JWT token authentication
- CORS protection
- Helmet security headers
- Input validation with Joi
- SQL injection prevention with Prisma
- Rate limiting (planned)

## 📦 Deployment

### Railway Deployment

1. Create a new project on Railway
2. Add PostgreSQL service
3. Add environment variables from `.env.example`
4. Deploy from GitHub repository

### Environment Variables

Required environment variables:
```
NODE_ENV=production
PORT=5000
DATABASE_URL=your-database-url
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
FRONTEND_URL=https://your-frontend-url.vercel.app
```

## 🧪 Testing

```bash
npm test
npm run test:watch
npm run test:coverage
```

## 📝 Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── app.ts                 # Express app configuration
│   ├── server.ts              # Server entry point
│   ├── config/                # Configuration files
│   ├── modules/               # Feature modules
│   │   ├── auth/             # Authentication module
│   │   ├── users/            # User management
│   │   ├── products/         # Product catalog
│   │   └── orders/           # Order management
│   ├── common/               # Shared utilities
│   │   ├── middleware/       # Express middleware
│   │   ├── errors/           # Error classes
│   │   ├── logger/           # Logging utility
│   │   └── utils/            # Helper functions
│   ├── database/
│   │   └── prisma/           # Prisma schema and migrations
│   └── types/                # TypeScript type definitions
├── docker/                   # Docker configuration
├── package.json
└── tsconfig.json
```

## 🤝 Contributing

Please follow the coding standards defined in `.cursorrules`.

## 📄 License

MIT License - Shielder Digital Platform
>>>>>>> 8a6668f (feat: implement signup and login with hashed passwords and multi-device session management)
