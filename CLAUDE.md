# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shielder Digital Platform — a B2B e-commerce and order management system for industrial filters, with multilingual support (English/Arabic RTL) and real-time cross-platform sync (Web + Android + iOS). The monorepo has two workspaces: `backend/` and `frontend/`.

## Commands

### Backend (`cd backend`)

```bash
npm run dev                    # Start dev server with hot reload (tsx watch)
npm run build                  # Compile TypeScript → dist/
npm run lint                   # ESLint
npm run lint:fix               # ESLint with auto-fix
npm run format                 # Prettier

# Database
npm run prisma:generate        # Regenerate Prisma client after schema changes
npm run prisma:migrate         # Apply pending migrations (dev only — needs shadow DB)
npm run prisma:studio          # Open Prisma Studio GUI
npm run prisma:push            # Push schema without migration (used on production server)

# Production DB deployment (on server, no shadow DB permissions)
npx prisma migrate deploy --schema=./src/database/prisma/schema.prisma   # preferred
npx prisma db push --schema=./src/database/prisma/schema.prisma          # fallback if migrate deploy fails

# Seeding
npm run seed:super-admin       # Create the initial super admin user
npm run seed:test-data         # Seed demo products, orders, etc.

# Tests
npm run test                   # All Jest tests
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report
npm run test:auth              # Trusted-device tests only
jest path/to/test.ts --runInBand --verbose   # Single test file

# Utilities
npm run email:check            # Verify email provider connectivity
```

Backend runs on **http://localhost:5000**. Swagger UI at **/api-docs** in non-production.

### Frontend (`cd frontend`)

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run type-check   # TypeScript check without emit
npm run lint         # Next.js ESLint
npm run lint:fix     # ESLint with auto-fix

# Tests
npm run test                         # Jest unit tests
npm run test:watch                   # Watch mode
npm run test:e2e                     # Cypress E2E (all)
npm run test:e2e:auth                # Cypress auth flow only
jest path/to/test.ts                 # Single test file
```

Frontend runs on **http://localhost:3000**.

## Environment Variables

### Backend (`.env`)
Required: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`

Key optional:
- `REDIS_URL` — defaults to `redis://localhost:6379`
- `EMAIL_PROVIDER` — `smtp` | `brevo` | `sendgrid`
- `FRONTEND_URL` — used in CORS and email links (default `http://localhost:3001`)
- `APP_URL` — backend base URL for uploaded file links
- `PRODUCT_IMAGE_STORAGE` — `local` (default) | `s3`

### Frontend (`.env.local`)
- `NEXT_PUBLIC_API_URL` — backend API URL (e.g. `http://localhost:5000/api`). Socket.IO derives its URL by stripping `/api`.

## Architecture

### Backend

Module-based Express architecture. Each feature lives in `src/modules/<name>/` and follows a consistent pattern:
```
<module>.routes.ts       → Express router, applies middleware
<module>.controller.ts   → Request/response handling, delegates to service
<module>.service.ts      → Business logic, Prisma queries
<module>.validation.ts   → Joi schemas validated by validation.middleware
```

**All routes** are mounted at both `/api` and `/api/v1` (see `src/app.ts`).

**Middleware stack** (in order): compression → Swagger → Helmet → CORS → JSON parsing → sanitization → language detection → morgan (dev only).

**Auth flow**: JWT access token (7d) + refresh token (30d, hashed in DB). The `authenticate` middleware (`src/modules/auth/auth.middleware.ts`) attaches `req.user`. RBAC is enforced via `requireRoles()` / `requireAdmin` / `requireSuperAdmin` from `src/common/middleware/rbac.middleware.ts`.

**Roles hierarchy**: `SUPER_ADMIN` > `ADMIN` > `STAFF` > `SUPPLIER` > `USER`. Only SUPER_ADMIN can change roles.

**Prisma schema**: `src/database/prisma/schema.prisma`. Always run `npm run prisma:generate` after schema changes. BigInt is globally serialized to Number via a prototype patch in `app.ts`.

