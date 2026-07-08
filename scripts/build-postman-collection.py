import json
import os

collection = {
    "info": {
        "_postman_id": "f8d8f9a4-7fd7-4e44-93fa-8d49f328b5a4",
        "name": "Shidler_APP_ API_Collecion",
        "description": "Production-ready Postman API Collection specifically for the SHIELDER Mobile Application. Built from the latest backend API implementation.",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "variable": [
        {"key": "base_url", "value": "http://localhost:5000/api", "type": "string"},
        {"key": "token", "value": "", "type": "string"},
        {"key": "refresh_token", "value": "", "type": "string"},
        {"key": "user_id", "value": "", "type": "string"},
        {"key": "product_id", "value": "", "type": "string"},
        {"key": "category_id", "value": "", "type": "string"},
        {"key": "quotation_id", "value": "", "type": "string"},
        {"key": "order_id", "value": "", "type": "string"},
        {"key": "cart_item_id", "value": "", "type": "string"},
        {"key": "notification_id", "value": "", "type": "string"}
    ],
    "item": []
}

# Define auth headers helper
def auth_headers(need_auth=True, content_json=True):
    headers = []
    if need_auth:
        headers.append({"key": "Authorization", "value": "Bearer {{token}}", "type": "text"})
    if content_json:
        headers.append({"key": "Content-Type", "value": "application/json", "type": "text"})
    headers.append({"key": "Accept", "value": "application/json", "type": "text"})
    headers.append({"key": "Accept-Language", "value": "en", "type": "text"})
    return headers

def make_url(path_str):
    # Splits path e.g. "/auth/login" -> ["auth", "login"]
    path_parts = [p for p in path_str.split('/') if p]
    return {
        "raw": "{{base_url}}" + path_str,
        "host": ["{{base_url}}"],
        "path": path_parts
    }

def make_request(method, path, headers, body_raw=None, body_mode="raw", formdata_list=None):
    req = {
        "method": method,
        "header": headers,
        "url": make_url(path)
    }
    if body_raw is not None:
        req["body"] = {
            "mode": body_mode,
            "raw": body_raw
        }
    elif formdata_list is not None:
        req["body"] = {
            "mode": "formdata",
            "formdata": formdata_list
        }
    return req

# Let's define the folders
folders = {}

# Helper to add item to folder
def add_to_folder(folder_name, folder_desc, item):
    if folder_name not in folders:
        folders[folder_name] = {
            "name": folder_name,
            "description": folder_desc,
            "item": []
        }
    folders[folder_name]["item"].append(item)

# 1. Authentication
auth_desc = "Authentication flow endpoints for registration, login, verification, and session management."
# Register
add_to_folder("1. Authentication", auth_desc, {
    "name": "Register",
    "event": [{
        "listen": "test",
        "script": {
            "exec": [
                "pm.test('Status code is 201', function () { pm.response.to.have.status(201); });",
                "var json = pm.response.json();",
                "if (json.success && json.data) {",
                "    if (json.data.accessToken) pm.environment.set('token', json.data.accessToken);",
                "    if (json.data.refreshToken) pm.environment.set('refresh_token', json.data.refreshToken);",
                "    if (json.data.user && json.data.user.id) pm.environment.set('user_id', json.data.user.id);",
                "}"
            ],
            "type": "text/javascript"
        }
    }],
    "request": make_request("POST", "/auth/signup", auth_headers(False), 
        json.dumps({
            "email": "user@example.com",
            "password": "Password@123",
            "fullName": "Jane Doe",
            "phoneNumber": "0512345678",
            "address": "123 Main Street, Riyadh",
            "companyName": "User Corp",
            "preferredLanguage": "en"
        }, indent=2)),
    "response": [{
        "name": "201 Created",
        "status": "Created",
        "code": 201,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Account created successfully. Please verify your email.",
            "data": {
                "user": {"id": "uuid-1234", "email": "user@example.com", "fullName": "Jane Doe", "role": "USER"},
                "accessToken": "eyJ...",
                "refreshToken": "eyJ..."
            }
        }, indent=2)
    }]
})

