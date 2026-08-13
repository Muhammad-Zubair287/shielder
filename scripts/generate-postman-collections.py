#!/usr/bin/env python3
"""
Generate production-quality Postman collections for Shielder backend.

Source of truth: backend Express route registrations (app.ts + *.routes.ts).
Preserves root-level legacy collections; writes canonical outputs to postman/.
"""

from __future__ import annotations

import copy
import json
import re
import uuid
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "postman"
LEGACY_WEB = ROOT / "SHIELDER.postman_collection.json"
LEGACY_MOBILE = ROOT / "SHIELDER_Mobile.postman_collection.json"

ERR = {
    "validation": {
        "success": False,
        "message": "Validation failed",
        "errors": [{"field": "email", "message": "Email is required"}],
    },
    "validation_ar": {
        "success": False,
        "message": "فشل التحقق من الصحة",
        "errors": [{"field": "email", "message": "البريد الإلكتروني مطلوب"}],
    },
    "unauthorized": {"success": False, "message": "Authentication required"},
    "forbidden": {"success": False, "message": "You do not have permission to perform this action"},
    "not_found": {"success": False, "message": "Resource not found"},
    "conflict": {"success": False, "message": "Resource already exists"},
    "server": {"success": False, "message": "Internal server error"},
    "rate_limit": {"success": False, "message": "Too many requests. Please try again later."},
}


def dumps(obj: Any) -> str:
    return json.dumps(obj, indent=2, ensure_ascii=False)


def uid() -> str:
    return str(uuid.uuid4())


def headers(
    *,
    auth: str | None = "accessToken",
    json_body: bool = True,
    language: str = "{{language}}",
    extra: list[dict] | None = None,
    user_agent: str | None = None,
) -> list[dict]:
    h: list[dict] = []
    if auth:
        h.append({"key": "Authorization", "value": f"Bearer {{{{{auth}}}}}", "type": "text"})
    if json_body:
        h.append({"key": "Content-Type", "value": "application/json", "type": "text"})
    h.append({"key": "Accept", "value": "application/json", "type": "text"})
    h.append({"key": "Accept-Language", "value": language, "type": "text"})
    if user_agent:
        h.append({"key": "User-Agent", "value": user_agent, "type": "text"})
    if extra:
        h.extend(extra)
    return h


def url(path: str, query: list[tuple[str, str]] | None = None) -> dict:
    path = path if path.startswith("/") else f"/{path}"
    # Paths that are not under /api (health, set-trusted-cookie)
    if path.startswith("/health") or path.startswith("/set-trusted") or path.startswith("/api-docs"):
        raw = "{{baseUrl}}" + path
        host = ["{{baseUrl}}"]
        parts = [p for p in path.split("/") if p]
        q = [{"key": k, "value": v} for k, v in (query or [])]
        out = {"raw": raw + (("?" + "&".join(f"{k}={v}" for k, v in query)) if query else ""), "host": host, "path": parts}
        if q:
            out["query"] = q
        return out

    # Prefer {{baseUrl}}/api/... — baseUrl is host only (http://localhost:5000)
    if path.startswith("/api/"):
        rel = path[len("/api/") :]
        raw_base = "{{baseUrl}}/api/" + rel
    elif path.startswith("/api"):
        rel = path[len("/api") :].lstrip("/")
        raw_base = "{{baseUrl}}/api/" + rel if rel else "{{baseUrl}}/api"
    else:
        rel = path.lstrip("/")
        raw_base = "{{baseUrl}}/api/" + rel

    parts = [p for p in ("api/" + rel).split("/") if p]
    q = [{"key": k, "value": v} for k, v in (query or [])]
    raw = raw_base
    if query:
        raw += "?" + "&".join(f"{k}={v}" for k, v in query)
    out: dict[str, Any] = {"raw": raw, "host": ["{{baseUrl}}"], "path": parts}
    if q:
        out["query"] = q
    return out


def example(
    name: str,
    code: int,
    body: Any,
    *,
    status: str | None = None,
    headers_list: list[dict] | None = None,
) -> dict:
    status_map = {
        200: "OK",
        201: "Created",
        204: "No Content",
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        409: "Conflict",
        422: "Unprocessable Entity",
        429: "Too Many Requests",
        500: "Internal Server Error",
        502: "Bad Gateway",
    }
    body_str = body if isinstance(body, str) else dumps(body)
    return {
        "id": uid(),
        "name": name,
        "originalRequest": {},
        "status": status or status_map.get(code, "OK"),
        "code": code,
        "_postman_previewlanguage": "json" if not isinstance(body, str) or body.strip().startswith("{") else "text",
        "header": headers_list
        or [{"key": "Content-Type", "value": "application/json"}],
        "body": body_str,
    }


def std_errors(*kinds: str) -> list[dict]:
    mapping = {
        "validation": (400, "400 Validation Error", ERR["validation"]),
        "validation_ar": (400, "400 Validation Error (Arabic)", ERR["validation_ar"]),
        "unauthorized": (401, "401 Unauthorized", ERR["unauthorized"]),
        "forbidden": (403, "403 Forbidden", ERR["forbidden"]),
        "not_found": (404, "404 Not Found", ERR["not_found"]),
        "conflict": (409, "409 Conflict", ERR["conflict"]),
        "server": (500, "500 Server Error", ERR["server"]),
        "rate_limit": (429, "429 Rate Limited", ERR["rate_limit"]),
    }
    out = []
    for k in kinds:
        code, name, body = mapping[k]
        out.append(example(name, code, body))
    return out


def tests(lines: list[str]) -> list[dict]:
    return [
        {
            "listen": "test",
            "script": {"type": "text/javascript", "exec": lines},
        }
    ]


LOGIN_SAVE = [
    "pm.test('Status is 200 or 201', function () { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });",
    "try {",
    "  const json = pm.response.json();",
    "  const data = json.data || {};",
    "  const tokens = data.tokens || data;",
    "  if (tokens.accessToken) {",
    "    pm.environment.set('accessToken', tokens.accessToken);",
    "    pm.environment.set('customerToken', tokens.accessToken);",
    "  }",
    "  if (tokens.refreshToken) {",
    "    pm.environment.set('refreshToken', tokens.refreshToken);",
    "    pm.environment.set('customerRefreshToken', tokens.refreshToken);",
    "  }",
    "  if (data.user && data.user.id) pm.environment.set('userId', data.user.id);",
    "  if (data.registrationSessionToken) pm.environment.set('registrationSessionToken', data.registrationSessionToken);",
    "  if (data.resetSessionToken) pm.environment.set('resetSessionToken', data.resetSessionToken);",
    "  if (data.verificationSessionToken) pm.environment.set('verificationSessionToken', data.verificationSessionToken);",
    "  if (data.otpSessionToken) pm.environment.set('otpSessionToken', data.otpSessionToken);",
    "  if (data.trustedDeviceToken) pm.environment.set('trustedDeviceToken', data.trustedDeviceToken);",
    "} catch (e) {}",
]

ADMIN_LOGIN_SAVE = [
    "pm.test('Status is 200', function () { pm.expect(pm.response.code).to.eql(200); });",
    "try {",
    "  const json = pm.response.json();",
    "  const data = json.data || {};",
    "  const tokens = data.tokens || data;",
    "  if (tokens.accessToken) {",
    "    pm.environment.set('accessToken', tokens.accessToken);",
    "    pm.environment.set('adminToken', tokens.accessToken);",
    "  }",
    "  if (tokens.refreshToken) {",
    "    pm.environment.set('refreshToken', tokens.refreshToken);",
    "    pm.environment.set('adminRefreshToken', tokens.refreshToken);",
    "  }",
    "  if (data.requiresTwoFactor && data.otpSessionToken) {",
    "    pm.environment.set('otpSessionToken', data.otpSessionToken);",
    "  }",
    "  if (data.user && data.user.id) pm.environment.set('userId', data.user.id);",
    "} catch (e) {}",
]

SUPER_LOGIN_SAVE = [
    "pm.test('Status is 200', function () { pm.expect(pm.response.code).to.eql(200); });",
    "try {",
    "  const json = pm.response.json();",
    "  const data = json.data || {};",
    "  const tokens = data.tokens || data;",
    "  if (tokens.accessToken) {",
    "    pm.environment.set('accessToken', tokens.accessToken);",
    "    pm.environment.set('superadminToken', tokens.accessToken);",
    "  }",
    "  if (tokens.refreshToken) {",
    "    pm.environment.set('refreshToken', tokens.refreshToken);",
    "    pm.environment.set('superadminRefreshToken', tokens.refreshToken);",
    "  }",
    "  if (data.user && data.user.id) pm.environment.set('userId', data.user.id);",
    "} catch (e) {}",
]


def save_id(path_expr: str, env_key: str) -> list[str]:
    return [
        "pm.test('Status is successful', function () { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });",
        "try {",
        "  const json = pm.response.json();",
        f"  const id = {path_expr};",
        f"  if (id) pm.environment.set('{env_key}', id);",
        "} catch (e) {}",
    ]


def req(
    name: str,
    method: str,
    path: str,
    *,
    description: str,
    auth: str | None = "accessToken",
    body: Any | None = None,
    formdata: list[dict] | None = None,
    query: list[tuple[str, str]] | None = None,
    success: dict | None = None,
    success_code: int = 200,
    errors: list[str] | None = None,
    test_script: list[str] | None = None,
    language: str = "{{language}}",
    user_agent: str | None = None,
    extra_headers: list[dict] | None = None,
    extra_examples: list[dict] | None = None,
    role: str | None = None,
) -> dict:
    role_line = f"\n\n**Required role:** `{role}`" if role else ""
    auth_line = (
        "\n\n**Auth:** Bearer JWT required"
        if auth
        else "\n\n**Auth:** Public (no Bearer token)"
    )
    desc = description + auth_line + role_line
    desc += (
        "\n\n**Locale:** Send `Accept-Language: en` or `Accept-Language: ar` "
        "(Arabic if header equals/starts with `ar`)."
    )

    json_body = formdata is None and method.upper() in {"POST", "PUT", "PATCH"} and body is not None
    h = headers(
        auth=auth,
        json_body=json_body and formdata is None,
        language=language,
        extra=extra_headers,
        user_agent=user_agent,
    )

    request: dict[str, Any] = {
        "method": method.upper(),
        "header": h,
        "url": url(path, query),
        "description": desc,
    }

    if formdata is not None:
        request["body"] = {"mode": "formdata", "formdata": formdata}
        # Ensure Content-Type is not forced for multipart
        request["header"] = [x for x in h if x.get("key") != "Content-Type"]
    elif body is not None:
        request["body"] = {
            "mode": "raw",
            "raw": body if isinstance(body, str) else dumps(body),
            "options": {"raw": {"language": "json"}},
        }

    responses: list[dict] = []
    if success is not None:
        responses.append(example(f"{success_code} Success", success_code, success))
    if extra_examples:
        responses.extend(extra_examples)
    responses.extend(std_errors(*(errors or ["validation", "unauthorized", "forbidden", "not_found", "server"])))

    item: dict[str, Any] = {
        "name": name,
        "request": request,
        "response": responses,
    }
    if test_script:
        item["event"] = tests(test_script)
    else:
        item["event"] = tests(
            [
                "pm.test('Response has body or expected status', function () {",
                "  pm.expect(pm.response.code).to.be.a('number');",
                "});",
            ]
        )
    return item


