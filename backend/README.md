# Shielder Backend API

Enterprise Express/TypeScript API for the Shielder Digital Platform — industrial filters B2B e-commerce.

## Prerequisites

- Node.js >= 20.19.0
- PostgreSQL >= 15
- Redis >= 6
- npm >= 9.0.0

## Setup

```bash
npm install
cp .env.example .env        # fill in required variables
npm run prisma:generate
npm run prisma:migrate
npm run seed:super-admin    # create initial SUPER_ADMIN account
npm run dev                 # starts on http://localhost:5000
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | yes | — | `development` / `production` |
| `PORT` | yes | `5000` | Server port |
| `DATABASE_URL` | yes | — | PostgreSQL connection string |
| `JWT_SECRET` | yes | — | Access token signing secret |
| `JWT_REFRESH_SECRET` | yes | — | Refresh token signing secret |
| `REDIS_URL` | no | `redis://localhost:6379` | Redis for rate limiting |
| `FRONTEND_URL` | no | `http://localhost:3001` | Used in CORS and email links |
| `APP_URL` | no | — | Backend base URL for file links |
| `EMAIL_PROVIDER` | no | — | `smtp` / `brevo` / `sendgrid` |
| `PRODUCT_IMAGE_STORAGE` | no | `local` | `local` or `s3` |
| `AWS_*` | no | — | Required when `PRODUCT_IMAGE_STORAGE=s3` |

## Scripts

```bash
npm run dev                  # Dev server with hot reload
npm run build                # Compile TypeScript → dist/
npm start                    # Run compiled build
npm run lint                 # ESLint
npm run lint:fix             # ESLint with auto-fix
npm run format               # Prettier

# Database
npm run prisma:generate      # Regenerate Prisma client after schema changes
npm run prisma:migrate       # Apply pending migrations
npm run prisma:studio        # Open Prisma Studio
npm run prisma:push          # Push schema without migration (prototype only)

# Seeding
npm run seed:super-admin     # Create initial SUPER_ADMIN
npm run seed:test-data       # Seed demo products, orders, etc.

# Testing
npm run test                 # All Jest tests
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report
npm run test:auth            # Trusted-device tests only
npm run email:check          # Verify email provider connectivity
```

## Architecture

### Module Pattern

Each feature lives in `src/modules/<name>/`:

```
<module>.routes.ts       → Express router, auth + validation middleware
<module>.controller.ts   → Request/response handling
<module>.service.ts      → Business logic, Prisma queries
<module>.validation.ts   → Joi schemas
```

All routes are mounted at both `/api` and `/api/v1`.

### Modules

| Module | Purpose |
|---|---|
| `auth` | Register, login, logout, email verification, password reset, trusted devices |
| `profile` | User profile read/update, profile image upload |
| `cart` | Persistent per-user cart: add, update, remove, clear |
| `order` | Order creation, status transitions, payment status |
| `payment` | Manual payments (cash, bank transfer); EPG online gateway |
| `quotation` | Admin-created formal quotations |
| `customer-quotation` | Customer-submitted quotations with PDF generation |
| `customer-quotation-basket` | Customer quotation basket management |
| `admin` | Admin CRUD for users; admin panel data |
| `super-admin` | Super-admin user management, platform settings |
| `inventory` | Products, categories, subcategories, brands |
| `inventory-alert` | Low-stock alerts |
| `warehouse` | Warehouse management |
| `notification` | In-app notifications |
| `analytics` | Dashboard stats, charts |
| `reports` | Export reports (Excel, PDF) |
| `settings` | Company settings, currency |
| `privacy-policy` | Privacy policy content management |
| `contact` | Contact form submissions |
| `newsletter` | Newsletter subscriptions |
| `product-review` | Product review management |
| `application` | Job/partnership applications |
| `security` | Security logs, session management |
| `realtime` | Socket.IO real-time sync service |

### Real-time Sync (Socket.IO)

The `realtime` module (`src/modules/realtime/socket.service.ts`) provides a singleton Socket.IO server attached to the HTTP server.

**Auth**: Clients must send a valid JWT in `socket.handshake.auth.token`. Invalid tokens are rejected at connect time.

**Rooms**:
- `user:<userId>` — personal events (cart, orders, profile, quotations)
- `role:<ROLE>` — role-wide broadcast (e.g. `role:ADMIN` for new order alerts)

