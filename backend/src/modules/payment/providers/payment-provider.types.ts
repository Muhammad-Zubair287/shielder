/**
 * External payment gateway provider contract.
 * Business logic (orders, stock, idempotency) stays in EPGService — providers
 * only simulate/realize gateway I/O.
 */

export type EpgProviderMode = 'mock' | 'sandbox' | 'production';

export type MockEpgScenario =
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'pending'
  | 'timeout'
  | 'duplicate_callback'
  | 'refund_success'
  | 'refund_failure'
  | 'already_refunded';

export type PaymentGatewayRefundResult = {
  success: boolean;
  refundId?: string;
  skipped?: boolean;
  reason?: string;
  rawStatus?: number;
  rawBody?: string;
};

export type CreateGatewaySessionParams = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerName: string;
  phoneNumber: string;
  successUrl: string;
  failureUrl: string;
  userId: string;
};

export type CreateGatewaySessionResult = {
  sessionId: string;
  paymentUrl: string;
  testMode: boolean;
  provider: EpgProviderMode;
};

export type RefundGatewayPaymentParams = {
  sessionId: string;
  amount: number;
  orderNumber?: string;
  reason?: string;
};

export type VerifyWebhookParams = {
  payload: unknown;
  signatureHeader: string;
  secretKey: string;
};

export interface PaymentGatewayProvider {
  readonly mode: EpgProviderMode;

  /** Whether initialize can proceed without real API credentials. */
  requiresApiCredentials(): boolean;

  createPaymentSession(params: CreateGatewaySessionParams): Promise<CreateGatewaySessionResult>;

  refundCapturedPayment(params: RefundGatewayPaymentParams): Promise<PaymentGatewayRefundResult>;

  verifyWebhookSignature(params: VerifyWebhookParams): boolean;
}