# Login
add_to_folder("1. Authentication", auth_desc, {
    "name": "Login",
    "event": [{
        "listen": "test",
        "script": {
            "exec": [
                "pm.test('Status code is 200', function () { pm.response.to.have.status(200); });",
                "var json = pm.response.json();",
                "if (json.success && json.data) {",
                "    if (json.data.tokens && json.data.tokens.accessToken) {",
                "        pm.environment.set('token', json.data.tokens.accessToken);",
                "        pm.environment.set('refresh_token', json.data.tokens.refreshToken);",
                "    } else if (json.data.accessToken) {",
                "        pm.environment.set('token', json.data.accessToken);",
                "        pm.environment.set('refresh_token', json.data.refreshToken);",
                "    }",
                "    if (json.data.user && json.data.user.id) pm.environment.set('user_id', json.data.user.id);",
                "}"
            ],
            "type": "text/javascript"
        }
    }],
    "request": make_request("POST", "/auth/login", auth_headers(False),
        json.dumps({
            "email": "user@example.com",
            "password": "Password@123"
        }, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Login successful.",
            "data": {
                "user": {"id": "uuid-1234", "email": "user@example.com", "fullName": "Jane Doe", "role": "USER"},
                "tokens": {
                    "accessToken": "eyJ...",
                    "refreshToken": "eyJ..."
                }
            }
        }, indent=2)
    }]
})

# Verify Email
add_to_folder("1. Authentication", auth_desc, {
    "name": "Verify Email",
    "request": make_request("GET", "/auth/verify-email/some-verification-token", auth_headers(False, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Email verified successfully."
        }, indent=2)
    }]
})

# Resend Verification Email
add_to_folder("1. Authentication", auth_desc, {
    "name": "Resend Verification Email",
    "request": make_request("POST", "/auth/resend-verification", auth_headers(False),
        json.dumps({"email": "user@example.com"}, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Verification link has been sent to your email."
        }, indent=2)
    }]
})

# Forgot Password
add_to_folder("1. Authentication", auth_desc, {
    "name": "Forgot Password (Send Reset Link)",
    "request": make_request("POST", "/auth/forgot-password", auth_headers(False),
        json.dumps({"email": "user@example.com"}, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Password reset link has been sent to your email."
        }, indent=2)
    }]
})

# Forgot Password - Send OTP
add_to_folder("1. Authentication", auth_desc, {
    "name": "Forgot Password - Send OTP",
    "request": make_request("POST", "/auth/forgot-password/send-otp", auth_headers(False),
        json.dumps({"email": "user@example.com"}, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "If the email exists, an OTP has been sent"
        }, indent=2)
    }]
})

# Forgot Password - Resend OTP
add_to_folder("1. Authentication", auth_desc, {
    "name": "Forgot Password - Resend OTP",
    "request": make_request("POST", "/auth/forgot-password/resend-otp", auth_headers(False),
        json.dumps({"email": "user@example.com"}, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "If the email exists, a new OTP has been sent"
        }, indent=2)
    }]
})

# Forgot Password - Verify OTP
add_to_folder("1. Authentication", auth_desc, {
    "name": "Forgot Password - Verify OTP",
    "request": make_request("POST", "/auth/forgot-password/verify-otp", auth_headers(False),
        json.dumps({"email": "user@example.com", "code": "248596"}, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "OTP verified successfully",
            "data": {
                "resetSessionToken": "some-reset-session-token",
                "expiresInMinutes": 10
            }
        }, indent=2)
    }]
})

# Forgot Password - Reset With OTP
add_to_folder("1. Authentication", auth_desc, {
    "name": "Forgot Password - Reset With OTP",
    "request": make_request("POST", "/auth/forgot-password/reset", auth_headers(False),
        json.dumps({"resetSessionToken": "some-reset-session-token", "newPassword": "NewPassword@123"}, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Password reset successful. Please login with your new password."
        }, indent=2)
    }]
})