**Emit helpers** (import from `socket.service.ts`):
```typescript
emitToUser(userId, 'cart:updated', data);
emitToRole('ADMIN', 'order:created', data);
emitToAll('product:updated', data);
```

**Controllers wired**: cart, order, profile, product, category, subcategory.

Login/logout events are intentionally **not** emitted — a session on one device is not affected by auth changes on another device.

### Middleware Stack

1. Compression (gzip)
2. Swagger UI (non-production)
3. Helmet (security headers)
4. CORS
5. JSON / URL-encoded body parsing (10 MB limit)
6. JSON parse error handler
7. Sanitization (rejects raw HTML/JS)
8. Language detection (`accept-language` header → `req.locale`)
9. Morgan HTTP logging (development only)

### Auth

- Access token: 7-day JWT, signed with `JWT_SECRET`
- Refresh token: 30-day JWT, hashed and stored in DB
- `authenticate` middleware (`auth.middleware.ts`) attaches `req.user`
- RBAC via `requireRoles()` / `requireAdmin` / `requireSuperAdmin` from `src/common/middleware/rbac.middleware.ts`
- `tokenVersion` in DB allows instant token invalidation on logout-all

### Key Patterns

- **Bilingual content**: `*Translation` sibling models with `(entityId, locale)` unique constraint. Always `include: { translations: true }` in content queries.
- **Soft deletes**: Users have `deletedAt`; filter with `deletedAt: null`.
- **BigInt serialization**: Globally patched in `app.ts` — `BigInt.prototype.toJSON = () => Number(this)`.
- **Static files**: Images at `/images`, uploads at `/uploads`. Multiple root paths searched so local dev and production both work.
- **PDF generation**: `pdfkit` server-side with `doc.heightOfString()` for dynamic Y positioning to handle long bilingual strings.
- **Cart idempotency**: `CartService.clearCart()` returns `{ removedItems: 0 }` instead of throwing when the cart is already empty.

## API Reference

Swagger UI is available at `http://localhost:5000/api-docs` in non-production environments.

### Key Endpoint Groups

```
GET/POST   /api/auth/*                   Authentication
GET/PUT    /api/profile/*                Profile management
GET/POST   /api/cart/*                   Cart operations
GET/POST   /api/orders/*                 Order management
GET/POST   /api/quotations/*             Admin quotations
GET/POST   /api/customer-quotations/*    Customer quotations (with PDF)
GET/POST   /api/admin/*                  Admin panel
GET/POST   /api/super-admin/*            Super-admin operations
GET/POST   /api/inventory/products       Product catalog
GET/POST   /api/inventory/categories     Categories
GET/POST   /api/inventory/subcategories  Subcategories
GET/POST   /api/notifications/*          Notifications
GET/POST   /api/settings/*              Platform settings
GET        /health                       Health check
GET        /health/email                 Email provider health
```

## Project Structure

```
backend/
├── src/
│   ├── app.ts                 # Express app, middleware stack, route mounting
│   ├── server.ts              # HTTP server + Socket.IO init, graceful shutdown
│   ├── config/
│   │   ├── env.ts             # Environment variable validation
│   │   ├── jwt.ts             # Token generation / verification
│   │   ├── app.config.ts      # CORS, pagination, roles constants
│   │   └── database.ts        # Prisma connect / disconnect
│   ├── modules/               # Feature modules (see table above)
│   ├── common/
│   │   ├── middleware/        # Auth, RBAC, error, sanitize, language, rate-limit
│   │   ├── errors/            # ApiError subclasses (400/401/403/404/409/500)
│   │   ├── logger/            # Winston logger
│   │   ├── services/          # Email, image storage, profile image
│   │   └── utils/             # Pagination, helpers
│   ├── database/
│   │   └── prisma/            # schema.prisma, migrations
│   └── types/                 # Global TypeScript types (AuthRequest, etc.)
└── scripts/                   # Seed scripts, performance baseline
```

## Testing

```bash
npm test                            # All tests
jest path/to/test.ts --runInBand    # Single file
npm run test:auth                   # Trusted-device suite
npm run test:coverage               # HTML coverage report
```

## Deployment (Railway)

1. Create a Railway project and add a PostgreSQL service
2. Set environment variables from `.env.example`
3. Deploy from GitHub — Railway auto-runs `npm run build && npm start`
4. A self-ping every 4 minutes keeps the dyno warm in production

## License

MIT — Shielder Development Team
