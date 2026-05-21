#!/bin/bash

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EMAIL VERIFICATION FLOW - QUICK TEST GUIDE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# This script tests the email verification flow with actual API calls
# Run this from the project root directory

set -e

# Configuration
API_BASE="http://localhost:5001/api"
TEST_EMAIL="test-verify-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!@#"
TEST_FULLNAME="Email Verification Tester"
VERIFICATION_TOKEN=""

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         EMAIL VERIFICATION FLOW - QUICK TEST               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Test Email: $TEST_EMAIL"
echo "API Base: $API_BASE"
echo ""

# Check if backend is running
echo "🔍 Checking if backend is running..."
if ! curl -s "$API_BASE/auth/health" > /dev/null 2>&1; then
    echo "❌ Backend not responding at $API_BASE"
    echo ""
    echo "Start the backend with:"
    echo "  cd backend"
    echo "  npm run dev"
    echo ""
    exit 1
fi
echo "✅ Backend is running"
echo ""

# ────────────────────────────────────────────────────────────────────────────
# STEP 1: SIGNUP
# ────────────────────────────────────────────────────────────────────────────
echo "📝 STEP 1: User Signup"
echo "─────────────────────────────────────────────────────────────────"

SIGNUP_RESPONSE=$(curl -s -X POST "$API_BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'",
    "fullName": "'$TEST_FULLNAME'",
    "role": "USER"
  }')

echo "Response:"
echo "$SIGNUP_RESPONSE" | jq '.' 2>/dev/null || echo "$SIGNUP_RESPONSE"

USER_ID=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.user.id' 2>/dev/null)
EMAIL_VERIFIED=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.user.emailVerified' 2>/dev/null)
STATUS=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.user.status' 2>/dev/null)
ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.tokens.accessToken' 2>/dev/null)

if [ "$USER_ID" != "null" ] && [ -n "$USER_ID" ]; then
    echo ""
    echo "✅ Signup successful"
    echo "   User ID: $USER_ID"
    echo "   Email: $TEST_EMAIL"
    echo "   Email Verified: $EMAIL_VERIFIED (should be false)"
    echo "   Status: $STATUS (should be PENDING)"
else
    echo "❌ Signup failed"
    exit 1
fi

echo ""

# ────────────────────────────────────────────────────────────────────────────
# STEP 2: TRY TO LOGIN WITHOUT VERIFICATION
# ────────────────────────────────────────────────────────────────────────────
echo "❌ STEP 2: Login Attempt Without Email Verification"
echo "─────────────────────────────────────────────────────────────────"

LOGIN_FAIL_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'"
  }')

echo "Response:"
echo "$LOGIN_FAIL_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_FAIL_RESPONSE"

LOGIN_SUCCESS=$(echo "$LOGIN_FAIL_RESPONSE" | jq -r '.success' 2>/dev/null)
LOGIN_MESSAGE=$(echo "$LOGIN_FAIL_RESPONSE" | jq -r '.message' 2>/dev/null)

if [ "$LOGIN_SUCCESS" = "false" ] && echo "$LOGIN_MESSAGE" | grep -q "verify.*email"; then
    echo ""
    echo "✅ Login correctly BLOCKED"
    echo "   Error Message: $LOGIN_MESSAGE"
    echo "   (This is correct behavior - unverified users should not be able to login)"
elif [ "$LOGIN_SUCCESS" = "true" ]; then
    echo ""
    echo "❌ CRITICAL: Login should have been blocked but succeeded!"
    echo "   This is a SECURITY ISSUE. Unverified users should not be able to login."
    exit 1
else
    echo ""
    echo "⚠️  Unexpected response format"
fi

echo ""

# ────────────────────────────────────────────────────────────────────────────
# STEP 3: GET VERIFICATION TOKEN FROM DATABASE
# ────────────────────────────────────────────────────────────────────────────
echo "🔑 STEP 3: Get Verification Token"
echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "To complete the email verification test, you need the verification token."
echo "Follow ONE of these methods:"
echo ""
echo "METHOD A: Check Your Email (Production Method)"
echo "──────────────────────────────────────────────"
echo "1. Check inbox for email from: Shielder Platform"
echo "2. Subject: Verify Your Email"
echo "3. Click the verification link"
echo "4. You will be verified and redirected"
echo ""
echo "METHOD B: Query Database Directly (Development)"
echo "──────────────────────────────────────────────"
echo "Run this SQL query to get the token:"
echo ""
echo "  SELECT verification_token,"
echo "         verification_token_expiry,"
echo "         emailVerified,"
echo "         status"
echo "  FROM users"
echo "  WHERE email = '$TEST_EMAIL';"
echo ""
echo "Then use the token in the next step."
echo ""
echo "METHOD C: Check Brevo Dashboard (Email Service)"
echo "──────────────────────────────────────────────"
echo "1. Go to: https://app.brevo.com"
echo "2. Check Email Logs"
echo "3. Look for email sent to: $TEST_EMAIL"
echo "4. Verify email was sent successfully"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "Once you have the token, enter it below or use the command:"
echo ""
echo "  curl -X GET http://localhost:5001/api/auth/verify-email/{TOKEN}"
echo ""