# Reset Password
add_to_folder("1. Authentication", auth_desc, {
    "name": "Reset Password (With Link Token)",
    "request": make_request("POST", "/auth/reset-password", auth_headers(False),
        json.dumps({"token": "some-reset-token-from-email", "newPassword": "NewPassword@123"}, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Password has been reset successfully."
        }, indent=2)
    }]
})

# Logout
add_to_folder("1. Authentication", auth_desc, {
    "name": "Logout",
    "request": make_request("POST", "/auth/logout", auth_headers(True),
        json.dumps({"refreshToken": "{{refresh_token}}"}, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Logged out successfully."
        }, indent=2)
    }]
})

# Refresh Token
add_to_folder("1. Authentication", auth_desc, {
    "name": "Refresh Token",
    "event": [{
        "listen": "test",
        "script": {
            "exec": [
                "pm.test('Status code is 200', function () { pm.response.to.have.status(200); });",
                "var json = pm.response.json();",
                "if (json.success && json.data && json.data.accessToken) {",
                "    pm.environment.set('token', json.data.accessToken);",
                "}"
            ],
            "type": "text/javascript"
        }
    }],
    "request": make_request("POST", "/auth/refresh", auth_headers(False),
        json.dumps({"refreshToken": "{{refresh_token}}"}, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": {
                "accessToken": "eyJ...",
                "refreshToken": "eyJ..."
            }
        }, indent=2)
    }]
})

# Get Current User (/auth/me)
add_to_folder("1. Authentication", auth_desc, {
    "name": "Get Current User (Me)",
    "request": make_request("GET", "/auth/me", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Current user retrieved successfully.",
            "data": {
                "id": "{{user_id}}",
                "email": "user@example.com",
                "fullName": "Jane Doe",
                "phoneNumber": "0512345678",
                "role": "USER",
                "status": "ACTIVE"
            }
        }, indent=2)
    }]
})


# 2. User Profile
profile_desc = "User profile retrieval and updates, preferences, language settings, avatar upload."
# Get Profile
add_to_folder("2. User Profile", profile_desc, {
    "name": "Get Profile",
    "request": make_request("GET", "/profile", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": {
                "id": "uuid-1234",
                "userId": "{{user_id}}",
                "fullName": "Jane Doe",
                "phoneNumber": "0512345678",
                "address": "123 Main Street, Riyadh",
                "companyName": "User Corp",
                "preferredLanguage": "en",
                "profileImage": "http://localhost:5000/uploads/profile-1234.jpg",
                "preferences": {"theme": "light"}
            }
        }, indent=2)
    }]
})

# Update Profile
add_to_folder("2. User Profile", profile_desc, {
    "name": "Update Profile",
    "request": make_request("PUT", "/profile", auth_headers(True),
        json.dumps({
            "fullName": "Jane Doe Updated",
            "phoneNumber": "0598765432",
            "address": "456 New Street, Jeddah",
            "companyName": "User Corp Expanded"
        }, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Profile updated successfully.",
            "data": {
                "fullName": "Jane Doe Updated",
                "phoneNumber": "0598765432",
                "address": "456 New Street, Jeddah",
                "companyName": "User Corp Expanded"
            }
        }, indent=2)
    }]
})

# Upload Profile Image
add_to_folder("2. User Profile", profile_desc, {
    "name": "Upload Profile Image",
    "request": make_request("POST", "/profile/upload-image", auth_headers(True, False),
        formdata_list=[
            {"key": "profileImage", "type": "file", "src": ""}
        ]),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Profile image uploaded successfully",
            "data": {
                "profileImage": "http://localhost:5000/uploads/profile/profileImage-123.png"
            }
        }, indent=2)
    }]
})

# Change Password
add_to_folder("2. User Profile", profile_desc, {
    "name": "Change Password",
    "request": make_request("PATCH", "/auth/change-password", auth_headers(True),
        json.dumps({
            "currentPassword": "Password@123",
            "newPassword": "NewPassword@123"
        }, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Password changed successfully"
        }, indent=2)
    }]
})


