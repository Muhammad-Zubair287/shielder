# Shielder Digital Platform

Enterprise B2B e-commerce and order management system for industrial filters, with full multilingual support (English / Arabic RTL) and real-time cross-platform synchronization.

## Project Structure

```
shielder/
├── backend/    # Node.js · Express · Prisma · PostgreSQL · Socket.IO
└── frontend/   # Next.js 14 · TypeScript · Tailwind CSS · Socket.IO Client
```

## Quick Start

### Prerequisites

- Node.js >= 20.19.0
- PostgreSQL >= 15
- Redis (for rate limiting)
- npm >= 9.0.0

### Backend

```bash
cd backend
npm install
cp .env.example .env          # fill in DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npm run prisma:generate
npm run prisma:migrate
npm run seed:super-admin       # create the first SUPER_ADMIN account
npm run dev                    # http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev                        # http://localhost:3000
```

## Features

### Authentication & Users
- Register / login / logout with JWT access + refresh tokens
- Tokens stored in `sessionStorage` (per-tab isolation)
- Email verification and password reset flows
- Trusted-device management
- Role-based access: `SUPER_ADMIN > ADMIN > STAFF > SUPPLIER > USER`

### Product Catalog
- Full CRUD with bilingual support (English + Arabic at the database level)
- Categories → Subcategories → Products hierarchy
- Product image upload (local or S3)
- Spec-based dynamic filtering
- Bulk import via Excel

### Cart & Checkout
- Persistent server-side cart
- Character-limited checkout form (name 100, address 200, notes 500)
- Order submission with server-side cart re-fetch before placing

### Quotation System
- Customer-submitted quotation basket
- Admin creates formal quotations from baskets
- PDF generation with dynamic field layout and bilingual labels
- Quotation → Order conversion flow

### Order Management
- Full order lifecycle: PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → CANCELLED
- Payment status tracking: PENDING → PAID → REFUNDED
- Per-order audit trail

### Admin Panel
- Products, categories, subcategories management
- Order and quotation management
- User management (ADMIN role)
- Reports and analytics
- Inventory and warehouse management

### Super Admin Panel
- Admin user management (create / suspend / delete admins)
- Company settings, privacy policy, about us
- Platform-wide analytics

### Real-time Sync (Socket.IO)
- Single persistent WebSocket connection per session, authenticated with JWT
- Any mutation on Web, Android, or iOS immediately reflects on all other connected clients
- Covered events: cart, orders, profile, quotations, products, categories, subcategories, notifications, settings
- Login/logout state is intentionally **not** synced across platforms

### Cross-tab Sync (BroadcastChannel)
- Same-browser multi-tab consistency for auth state, language, and data changes
- Works in parallel with Socket.IO (one handles cross-tab, the other handles cross-device)

### Multilingual
- English and Arabic UI with full RTL layout
- Language preference stored per-user in the database
- All content entities (Product, Category, Subcategory) store bilingual translations natively

## Tech Stack

| Layer | Technology |
|---|---|
| API server | Express.js, TypeScript |
| ORM | Prisma + PostgreSQL |
| Auth | JWT (access 7d, refresh 30d) |
| Real-time | Socket.IO |
| Caching / rate-limiting | Redis |
| Email | SMTP / Brevo / SendGrid (pluggable) |
| File storage | Local or AWS S3 |
| PDF | pdfkit (server-side) |
| Frontend | Next.js 14 (App Router) |
| State | Zustand (auth) + TanStack React Query (server data) |
| Styling | Tailwind CSS |
| i18n | Custom LanguageContext (EN/AR) |

## Deployment

### Frontend → Vercel
Set `NEXT_PUBLIC_API_URL` to your backend URL and deploy from GitHub.

### Backend → Railway
Add a PostgreSQL service, set env vars from `.env.example`, and deploy from GitHub. A self-ping (every 4 min) prevents Railway cold starts in production.

## Documentation

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
- Swagger UI: `http://localhost:5000/api-docs` (non-production only)

## License

MIT — Shielder Development Team