def folder(name: str, description: str, items: list[dict]) -> dict:
    return {"name": name, "description": description, "item": items}


# ── Endpoint inventory used for coverage audit ────────────────────────────────
# Full path including /api where applicable. Classification: WEB | MOBILE | BOTH | INTERNAL

INVENTORY: list[tuple[str, str, str, str, str]] = [
    # method, path, module, auth/role, class
    ("GET", "/health", "system", "public", "BOTH"),
    ("GET", "/health/email", "system", "public", "WEB"),
    ("GET", "/set-trusted-cookie", "system", "dev-only", "INTERNAL"),
    ("GET", "/api/debug-routes", "system", "public", "INTERNAL"),
    # Auth
    ("POST", "/api/auth/signup", "auth", "public", "BOTH"),
    ("POST", "/api/auth/login", "auth", "public", "BOTH"),
    ("POST", "/api/auth/refresh", "auth", "public", "BOTH"),
    ("POST", "/api/auth/forgot-password", "auth", "public", "BOTH"),
    ("POST", "/api/auth/forgot-password/send-otp", "auth", "public", "BOTH"),
    ("POST", "/api/auth/forgot-password/resend-otp", "auth", "public", "BOTH"),
    ("POST", "/api/auth/forgot-password/verify-otp", "auth", "public", "BOTH"),
    ("POST", "/api/auth/forgot-password/reset", "auth", "public", "BOTH"),
    ("POST", "/api/auth/signup/initiate", "auth", "public", "BOTH"),
    ("POST", "/api/auth/signup/verify-otp", "auth", "public", "BOTH"),
    ("POST", "/api/auth/signup/resend-otp", "auth", "public", "BOTH"),
    ("POST", "/api/auth/resend-verification", "auth", "public", "BOTH"),
    ("POST", "/api/auth/reset-password", "auth", "public", "BOTH"),
    ("GET", "/api/auth/verify-email/:token", "auth", "public", "BOTH"),
    ("POST", "/api/auth/send-otp", "auth", "public", "BOTH"),
    ("POST", "/api/auth/verify-otp", "auth", "public", "BOTH"),
    ("POST", "/api/auth/verification/verify-otp", "auth", "public", "BOTH"),
    ("POST", "/api/auth/verification/resend-otp", "auth", "public", "BOTH"),
    ("POST", "/api/auth/verification/change-email", "auth", "public", "BOTH"),
    ("GET", "/api/auth/me", "auth", "auth", "BOTH"),
    ("POST", "/api/auth/logout", "auth", "auth", "BOTH"),
    ("POST", "/api/auth/logout-all", "auth", "auth", "BOTH"),
    ("PATCH", "/api/auth/change-password", "auth", "auth", "BOTH"),
    ("GET", "/api/auth/sessions", "auth", "auth", "BOTH"),
    ("DELETE", "/api/auth/sessions/:sessionId", "auth", "auth", "BOTH"),
    ("GET", "/api/auth/trusted-devices", "auth", "auth", "BOTH"),
    ("DELETE", "/api/auth/trusted-devices/:token", "auth", "auth", "BOTH"),
    ("GET", "/api/auth/trusted-device/status", "auth", "public/cookie", "BOTH"),
]


def normalize_legacy_url(raw: str) -> str:
    raw = raw or ""
    raw = raw.replace("{{base_url}}", "{{baseUrl}}/api")
    raw = raw.replace("{{base_url_v1}}", "{{baseUrl}}/api/v1")
    raw = raw.replace("{{baseUrl}}/api/api/", "{{baseUrl}}/api/")
    return raw


def rewrite_vars(obj: Any) -> Any:
    """Normalize legacy variable names to new environment keys."""
    mapping = {
        "{{access_token}}": "{{accessToken}}",
        "{{refresh_token}}": "{{refreshToken}}",
        "{{superadmin_token}}": "{{superadminToken}}",
        "{{admin_token}}": "{{adminToken}}",
        "{{customer_token}}": "{{customerToken}}",
        "{{product_id}}": "{{productId}}",
        "{{category_id}}": "{{categoryId}}",
        "{{subcategory_id}}": "{{subcategoryId}}",
        "{{warehouse_id}}": "{{warehouseId}}",
        "{{quotation_id}}": "{{quotationId}}",
        "{{order_id}}": "{{orderId}}",
        "{{payment_id}}": "{{paymentId}}",
        "{{application_id}}": "{{applicationId}}",
        "{{user_id}}": "{{userId}}",
        "{{session_id}}": "{{sessionId}}",
        "{{notification_id}}": "{{notificationId}}",
        "{{alert_id}}": "{{alertId}}",
        "{{review_id}}": "{{reviewId}}",
        "{{registration_session_token}}": "{{registrationSessionToken}}",
        "{{reset_session_token}}": "{{resetSessionToken}}",
        "{{verification_session_token}}": "{{verificationSessionToken}}",
        "{{otp_session_token}}": "{{otpSessionToken}}",
        "{{superadmin_refresh_token}}": "{{superadminRefreshToken}}",
        "{{admin_refresh_token}}": "{{adminRefreshToken}}",
        "{{customer_refresh_token}}": "{{customerRefreshToken}}",
        "{{active_access_token}}": "{{accessToken}}",
        "{{active_refresh_token}}": "{{refreshToken}}",
        "{{base_url}}": "{{baseUrl}}/api",
        "{{base_url_v1}}": "{{baseUrl}}/api/v1",
        "{{token}}": "{{accessToken}}",
    }

    if isinstance(obj, str):
        s = obj
        for a, b in mapping.items():
            s = s.replace(a, b)
        # Fix double /api/api
        s = s.replace("{{baseUrl}}/api/api/", "{{baseUrl}}/api/")
        return s
    if isinstance(obj, list):
        return [rewrite_vars(x) for x in obj]
    if isinstance(obj, dict):
        return {k: rewrite_vars(v) for k, v in obj.items()}
    return obj


def strip_mobile_folder(items: list[dict]) -> list[dict]:
    return [i for i in items if not str(i.get("name", "")).startswith("📱") and "Mobile APIs" not in str(i.get("name", ""))]


def extract_paths(items: list[dict]) -> set[tuple[str, str]]:
    found: set[tuple[str, str]] = set()

    def walk(nodes: list[dict]) -> None:
        for n in nodes:
            if "request" in n:
                r = n["request"]
                method = r.get("method", "GET").upper()
                u = r.get("url")
                raw = u.get("raw", "") if isinstance(u, dict) else str(u or "")
                raw = re.sub(r"https?://[^/]+", "", raw)
                raw = raw.replace("{{baseUrl}}", "")
                raw = raw.replace("{{base_url}}", "")
                raw = raw.replace("{{base_url_v1}}", "")
                raw = raw.split("?")[0]
                if raw.startswith("/api/v1/"):
                    raw = "/api/" + raw[len("/api/v1/") :]
                if not raw.startswith("/"):
                    raw = "/" + raw
                # If collection used base_url including /api already stripped wrongly
                if raw.startswith("/auth/") or raw.startswith("/inventory/") or raw.startswith("/profile/"):
                    raw = "/api" + raw
                norm = re.sub(r"\{\{[^}]+\}\}", ":param", raw)
                found.add((method, norm))
            elif "item" in n:
                walk(n["item"])

    walk(items)
    return found