# 3. Home
home_desc = "Dashboard/Home screen queries, banner/public configs, and basic listings."
add_to_folder("3. Home", home_desc, {
    "name": "Home Banner & Public Configs",
    "request": make_request("GET", "/settings/public", auth_headers(False, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": {
                "company_name_en": "SHIELDER Filtration",
                "company_name_ar": "شيلدر للمرشحات",
                "company_email": "info@shielder.com",
                "company_phone": "9665000000",
                "company_location_en": "Industrial Area, Riyadh",
                "company_location_ar": "المنطقة الصناعية، الرياض",
                "mapEmbedUrl": "https://maps.google.com/...",
                "whatsAppHref": "https://wa.me/..."
            }
        }, indent=2)
    }]
})


# 4. Categories
cat_desc = "Category and subcategory lists and details."
add_to_folder("4. Categories", cat_desc, {
    "name": "Get Categories",
    "event": [{
        "listen": "test",
        "script": {
            "exec": [
                "var json = pm.response.json();",
                "if (json.success && Array.isArray(json.data) && json.data.length > 0) {",
                "    pm.environment.set('category_id', json.data[0].id);",
                "}"
            ],
            "type": "text/javascript"
        }
    }],
    "request": make_request("GET", "/inventory/categories", auth_headers(False, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": [
                {
                    "id": "uuid-cat-1",
                    "image": "http://localhost:5000/images/cat1.jpg",
                    "isActive": True,
                    "translations": [{"locale": "en", "name": "Air Filters"}]
                }
            ]
        }, indent=2)
    }]
})

add_to_folder("4. Categories", cat_desc, {
    "name": "Get Category Details",
    "request": make_request("GET", "/inventory/categories/{{category_id}}", auth_headers(False, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": {
                "id": "{{category_id}}",
                "image": "http://localhost:5000/images/cat1.jpg",
                "isActive": True,
                "translations": [{"locale": "en", "name": "Air Filters"}]
            }
        }, indent=2)
    }]
})

add_to_folder("4. Categories", cat_desc, {
    "name": "Get Subcategories",
    "request": make_request("GET", "/inventory/subcategories", auth_headers(False, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": [
                {
                    "id": "uuid-subcat-1",
                    "categoryId": "{{category_id}}",
                    "isActive": True,
                    "translations": [{"locale": "en", "name": "Industrial Air Filters"}]
                }
            ]
        }, indent=2)
    }]
})


# 5. Products
prod_desc = "Browse and search filters and products."
add_to_folder("5. Products", prod_desc, {
    "name": "Product List",
    "event": [{
        "listen": "test",
        "script": {
            "exec": [
                "var json = pm.response.json();",
                "if (json.success && json.products && json.products.length > 0) {",
                "    pm.environment.set('product_id', json.products[0].id);",
                "}"
            ],
            "type": "text/javascript"
        }
    }],
    "request": make_request("GET", "/inventory/products?page=1&limit=12&sort=newest", auth_headers(False, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "products": [
                {
                    "id": "uuid-prod-1",
                    "price": "150.00",
                    "stock": 45,
                    "sku": "FLTR-AIR-01",
                    "mainImage": "http://localhost:5000/images/prod1.jpg",
                    "translations": [{"locale": "en", "name": "High Flow Air Filter"}]
                }
            ],
            "total": 1,
            "page": 1,
            "limit": 12
        }, indent=2)
    }]
})

add_to_folder("5. Products", prod_desc, {
    "name": "Product Details",
    "request": make_request("GET", "/inventory/products/{{product_id}}", auth_headers(False, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": {
                "id": "{{product_id}}",
                "price": "150.00",
                "stock": 45,
                "sku": "FLTR-AIR-01",
                "mainImage": "http://localhost:5000/images/prod1.jpg",
                "translations": [{"locale": "en", "name": "High Flow Air Filter", "description": "High flow replacement filter."}],
                "specifications": [{"specKey": "Diameter", "specValue": "200mm"}]
            }
        }, indent=2)
    }]
})

