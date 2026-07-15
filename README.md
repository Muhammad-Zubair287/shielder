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
- **OTP-based registration** — 6-digit email OTP; account created only after successful verification (no unverified users in DB)
- Login / logout with JWT access (7d) + refresh tokens (30d)
- Tokens stored in `sessionStorage` (per-tab isolation)
- Password reset via email
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
- Customer name always resolved from profile (never stored as email)
- PDF generation with dynamic field layout and bilingual labels
- Quotation → Order conversion flow

### Order Management
- Full order lifecycle: `PENDING → CONFIRMED → PROCESSING → READY_FOR_PICKUP → SHIPPED → DELIVERED → COMPLETED → CANCELLED`
- Payment status tracking: `PENDING → UNPAID → PAID → PARTIALLY_PAID → PARTIALLY_REFUNDED → REFUNDED → FAILED`
- Per-order audit trail
- Status labels fully localized — update instantly on language switch

### Admin Panel
- Products, categories, subcategories management
- Order and quotation management with localized status filters
- User management (ADMIN role)
- Reports and analytics
- Inventory and warehouse management

### Super Admin Panel
- Admin user management (create / suspend / delete admins)
- Company settings, privacy policy, terms & conditions, about us
- Platform-wide analytics

### Real-time Sync (Socket.IO)
- Single persistent WebSocket connection per session, authenticated with JWT
- Any mutation on Web, Android, or iOS immediately reflects on all other connected clients
- Covered events: cart, orders, profile, quotations, products, categories, subcategories, users, notifications, settings
- Login/logout state is intentionally **not** synced across platforms

### Cross-tab Sync (BroadcastChannel)
- Same-browser multi-tab consistency for auth state, language, and data changes
- Works in parallel with Socket.IO (one handles cross-tab, the other handles cross-device)

### Multilingual
- English and Arabic UI with full RTL layout
- Language preference stored per-user in the database
- All content entities (Product, Category, Subcategory) store bilingual translations natively
- Dynamic navbar titles detect UUIDs/IDs in URLs and show human-readable labels (e.g. `Order Details`)

### Terms & Conditions Management
- Public-facing terms & conditions page at `/terms-and-conditions`
- Bilingual content (English + Arabic) stored in database
- Super Admin can update terms via API: `PUT /api/admin/terms-and-conditions`
- Public can view terms: `GET /api/terms-and-conditions`
- Last updated timestamp displayed on public page

## Tech Stack

| Layer | Technology |
|---|---|
| API server | Express.js, TypeScript |
| ORM | Prisma + PostgreSQL |
| Auth | JWT (access 7d, refresh 30d) + OTP email verification |
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

### Server (production)

```bash
git pull origin main
cd backend && npm install
npx prisma migrate deploy --schema=./src/database/prisma/schema.prisma
# fallback if above fails (no shadow DB permissions on host):
# npx prisma db push --schema=./src/database/prisma/schema.prisma
npm run prisma:generate
npm run build
cd ../frontend && npm install && npm run build
pm2 restart all
```

### Frontend → Vercel
Set `NEXT_PUBLIC_API_URL` to your backend URL and deploy from GitHub.

### Backend → Railway / VPS
Add a PostgreSQL service, set env vars from `.env.example`, and deploy from GitHub. A self-ping (every 4 min) prevents Railway cold starts in production.

## Git Remotes

| Remote | Repository |
|---|---|
| `origin` | `https://github.com/Muhammad-Zubair287/shielder.git` |
| `company` | `https://github.com/devflxofficial/Shielder.git` |
| `personal` | `https://github.com/MuhammadZubairr/shielder.git` |

Push to all three after every release:
```bash
git push origin main && git push company main && git push personal main
```

## Documentation

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
- Swagger UI: `http://localhost:5000/api-docs` (non-production only)

## License

MIT — Shielder Development Team
