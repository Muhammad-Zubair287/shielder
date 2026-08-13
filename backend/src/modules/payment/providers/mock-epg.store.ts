/**
 * In-memory mock gateway session state (development only).
 * Not persisted — sufficient for local/concurrency testing.
 */

import type { MockEpgScenario } from './payment-provider.types';

export type MockSessionTerminalStatus = 'success' | 'failed' | 'cancelled';

export type MockGatewaySession = {
  sessionId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  userId: string;
  captured: boolean;
  refunded: boolean;
  refundAttempts: number;
  forcedRefundScenario?: 'refund_success' | 'refund_failure' | 'already_refunded';
  terminalStatus?: MockSessionTerminalStatus;
  /** Redirect after terminal state (for idempotent re-open / back navigation) */
  terminalRedirectUrl?: string;
  createdAt: number;
};

const sessions = new Map<string, MockGatewaySession>();

/** Test-only reset */
export function clearMockEpgStore(): void {
  sessions.clear();
}

export function createMockSession(data: Omit<MockGatewaySession, 'captured' | 'refunded' | 'refundAttempts' | 'createdAt'>): MockGatewaySession {
  const session: MockGatewaySession = {
    ...data,
    captured: false,
    refunded: false,
    refundAttempts: 0,
    createdAt: Date.now(),
  };
  sessions.set(data.sessionId, session);
  return session;
}

export function getMockSession(sessionId: string): MockGatewaySession | undefined {
  return sessions.get(sessionId);
}

export function markMockSessionCaptured(sessionId: string): void {
  const s = sessions.get(sessionId);
  if (s) s.captured = true;
}

export function markMockSessionRefunded(sessionId: string): void {
  const s = sessions.get(sessionId);
  if (s) {
    s.refunded = true;
    s.refundAttempts += 1;
  }
}

export function incrementMockRefundAttempt(sessionId: string): void {
  const s = sessions.get(sessionId);
  if (s) s.refundAttempts += 1;
}

export function setMockForcedRefundScenario(
  sessionId: string,
  scenario: MockGatewaySession['forcedRefundScenario'],
): void {
  const s = sessions.get(sessionId);
  if (s) s.forcedRefundScenario = scenario;
}

export function markMockSessionTerminal(
  sessionId: string,
  status: MockSessionTerminalStatus,
  redirectUrl?: string,
): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.terminalStatus = status;
  if (redirectUrl) {
    s.terminalRedirectUrl = redirectUrl;
  }
}

export function isMockSessionExecutable(sessionId: string): boolean {
  const s = sessions.get(sessionId);
  return Boolean(s && !s.terminalStatus);
}

export function scenarioToCallbackStatus(scenario: MockEpgScenario): string | null {
  switch (scenario) {
    case 'success':
    case 'duplicate_callback':
      return 'paid';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    case 'pending':
    case 'timeout':
      return null;
    default:
      return null;
  }
}