**Static files**: Product images served from `images/` at `/images` route; uploads served from `uploads/` at `/uploads`. The app searches multiple root paths for both.

**Email**: Pluggable provider system supporting SMTP, Brevo (REST + SMTP), and SendGrid. Configured via `EMAIL_PROVIDER` env var.

### Frontend

Next.js 14 App Router. Key directories:
- `src/app/` — pages organized by role: `admin/`, `superadmin/`, customer routes, plus public routes
- `src/services/` — one service file per backend module (thin Axios wrappers)
- `src/contexts/` — React contexts for: Language, Cart, Quotation, Currency
- `src/store/auth.store.ts` — Zustand auth store; also syncs to `sessionStorage`
- `src/components/providers/` — AuthProvider, QueryProvider, CrossTabSyncProvider
- `src/lib/socket.ts` — Socket.IO client singleton
- `src/lib/crossTabSync.ts` — BroadcastChannel helpers + typed SyncEvent union
- `src/hooks/useRealtimeSync.ts` — Socket.IO event routing hook
- `src/hooks/useSyncRefetch.ts` — DOM event listener for non-RQ admin pages

**i18n**: Language context (`src/contexts/LanguageContext`) drives EN/AR switching. Arabic uses Cairo font and RTL layout via `DirSync` component that sets `[dir]` and `[lang]` on `<html>` before hydration.

**API calls**: All frontend services call the backend via `NEXT_PUBLIC_API_URL`. TanStack React Query is the data-fetching layer; Zustand handles auth state only.

**Theme**: Dark/light mode is initialized before React hydrates via an inline script in `layout.tsx` reading `localStorage.theme`.

**Tokens**: Stored in `sessionStorage` (per-tab isolation, not `localStorage`).

## Real-time Sync

The platform has two complementary sync layers:

### 1. BroadcastChannel (same browser, cross-tab)

`src/lib/crossTabSync.ts` defines the `SyncEvent` union and `broadcastSync()` helper. `CrossTabSyncProvider` listens and routes events.

Broadcast after every mutation using:
```typescript
broadcastSync({ type: 'DATA_CHANGED', module: 'products' });
broadcastSync({ type: 'QUERY_INVALIDATE', keys: ['some-query-key'] });
broadcastSync({ type: 'AUTH_USER_UPDATED', user: updatedUser });
```

### 2. Socket.IO (cross-device: Web + Android + iOS)

`src/modules/realtime/socket.service.ts` is a singleton Socket.IO server. It initializes on `src/server.ts` startup via `initSocketServer(httpServer)`.

**Auth**: clients must pass a valid JWT in `socket.handshake.auth.token`.

**Rooms**: every connected socket joins `user:<userId>` and `role:<ROLE>`.

**Emit helpers** (import from `@/modules/realtime/socket.service`):
```typescript
emitToUser(userId, 'cart:updated', data);    // personal room
emitToRole('ADMIN', 'order:created', data);  // role room
emitToAll('product:updated', data);          // all connected clients
```

**Covered events**: `cart:updated`, `order:created/updated`, `profile:updated`, `quotation:created/updated`, `product/category/subcategory:created/updated/deleted`, `notification:new`, `settings:updated`, `privacy-policy:updated`, `user:created/updated/deleted`.

**Login/logout are intentionally not emitted** — a session on one device is never killed by auth actions on another device.

On the frontend, `useRealtimeSync()` (mounted inside `CrossTabSyncProvider`) listens for all events and routes them to `queryClient.invalidateQueries()` and/or `window.dispatchEvent(DATA_CHANGED_EVENT)`.

### 3. Non-React-Query admin pages

Admin pages that use manual `fetch` instead of React Query call both:
```typescript
// after mutation success:
broadcastSync({ type: 'DATA_CHANGED', module: 'products' });

// in the page component:
useSyncRefetch(fetchData, 'products');
```

`useSyncRefetch` listens for the `shielder:data-changed` DOM event (fired by both BroadcastChannel and Socket.IO paths) and calls `fetchData()` when the module matches.