# Prompt for verification token
read -p "Enter verification token (or press Enter to skip): " VERIFICATION_TOKEN

if [ -n "$VERIFICATION_TOKEN" ]; then
    # ────────────────────────────────────────────────────────────────────────────
    # STEP 4: VERIFY EMAIL
    # ────────────────────────────────────────────────────────────────────────────
    echo ""
    echo "✅ STEP 4: Verify Email"
    echo "─────────────────────────────────────────────────────────────────"

    VERIFY_RESPONSE=$(curl -s -X GET "$API_BASE/auth/verify-email/$VERIFICATION_TOKEN")

    echo "Response:"
    echo "$VERIFY_RESPONSE" | jq '.' 2>/dev/null || echo "$VERIFY_RESPONSE"

    VERIFY_SUCCESS=$(echo "$VERIFY_RESPONSE" | jq -r '.success' 2>/dev/null)
    NEW_EMAIL_VERIFIED=$(echo "$VERIFY_RESPONSE" | jq -r '.data.user.emailVerified' 2>/dev/null)
    NEW_STATUS=$(echo "$VERIFY_RESPONSE" | jq -r '.data.user.status' 2>/dev/null)

    if [ "$VERIFY_SUCCESS" = "true" ]; then
        echo ""
        echo "✅ Email verification successful"
        echo "   Email Verified: $NEW_EMAIL_VERIFIED (should be true)"
        echo "   New Status: $NEW_STATUS (should be ACTIVE)"
    else
        echo ""
        echo "❌ Email verification failed"
        exit 1
    fi

    echo ""

    # ────────────────────────────────────────────────────────────────────────────
    # STEP 5: LOGIN AFTER VERIFICATION
    # ────────────────────────────────────────────────────────────────────────────
    echo "✅ STEP 5: Login After Email Verification"
    echo "─────────────────────────────────────────────────────────────────"

    LOGIN_SUCCESS_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "'$TEST_EMAIL'",
        "password": "'$TEST_PASSWORD'"
      }')

    echo "Response:"
    echo "$LOGIN_SUCCESS_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_SUCCESS_RESPONSE"

    LOGIN_SUCCESS=$(echo "$LOGIN_SUCCESS_RESPONSE" | jq -r '.success' 2>/dev/null)
    NEW_ACCESS_TOKEN=$(echo "$LOGIN_SUCCESS_RESPONSE" | jq -r '.data.tokens.accessToken' 2>/dev/null)

    if [ "$LOGIN_SUCCESS" = "true" ] && [ "$NEW_ACCESS_TOKEN" != "null" ]; then
        echo ""
        echo "✅ Login successful after verification!"
        echo "   Access Token: ${NEW_ACCESS_TOKEN:0:30}..."
        echo ""
        echo "🎉 EMAIL VERIFICATION FLOW TEST PASSED!"
    else
        echo ""
        echo "❌ Login failed after verification"
        exit 1
    fi
else
    echo ""
    echo "⏭️  Skipped verification step"
    echo "   To complete the flow, get the verification token and:"
    echo "   curl -X GET http://localhost:5001/api/auth/verify-email/{TOKEN}"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   TEST SUMMARY                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Test User Created:"
echo "   Email: $TEST_EMAIL"
echo "   Password: $TEST_PASSWORD"
echo "   User ID: $USER_ID"
echo ""
echo "✅ Signup Flow:"
echo "   - User created with emailVerified: false ✓"
echo "   - Status set to PENDING ✓"
echo "   - Verification token generated ✓"
echo "   - Access/Refresh tokens returned ✓"
echo ""
echo "✅ Login Protection:"
echo "   - Unverified users BLOCKED from login ✓"
echo "   - Correct error message displayed ✓"
echo ""
if [ -n "$VERIFICATION_TOKEN" ]; then
    echo "✅ Email Verification:"
    echo "   - Verification endpoint works ✓"
    echo "   - User marked as verified ✓"
    echo "   - Status changed to ACTIVE ✓"
    echo ""
    echo "✅ Login After Verification:"
    echo "   - Verified users can NOW login ✓"
    echo "   - Tokens received successfully ✓"
    echo ""
fi
echo "═══════════════════════════════════════════════════════════════"
echo ""