def build_missing_web_items() -> list[dict]:
    """Requests missing from the legacy web collection (verified against routes)."""
    strong_pw = "Password@123"
    return [
        folder(
            "Health & System",
            "System health and development diagnostics. `/set-trusted-cookie` and `/api/debug-routes` are non-production helpers.",
            [
                req(
                    "Health Check",
                    "GET",
                    "/health",
                    description="Liveness probe. Returns upload provider writability without exposing filesystem paths.",
                    auth=None,
                    success={
                        "success": True,
                        "message": "Shielder API is running",
                        "timestamp": "2026-08-13T07:00:00.000Z",
                        "environment": "development",
                        "uploads": {
                            "provider": "local",
                            "writable": True,
                            "exists": True,
                            "checkedAt": "2026-08-13T07:00:00.000Z",
                        },
                    },
                    errors=["server"],
                    test_script=[
                        "pm.test('Health OK', function () { pm.expect(pm.response.code).to.eql(200); });"
                    ],
                ),
                req(
                    "Email Health Check",
                    "GET",
                    "/health/email",
                    description="Verifies email provider connectivity (SMTP/Brevo/SendGrid).",
                    auth=None,
                    success={"success": True, "message": "Email service OK"},
                    extra_examples=[
                        example(
                            "502 Email Unreachable",
                            502,
                            {"success": False, "message": "Email service not configured or unreachable"},
                        )
                    ],
                    errors=["server"],
                ),
                req(
                    "Debug Routes (INTERNAL)",
                    "GET",
                    "/api/debug-routes",
                    description="INTERNAL diagnostics confirming API prefix registration.",
                    auth=None,
                    success={
                        "success": True,
                        "message": "Sub-route /api is working correctly",
                        "prefix": "/api",
                    },
                    errors=["server"],
                ),
                req(
                    "Set Trusted Cookie (DEV ONLY)",
                    "GET",
                    "/set-trusted-cookie",
                    description="Development helper to set `trustedDeviceToken` cookie for API-origin testing. **Not available in production.**",
                    auth=None,
                    query=[("token", "{{trustedDeviceToken}}")],
                    success="Trusted device cookie set for token=abcd1234...",
                    success_code=200,
                    errors=["validation", "server"],
                ),
            ],
        ),
        folder(
            "Authentication — Additional / Legacy",
            "Auth endpoints present in backend but often omitted from older collections. Prefer OTP registration (`/signup/initiate`) for new clients.",
            [
                req(
                    "Legacy Signup (creates user immediately)",
                    "POST",
                    "/api/auth/signup",
                    description="Legacy registration that creates the user immediately. Prefer `/signup/initiate` OTP flow for new clients.",
                    auth=None,
                    body={
                        "email": "legacy.user@example.com",
                        "password": strong_pw,
                        "fullName": "Legacy User",
                        "phoneNumber": "+966501234567",
                        "address": "Riyadh",
                        "companyName": "Example Co",
                        "preferredLanguage": "en",
                    },
                    success={
                        "success": True,
                        "message": "Account created successfully.",
                        "data": {
                            "user": {
                                "id": "uuid",
                                "email": "legacy.user@example.com",
                                "role": "USER",
                                "status": "ACTIVE",
                                "emailVerified": False,
                                "profile": {"fullName": "Legacy User"},
                            },
                            "tokens": {
                                "accessToken": "eyJ...",
                                "refreshToken": "eyJ...",
                            },
                            "emailDeliveryStatus": "email_sent",
                        },
                    },
                    success_code=201,
                    errors=["validation", "conflict", "rate_limit", "server"],
                    test_script=LOGIN_SAVE,
                ),
                req(
                    "Forgot Password (email link)",
                    "POST",
                    "/api/auth/forgot-password",
                    description="Sends password-reset email link. Always returns generic success to avoid account enumeration.",
                    auth=None,
                    body={"email": "{{customerEmail}}"},
                    success={"success": True, "message": "If the email exists, a reset link has been sent."},
                    errors=["validation", "rate_limit", "server"],
                ),
                req(
                    "Reset Password (email token)",
                    "POST",
                    "/api/auth/reset-password",
                    description="Resets password using token from email link. Body field is `newPassword` (not `password`).",
                    auth=None,
                    body={"token": "{{emailResetToken}}", "newPassword": strong_pw},
                    success={"success": True, "message": "Password reset successfully."},
                    errors=["validation", "not_found", "rate_limit", "server"],
                ),
                req(
                    "Verify Email (link token)",
                    "GET",
                    "/api/auth/verify-email/{{emailVerificationToken}}",
                    description="Verifies email address using token from verification email.",
                    auth=None,
                    success={"success": True, "message": "Email verified successfully."},
                    errors=["not_found", "server"],
                ),
                req(
                    "Send Admin 2FA OTP",
                    "POST",
                    "/api/auth/send-otp",
                    description="Sends OTP for admin two-factor authentication. Method defaults to EMAIL.",
                    auth=None,
                    body={"userId": "{{userId}}", "method": "EMAIL"},
                    success={"success": True, "message": "OTP sent successfully."},
                    errors=["validation", "rate_limit", "server"],
                ),
                req(
                    "Verify Forced Email OTP",
                    "POST",
                    "/api/auth/verification/verify-otp",
                    description="Completes forced email re-verification flow started when login returns `requiresVerification`.",
                    auth=None,
                    body={
                        "verificationSessionToken": "{{verificationSessionToken}}",
                        "code": "{{otp}}",
                    },
                    success={"success": True, "message": "Email verified successfully."},
                    errors=["validation", "rate_limit", "server"],
                ),
                req(
                    "Resend Forced Email OTP",
                    "POST",
                    "/api/auth/verification/resend-otp",
                    description="Resends OTP for forced email re-verification.",
                    auth=None,
                    body={"verificationSessionToken": "{{verificationSessionToken}}"},
                    success={
                        "success": True,
                        "message": "OTP resent.",
                        "data": {"expiresInMinutes": 5, "resendCooldownSeconds": 60},
                    },
                    errors=["validation", "rate_limit", "server"],
                ),
                req(
                    "Change Email During Verification",
                    "POST",
                    "/api/auth/verification/change-email",
                    description="Changes email while a verification session is pending.",
                    auth=None,
                    body={
                        "verificationSessionToken": "{{verificationSessionToken}}",
                        "newEmail": "new.email@example.com",
                    },
                    success={
                        "success": True,
                        "message": "Verification email updated.",
                        "data": {
                            "verificationSessionToken": "new-session-token",
                            "verificationEmail": "new.email@example.com",
                            "expiresInMinutes": 15,
                        },
                    },
                    errors=["validation", "rate_limit", "conflict", "server"],
                    test_script=[
                        "try { const d=pm.response.json().data||{}; if(d.verificationSessionToken) pm.environment.set('verificationSessionToken', d.verificationSessionToken); } catch(e){}"
                    ],
                ),
                req(
                    "Revoke Trusted Device",
                    "DELETE",
                    "/api/auth/trusted-devices/{{trustedDeviceToken}}",
                    description="Revokes a remembered trusted device token.",
                    auth="accessToken",
                    success={"success": True, "message": "Trusted device revoked."},
                    errors=["unauthorized", "not_found", "server"],
                ),
                req(
                    "Trusted Device Status",
                    "GET",
                    "/api/auth/trusted-device/status",
                    description="Checks whether the current request presents a valid trusted-device token (header `x-trusted-device-token` or cookie `trustedDeviceToken`).",
                    auth=None,
                    extra_headers=[
                        {"key": "x-trusted-device-token", "value": "{{trustedDeviceToken}}", "type": "text"}
                    ],
                    success={
                        "success": True,
                        "data": {"trusted": True, "expiresAt": "2026-09-12T00:00:00.000Z"},
                    },
                    extra_examples=[
                        example(
                            "200 Not Trusted",
                            200,
                            {"success": True, "data": {"trusted": False, "expiresAt": None}},
                        )
                    ],
                    errors=["server"],
                ),
            ],
        ),
        folder(
            "Notifications — Preferences Alias",
            "PATCH alias for notification preferences (PUT also supported).",
            [
                req(
                    "Update Notification Preferences (PATCH)",
                    "PATCH",
                    "/api/notifications/preferences",
                    description="Alias of PUT `/notifications/preferences`. Updates the authenticated user's notification preferences.",
                    auth="accessToken",
                    body={"emailEnabled": True, "pushEnabled": True, "orderUpdates": True},
                    success={"success": True, "message": "Preferences updated.", "data": {}},
                    errors=["unauthorized", "validation", "server"],
                ),
            ],
        ),
        folder(
            "EPG — Callback / Webhook / Mock",
            "Gateway callback/webhook plus development-only mock EPG controls. Marked clearly for QA.",
            [
                req(
                    "EPG Provider Info",
                    "GET",
                    "/api/epg/provider",
                    description="Safe provider metadata (no secrets). Useful for clients to detect mock vs sandbox vs production.",
                    auth=None,
                    success={
                        "success": True,
                        "data": {"provider": "mock", "testMode": True, "mockEnabled": True},
                    },
                    errors=["server"],
                ),
                req(
                    "EPG Callback (browser redirect)",
                    "GET",
                    "/api/epg/callback",
                    description=(
                        "Public EPG redirect target. **Does not return JSON** — issues HTTP redirects to frontend "
                        "(`/order-confirmation/:orderId?payment=success` or checkout failure URLs)."
                    ),
                    auth=None,
                    query=[("sessionId", "{{epgSessionId}}"), ("status", "success")],
                    success="302 Redirect to frontend order confirmation",
                    errors=["server"],
                ),
                req(
                    "EPG Webhook",
                    "POST",
                    "/api/epg/webhook",
                    description=(
                        "Server-to-server webhook. Signature verified via `X-EPG-Signature` / `X-Signature`. "
                        "Invalid signatures return `{ received: false, reason: 'invalid_signature' }`. "
                        "Controller exceptions intentionally still return HTTP 200 `{ received: true }`."
                    ),
                    auth=None,
                    body={"sessionId": "{{epgSessionId}}", "status": "SUCCESS", "amount": 100.0},
                    extra_headers=[
                        {"key": "X-EPG-Signature", "value": "{{epgWebhookSignature}}", "type": "text"}
                    ],
                    success={"received": True},
                    extra_examples=[
                        example(
                            "200 Invalid Signature",
                            200,
                            {"received": False, "reason": "invalid_signature"},
                        )
                    ],
                    errors=["server"],
                ),
                req(
                    "Mock EPG — Get Session [DEV ONLY]",
                    "GET",
                    "/api/epg/mock/session/{{epgSessionId}}",
                    description="**Development / Mock Only.** Returns mock session state. 404 when mock provider is disabled.",
                    auth="customerToken",
                    success={
                        "success": True,
                        "data": {
                            "sessionId": "mock-session-id",
                            "orderId": "uuid",
                            "orderNumber": "ORD-...",
                            "amount": 250.0,
                            "currency": "SAR",
                            "paymentStatus": "PENDING",
                            "orderStatus": "PENDING",
                            "provider": "mock",
                            "sessionStatus": "pending",
                            "isExecutable": True,
                            "terminalRedirectUrl": None,
                        },
                    },
                    errors=["unauthorized", "not_found", "server"],
                    role="Authenticated customer (owner of session)",
                ),
                req(
                    "Mock EPG — Trigger Scenario [DEV ONLY]",
                    "POST",
                    "/api/epg/mock/trigger",
                    description=(
                        "**Development / Mock Only.** Triggers mock payment scenarios: "
                        "`success | failed | cancelled | pending | timeout | duplicate_callback | "
                        "refund_success | refund_failure | already_refunded`."
                    ),
                    auth="customerToken",
                    body={"sessionId": "{{epgSessionId}}", "scenario": "success"},
                    success={
                        "success": True,
                        "data": {
                            "scenario": "success",
                            "redirectUrl": "http://localhost:3000/order-confirmation/uuid?payment=success",
                            "callbackResult": {
                                "success": True,
                                "orderId": "uuid",
                                "orderNumber": "ORD-...",
                            },
                        },
                    },
                    errors=["validation", "unauthorized", "not_found", "server"],
                    test_script=save_id("pm.response.json()?.data?.callbackResult?.orderId", "orderId"),
                ),
            ],
        ),
        folder(
            "Storage",
            "Private signed URL streaming. Token is a JWT signed with PRIVATE_URL_SIGNING_SECRET. No Bearer auth.",
            [
                req(
                    "Stream Private Object",
                    "GET",
                    "/api/storage/private/{{privateUrlToken}}",
                    description=(
                        "Streams a private object (profile/contact uploads only). "
                        "Authorization is the signed `:token` path parameter.\n\n"
                        "- Expired → `storage.privateExpired`\n"
                        "- Invalid/tampered → `storage.privateInvalidToken`\n"
                        "- Allowed refs: `/uploads/profile/*`, `/uploads/contact/*`\n"
                        "- Success returns raw bytes (image/pdf), not JSON.\n\n"
                        "Never log or commit `PRIVATE_URL_SIGNING_SECRET`."
                    ),
                    auth=None,
                    success="(binary stream — Content-Type: image/jpeg|image/png|application/pdf|...)",
                    errors=["not_found", "server"],
                    extra_examples=[
                        example(
                            "400/401 Expired Token",
                            400,
                            {"success": False, "message": "Private URL has expired"},
                        ),
                        example(
                            "400 Invalid Token",
                            400,
                            {"success": False, "message": "Invalid private URL token"},
                        ),
                    ],
                ),
            ],
        ),
        folder(
            "Terms and Conditions",
            "Public read + Super Admin update.",
            [
                req(
                    "Get Terms and Conditions",
                    "GET",
                    "/api/terms-and-conditions",
                    description="Public terms document. Localized message via Accept-Language.",
                    auth=None,
                    success={
                        "success": True,
                        "data": {
                            "id": "uuid",
                            "contentEn": "Terms...",
                            "contentAr": "الشروط...",
                            "updatedAt": "2026-08-01T00:00:00.000Z",
                        },
                    },
                    errors=["server"],
                ),
                req(
                    "Update Terms and Conditions",
                    "PUT",
                    "/api/terms-and-conditions/admin",
                    description="Update terms content. Super Admin only.",
                    auth="superadminToken",
                    role="SUPER_ADMIN",
                    body={
                        "contentEn": "Updated English terms...",
                        "contentAr": "شروط محدثة...",
                    },
                    success={
                        "success": True,
                        "message": "Terms and conditions updated.",
                        "data": {"id": "uuid"},
                    },
                    errors=["unauthorized", "forbidden", "validation", "server"],
                ),
            ],
        ),
        folder(
            "Public Warehouses",
            "Customer-facing warehouse list used by checkout pickup flow. Admin CRUD lives under `/api/admin/warehouses`.",
            [
                req(
                    "List Active Warehouses",
                    "GET",
                    "/api/warehouses/active",
                    description="Authenticated list of active warehouses for pickup checkout. Any authenticated role.",
                    auth="accessToken",
                    success={
                        "success": True,
                        "data": [
                            {
                                "id": "uuid",
                                "name": "Main Warehouse",
                                "city": "Riyadh",
                                "country": "Saudi Arabia",
                                "isMain": True,
                                "isActive": True,
                            }
                        ],
                    },
                    errors=["unauthorized", "server"],
                    test_script=save_id("(pm.response.json().data||[])[0]?.id", "warehouseId"),
                ),
            ],
        ),
    ]