add_to_folder("5. Products", prod_desc, {
    "name": "Search Products",
    "request": make_request("GET", "/inventory/products?search=Filter", auth_headers(False, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "products": [
                {
                    "id": "uuid-prod-1",
                    "price": "150.00",
                    "sku": "FLTR-AIR-01",
                    "translations": [{"locale": "en", "name": "High Flow Air Filter"}]
                }
            ]
        }, indent=2)
    }]
})

add_to_folder("5. Products", prod_desc, {
    "name": "Product Filters",
    "request": make_request("GET", "/inventory/products/filters", auth_headers(False, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": {
                "categories": [{"id": "cat-1", "name": "Air Filters"}],
                "priceRange": {"min": 10, "max": 2500}
            }
        }, indent=2)
    }]
})

add_to_folder("5. Products", prod_desc, {
    "name": "Related Products",
    "request": make_request("GET", "/inventory/products?categoryId={{category_id}}&limit=4", auth_headers(False, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "products": []
        }, indent=2)
    }]
})


# 6. Cart
cart_desc = "User shopping cart, adding items, quantity updates, and clearing cart."
add_to_folder("6. Cart", cart_desc, {
    "name": "Get Cart",
    "event": [{
        "listen": "test",
        "script": {
            "exec": [
                "var json = pm.response.json();",
                "if (json.success && json.data && json.data.items && json.data.items.length > 0) {",
                "    pm.environment.set('cart_item_id', json.data.items[0].productId);",
                "}"
            ],
            "type": "text/javascript"
        }
    }],
    "request": make_request("GET", "/cart", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": {
                "id": "cart-uuid",
                "items": [
                    {
                        "productId": "{{product_id}}",
                        "quantity": 2,
                        "priceAtTime": 150,
                        "subtotal": 300
                    }
                ],
                "totalAmount": 300
            }
        }, indent=2)
    }]
})

add_to_folder("6. Cart", cart_desc, {
    "name": "Add to Cart",
    "request": make_request("POST", "/cart/add", auth_headers(True),
        json.dumps({
            "productId": "{{product_id}}",
            "quantity": 2
        }, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Item added to cart successfully."
        }, indent=2)
    }]
})

add_to_folder("6. Cart", cart_desc, {
    "name": "Update Quantity",
    "request": make_request("PUT", "/cart/update", auth_headers(True),
        json.dumps({
            "productId": "{{product_id}}",
            "quantity": 5
        }, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Cart updated successfully."
        }, indent=2)
    }]
})

add_to_folder("6. Cart", cart_desc, {
    "name": "Remove Item",
    "request": make_request("DELETE", "/cart/remove/{{product_id}}", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Item removed from cart."
        }, indent=2)
    }]
})

add_to_folder("6. Cart", cart_desc, {
    "name": "Clear Cart",
    "request": make_request("DELETE", "/cart/clear", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Cart cleared successfully."
        }, indent=2)
    }]
})


# 7. Quotations
quot_desc = "Customer quotation requests, history, and status acceptance."
add_to_folder("7. Quotations", quot_desc, {
    "name": "Generate Quotation",
    "event": [{
        "listen": "test",
        "script": {
            "exec": [
                "var json = pm.response.json();",
                "if (json.success && json.data && json.data.id) {",
                "    pm.environment.set('quotation_id', json.data.id);",
                "}"
            ],
            "type": "text/javascript"
        }
    }],
    "request": make_request("POST", "/customer-quotations/generate", auth_headers(True),
        json.dumps({
            "companyName": "User Corp",
            "vatNumber": "300012345600003",
            "address": "Riyadh Industrial City",
            "products": [{"productId": "{{product_id}}", "quantity": 10}],
            "notes": "Fast shipping please."
        }, indent=2)),
    "response": [{
        "name": "201 Created",
        "status": "Created",
        "code": 201,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": {
                "id": "quotation-uuid",
                "quotationNumber": "QT-2026-0001",
                "total": "1500.00"
            }
        }, indent=2)
    }]
})

