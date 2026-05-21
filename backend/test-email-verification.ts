/**
 * COMPLETE EMAIL VERIFICATION FLOW TEST
 * 
 * This script tests all aspects of the verification flow:
 * 1. New user registration sends verification email
 * 2. User without email verification cannot login
 * 3. After email verification, user can login
 * 4. Verification endpoint updates the database correctly
 */

import axios, { AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';

const API_BASE = 'http://localhost:5001/api';
const prisma = new PrismaClient();

const TEST_EMAIL = `verify-test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!@#';
const TEST_FULLNAME = 'Email Verification Test User';

interface TestResult {
  name: string;
  pass: boolean;
  details: string;
  expected?: string;
  actual?: string;
}

const results: TestResult[] = [];

async function testSignup() {
  console.log('\n✏️  TEST 1: New User Signup\n');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/signup`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      fullName: TEST_FULLNAME,
      role: 'USER',
    });

    const { user, tokens } = response.data.data;

    const dbUser = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });

    const pass =
      user.emailVerified === false &&
      dbUser?.status === 'PENDING' &&
      dbUser?.verificationToken !== null;

    results.push({
      name: 'Signup creates user with emailVerified: false',
      pass,
      details: `User created: ${user.id}`,
      expected: 'emailVerified=false, status=PENDING, verificationToken!=null',
      actual: `emailVerified=${user.emailVerified}, status=${dbUser?.status}, token=${dbUser?.verificationToken ? 'present' : 'missing'}`,
    });

    console.log(`✅ Response received from signup`);
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - Email Verified: ${user.emailVerified} (should be false)`);
    console.log(`   - Status: ${user.status} (should be PENDING)`);
    console.log(`   - Access Token: ${tokens.accessToken.substring(0, 30)}...`);

    if (dbUser?.verificationToken) {
      console.log(`   - Verification Token: ${dbUser.verificationToken.substring(0, 20)}...`);
      console.log(`   - Token Expiry: ${dbUser.verificationTokenExpiry}`);
    }

    return dbUser?.verificationToken || null;
  } catch (error) {
    const axiosError = error as AxiosError;
    results.push({
      name: 'Signup creates user with emailVerified: false',
      pass: false,
      details: `Signup API failed: ${axiosError.response?.data}`,
    });
    console.error('❌ Signup failed:', axiosError.message);
    return null;
  }
}

async function testLoginBeforeVerification() {
  console.log('\n❌ TEST 2: Login Without Email Verification (Should Fail)\n');

  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    results.push({
      name: 'Login without email verification should be blocked',
      pass: false,
      details: 'Login succeeded when it should have been blocked',
      expected: '401 Unauthorized - "Please verify your email"',
      actual: `200 OK - User logged in anyway`,
    });

    console.error(
      '❌ CRITICAL: Login should have failed! Unverified user should NOT be able to login.'
    );
    console.log(`   This is a SECURITY ISSUE.`);
    return false;
  } catch (error) {
    const axiosError = error as AxiosError<{ message: string }>;
    
    if (axiosError.response?.status === 401) {
      const message = axiosError.response?.data?.message || '';
      const isEmailVerification = message.toLowerCase().includes('verify');

      if (isEmailVerification) {
        results.push({
          name: 'Login without email verification should be blocked',
          pass: true,
          details: `Login correctly blocked with message: "${message}"`,
          expected: '401 Unauthorized - Email verification required',
          actual: `401 - ${message}`,
        });
        console.log(`✅ Login correctly BLOCKED`);
        console.log(`   Message: "${message}"`);
        return true;
      } else {
        results.push({
          name: 'Login without email verification should be blocked',
          pass: false,
          details: `Login blocked but wrong reason: "${message}"`,
          expected: 'Email verification message',
          actual: message,
        });
        console.warn(`⚠️  Login blocked but wrong error: "${message}"`);
        return false;
      }
    } else {
      results.push({
        name: 'Login without email verification should be blocked',
        pass: false,
        details: `Unexpected error: ${axiosError.message}`,
      });
      console.error(`❌ Unexpected error:`, axiosError.message);
      return false;
    }
  }
}

async function testEmailVerification(verificationToken: string | null) {
  console.log('\n✅ TEST 3: Email Verification\n');

  if (!verificationToken) {
    results.push({
      name: 'Email verification endpoint works',
      pass: false,
      details: 'No verification token available from signup',
    });
    console.error('❌ No verification token from signup');
    return false;
  }

  try {
    const response = await axios.get(`${API_BASE}/auth/verify-email/${verificationToken}`);

    const updatedUser = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });

    const pass =
      updatedUser?.emailVerified === true &&
      updatedUser?.status === 'ACTIVE' &&
      updatedUser?.verificationToken === null;

    results.push({
      name: 'Email verification endpoint updates user correctly',
      pass,
      details: `Verification completed for ${TEST_EMAIL}`,
      expected: 'emailVerified=true, status=ACTIVE, verificationToken=null',
      actual: `emailVerified=${updatedUser?.emailVerified}, status=${updatedUser?.status}, token=${updatedUser?.verificationToken}`,
    });

    console.log(`✅ Email verified successfully`);
    console.log(`   - New Email Verified Status: ${updatedUser?.emailVerified}`);
    console.log(`   - New Status: ${updatedUser?.status}`);
    console.log(`   - Verification Token Cleared: ${updatedUser?.verificationToken === null}`);

    return true;
  } catch (error) {
    const axiosError = error as AxiosError;
    results.push({
      name: 'Email verification endpoint updates user correctly',
      pass: false,
      details: `Verification API failed: ${axiosError.message}`,
    });
    console.error('❌ Verification failed:', axiosError.message);
    return false;
  }
}

async function testLoginAfterVerification() {
  console.log('\n✅ TEST 4: Login After Email Verification (Should Succeed)\n');

  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    const { user, tokens } = response.data.data;

    results.push({
      name: 'Verified user can login successfully',
      pass: true,
      details: `User logged in successfully after verification`,
      expected: '200 OK - tokens returned',
      actual: `200 OK - Access Token: ${tokens.accessToken.substring(0, 30)}...`,
    });

    console.log(`✅ Login successful after verification`);
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Access Token: ${tokens.accessToken.substring(0, 30)}...`);
    console.log(`   - Refresh Token: ${tokens.refreshToken.substring(0, 30)}...`);

    return true;
  } catch (error) {
    const axiosError = error as AxiosError<{ message: string }>;
    results.push({
      name: 'Verified user can login successfully',
      pass: false,
      details: `Login failed: ${axiosError.response?.data?.message || axiosError.message}`,
      expected: '200 OK - User logged in',
      actual: `${axiosError.response?.status} - ${axiosError.response?.data?.message}`,
    });
    console.error(
      '❌ Login failed after verification:',
      axiosError.response?.data?.message || axiosError.message
    );
    return false;
  }
}

