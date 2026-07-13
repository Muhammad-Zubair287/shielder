# Shielder Frontend

Next.js 14 frontend for the Shielder Digital Platform — B2B industrial filters e-commerce with multilingual support (English / Arabic RTL) and real-time cross-platform synchronization.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Shielder backend running (see `../backend/README.md`)

## Setup

```bash
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev      # http://localhost:3000
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (e.g. `http://localhost:5000/api`) |

The Socket.IO client derives its URL automatically by stripping `/api` from this value.

## Scripts

```bash
npm run dev          # Next.js dev server (port 3000)
npm run build        # Production build
npm start            # Start production server
npm run type-check   # TypeScript check without emit
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier
npm run test         # Jest unit tests
npm run test:watch   # Watch mode
npm run test:e2e     # Cypress E2E (all specs)
npm run test:e2e:auth # Cypress auth flow only
```

## Architecture

### Directory Layout

```
frontend/src/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx            # Root layout: providers, theme init, font loading
│   ├── (public)/             # Home, products, product detail, about, contact
│   ├── login/ register/      # Auth pages
│   ├── admin/                # Admin panel (role-guarded)
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── subcategories/
│   │   ├── orders/
│   │   ├── quotations/
│   │   └── users/
│   ├── superadmin/           # Super-admin panel (role-guarded)
│   │   ├── dashboard/
│   │   ├── users/
│   │   └── settings/
│   ├── checkout/             # Order placement
│   ├── my-orders/            # Customer order history
│   ├── my-quotation/         # Customer quotation history + detail
│   └── profile/              # User profile management
├── components/
│   ├── providers/
│   │   ├── CrossTabSyncProvider.tsx  # BroadcastChannel + Socket.IO sync
│   │   ├── QueryProvider.tsx         # TanStack React Query config
│   │   └── AuthProvider.tsx          # Auth initialization
│   ├── cart/                 # Cart drawer, QuotationDrawer
│   ├── layout/               # Navbar, Footer, Sidebar
│   └── ui/                   # Shared UI components
├── contexts/
│   ├── LanguageContext.tsx   # EN/AR locale, RTL, translations
│   ├── CartContext.tsx        # Cart state + BroadcastChannel sync
│   └── QuotationContext.tsx  # Quotation basket state
├── hooks/
│   ├── useRealtimeSync.ts    # Socket.IO event listener → React Query + DOM events
│   └── useSyncRefetch.ts     # DOM event listener for non-RQ admin pages
├── lib/
│   ├── socket.ts             # Socket.IO client singleton
│   └── crossTabSync.ts       # BroadcastChannel helpers + SyncEvent types
├── services/                 # Axios API wrappers (one per backend module)
├── store/
│   └── auth.store.ts         # Zustand auth store (reads/writes sessionStorage)
└── utils/
    └── constants.ts          # API endpoints, storage keys, limits
```

### Provider Tree (layout.tsx)

```
ThemeScript (inline, runs before hydration)
└── QueryProvider
    └── CrossTabSyncProvider   ← BroadcastChannel + Socket.IO
        └── LanguageProvider
            └── AuthProvider
                └── CartProvider
                    └── QuotationProvider
                        └── {children}
```

## Real-time Sync

### Socket.IO (cross-device)

`src/lib/socket.ts` holds a module-level singleton connected to the backend Socket.IO server. The connection is established lazily when the user is authenticated and torn down on logout.

**Auth**: the JWT access token is read from `sessionStorage('shielder_access_token')` and passed in `socket.handshake.auth.token`.

`src/hooks/useRealtimeSync.ts` is mounted inside `CrossTabSyncProvider`. It listens for all backend events and routes them to:
- `queryClient.invalidateQueries()` for React Query pages
- `window.dispatchEvent(DATA_CHANGED_EVENT)` for non-RQ admin pages (picked up by `useSyncRefetch`)

**Events handled:**