add_to_folder("7. Quotations", quot_desc, {
    "name": "Get My Quotations",
    "request": make_request("GET", "/quotations/my", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": []
        }, indent=2)
    }]
})

add_to_folder("7. Quotations", quot_desc, {
    "name": "Quotation Details",
    "request": make_request("GET", "/customer-quotations/{{quotation_id}}", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": {
                "id": "{{quotation_id}}",
                "quotationNumber": "QT-2026-0001",
                "status": "PENDING",
                "total": "1500.0"
            }
        }, indent=2)
    }]
})

add_to_folder("7. Quotations", quot_desc, {
    "name": "Download PDF",
    "request": make_request("GET", "/customer-quotations/{{quotation_id}}/pdf", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": "PDF binary data stream"
    }]
})

add_to_folder("7. Quotations", quot_desc, {
    "name": "Accept Quotation",
    "request": make_request("POST", "/customer-quotations/{{quotation_id}}/accept", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Quotation accepted successfully."
        }, indent=2)
    }]
})

# Quotation Basket endpoints
add_to_folder("7. Quotations", quot_desc, {
    "name": "Get Quotation Basket",
    "request": make_request("GET", "/customer/quotation-basket", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": {
                "id": "basket-uuid",
                "items": [{"productId": "{{product_id}}", "quantity": 10}]
            }
        }, indent=2)
    }]
})

add_to_folder("7. Quotations", quot_desc, {
    "name": "Add/Update Basket Item",
    "request": make_request("POST", "/customer/quotation-basket/items", auth_headers(True),
        json.dumps({"productId": "{{product_id}}", "quantity": 10}, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Item added/updated in basket successfully"
        }, indent=2)
    }]
})


# 8. Orders
ord_desc = "Order placements (DELIVERY / PICKUP warehouse), order tracking, details."
add_to_folder("8. Orders", ord_desc, {
    "name": "Place Order - Home Delivery",
    "event": [{
        "listen": "test",
        "script": {
            "exec": [
                "var json = pm.response.json();",
                "if (json.success && json.data && json.data.id) {",
                "    pm.environment.set('order_id', json.data.id);",
                "}"
            ],
            "type": "text/javascript"
        }
    }],
    "request": make_request("POST", "/orders", auth_headers(True),
        json.dumps({
            "deliveryType": "DELIVERY",
            "customerName": "Jane Doe",
            "phoneNumber": "0512345678",
            "shippingAddress": "123 Main Street, Riyadh",
            "paymentMethod": "CASH",
            "items": [{"productId": "{{product_id}}", "quantity": 2}]
        }, indent=2)),
    "response": [{
        "name": "201 Created",
        "status": "Created",
        "code": 201,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Order created successfully",
            "data": {
                "id": "order-uuid",
                "orderNumber": "ORD-123456789-01",
                "deliveryType": "DELIVERY",
                "total": "300.00"
            }
        }, indent=2)
    }]
})

add_to_folder("8. Orders", ord_desc, {
    "name": "Place Order - Pickup from Warehouse",
    "request": make_request("POST", "/orders", auth_headers(True),
        json.dumps({
            "deliveryType": "PICKUP",
            "warehouseId": "some-warehouse-uuid",
            "customerName": "Jane Doe",
            "phoneNumber": "0512345678",
            "paymentMethod": "CASH",
            "items": [{"productId": "{{product_id}}", "quantity": 2}]
        }, indent=2)),
    "response": [{
        "name": "201 Created",
        "status": "Created",
        "code": 201,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": {
                "id": "order-uuid",
                "orderNumber": "ORD-123456789-02",
                "deliveryType": "PICKUP"
            }
        }, indent=2)
    }]
})

add_to_folder("8. Orders", ord_desc, {
    "name": "My Orders",
    "request": make_request("GET", "/orders/my", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": []
        }, indent=2)
    }]
})