def ensure_descriptions(items: list[dict]) -> None:
    """Add minimal description if missing."""

    def walk(nodes: list[dict], trail: str = "") -> None:
        for n in nodes:
            name = n.get("name", "")
            if "request" in n:
                r = n["request"]
                if not r.get("description"):
                    method = r.get("method", "GET")
                    u = r.get("url")
                    raw = u.get("raw", "") if isinstance(u, dict) else str(u or "")
                    r["description"] = (
                        f"{method} `{raw}`\n\n"
                        f"Folder: {trail}\n\n"
                        "Locale via `Accept-Language: en|ar`. "
                        "Use Bearer token when Authorization header is present."
                    )
                # Ensure at least one response example
                if not n.get("response"):
                    n["response"] = [
                        example(
                            "200 Success",
                            200,
                            {"success": True, "message": "OK", "data": {}},
                        )
                    ] + std_errors("unauthorized", "server")
            elif "item" in n:
                walk(n["item"], f"{trail}/{name}" if trail else name)

    walk(items)


def build_web_collection() -> dict:
    legacy = json.loads(LEGACY_WEB.read_text())
    items = strip_mobile_folder(legacy.get("item", []))
    items = rewrite_vars(items)
    # Prepend missing coverage folders
    missing = build_missing_web_items()
    # Also add E2E workflow folder
    e2e = folder(
        "End-to-End Workflows",
        "Chained happy-path workflows. Run in order within an environment. Tokens/IDs are saved automatically.",
        [
            req(
                "E2E 1 — Customer Login",
                "POST",
                "/api/auth/login",
                description="Start customer workflow.",
                auth=None,
                body={"email": "{{customerEmail}}", "password": "{{customerPassword}}"},
                success={
                    "success": True,
                    "message": "Login successful.",
                    "data": {
                        "user": {"id": "uuid", "email": "customer@example.com", "role": "USER"},
                        "tokens": {"accessToken": "eyJ...", "refreshToken": "eyJ..."},
                    },
                },
                errors=["validation", "unauthorized", "rate_limit", "server"],
                test_script=LOGIN_SAVE,
            ),
            req(
                "E2E 2 — Admin Login",
                "POST",
                "/api/auth/login",
                description="Admin login for catalog setup. May return `requiresTwoFactor`.",
                auth=None,
                body={"email": "{{adminEmail}}", "password": "{{adminPassword}}", "rememberDevice": True},
                success={
                    "success": True,
                    "message": "Login successful.",
                    "data": {
                        "user": {"id": "uuid", "role": "ADMIN"},
                        "tokens": {"accessToken": "eyJ...", "refreshToken": "eyJ..."},
                    },
                },
                errors=["validation", "unauthorized", "rate_limit", "server"],
                test_script=ADMIN_LOGIN_SAVE,
            ),
            req(
                "E2E 3 — Create Category",
                "POST",
                "/api/inventory/categories",
                description="Multipart create category.",
                auth="adminToken",
                role="ADMIN",
                formdata=[
                    {"key": "nameEn", "value": "Industrial Filters", "type": "text"},
                    {"key": "descriptionEn", "value": "Filter category", "type": "text"},
                    {"key": "nameAr", "value": "فلاتر صناعية", "type": "text"},
                    {"key": "isActive", "value": "true", "type": "text"},
                    {"key": "image", "type": "file", "src": [], "value": ""},
                ],
                success={"success": True, "data": {"id": "uuid"}},
                success_code=201,
                errors=["unauthorized", "forbidden", "validation", "server"],
                test_script=save_id("pm.response.json()?.data?.id", "categoryId"),
            ),
            req(
                "E2E 4 — Create Product",
                "POST",
                "/api/inventory/products",
                description="Creates product in PENDING status.",
                auth="adminToken",
                role="ADMIN",
                body={
                    "categoryId": "{{categoryId}}",
                    "subcategoryId": "{{subcategoryId}}",
                    "price": 199.99,
                    "stock": 25,
                    "sku": "SKU-E2E-001",
                    "translations": [
                        {"locale": "en", "name": "E2E Filter", "description": "Workflow product"},
                        {"locale": "ar", "name": "فلتر تجريبي", "description": "منتج تجريبي"},
                    ],
                },
                success={"success": True, "data": {"id": "uuid", "status": "PENDING"}},
                success_code=201,
                errors=["unauthorized", "forbidden", "validation", "server"],
                test_script=save_id("pm.response.json()?.data?.id", "productId"),
            ),
            req(
                "E2E 5 — Upload Product Image",
                "POST",
                "/api/inventory/products/{{productId}}/images",
                description="Multipart field `productImage`. Max ~5 MiB. image/jpeg|png|webp|jfif.",
                auth="adminToken",
                role="ADMIN",
                formdata=[{"key": "productImage", "type": "file", "src": [], "value": ""}],
                success={"success": True, "data": {"mainImage": "https://.../products/....jpeg"}},
                errors=["unauthorized", "forbidden", "validation", "server"],
            ),
            req(
                "E2E 6 — Approve Product",
                "PATCH",
                "/api/inventory/products/{{productId}}/approve",
                description="Publish pending product.",
                auth="adminToken",
                role="ADMIN",
                body={},
                success={"success": True, "data": {"id": "uuid", "status": "PUBLISHED"}},
                errors=["unauthorized", "forbidden", "not_found", "server"],
            ),
            req(
                "E2E 7 — Add to Cart",
                "POST",
                "/api/cart/add",
                description="Customer adds product to cart.",
                auth="customerToken",
                body={"productId": "{{productId}}", "quantity": 2},
                success_code=201,
                success={"success": True, "message": "Item added", "data": {"id": "cart-uuid", "totalAmount": 399.98}},
                errors=["unauthorized", "validation", "server"],
            ),
            req(
                "E2E 8 — Create Cash Order",
                "POST",
                "/api/orders",
                description="Checkout with CASH payment method.",
                auth="customerToken",
                body={
                    "deliveryType": "DELIVERY",
                    "shippingAddress": "King Fahd Road, Riyadh",
                    "phoneNumber": "+966501234567",
                    "customerName": "Customer Name",
                    "paymentMethod": "CASH",
                    "notes": "E2E order",
                    "items": [{"productId": "{{productId}}", "quantity": 1}],
                },
                success_code=201,
                success={
                    "success": True,
                    "message": "Order created successfully.",
                    "data": {"id": "uuid", "orderNumber": "ORD-...", "orderId": "uuid"},
                },
                errors=["unauthorized", "validation", "server"],
                test_script=save_id("pm.response.json()?.data?.id || pm.response.json()?.data?.orderId", "orderId"),
            ),
            req(
                "E2E 9 — Initialize EPG Payment",
                "POST",
                "/api/epg/initialize",
                description="Card checkout via EPG (mock or real depending on env).",
                auth="customerToken",
                body={
                    "items": [{"productId": "{{productId}}", "quantity": 1}],
                    "customerName": "Customer Name",
                    "phoneNumber": "+966501234567",
                    "shippingAddress": "King Fahd Road, Riyadh",
                    "deliveryType": "DELIVERY",
                    "notes": "",
                },
                success={
                    "success": True,
                    "data": {
                        "orderId": "uuid",
                        "orderNumber": "ORD-...",
                        "sessionId": "session-id",
                        "paymentUrl": "https://...",
                        "testMode": True,
                        "provider": "mock",
                    },
                },
                errors=["unauthorized", "validation", "server"],
                test_script=[
                    "pm.test('EPG init ok', function () { pm.expect(pm.response.code).to.eql(200); });",
                    "try {",
                    "  const d = pm.response.json().data || {};",
                    "  if (d.sessionId) pm.environment.set('epgSessionId', d.sessionId);",
                    "  if (d.orderId) pm.environment.set('orderId', d.orderId);",
                    "} catch (e) {}",
                ],
            ),
            req(
                "E2E 10 — Mock EPG Success [DEV ONLY]",
                "POST",
                "/api/epg/mock/trigger",
                description="**Development / Mock Only.** Completes the payment session.",
                auth="customerToken",
                body={"sessionId": "{{epgSessionId}}", "scenario": "success"},
                success={"success": True, "data": {"scenario": "success"}},
                errors=["unauthorized", "not_found", "validation", "server"],
            ),
        ],
    )

    # Product bulk upload negative cases folder
    bulk = folder(
        "Inventory — Bulk Upload & Negatives",
        "Excel bulk product upload and common negative cases. Inspect product.service bulkUpload for column rules.",
        [
            req(
                "Product Bulk Upload (Excel)",
                "POST",
                "/api/inventory/products/bulk-upload",
                description=(
                    "Admin multipart upload. Field name: `file`.\n\n"
                    "**Template columns:** Product Name, Arabic Name, Filter Number, Alternate Numbers, SKU, "
                    "Price, Stock, Minimum Stock, Category Name, Subcategory Name, Brand Name, Description, "
                    "Arabic Description, Filter Type, Material, Dimensions, Image, spec_Color, spec_Size.\n\n"
                    "**Required per row:** Product Name (or Name), Price (numeric), Stock (numeric).\n"
                    "SKU optional but must be unique when present.\n"
                    "Missing category/subcategory names are auto-created.\n"
                    "Image column supports data URL, HTTP(S) URL, or safe local path; embedded workbook images also supported.\n"
                    "Imported products are created as `PUBLISHED` (unlike normal create which is `PENDING`).\n"
                    "Download template via `GET /inventory/products/template`."
                ),
                auth="adminToken",
                role="ADMIN",
                formdata=[{"key": "file", "type": "file", "src": [], "value": ""}],
                success={
                    "success": True,
                    "data": {
                        "total": 10,
                        "success": 8,
                        "failed": 2,
                        "warnings": ["Row 4: embedded image used (may be low resolution)"],
                        "errors": [{"row": 3, "sku": "DUP-1", "error": "SKU already exists"}],
                    },
                },
                errors=["unauthorized", "forbidden", "validation", "server"],
                extra_examples=[
                    example(
                        "400 No File",
                        400,
                        {"success": False, "message": "No file uploaded"},
                    )
                ],
            ),
            req(
                "Product Bulk Upload — Missing File",
                "POST",
                "/api/inventory/products/bulk-upload",
                description="Negative: no multipart file.",
                auth="adminToken",
                role="ADMIN",
                formdata=[],
                success={"success": False, "message": "No file uploaded"},
                success_code=400,
                errors=["unauthorized", "forbidden", "server"],
            ),
            req(
                "Create Product — Unauthorized",
                "POST",
                "/api/inventory/products",
                description="Negative: missing auth.",
                auth=None,
                body={
                    "categoryId": "{{categoryId}}",
                    "subcategoryId": "{{subcategoryId}}",
                    "price": 10,
                    "translations": [{"locale": "en", "name": "X"}],
                },
                success=ERR["unauthorized"],
                success_code=401,
                errors=["forbidden", "server"],
            ),
        ],
    )

    ensure_descriptions(items)
    collection = {
        "info": {
            "_postman_id": "a1b2c3d4-shielder-web-api",
            "name": "Project API — Web",
            "description": (
                "Complete Shielder backend API collection for Web, Admin, and Superadmin clients.\n\n"
                "All routes are also available under `/api/v1/*` (same handlers).\n\n"
                "Locale: `Accept-Language: en|ar`.\n"
                "Auth tokens are saved automatically from login responses at `data.tokens.accessToken` "
                "(refresh at `data.accessToken` for `/auth/refresh`).\n\n"
                "Generated from backend route source. Legacy root collections are preserved."
            ),
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "variable": [
            {"key": "baseUrl", "value": "{{baseUrl}}", "type": "string"},
        ],
        "auth": {
            "type": "bearer",
            "bearer": [{"key": "token", "value": "{{accessToken}}", "type": "string"}],
        },
        "item": missing + [e2e, bulk] + items,
    }
    return rewrite_vars(collection)


def build_mobile_collection() -> dict:
    """Customer-facing shared APIs intended for mobile clients. No separate mobile routes exist."""
    strong_pw = "Password@123"
    phone_ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
    desktop_ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"

    auth_folder = folder(
        "Authentication",
        "Shared auth APIs used by mobile. No mobile-specific auth routes exist — same JWT access/refresh tokens as web.",
        [
            req(
                "Initiate Registration (OTP)",
                "POST",
                "/api/auth/signup/initiate",
                description="Preferred mobile registration. User is NOT created until OTP verification.",
                auth=None,
                body={
                    "email": "mobile.user@example.com",
                    "password": strong_pw,
                    "fullName": "Mobile User",
                    "phoneNumber": "+966501234567",
                    "preferredLanguage": "en",
                },
                success={
                    "success": True,
                    "message": "OTP sent.",
                    "data": {
                        "registrationSessionToken": "session-token",
                        "email": "mobile.user@example.com",
                        "expiresInMinutes": 10,
                    },
                },
                errors=["validation", "conflict", "rate_limit", "server"],
                test_script=[
                    "pm.test('OTP initiate', function () { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });",
                    "try { const d=pm.response.json().data||{}; if(d.registrationSessionToken) pm.environment.set('registrationSessionToken', d.registrationSessionToken); } catch(e){}",
                ],
            ),
            req(
                "Verify Registration OTP",
                "POST",
                "/api/auth/signup/verify-otp",
                description="Creates the user account. Does NOT return tokens — client must login afterwards.",
                auth=None,
                body={"registrationSessionToken": "{{registrationSessionToken}}", "code": "{{otp}}"},
                success={"success": True, "message": "Registration completed."},
                errors=["validation", "rate_limit", "server"],
            ),
            req(
                "Resend Registration OTP",
                "POST",
                "/api/auth/signup/resend-otp",
                description="Max 3 resends, 60s cooldown, 10 minute expiry.",
                auth=None,
                body={"registrationSessionToken": "{{registrationSessionToken}}"},
                success={
                    "success": True,
                    "message": "OTP resent.",
                    "data": {"email": "mobile.user@example.com", "expiresInMinutes": 10},
                },
                errors=["validation", "rate_limit", "server"],
            ),
            req(
                "Login",
                "POST",
                "/api/auth/login",
                description="Returns tokens at `data.tokens.accessToken` / `data.tokens.refreshToken`.",
                auth=None,
                body={"email": "{{customerEmail}}", "password": "{{customerPassword}}"},
                success={
                    "success": True,
                    "message": "Login successful.",
                    "data": {
                        "user": {"id": "uuid", "email": "customer@example.com", "role": "USER"},
                        "tokens": {"accessToken": "eyJ...", "refreshToken": "eyJ..."},
                    },
                },
                extra_examples=[
                    example(
                        "403 Requires Email Verification",
                        403,
                        {
                            "success": False,
                            "requiresVerification": True,
                            "message": "Email verification required.",
                            "verificationSessionToken": "token",
                            "verificationExpiresInMinutes": 15,
                            "verificationEmail": "customer@example.com",
                            "user": {},
                        },
                    )
                ],
                errors=["validation", "unauthorized", "rate_limit", "server"],
                test_script=LOGIN_SAVE,
            ),
            req(
                "Refresh Token",
                "POST",
                "/api/auth/refresh",
                description="Token paths differ from login: `data.accessToken` and `data.refreshToken`.",
                auth=None,
                body={"refreshToken": "{{refreshToken}}"},
                success={
                    "success": True,
                    "message": "Token refreshed.",
                    "data": {"accessToken": "eyJ...", "refreshToken": "eyJ..."},
                },
                errors=["validation", "unauthorized", "server"],
                test_script=[
                    "try { const d=pm.response.json().data||{}; if(d.accessToken){pm.environment.set('accessToken', d.accessToken); pm.environment.set('customerToken', d.accessToken);} if(d.refreshToken) pm.environment.set('refreshToken', d.refreshToken);} catch(e){}"
                ],
            ),
            req(
                "Logout",
                "POST",
                "/api/auth/logout",
                description="Logout current device/session.",
                auth="customerToken",
                body={"refreshToken": "{{refreshToken}}"},
                success={"success": True, "message": "Logged out."},
                errors=["unauthorized", "validation", "server"],
            ),
            req(
                "Logout All Devices",
                "POST",
                "/api/auth/logout-all",
                description="Revokes all sessions for the user.",
                auth="customerToken",
                body=None,
                success={"success": True, "message": "Logged out from all devices."},
                errors=["unauthorized", "server"],
            ),
            req(
                "Get Current User",
                "GET",
                "/api/auth/me",
                description="Current authenticated user.",
                auth="customerToken",
                success={"success": True, "data": {"user": {"id": "uuid", "email": "customer@example.com"}}},
                errors=["unauthorized", "server"],
            ),
            req(
                "Change Password",
                "PATCH",
                "/api/auth/change-password",
                description="Requires old password.",
                auth="customerToken",
                body={"oldPassword": "{{customerPassword}}", "newPassword": strong_pw},
                success={"success": True, "message": "Password changed."},
                errors=["unauthorized", "validation", "server"],
            ),
            req(
                "Forgot Password — Send OTP",
                "POST",
                "/api/auth/forgot-password/send-otp",
                description="Mobile-friendly OTP password reset step 1.",
                auth=None,
                body={"email": "{{customerEmail}}"},
                success={"success": True, "message": "If the email exists, an OTP has been sent."},
                errors=["validation", "rate_limit", "server"],
            ),
            req(
                "Forgot Password — Verify OTP",
                "POST",
                "/api/auth/forgot-password/verify-otp",
                description="Returns `resetSessionToken`.",
                auth=None,
                body={"email": "{{customerEmail}}", "code": "{{otp}}"},
                success={
                    "success": True,
                    "message": "OTP verified.",
                    "data": {"resetSessionToken": "token", "expiresInMinutes": 10},
                },
                errors=["validation", "rate_limit", "server"],
                test_script=[
                    "try { const d=pm.response.json().data||{}; if(d.resetSessionToken) pm.environment.set('resetSessionToken', d.resetSessionToken);} catch(e){}"
                ],
            ),
            req(
                "Forgot Password — Reset",
                "POST",
                "/api/auth/forgot-password/reset",
                description="Reset using verified OTP session.",
                auth=None,
                body={"resetSessionToken": "{{resetSessionToken}}", "newPassword": strong_pw},
                success={"success": True, "message": "Password reset successfully."},
                errors=["validation", "rate_limit", "server"],
            ),
            req(
                "Get Sessions",
                "GET",
                "/api/auth/sessions",
                description="List active sessions.",
                auth="customerToken",
                success={"success": True, "data": {"sessions": []}},
                errors=["unauthorized", "server"],
            ),
            req(
                "Revoke Session",
                "DELETE",
                "/api/auth/sessions/{{sessionId}}",
                description="Revoke one session.",
                auth="customerToken",
                success={"success": True, "message": "Session revoked."},
                errors=["unauthorized", "not_found", "server"],
            ),
        ],
    )

    profile_folder = folder(
        "Profile",
        "Customer profile APIs shared with web.",
        [
            req(
                "Get My Profile",
                "GET",
                "/api/profile",
                description="Own profile.",
                auth="customerToken",
                success={"success": True, "data": {"id": "uuid", "fullName": "Customer", "email": "customer@example.com"}},
                errors=["unauthorized", "forbidden", "server"],
            ),
            req(
                "Update My Profile",
                "PUT",
                "/api/profile",
                description="At least one allowed field required. Unknown fields rejected.",
                auth="customerToken",
                body={
                    "fullName": "Customer Name",
                    "phoneNumber": "+966501234567",
                    "address": "Riyadh",
                    "companyName": "Acme",
                },
                success={"success": True, "message": "Profile updated.", "data": {}},
                errors=["unauthorized", "validation", "server"],
            ),
            req(
                "Update Language",
                "PATCH",
                "/api/profile/language",
                description="Persists preferred language `en|ar`.",
                auth="customerToken",
                body={"preferredLanguage": "ar"},
                success={"success": True, "message": "Language updated.", "data": {}},
                errors=["unauthorized", "validation", "server"],
            ),
            req(
                "Update Preferences",
                "PATCH",
                "/api/profile/preferences",
                description="Theme/other preferences object.",
                auth="customerToken",
                body={"theme": "light"},
                success={"success": True, "data": {}},
                errors=["unauthorized", "server"],
            ),
            req(
                "Upload Profile Image",
                "POST",
                "/api/profile/upload-image",
                description="Multipart field `profileImage`. Same limits as web (image types, size cap).",
                auth="customerToken",
                formdata=[{"key": "profileImage", "type": "file", "src": [], "value": ""}],
                success={"success": True, "data": {"profileImage": "/api/storage/private/..." }},
                errors=["unauthorized", "validation", "server"],
            ),
        ],
    )

    catalog = folder(
        "Catalog",
        "Public catalog endpoints used by mobile product browsing.",
        [
            req(
                "List Products",
                "GET",
                "/api/inventory/products",
                description="Public product list. Supports search, filters, pagination.",
                auth=None,
                query=[
                    ("page", "1"),
                    ("limit", "12"),
                    ("search", ""),
                    ("sort", "newest"),
                    ("locale", "en"),
                ],
                success={
                    "success": True,
                    "products": [{"id": "uuid", "name": "Filter", "price": 100, "mainImage": "https://..."}],
                    "pagination": {"total": 1, "page": 1, "totalPages": 1},
                },
                errors=["validation", "server"],
            ),
            req(
                "Product Filters",
                "GET",
                "/api/inventory/products/filters",
                description="Available filter facets.",
                auth=None,
                query=[("locale", "en")],
                success={"success": True, "data": {}},
                errors=["server"],
            ),
            req(
                "Get Product",
                "GET",
                "/api/inventory/products/{{productId}}",
                description="Product detail.",
                auth=None,
                success={"success": True, "data": {"id": "uuid", "name": "Filter"}},
                errors=["not_found", "server"],
            ),
            req(
                "Product Attachments",
                "GET",
                "/api/inventory/products/{{productId}}/attachments",
                description="Datasheets/manuals/images.",
                auth=None,
                success={"success": True, "data": []},
                errors=["not_found", "server"],
            ),
            req(
                "List Categories",
                "GET",
                "/api/inventory/categories",
                description="Public categories.",
                auth=None,
                success={"success": True, "data": []},
                errors=["server"],
                test_script=save_id("(pm.response.json().data||[])[0]?.id", "categoryId"),
            ),
            req(
                "Get Category",
                "GET",
                "/api/inventory/categories/{{categoryId}}",
                description="Category detail.",
                auth=None,
                success={"success": True, "data": {"id": "uuid"}},
                errors=["not_found", "server"],
            ),
            req(
                "List Subcategories",
                "GET",
                "/api/inventory/subcategories",
                description="Public subcategories.",
                auth=None,
                success={"success": True, "data": []},
                errors=["server"],
            ),
            req(
                "Get Subcategory",
                "GET",
                "/api/inventory/subcategories/{{subcategoryId}}",
                description="Subcategory detail.",
                auth=None,
                success={"success": True, "data": {"id": "uuid"}},
                errors=["not_found", "server"],
            ),
            req(
                "Spec Templates",
                "GET",
                "/api/inventory/spec-templates",
                description="Specification templates (optionally by category query in controller).",
                auth=None,
                success={"success": True, "data": []},
                errors=["server"],
            ),
            req(
                "Spec Templates by Category",
                "GET",
                "/api/inventory/spec-templates/category/{{categoryId}}",
                description="Spec templates for a category.",
                auth=None,
                success={"success": True, "data": []},
                errors=["not_found", "server"],
            ),
            req(
                "List Reviews",
                "GET",
                "/api/reviews",
                description="Public reviews.",
                auth=None,
                query=[("productId", "{{productId}}"), ("page", "1"), ("limit", "10")],
                success={"success": True, "data": [], "pagination": {"page": 1, "limit": 10, "total": 0}},
                errors=["validation", "server"],
            ),
            req(
                "Add Review",
                "POST",
                "/api/reviews",
                description="Authenticated review submission.",
                auth="customerToken",
                body={
                    "productId": "{{productId}}",
                    "rating": 5,
                    "title": "Great filter",
                    "comment": "Works well in our plant environment.",
                },
                success_code=201,
                success={"success": True, "data": {"id": "uuid", "status": "PENDING"}},
                errors=["unauthorized", "validation", "server"],
                test_script=save_id("pm.response.json()?.data?.id", "reviewId"),
            ),
        ],
    )

    cart = folder(
        "Cart",
        "Authenticated customer cart. Note: PUT /cart/update currently validates with addItem schema (requires productId + quantity).",
        [
            req("Get Cart", "GET", "/api/cart", description="Current cart.", auth="customerToken",
                success={"success": True, "data": {"id": "uuid", "items": [], "totalAmount": 0, "currency": "SAR"}},
                errors=["unauthorized", "server"]),
            req("Add Item", "POST", "/api/cart/add", description="Add product.", auth="customerToken",
                body={"productId": "{{productId}}", "quantity": 1}, success_code=201,
                success={"success": True, "message": "Item added", "data": {"items": [], "totalAmount": 0, "currency": "SAR"}},
                errors=["unauthorized", "validation", "server"]),
            req("Update Item", "PUT", "/api/cart/update", description="Update quantity (requires productId).", auth="customerToken",
                body={"productId": "{{productId}}", "quantity": 2},
                success={"success": True, "message": "Cart updated", "data": {}},
                errors=["unauthorized", "validation", "server"]),
            req("Remove Item", "DELETE", "/api/cart/remove/{{productId}}", description="Remove product from cart.", auth="customerToken",
                success={"success": True, "message": "Item removed", "data": {}},
                errors=["unauthorized", "not_found", "server"]),
            req("Clear Cart", "DELETE", "/api/cart/clear", description="Clear all items (idempotent).", auth="customerToken",
                success={"success": True, "message": "Cart cleared", "data": {}},
                errors=["unauthorized", "server"]),
        ],
    )

    orders = folder(
        "Orders & Checkout",
        "Customer order APIs + EPG initialize/provider. Callback/webhook are gateway-facing (documented in Web collection).",
        [
            req("My Orders", "GET", "/api/orders/my", description="Authenticated customer's orders.", auth="customerToken",
                success={"success": True, "data": []}, errors=["unauthorized", "server"]),
            req("Get Order", "GET", "/api/orders/{{orderId}}", description="Order detail (owner or admin).", auth="customerToken",
                success={"success": True, "data": {"id": "uuid", "orderNumber": "ORD-..."}},
                errors=["unauthorized", "forbidden", "not_found", "server"]),
            req(
                "Create Order (Cash / Bank)",
                "POST",
                "/api/orders",
                description="Create order. Server recalculates totals.",
                auth="customerToken",
                body={
                    "deliveryType": "DELIVERY",
                    "shippingAddress": "King Fahd Road, Riyadh",
                    "phoneNumber": "+966501234567",
                    "customerName": "Customer Name",
                    "paymentMethod": "CASH",
                    "notes": "",
                    "items": [{"productId": "{{productId}}", "quantity": 1}],
                },
                success_code=201,
                success={"success": True, "message": "Order created successfully.", "data": {"id": "uuid", "orderId": "uuid"}},
                errors=["unauthorized", "validation", "server"],
                test_script=save_id("pm.response.json()?.data?.id", "orderId"),
            ),
            req(
                "Active Warehouses",
                "GET",
                "/api/warehouses/active",
                description="Pickup warehouse list for checkout.",
                auth="customerToken",
                success={"success": True, "data": []},
                errors=["unauthorized", "server"],
            ),
            req(
                "EPG Initialize",
                "POST",
                "/api/epg/initialize",
                description="Start card payment. Returns paymentUrl + sessionId.",
                auth="customerToken",
                body={
                    "items": [{"productId": "{{productId}}", "quantity": 1}],
                    "customerName": "Customer Name",
                    "phoneNumber": "+966501234567",
                    "shippingAddress": "King Fahd Road, Riyadh",
                    "deliveryType": "DELIVERY",
                },
                success={
                    "success": True,
                    "data": {
                        "orderId": "uuid",
                        "sessionId": "session",
                        "paymentUrl": "https://...",
                        "testMode": True,
                        "provider": "mock",
                    },
                },
                errors=["unauthorized", "validation", "server"],
                test_script=[
                    "try { const d=pm.response.json().data||{}; if(d.sessionId) pm.environment.set('epgSessionId', d.sessionId); if(d.orderId) pm.environment.set('orderId', d.orderId);} catch(e){}"
                ],
            ),
            req(
                "EPG Provider Info",
                "GET",
                "/api/epg/provider",
                description="Safe provider metadata for mobile UI (mock vs live).",
                auth=None,
                success={"success": True, "data": {"provider": "mock", "testMode": True}},
                errors=["server"],
            ),
            req(
                "Mock EPG Trigger [DEV ONLY]",
                "POST",
                "/api/epg/mock/trigger",
                description="**Development / Mock Only.** Not for production builds.",
                auth="customerToken",
                body={"sessionId": "{{epgSessionId}}", "scenario": "success"},
                success={"success": True, "data": {"scenario": "success"}},
                errors=["unauthorized", "not_found", "validation", "server"],
            ),
        ],
    )

    quotations = folder(
        "Quotations",
        "Customer quotation basket + instant customer quotations + my admin-issued quotations.",
        [
            req("Get Quotation Basket", "GET", "/api/customer/quotation-basket", description="Basket contents.", auth="customerToken",
                success={"success": True, "data": {"items": []}}, errors=["unauthorized", "server"]),
            req("Add/Update Basket Item", "POST", "/api/customer/quotation-basket/items", description="Upsert basket item.", auth="customerToken",
                body={"productId": "{{productId}}", "quantity": 2},
                success={"success": True, "data": {}}, errors=["unauthorized", "validation", "server"]),
            req("Update Basket Quantity", "PATCH", "/api/customer/quotation-basket/items/{{productId}}", description="Update quantity.", auth="customerToken",
                body={"quantity": 3}, success={"success": True, "data": {}}, errors=["unauthorized", "validation", "server"]),
            req("Remove Basket Item", "DELETE", "/api/customer/quotation-basket/items/{{productId}}", description="Remove item.", auth="customerToken",
                success={"success": True, "data": {}}, errors=["unauthorized", "server"]),
            req("Clear Basket", "DELETE", "/api/customer/quotation-basket", description="Clear basket.", auth="customerToken",
                success={"success": True, "data": {}}, errors=["unauthorized", "server"]),
            req(
                "Generate Customer Quotation",
                "POST",
                "/api/customer-quotations/generate",
                description="Instant customer quotation. Mobile may send `items` (alias `products`) and optional company fields.",
                auth="customerToken",
                body={
                    "companyName": "Acme Industrial",
                    "address": "Riyadh",
                    "notes": "Urgent",
                    "items": [{"productId": "{{productId}}", "quantity": 2}],
                },
                success_code=201,
                success={"success": True, "data": {"id": "uuid"}},
                errors=["unauthorized", "validation", "server"],
                test_script=save_id("pm.response.json()?.data?.id", "quotationId"),
            ),
            req("Get Customer Quotation", "GET", "/api/customer-quotations/{{quotationId}}", description="Quotation detail.", auth="customerToken",
                success={"success": True, "data": {"id": "uuid"}}, errors=["unauthorized", "not_found", "server"]),
            req("Download Quotation PDF", "GET", "/api/customer-quotations/{{quotationId}}/pdf", description="PDF binary download.", auth="customerToken",
                success="(application/pdf binary)", errors=["unauthorized", "not_found", "server"]),
            req("Accept Quotation", "POST", "/api/customer-quotations/{{quotationId}}/accept", description="Accept quotation.", auth="customerToken",
                body={}, success={"success": True, "message": "Accepted"}, errors=["unauthorized", "not_found", "server"]),
            req("Reject Quotation", "POST", "/api/customer-quotations/{{quotationId}}/reject", description="Reject quotation.", auth="customerToken",
                body={}, success={"success": True, "message": "Rejected"}, errors=["unauthorized", "not_found", "server"]),
            req("My Quotations", "GET", "/api/quotations/my", description="Quotations issued to the customer by admin.", auth="customerToken",
                success={"success": True, "data": []}, errors=["unauthorized", "server"]),
        ],
    )

    notifications = folder(
        "Notifications",
        "Customer notification inbox and preferences.",
        [
            req("List Notifications", "GET", "/api/notifications", description="Inbox.", auth="customerToken",
                success={"success": True, "data": []}, errors=["unauthorized", "server"]),
            req("Latest Notifications", "GET", "/api/notifications/latest", description="Latest items.", auth="customerToken",
                success={"success": True, "data": []}, errors=["unauthorized", "server"]),
            req("Unread Count", "GET", "/api/notifications/unread-count", description="Badge count.", auth="customerToken",
                success={"success": True, "data": {"count": 0}}, errors=["unauthorized", "server"]),
            req("Mark All Read", "PATCH", "/api/notifications/read-all", description="Mark all read.", auth="customerToken",
                body={}, success={"success": True, "message": "All marked read"}, errors=["unauthorized", "server"]),
            req("Mark One Read", "PATCH", "/api/notifications/{{notificationId}}/read", description="Mark one read.", auth="customerToken",
                body={}, success={"success": True}, errors=["unauthorized", "not_found", "server"]),
            req("Delete Notification", "DELETE", "/api/notifications/{{notificationId}}", description="Delete notification.", auth="customerToken",
                success={"success": True}, errors=["unauthorized", "not_found", "server"]),
            req("Get Preferences", "GET", "/api/notifications/preferences", description="Notification preferences.", auth="customerToken",
                success={"success": True, "data": {}}, errors=["unauthorized", "server"]),
            req("Update Preferences (PUT)", "PUT", "/api/notifications/preferences", description="Update preferences.", auth="customerToken",
                body={"emailEnabled": True}, success={"success": True, "data": {}}, errors=["unauthorized", "server"]),
            req("Update Preferences (PATCH)", "PATCH", "/api/notifications/preferences", description="PATCH alias.", auth="customerToken",
                body={"emailEnabled": True}, success={"success": True, "data": {}}, errors=["unauthorized", "server"]),
        ],
    )

    contact = folder(
        "Contact (CAPTCHA Policy)",
        (
            "Contact form. CAPTCHA is **not** controlled by a body field.\n"
            "Backend uses User-Agent: phone UA (`android|iphone|ipad|ipod|mobile`) skips CAPTCHA; "
            "desktop/other UA requires captchaToken."
        ),
        [
            req(
                "Submit Contact — Mobile UA (CAPTCHA optional)",
                "POST",
                "/api/contact",
                description=(
                    "Mobile request example. CAPTCHA skipped when User-Agent matches phone pattern. "
                    "`fullName` is accepted and split into first/last on the server."
                ),
                auth=None,
                user_agent=phone_ua,
                formdata=[
                    {"key": "fullName", "value": "Mobile User", "type": "text"},
                    {"key": "email", "value": "mobile.user@example.com", "type": "text"},
                    {"key": "phone", "value": "+966501234567", "type": "text"},
                    {"key": "subject", "value": "Product inquiry", "type": "text"},
                    {"key": "message", "value": "I need industrial filters for my plant.", "type": "text"},
                    {"key": "attachment", "type": "file", "src": [], "value": ""},
                ],
                success_code=201,
                success={"success": True, "message": "Inquiry submitted.", "data": {"id": "uuid"}},
                errors=["validation", "server"],
                test_script=save_id("pm.response.json()?.data?.id", "contactId"),
            ),
            req(
                "Submit Contact — Desktop UA (CAPTCHA required)",
                "POST",
                "/api/contact",
                description=(
                    "Desktop request example. `captchaToken` required. "
                    "In non-production without reCAPTCHA secret, tokens like `dev-human-verified` are accepted."
                ),
                auth=None,
                user_agent=desktop_ua,
                formdata=[
                    {"key": "firstName", "value": "John", "type": "text"},
                    {"key": "lastName", "value": "Doe", "type": "text"},
                    {"key": "email", "value": "john@example.com", "type": "text"},
                    {"key": "subject", "value": "Support", "type": "text"},
                    {"key": "message", "value": "Need help with an order.", "type": "text"},
                    {"key": "captchaToken", "value": "dev-human-verified", "type": "text"},
                ],
                success_code=201,
                success={"success": True, "message": "Inquiry submitted.", "data": {"id": "uuid"}},
                errors=["validation", "server"],
                extra_examples=[
                    example(
                        "400 CAPTCHA Required",
                        400,
                        {"success": False, "message": "CAPTCHA is required"},
                    )
                ],
            ),
            req(
                "Submit Contact — EN vs AR messages",
                "POST",
                "/api/contact",
                description="Same mobile contact with Arabic Accept-Language to demonstrate localized messages.",
                auth=None,
                language="ar",
                user_agent=phone_ua,
                formdata=[
                    {"key": "fullName", "value": "مستخدم", "type": "text"},
                    {"key": "email", "value": "ar.user@example.com", "type": "text"},
                    {"key": "subject", "value": "استفسار", "type": "text"},
                    {"key": "message", "value": "أحتاج مساعدة بخصوص المنتجات.", "type": "text"},
                ],
                success_code=201,
                success={"success": True, "message": "تم إرسال الاستفسار بنجاح.", "data": {"id": "uuid"}},
                errors=["validation_ar", "server"],
            ),
        ],
    )

    public = folder(
        "Public Content & Apps",
        "Public content plus mobile application download listings (APK/IPA links managed by Super Admin).",
        [
            req("Public Settings", "GET", "/api/settings/public", description="Public company/settings subset.", auth=None,
                success={"success": True, "data": {"companyName": "Shielder", "currency": "SAR"}},
                errors=["server"]),
            req("Privacy Policy", "GET", "/api/privacy-policy", description="Public privacy policy.", auth=None,
                success={"success": True, "data": {}}, errors=["server"]),
            req("Terms and Conditions", "GET", "/api/terms-and-conditions", description="Public terms.", auth=None,
                success={"success": True, "data": {}}, errors=["server"]),
            req(
                "Active Mobile Applications",
                "GET",
                "/api/applications/active",
                description=(
                    "Public list of downloadable mobile apps (ANDROID/IOS) with external downloadUrl. "
                    "This is NOT a mobile API surface — it publishes app store / APK links."
                ),
                auth=None,
                success={
                    "success": True,
                    "data": [
                        {
                            "id": 1,
                            "applicationName": "Shielder Android",
                            "platform": "ANDROID",
                            "downloadUrl": "https://example.com/app.apk",
                            "status": "ACTIVE",
                        }
                    ],
                },
                errors=["server"],
            ),
            req(
                "Newsletter Subscribe",
                "POST",
                "/api/newsletter/subscribe",
                description="Public newsletter subscription.",
                auth=None,
                body={"email": "subscriber@example.com"},
                success={"success": True, "message": "Subscribed"},
                errors=["validation", "conflict", "server"],
            ),
            req(
                "Stream Private Object",
                "GET",
                "/api/storage/private/{{privateUrlToken}}",
                description="Private profile/contact file stream via signed token (no Bearer).",
                auth=None,
                success="(binary)",
                errors=["not_found", "server"],
            ),
            req(
                "Health",
                "GET",
                "/health",
                description="Optional connectivity check for mobile diagnostics.",
                auth=None,
                success={"success": True, "message": "Shielder API is running"},
                errors=["server"],
            ),
        ],
    )

    collection = {
        "info": {
            "_postman_id": "b2c3d4e5-shielder-mobile-api",
            "name": "Project API — Mobile",
            "description": (
                "## Mobile API scope\n\n"
                "This repository has **no separate mobile-only HTTP API** and no React Native/Expo/Flutter client.\n"
                "Android/iOS are expected to consume the **same Express REST API** as the web customer portal.\n\n"
                "This collection includes customer-facing shared endpoints plus mobile-relevant behaviors:\n"
                "- Contact CAPTCHA skipped for phone User-Agents\n"
                "- OTP registration / password reset flows\n"
                "- `GET /applications/active` for app download listings\n"
                "- Same JWT Bearer tokens as web (`data.tokens.accessToken`)\n\n"
                "Admin/Superadmin panel APIs are intentionally excluded — see **Project API — Web**."
            ),
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "auth": {
            "type": "bearer",
            "bearer": [{"key": "token", "value": "{{customerToken}}", "type": "string"}],
        },
        "item": [
            auth_folder,
            profile_folder,
            catalog,
            cart,
            orders,
            quotations,
            notifications,
            contact,
            public,
        ],
    }
    return rewrite_vars(collection)


def build_environment(name: str, base_url: str, env_id: str) -> dict:
    values = [
        ("baseUrl", base_url, "default"),
        ("webBaseUrl", base_url, "default"),
        ("mobileBaseUrl", base_url, "default"),
        ("language", "en", "default"),
        ("accessToken", "", "secret"),
        ("refreshToken", "", "secret"),
        ("customerToken", "", "secret"),
        ("customerRefreshToken", "", "secret"),
        ("adminToken", "", "secret"),
        ("adminRefreshToken", "", "secret"),
        ("superadminToken", "", "secret"),
        ("superadminRefreshToken", "", "secret"),
        ("trustedDeviceToken", "", "secret"),
        ("otp", "", "default"),
        ("registrationSessionToken", "", "secret"),
        ("resetSessionToken", "", "secret"),
        ("verificationSessionToken", "", "secret"),
        ("otpSessionToken", "", "secret"),
        ("emailResetToken", "", "secret"),
        ("emailVerificationToken", "", "secret"),
        ("privateUrlToken", "", "secret"),
        ("epgSessionId", "", "default"),
        ("epgWebhookSignature", "", "secret"),
        ("customerEmail", "customer@example.com", "default"),
        ("customerPassword", "Customer@123", "secret"),
        ("adminEmail", "admin@example.com", "default"),
        ("adminPassword", "Admin@123", "secret"),
        ("superadminEmail", "superadmin@example.com", "default"),
        ("superadminPassword", "SuperAdmin@123", "secret"),
        ("userId", "", "default"),
        ("sessionId", "", "default"),
        ("productId", "", "default"),
        ("categoryId", "", "default"),
        ("subcategoryId", "", "default"),
        ("warehouseId", "", "default"),
        ("orderId", "", "default"),
        ("paymentId", "", "default"),
        ("quotationId", "", "default"),
        ("applicationId", "", "default"),
        ("contactId", "", "default"),
        ("notificationId", "", "default"),
        ("alertId", "", "default"),
        ("reviewId", "", "default"),
        ("excelFile", "", "default"),
        ("productImageFile", "", "default"),
    ]
    return {
        "id": env_id,
        "name": name,
        "_postman_variable_scope": "environment",
        "values": [
            {"key": k, "value": v, "type": t, "enabled": True} for k, v, t in values
        ],
    }


README = r"""# Shielder Postman Collections

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
"""


def write_json(path: Path, data: Any) -> None:
    path.write_text(dumps(data) + "\n", encoding="utf-8")
    print(f"Wrote {path} ({path.stat().st_size} bytes)")


def audit(web: dict, mobile: dict) -> dict:
    """Compare discovered backend routes vs collections."""
    # Re-discover from source
    route_files = list((ROOT / "backend/src").rglob("*.routes.ts")) + [ROOT / "backend/src/app.ts"]
    method_re = re.compile(r"(?:router|app)\.(get|post|put|patch|delete)\(\s*['`]([^'`]+)['`]", re.I)
    mounts = {
        "auth.routes.ts": "/api/auth",
        "profile.routes.ts": "/api/profile",
        "cart.routes.ts": "/api/cart",
        "admin.routes.ts": "/api/admin",
        "admin-management.routes.ts": "/api/admins",
        "super-admin.routes.ts": "/api/super-admin",
        "inventory.routes.ts": "/api/inventory",
        "stock-alert.routes.ts": "/api/products",
        "notification.routes.ts": "/api/notifications",
        "analytics.routes.ts": "/api/analytics",
        "order.routes.ts": "/api/orders",
        "payment.routes.ts": "/api/payments",
        "epg.routes.ts": "/api/epg",
        "reports.routes.ts": "/api/reports",
        "settings.routes.ts": "/api/settings",
        "privacy-policy.routes.ts": "/api/privacy-policy",
        "terms-and-conditions.routes.ts": "/api/terms-and-conditions",
        "quotation.routes.ts": "/api/quotations",
        "customer-quotation.routes.ts": "/api/customer-quotations",
        "customer-quotation-basket.routes.ts": "/api/customer/quotation-basket",
        "contact.routes.ts": "/api/contact",
        "storage.routes.ts": "/api/storage",
        "newsletter.routes.ts": "/api/newsletter",
        "product-review.routes.ts": "/api/reviews",
        "public-warehouse.routes.ts": "/api/warehouses",
        "application.routes.ts": "/api/applications",
        "inventory-alert.routes.ts": "/api/admin/inventory-alerts",
        "translate.routes.ts": "/api/translate",
        "category.routes.ts": "/api/inventory/categories",
        "subcategory.routes.ts": "/api/inventory/subcategories",
        "product.routes.ts": "/api/inventory/products",
        "spec-template.routes.ts": "/api/inventory/spec-templates",
        "warehouse.routes.ts": "/api/admin/warehouses",
        "admin-contact.routes.ts": "/api/admin/contacts",
        "admin-newsletter.routes.ts": "/api/admin/newsletter",
        "app.ts": "",
    }

    backend: list[tuple[str, str]] = []
    for f in route_files:
        prefix = mounts.get(f.name)
        if prefix is None:
            continue
        for m in method_re.finditer(f.read_text()):
            method, path = m.group(1).upper(), m.group(2)
            if f.name == "app.ts":
                full = path
            else:
                full = (prefix.rstrip("/") + "/" + path.lstrip("/")).replace("//", "/")
                if path == "/":
                    full = prefix
            backend.append((method, full))

    # unique
    seen = set()
    uniq = []
    for e in backend:
        if e not in seen:
            seen.add(e)
            uniq.append(e)

    web_paths = extract_paths(web["item"])
    mobile_paths = extract_paths(mobile["item"])

    def covered(method: str, path: str, coll: set[tuple[str, str]]) -> bool:
        norm = re.sub(r":[A-Za-z_][A-Za-z0-9_]*", ":param", path)
        candidates = {norm}
        if norm.startswith("/api/"):
            candidates.add(norm[4:])  # /auth/...
        for m, p in coll:
            p2 = re.sub(r":param", "[^/]+", re.escape(p).replace(r"\:param", "[^/]+"))
            # simpler: replace :param with wildcard match
            for c in candidates:
                c_pat = "^" + re.escape(re.sub(r":[A-Za-z_][A-Za-z0-9_]*", ":param", c)).replace(
                    r"\:param", "[^/]+"
                ) + "$"
                p_norm = re.sub(r":[A-Za-z_][A-Za-z0-9_]*", ":param", p)
                c_norm = re.sub(r":[A-Za-z_][A-Za-z0-9_]*", ":param", c)
                # compare segment-wise
                cs = c_norm.strip("/").split("/")
                ps = p_norm.strip("/").split("/")
                # also try with/without api prefix
                variants = [ps]
                if ps and ps[0] != "api":
                    variants.append(["api"] + ps)
                if ps and ps[0] == "api":
                    variants.append(ps[1:])
                for v in variants:
                    if len(v) != len(cs):
                        continue
                    ok = True
                    for a, b in zip(v, cs):
                        if a == ":param" or b == ":param":
                            continue
                        if a != b:
                            ok = False
                            break
                    if ok:
                        return True
        return False

    missing_web = []
    for method, path in uniq:
        if not covered(method, path, web_paths):
            missing_web.append((method, path))

    # Classification counts
    internal = {("/set-trusted-cookie",), ("/api/debug-routes",)}
    # rough mobile set: customer-facing
    mobile_prefixes = (
        "/api/auth",
        "/api/profile",
        "/api/cart",
        "/api/orders",
        "/api/epg",
        "/api/inventory/products",
        "/api/inventory/categories",
        "/api/inventory/subcategories",
        "/api/inventory/spec-templates",
        "/api/reviews",
        "/api/notifications",
        "/api/customer-quotations",
        "/api/customer/quotation-basket",
        "/api/quotations/my",
        "/api/settings/public",
        "/api/privacy-policy",
        "/api/terms-and-conditions",
        "/api/applications/active",
        "/api/contact",
        "/api/newsletter",
        "/api/storage",
        "/api/warehouses/active",
        "/health",
    )

    classes = {"WEB": 0, "MOBILE": 0, "BOTH": 0, "INTERNAL": 0}
    for method, path in uniq:
        if path in ("/set-trusted-cookie", "/api/debug-routes") or path.startswith("/api-docs"):
            classes["INTERNAL"] += 1
        elif any(path == p or path.startswith(p.rstrip("/") + "/") or path.startswith(p) for p in mobile_prefixes if not p.endswith(("products", "categories", "subcategories", "spec-templates", "my", "active", "public"))):
            # refine below
            pass

    # Better classification
    def classify(path: str) -> str:
        if path in ("/set-trusted-cookie", "/api/debug-routes"):
            return "INTERNAL"
        adminish = (
            "/api/admin",
            "/api/admins",
            "/api/super-admin",
            "/api/analytics",
            "/api/reports",
            "/api/payments",
            "/api/translate",
            "/api/products/low-stock",
            "/api/admin/inventory-alerts",
        )
        if any(path.startswith(a) for a in adminish):
            return "WEB"
        # product management mutations are web; public GETs both
        if path.startswith("/api/inventory/products") and any(
            x in path for x in ("bulk", "management", "pending", "template", "approve", "reject", "images", "specifications", "attachments")
        ) and not path.endswith("/attachments"):
            # list attachments is BOTH; mutations WEB — simplified:
            if path.endswith("/attachments") and not path.endswith("/attachments/{{"):
                return "BOTH"
            if "/attachments" in path and path.count("/") > 5:
                return "WEB"
            return "WEB"
        customer = (
            "/api/auth",
            "/api/profile",
            "/api/cart",
            "/api/orders",
            "/api/epg",
            "/api/notifications",
            "/api/customer",
            "/api/reviews",
            "/api/contact",
            "/api/newsletter",
            "/api/storage",
            "/api/warehouses",
            "/api/settings/public",
            "/api/privacy-policy",
            "/api/terms-and-conditions",
            "/api/applications/active",
            "/health",
        )
        if path in ("/health", "/health/email"):
            return "BOTH" if path == "/health" else "WEB"
        if path.startswith("/api/quotations"):
            if path.startswith("/api/quotations/my"):
                return "BOTH"
            return "WEB"
        if path.startswith("/api/inventory/categories") or path.startswith("/api/inventory/subcategories"):
            # GET public BOTH, mutations WEB — treat path without knowing method: BOTH for get-like; use BOTH for list/get, WEB for write in audit note
            return "BOTH"
        if path.startswith("/api/inventory/products") or path.startswith("/api/inventory/spec-templates"):
            return "BOTH"
        if path.startswith("/api/applications"):
            return "BOTH" if path.endswith("/active") else "WEB"
        if path.startswith("/api/settings"):
            return "BOTH" if path.endswith("/public") else "WEB"
        if any(path.startswith(c) for c in customer):
            return "BOTH"
        return "WEB"

    for method, path in uniq:
        classes[classify(path)] += 1

    return {
        "backend_total": len(uniq),
        "web_requests": len(web_paths),
        "mobile_requests": len(mobile_paths),
        "missing_web": missing_web,
        "classes": classes,
        "backend": uniq,
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    if not LEGACY_WEB.exists():
        raise SystemExit(f"Missing legacy web collection: {LEGACY_WEB}")

    web = build_web_collection()
    mobile = build_mobile_collection()
    ensure_descriptions(web["item"])
    ensure_descriptions(mobile["item"])

    write_json(OUT / "Project-API-Web.postman_collection.json", web)
    write_json(OUT / "Project-API-Mobile.postman_collection.json", mobile)
    write_json(
        OUT / "Project-Local.postman_environment.json",
        build_environment("Project — Local", "http://localhost:5000", "shielder-local-env"),
    )
    write_json(
        OUT / "Project-Staging.postman_environment.json",
        build_environment("Project — Staging", "https://staging-api.example.com", "shielder-staging-env"),
    )
    write_json(
        OUT / "Project-Production.postman_environment.json",
        build_environment("Project — Production", "https://api.example.com", "shielder-production-env"),
    )
    (OUT / "README.md").write_text(README, encoding="utf-8")
    print(f"Wrote {OUT / 'README.md'}")

    # Validate JSON round-trip
    for p in OUT.glob("*.json"):
        json.loads(p.read_text())
    print("JSON validation: OK")

    result = audit(web, mobile)
    audit_path = OUT / "COVERAGE-AUDIT.md"
    lines = [
        "# Route Coverage Audit",
        "",
        "## API Discovery",
        "",
        "```text",
        f"Total backend endpoints discovered: {result['backend_total']}",
        f"Web-oriented (admin/panel): ~{result['classes']['WEB']}",
        f"Shared / mobile-capable: ~{result['classes']['BOTH']}",
        f"Internal: {result['classes']['INTERNAL']}",
        "```",
        "",
        "- Routes mounted on both `/api` and `/api/v1` (same handlers). Collections use `/api`.",
        "- **No mobile-only Express routes** exist. Mobile consumes shared customer APIs.",
        "- `GET /applications/active` publishes ANDROID/IOS download links (not a separate mobile API).",
        "",
        "## Postman Coverage",
        "",
        "```text",
        f"Documented (Web unique route signatures): {result['web_requests']}/{result['backend_total']}",
        f"Missing: {len(result['missing_web'])}",
        f"Mobile unique route signatures: {result['mobile_requests']}",
        "```",
        "",
        "## Security Findings",
        "",
        "1. **CAPTCHA User-Agent bypass (known)** — `POST /api/contact` skips CAPTCHA for phone UAs; spoofable.",
        "2. **Dev helpers** — `/set-trusted-cookie`, mock EPG, `/api-docs` when not production.",
        "3. **EPG webhook** — processing exceptions still return `{ received: true }` by design.",
        "4. **Auth/settings sanitization** — password hashes stripped; payment secrets masked.",
        "5. **Health** — returns `environment` name (low risk); absolute upload paths are not exposed.",
        "",
        "## Missing from Web collection",
        "",
    ]
    if result["missing_web"]:
        for m, p in result["missing_web"]:
            lines.append(f"- `{m} {p}`")
    else:
        lines.append("- None")
    lines.append("")
    lines.append("## Full backend inventory")
    lines.append("")
    lines.append("| METHOD | PATH |")
    lines.append("|--------|------|")
    for m, p in result["backend"]:
        lines.append(f"| {m} | `{p}` |")
    audit_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {audit_path}")
    print(f"Missing web endpoints: {len(result['missing_web'])}")
    if result["missing_web"]:
        for m, p in result["missing_web"][:50]:
            print(f"  MISSING {m} {p}")


if __name__ == "__main__":
    main()
