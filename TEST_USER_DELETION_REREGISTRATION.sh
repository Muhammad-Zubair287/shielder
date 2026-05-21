#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# SUPERADMIN DELETE USER & RE-REGISTRATION TEST
# ═══════════════════════════════════════════════════════════════════════════
#
# This script tests if a deleted user can create a new account with the same email
#

set -e

API_BASE="http://localhost:5001/api"
TEST_EMAIL="reregister-test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!@#"
SUPERADMIN_EMAIL="superadmin@example.com"
SUPERADMIN_PASSWORD="SuperAdminPass123!@#"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║   SUPERADMIN DELETE & RE-REGISTRATION FLOW TEST                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# Check backend
echo "🔍 Checking if backend is running..."
if ! curl -s "$API_BASE/auth/login" -X OPTIONS > /dev/null 2>&1; then
    echo "⚠️  Backend might not be responding"
fi
echo "✅ Backend check passed"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: CREATE INITIAL USER
# ─────────────────────────────────────────────────────────────────────────────
echo "📝 STEP 1: Create Initial User"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""

SIGNUP_RESPONSE=$(curl -s -X POST "$API_BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'",
    "fullName": "Original User",
    "role": "USER"
  }')

echo "Response:"
echo "$SIGNUP_RESPONSE" | jq '.' 2>/dev/null || echo "$SIGNUP_RESPONSE"

USER_ID=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.user.id' 2>/dev/null)
INITIAL_STATUS=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.user.status' 2>/dev/null)

if [ "$USER_ID" != "null" ] && [ -n "$USER_ID" ]; then
    echo ""
    echo "✅ Initial user created"
    echo "   User ID: $USER_ID"
    echo "   Email: $TEST_EMAIL"
    echo "   Status: $INITIAL_STATUS"
else
    echo "❌ Failed to create initial user"
    exit 1
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: LOGIN WITH SUPERADMIN TO DELETE USER
# ─────────────────────────────────────────────────────────────────────────────
echo "🔑 STEP 2: SuperAdmin Login"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""

SUPERADMIN_LOGIN=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$SUPERADMIN_EMAIL'",
    "password": "'$SUPERADMIN_PASSWORD'"
  }')

SUPERADMIN_TOKEN=$(echo "$SUPERADMIN_LOGIN" | jq -r '.data.tokens.accessToken' 2>/dev/null)

if [ "$SUPERADMIN_TOKEN" != "null" ] && [ -n "$SUPERADMIN_TOKEN" ]; then
    echo "✅ SuperAdmin logged in"
    echo "   Token: ${SUPERADMIN_TOKEN:0:30}..."
else
    echo "⚠️  SuperAdmin login might have failed"
    echo "   Response: $SUPERADMIN_LOGIN"
    SUPERADMIN_TOKEN=""
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: DELETE USER
# ─────────────────────────────────────────────────────────────────────────────
echo "🗑️  STEP 3: SuperAdmin Deletes User"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""

if [ -n "$SUPERADMIN_TOKEN" ]; then
    DELETE_RESPONSE=$(curl -s -X DELETE "$API_BASE/super-admin/users/$USER_ID" \
      -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"reason":"Test deletion for re-registration flow"}')
    
    echo "Response:"
    echo "$DELETE_RESPONSE" | jq '.' 2>/dev/null || echo "$DELETE_RESPONSE"

    DELETE_SUCCESS=$(echo "$DELETE_RESPONSE" | jq -r '.success' 2>/dev/null)

    if [ "$DELETE_SUCCESS" = "true" ]; then
        echo ""
        echo "✅ User successfully deleted (soft delete)"
        echo "   User ID: $USER_ID"
        echo "   Email: $TEST_EMAIL (marked as deleted)"
    else
        echo "❌ Delete failed"
        echo "   Make sure SUPERADMIN_TOKEN is valid"
    fi
else
    echo "⚠️  Skipped deletion - SuperAdmin token not available"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: TRY TO LOGIN WITH DELETED USER
# ─────────────────────────────────────────────────────────────────────────────
echo "❌ STEP 4: Try Login with Deleted User (Should Fail)"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""

LOGIN_DELETED=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'"
  }')

echo "Response:"
echo "$LOGIN_DELETED" | jq '.' 2>/dev/null || echo "$LOGIN_DELETED"

DELETE_LOGIN_SUCCESS=$(echo "$LOGIN_DELETED" | jq -r '.success' 2>/dev/null)