add_to_folder("8. Orders", ord_desc, {
    "name": "Order Details",
    "request": make_request("GET", "/orders/{{order_id}}", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": {
                "id": "{{order_id}}",
                "orderNumber": "ORD-123456789-01",
                "status": "PENDING",
                "deliveryType": "DELIVERY",
                "total": "300.00"
            }
        }, indent=2)
    }]
})

add_to_folder("8. Orders", ord_desc, {
    "name": "Get Active Warehouses (For Order Pickup)",
    "request": make_request("GET", "/warehouses/active", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": [
                {
                    "id": "some-warehouse-uuid",
                    "name": "Main Warehouse Riyadh",
                    "city": "Riyadh",
                    "isActive": True
                }
            ]
        }, indent=2)
    }]
})


# 9. Payments
pay_desc = "Init EPG card transactions, payment redirects and updates."
add_to_folder("9. Payments", pay_desc, {
    "name": "Initialize EPG Card Payment",
    "request": make_request("POST", "/epg/initialize", auth_headers(True),
        json.dumps({
            "items": [{"productId": "{{product_id}}", "quantity": 2}],
            "customerName": "Jane Doe",
            "phoneNumber": "0512345678",
            "shippingAddress": "123 Main Street, Riyadh",
            "deliveryType": "DELIVERY",
            "notes": "Paying via credit card"
        }, indent=2)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": {
                "orderId": "order-uuid",
                "orderNumber": "ORD-123456",
                "sessionId": "epg-session-123",
                "paymentUrl": "https://epg.gateway.com/pay/session-123"
            }
        }, indent=2)
    }]
})

add_to_folder("9. Payments", pay_desc, {
    "name": "Payment Callback (EPG Redirect)",
    "request": make_request("GET", "/epg/callback?orderId={{order_id}}&status=success", auth_headers(False, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Payment verified and processed successfully."
        }, indent=2)
    }]
})


# 10. Notifications
notif_desc = "User notification alerts, mark read, unread count."
add_to_folder("10. Notifications", notif_desc, {
    "name": "Get Notifications",
    "event": [{
        "listen": "test",
        "script": {
            "exec": [
                "var json = pm.response.json();",
                "if (json.success && Array.isArray(json.data) && json.data.length > 0) {",
                "    pm.environment.set('notification_id', json.data[0].id);",
                "}"
            ],
            "type": "text/javascript"
        }
    }],
    "request": make_request("GET", "/notifications", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": [
                {
                    "id": "notif-uuid-1",
                    "title": "Quotation Approved",
                    "message": "Your quotation QT-2026-0001 has been approved.",
                    "isRead": False,
                    "createdAt": "2026-07-07T10:00:00Z"
                }
            ]
        }, indent=2)
    }]
})

add_to_folder("10. Notifications", notif_desc, {
    "name": "Get Latest Notifications",
    "request": make_request("GET", "/notifications/latest", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": []
        }, indent=2)
    }]
})

add_to_folder("10. Notifications", notif_desc, {
    "name": "Get Unread Count",
    "request": make_request("GET", "/notifications/unread-count", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": {"count": 1}
        }, indent=2)
    }]
})

add_to_folder("10. Notifications", notif_desc, {
    "name": "Mark All as Read",
    "request": make_request("PATCH", "/notifications/read-all", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "All notifications marked as read."
        }, indent=2)
    }]
})

add_to_folder("10. Notifications", notif_desc, {
    "name": "Mark as Read",
    "request": make_request("PATCH", "/notifications/{{notification_id}}/read", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Notification marked as read."
        }, indent=2)
    }]
})

add_to_folder("10. Notifications", notif_desc, {
    "name": "Delete Notification",
    "request": make_request("DELETE", "/notifications/{{notification_id}}", auth_headers(True, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Notification deleted successfully."
        }, indent=2)
    }]
})