async function printResults() {
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              EMAIL VERIFICATION FLOW TEST RESULTS             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let totalPass = 0;
  let totalTests = results.length;

  for (const result of results) {
    const icon = result.pass ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    console.log(`   Details: ${result.details}`);
    if (result.expected) {
      console.log(`   Expected: ${result.expected}`);
    }
    if (result.actual) {
      console.log(`   Actual: ${result.actual}`);
    }
    console.log('');
    if (result.pass) totalPass++;
  }

  console.log('═'.repeat(60));
  console.log(`\nRESULTS: ${totalPass}/${totalTests} tests passed\n`);

  if (totalPass === totalTests) {
    console.log('✅ ALL TESTS PASSED! Email verification flow is working correctly.\n');
  } else {
    console.log(
      `❌ ${totalTests - totalPass} test(s) failed. Please review the implementation.\n`
    );
  }

  console.log('═'.repeat(60));
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║    EMAIL VERIFICATION FLOW COMPREHENSIVE TEST SUITE         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nTest User: ${TEST_EMAIL}`);
  console.log(`API Base: ${API_BASE}\n`);

  try {
    // Run all tests in sequence
    const token = await testSignup();
    await testLoginBeforeVerification();
    const verificationSuccess = await testEmailVerification(token);
    if (verificationSuccess) {
      await testLoginAfterVerification();
    }

    // Print summary
    await printResults();

    // Cleanup
    await prisma.user.delete({
      where: { email: TEST_EMAIL },
    });
    console.log(`Cleanup: Test user deleted from database\n`);
  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