## Registration Flow (OTP-based)

Customer registration uses a two-step OTP flow — no unverified accounts are ever stored in the `User` table.

### Endpoints
- `POST /api/auth/signup/initiate` — validates all fields, hashes password + 6-digit OTP, stores a `PendingRegistration` record, sends OTP via email. Returns `registrationSessionToken`.
- `POST /api/auth/signup/verify-otp` — verifies OTP (bcrypt), atomically creates `User` + `UserProfile` in a transaction, deletes the pending record.
- `POST /api/auth/signup/resend-otp` — generates a new OTP, resets attempt counter, enforces 60s cooldown and max 3 resends.

### Security constants
- OTP expiry: 10 minutes
- Max wrong attempts: 5 (session invalidated after)
- Max resends: 3
- Resend cooldown: 60 seconds
- OTP stored as bcrypt hash, never plaintext

### Frontend
- `/register` — collects user details, calls `/signup/initiate`, stores `reg_session_token` + `reg_email` in `sessionStorage`, redirects to `/verify-registration`
- `/verify-registration` — 6-box digit input, auto-submit on completion, paste support, 60s resend countdown, RTL-aware, clears sessionStorage on success/change-email

### PendingRegistration model
Stored in `pending_registrations` table. Cleaned up automatically on successful verification or by a background cleanup of expired records.

## Key Patterns

- **Translations**: Content entities (Product, Category, Subcategory, Brand) use a `*Translation` sibling model with `(entityId, locale)` unique constraint. Always include `translations` relation when serving content to the frontend.
- **Soft deletes**: Users have `deletedAt`; filter with `deletedAt: null` in queries.
- **Quotation lifecycle**: Customer submits via `QuotationBasket` → admin creates formal `Quotation` → can be converted to `Order`. Two separate flows: admin-created (`quotation` module) and customer-submitted (`customer-quotation` / `customer-quotation-basket` modules).
- **Customer name in quotations**: Always resolved from `UserProfile.fullName` — never stored as email. One-time migration script at `src/scripts/fix-quotation-customer-names.ts` was used to backfill existing records.
- **Inventory**: `Inventory` model tracks per-warehouse stock separately from `Product.stock` (the legacy aggregate). `stock_history` records every change with a `StockChangeType`.
- **Payments**: EPG (online gateway) handled by dedicated `epg.routes.ts`; manual payments (cash, bank transfer) via `payment.routes.ts`.
- **Rate limiting**: Applied per-route via `rateLimitAuth()` using Redis. See `src/common/middleware/rateLimit.middleware.ts`.
- **RTL layout**: Use `dir="rtl"` on the container. Do not add `flex-row-reverse` inside RTL containers — the combination double-reverses and looks like LTR. Use `gap-*` instead of `space-x-*` (space-x does not flip in RTL).
- **Drawers/panels**: Always `right-0` regardless of locale; the open icon is always on the right side of the header.
- **Cart idempotency**: `CartService.clearCart()` returns gracefully when the cart is already empty. Frontend uses `clearCart({ silent: true })` after checkout to suppress the toast.
- **Character limits**: Checkout form: `name 100, address 200, notes 500`. Quotation drawer: `companyName 100, address 200`. Enforced client-side with counters and server-side via validation.
- **PDF generation**: `pdfkit` server-side with `doc.heightOfString()` for dynamic vertical positioning to handle long bilingual names and addresses without layout overflow.
- **Order status labels**: Never rely on backend `statusLabel` for display — build frontend lookup maps from `t()` so labels update instantly when the user switches language without waiting for a React Query refetch.
- **Navbar dynamic titles**: UUID and numeric ID segments in the URL are detected and replaced with a human-readable `"<Entity> Details"` title (e.g. `/orders/abc-123` → `Order Details`).
- **Production DB migrations**: The production server DB user lacks permission to create shadow databases, so `prisma migrate dev` fails. Use `prisma migrate deploy` (preferred) or `prisma db push` (fallback) on the server.