# 11. Resources
res_desc = "Technical resources, datasheets, installation guides."
add_to_folder("11. Resources", res_desc, {
    "name": "Product Attachments (Data Sheets & Manuals)",
    "request": make_request("GET", "/inventory/products/{{product_id}}/attachments", auth_headers(False, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": [
                {
                    "id": "attach-uuid",
                    "productId": "{{product_id}}",
                    "type": "DATASHEET",
                    "fileName": "AirFilter_Specs.pdf",
                    "fileUrl": "http://localhost:5000/uploads/attachments/AirFilter_Specs.pdf",
                    "mimeType": "application/pdf",
                    "size": 1048576,
                    "language": "en"
                }
            ]
        }, indent=2)
    }]
})


# 12. Contact Us
contact_desc = "Submit questions or feedback, view corporate contact points."
add_to_folder("12. Contact Us", contact_desc, {
    "name": "Submit Contact Form",
    "request": make_request("POST", "/contact", auth_headers(False, False),
        formdata_list=[
            {"key": "firstName", "value": "Jane", "type": "text"},
            {"key": "lastName", "value": "Doe", "type": "text"},
            {"key": "email", "value": "jane.doe@example.com", "type": "text"},
            {"key": "phone", "value": "0512345678", "type": "text"},
            {"key": "subject", "value": "Industrial Quotation Request", "type": "text"},
            {"key": "message", "value": "Hello, I need information on volume pricing.", "type": "text"},
            {"key": "attachment", "type": "file", "src": ""}
        ]),
    "response": [{
        "name": "201 Created",
        "status": "Created",
        "code": 201,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "message": "Contact message submitted successfully.",
            "data": {
                "id": "contact-submission-uuid"
            }
        }, indent=2)
    }]
})


# 13. Settings
settings_desc = "Legal policies and public configuration retrieval."
add_to_folder("13. Settings", settings_desc, {
    "name": "Privacy Policy",
    "request": make_request("GET", "/privacy-policy", auth_headers(False, False)),
    "response": [{
        "name": "200 OK",
        "status": "OK",
        "code": 200,
        "_postman_previewlanguage": "json",
        "body": json.dumps({
            "success": True,
            "data": {
                "id": "CURRENT",
                "contentEn": "This is the English privacy policy text...",
                "contentAr": "هذا هو نص سياسة الخصوصية باللغة العربية..."
            }
        }, indent=2)
    }]
})

# Add sorted folder structures to the collection items list
for key in sorted(folders.keys()):
    collection["item"].append(folders[key])

# Write collection
with open("/Users/mzubair/Documents/Professional/DevFlx/shielder/Shidler_APP_ API_Collecion.postman_collection.json", "w") as f:
    json.dump(collection, f, indent=2)

# Write environment file
environment = {
    "id": "e55df5cc-67b1-41cf-906d-745a7828c465",
    "name": "SHIELDER Mobile Environment",
    "values": [
        {
            "key": "base_url",
            "value": "http://localhost:5000/api",
            "enabled": True,
            "type": "default"
        },
        {
            "key": "token",
            "value": "",
            "enabled": True,
            "type": "default"
        },
        {
            "key": "refresh_token",
            "value": "",
            "enabled": True,
            "type": "default"
        },
        {
            "key": "user_id",
            "value": "",
            "enabled": True,
            "type": "default"
        },
        {
            "key": "product_id",
            "value": "",
            "enabled": True,
            "type": "default"
        },
        {
            "key": "category_id",
            "value": "",
            "enabled": True,
            "type": "default"
        },
        {
            "key": "quotation_id",
            "value": "",
            "enabled": True,
            "type": "default"
        },
        {
            "key": "order_id",
            "value": "",
            "enabled": True,
            "type": "default"
        },
        {
            "key": "cart_item_id",
            "value": "",
            "enabled": True,
            "type": "default"
        },
        {
            "key": "notification_id",
            "value": "",
            "enabled": True,
            "type": "default"
        }
    ],
    "_postman_variable_scope": "environment"
}

with open("/Users/mzubair/Documents/Professional/DevFlx/shielder/Shidler_APP_ API_Collecion.postman_environment.json", "w") as f:
    json.dump(environment, f, indent=2)

print("Build complete!")
