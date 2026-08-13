# Shielder Postman Collections

Production-quality Postman collections generated from the **actual Express backend route registrations**.

## Files

| File | Purpose |
|------|---------|
| `Project-API-Web.postman_collection.json` | Full API surface for Web / Admin / Superadmin |
| `Project-API-Mobile.postman_collection.json` | Customer-facing shared APIs for mobile clients |
| `Project-Local.postman_environment.json` | Local environment (`baseUrl`) |
| `Project-Staging.postman_environment.json` | Staging environment (empty host placeholder) |
| `Project-Production.postman_environment.json` | Production environment (empty host placeholder) |

Legacy root files (`SHIELDER.postman_collection.json`, `SHIELDER_Mobile.postman_collection.json`) are **preserved** and not deleted.

## Import

1. Open Postman → **Import**
2. Import both collections and the environment you need
3. Select **Project — Local** (or Staging/Production) in the environment dropdown
4. Set `baseUrl` to the backend origin only, e.g. `http://localhost:5000` (no `/api` suffix)

All collection requests use `{{baseUrl}}/api/...`. The same handlers are also mounted at `/api/v1/...`.

## Authentication

1. Run **Login** (customer / admin / superadmin) in the Authentication folder
2. Tests save tokens automatically:
   - Login: `data.tokens.accessToken` → `accessToken` / role token
   - Refresh: `data.accessToken` → `accessToken` (different path than login)
3. Protected requests send `Authorization: Bearer {{accessToken}}` (or role-specific tokens)

### Required test accounts

Create via seed scripts / admin panel (do not commit real passwords):

- Customer (`USER`)
- Admin (`ADMIN`) — may require 2FA OTP
- Super Admin (`SUPER_ADMIN`)

## Locale (English / Arabic)

Send header:

```http
Accept-Language: en
Accept-Language: ar
```

Backend selects Arabic when the header equals or starts with `ar`; otherwise English.

## Web vs Mobile

| Topic | Finding |
|-------|---------|
| Separate mobile routes? | **No** — one shared Express API |
| Mobile app source in repo? | **No** React Native/Expo/Flutter project |
| Mobile collection contents | Customer portal APIs + contact UA policy + app download listings |
| Web collection contents | Everything including Admin / Superadmin / reports / bulk upload |
| Auth tokens | Same JWT access + refresh for web and mobile |
| CAPTCHA | Desktop UA requires token; phone UA matching android/iphone/ipad/ipod/mobile skips verification |

`GET /applications/active` publishes ANDROID/IOS **download links** — it is not a separate mobile API framework.

## File / multipart variables

| Endpoint | Field | Notes |
|----------|-------|-------|
| Product image | `productImage` | jpeg/png/webp/jfif, ~5 MiB |
| Product bulk upload | `file` | Excel workbook |
| Category/subcategory | `image` | optional |
| Profile image | `profileImage` | signature-validated |
| Contact | `attachment` | pdf/png/jpeg/doc/docx, 5 MiB |
| Application image | `appImage` | Super Admin |
| Settings logo | `logo` / `companyLogo` | Admin |

Attach files in Postman form-data UI (file type). Do not hardcode server filesystem paths.

## Mock EPG

When payment provider is mock/dev:

- `POST /api/epg/initialize`
- `GET /api/epg/mock/session/:sessionId`
- `POST /api/epg/mock/trigger` with scenarios: `success`, `failed`, `cancelled`, …

Marked **Development / Mock Only** in collections. Do not treat as production payment.

Real EPG requires gateway credentials configured in server environment — **never put secrets in Postman**.

## Private storage

`GET /api/storage/private/:token` streams bytes using a signed JWT path token (TTL via `PRIVATE_URL_TTL_SECONDS`). No Bearer auth. Allowed scopes: `/uploads/profile/`, `/uploads/contact/`.

## Security warnings

- Never export production secrets into collections/environments committed to git
- Do not commit real JWT tokens, S3 keys, EPG secrets, or DB URLs
- CAPTCHA phone detection is User-Agent based and spoofable — treat as UX policy, not strong security
- `/set-trusted-cookie` and mock EPG routes are development helpers
- Payment settings responses mask gateway secrets as `********`

## Regenerate

```bash
python3 scripts/generate-postman-collections.py
```

## Coverage

See the generator console output / final report for route-vs-collection audit counts.