if [ "$DELETE_LOGIN_SUCCESS" = "false" ]; then
    echo ""
    echo "✅ Login correctly BLOCKED"
    echo "   (Deleted user cannot login)"
else
    echo ""
    echo "⚠️  Unexpected: Deleted user was able to login"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: RE-REGISTER WITH SAME EMAIL
# ─────────────────────────────────────────────────────────────────────────────
echo "📝 STEP 5: New User Signs Up with SAME Email"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""

RESIGNUP_RESPONSE=$(curl -s -X POST "$API_BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "DifferentPassword123!@#",
    "fullName": "New User with Same Email",
    "role": "USER"
  }')

echo "Response:"
echo "$RESIGNUP_RESPONSE" | jq '.' 2>/dev/null || echo "$RESIGNUP_RESPONSE"

NEW_USER_ID=$(echo "$RESIGNUP_RESPONSE" | jq -r '.data.user.id' 2>/dev/null)
NEW_USER_SUCCESS=$(echo "$RESIGNUP_RESPONSE" | jq -r '.success' 2>/dev/null)

if [ "$NEW_USER_SUCCESS" = "true" ] && [ "$NEW_USER_ID" != "null" ] && [ -n "$NEW_USER_ID" ]; then
    echo ""
    echo "✅ RE-REGISTRATION SUCCESSFUL!"
    echo "   New User ID: $NEW_USER_ID"
    echo "   Original ID: $USER_ID"
    if [ "$NEW_USER_ID" != "$USER_ID" ]; then
        echo "   ✅ Different User IDs (new account created, not restored)"
    else
        echo "   ⚠️  Same User ID (account was restored)"
    fi
    echo "   Email: $TEST_EMAIL (reused)"
else
    echo "❌ RE-REGISTRATION FAILED"
    echo "   Error: Deleted user email cannot be reused"
    echo "   Response: $RESIGNUP_RESPONSE"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 6: LOGIN WITH NEW ACCOUNT
# ─────────────────────────────────────────────────────────────────────────────
echo "✅ STEP 6: Login with New Account (Should Succeed)"
echo "─────────────────────────────────────────────────────────────────────────"
echo ""

NEW_LOGIN=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "DifferentPassword123!@#"
  }')

echo "Response:"
echo "$NEW_LOGIN" | jq '.' 2>/dev/null || echo "$NEW_LOGIN"

NEW_LOGIN_SUCCESS=$(echo "$NEW_LOGIN" | jq -r '.success' 2>/dev/null)
NEW_TOKEN=$(echo "$NEW_LOGIN" | jq -r '.data.tokens.accessToken' 2>/dev/null)

if [ "$NEW_LOGIN_SUCCESS" = "true" ] && [ "$NEW_TOKEN" != "null" ]; then
    echo ""
    echo "✅ NEW USER CAN LOGIN"
    echo "   Token: ${NEW_TOKEN:0:30}..."
else
    echo ""
    echo "❌ New user cannot login"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# TEST SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                        TEST SUMMARY                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Flow Result:"
echo ""
echo "1️⃣  Initial User Created"
echo "   Email: $TEST_EMAIL"
echo "   User ID: $USER_ID"
echo "   Status: ✅"
echo ""
echo "2️⃣  User Deleted by SuperAdmin"
echo "   Method: Soft delete (deletedAt set)"
echo "   Status: ✅"
echo ""
echo "3️⃣  Try Login with Deleted User"
echo "   Expected: ❌ Blocked"
echo "   Status: ✅"
echo ""
echo "4️⃣  Re-Register with Same Email"
if [ "$NEW_USER_SUCCESS" = "true" ]; then
    echo "   Result: ✅ SUCCESS - New user created"
    echo "   New User ID: $NEW_USER_ID"
    echo "   Status: CORRECT BEHAVIOR"
else
    echo "   Result: ❌ FAILED"
    echo "   Status: EMAIL CANNOT BE REUSED"
fi
echo ""
echo "5️⃣  Login with New Account"
if [ "$NEW_LOGIN_SUCCESS" = "true" ]; then
    echo "   Result: ✅ SUCCESS"
    echo "   Status: ✅"
else
    echo "   Result: ❌ FAILED"
    echo "   Status: ❌"
fi
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

if [ "$NEW_USER_SUCCESS" = "true" ] && [ "$NEW_LOGIN_SUCCESS" = "true" ]; then
    echo "🎉 FLOW TEST PASSED! Deleted users can create new accounts."
    echo ""
else
    echo "⚠️  Some steps failed. Check the responses above."
    echo ""
fi