| Event | React Query keys invalidated | Module (DOM event) |
|---|---|---|
| `cart:updated` | `cart` | — |
| `order:created/updated` | `orders`, `my-orders`, `order-summary` | `orders` |
| `profile:updated` | `profile` | — |
| `quotation:created/updated` | `quotations`, `customer-quotations` | `quotations` |
| `product:created/updated/deleted` | `products` | `products` |
| `category:created/updated/deleted` | `categories` | `categories` |
| `subcategory:created/updated/deleted` | `subcategories` | `subcategories` |
| `notification:new` | `notifications` | — |
| `settings:updated` | `settings` | — |

### BroadcastChannel (cross-tab, same browser)

`src/lib/crossTabSync.ts` defines the `SyncEvent` union and `broadcastSync()` helper. `CrossTabSyncProvider` listens and handles:

| Event | Action |
|---|---|
| `AUTH_LOGOUT` | Call `useAuthStore.logout()` on all other tabs |
| `AUTH_USER_UPDATED` | Push new user object into Zustand on all other tabs |
| `LANGUAGE_CHANGED` | Switch locale on all other tabs |
| `QUERY_INVALIDATE` | Invalidate specific React Query keys |
| `QUERY_INVALIDATE_ALL` | Invalidate all queries |
| `DATA_CHANGED` | Dispatch `shielder:data-changed` DOM event |

### useSyncRefetch

Admin pages that use manual `fetch` (not React Query) call:

```typescript
useSyncRefetch(fetchData, 'products');   // re-fetch when products change
```

This hook subscribes to `shielder:data-changed` DOM events and calls `fetchData()` when the module matches.

## Authentication

- Tokens stored in `sessionStorage` (per-tab, cleared on tab close)
- Zustand `auth.store.ts` is the single source of truth for auth state in React
- `AuthProvider` initializes from `sessionStorage` on mount
- Axios interceptors in `api.service.ts` attach the access token and handle 401 → refresh token → retry

## Multilingual (EN/AR)

- `LanguageContext` drives locale switching
- Arabic applies `dir="rtl"` and Cairo font globally
- `DirSync` sets `<html lang>` and `<html dir>` before hydration to prevent flash
- All translation strings live in `LanguageContext.tsx` under `translations.en` / `translations.ar`
- `isRTL` flag from `useLanguage()` is used in components to conditionally flip icon placement and text alignment

## Key Patterns

- **Character limits on forms**: `LIMITS` constants in checkout (`name: 100, address: 200, notes: 500`) and quotation drawer (`companyName: 100, address: 200`)
- **RTL layout**: rely on `dir="rtl"` on the container — do not add `flex-row-reverse` inside RTL containers (double-reversal breaks layout)
- **Drawer direction**: always `right-0` regardless of locale (icon is always on the right)
- **Cart idempotency**: `clearCart({ silent: true })` after checkout suppresses the success toast and swallows any 400 error from an already-empty cart
- **Non-RQ admin pages**: use `broadcastSync({ type: 'DATA_CHANGED', module: '...' })` after mutations and `useSyncRefetch(fetchFn, 'module')` to auto-refresh on changes from other tabs/devices

## Pages & Routes

### Public
- `/` — Home
- `/products` — Product catalog with filtering, compare, and quotation basket
- `/products/[id]` — Product detail
- `/about`, `/contact`, `/privacy-policy`, `/resources`

### Auth
- `/login`, `/register`
- `/verify-email/[token]`, `/forgot-password`, `/reset-password`

### Customer (authenticated)
- `/checkout` — Place an order
- `/my-orders` — Order history
- `/my-quotation` — Quotation list
- `/my-quotation/[id]` — Quotation detail
- `/profile` — Profile management

### Admin (role: ADMIN)
- `/admin/dashboard`
- `/admin/products`, `/admin/categories`, `/admin/subcategories`
- `/admin/orders`, `/admin/quotations`
- `/admin/users`

### Super Admin (role: SUPER_ADMIN)
- `/superadmin/dashboard`
- `/superadmin/users`
- `/superadmin/settings`, `/superadmin/privacy-policy`, `/superadmin/about-us`

## Deployment (Vercel)

1. Connect the `frontend/` directory to a Vercel project
2. Set `NEXT_PUBLIC_API_URL` to your production backend URL
3. Deploy — Vercel auto-deploys on push to main

## License

MIT — Shielder Development Team
