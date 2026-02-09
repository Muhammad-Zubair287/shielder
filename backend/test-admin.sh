#!/bin/bash

# Test RBAC Admin Endpoints
echo "🧪 Testing Admin RBAC System"
echo "================================"

# 1. Login as Super Admin
echo -e "\n1️⃣ Login as Super Admin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@shielder.com","password":"SuperAdmin@2026"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "$LOGIN_RESPONSE" | jq
  exit 1
fi

echo "✅ Login successful! Token received."

# 2. Test Super Admin - Get all users
echo -e "\n2️⃣ Super Admin: Get all users..."
curl -s -X GET "http://localhost:5001/api/super-admin/users" \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Test Super Admin - Create an Admin user
echo -e "\n3️⃣ Super Admin: Create Admin user..."
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:5001/api/super-admin/admins \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"admin@shielder.com",
    "password":"Admin@2026",
    "firstName":"Test",
    "lastName":"Admin"
  }')

echo "$ADMIN_RESPONSE" | jq
ADMIN_ID=$(echo $ADMIN_RESPONSE | jq -r '.data.id')

# 4. Test Admin - Get users (only USER role)
echo -e "\n4️⃣ Admin: Login and get users..."
ADMIN_LOGIN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@shielder.com","password":"Admin@2026"}')

ADMIN_TOKEN=$(echo $ADMIN_LOGIN | jq -r '.data.accessToken')

curl -s -X GET "http://localhost:5001/api/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# 5. Test Admin - Create USER
echo -e "\n5️⃣ Admin: Create USER account..."
curl -s -X POST http://localhost:5001/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@shielder.com",
    "password":"User@2026",
    "firstName":"Test",
    "lastName":"User"
  }' | jq

# 6. Test Admin trying to create another Admin (should fail)
echo -e "\n6️⃣ Admin: Try to create Admin (should fail)..."
curl -s -X POST http://localhost:5001/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"admin2@shielder.com",
    "password":"Admin2@2026",
    "role":"ADMIN",
    "firstName":"Test",
    "lastName":"Admin2"
  }' | jq

echo -e "\n✅ All tests completed!"
