// ────────────────────────────────────────────────────────────
// Admin Notifications Module — Type Definitions
// ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'ORDER_CREATED'
  | 'ORDER_COMPLETED'
  | 'PAYMENT_SUCCESSFUL'
  | 'PAYMENT_FAILED'
  | 'LOW_STOCK'
  | 'NEW_USER_CREATED'
  | 'REFUND_ISSUED'
  | 'SYSTEM_ALERT'
  | 'QUOTATION_APPROVED'
  | 'QUOTATION_EXPIRED'
  | 'QUOTATION_CREATED';

export type NotificationFilter = 'ALL' | 'UNREAD' | 'READ';

export type TargetRole = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';

export interface AdminNotification {
  id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  module: string | null;
  isRead: boolean;
  relatedId: string | null;
  triggeredBy: string | null;
  triggeredById: string | null;
  roleTarget: string | null;
  createdAt: string;
  user?: {
    email: string;
    profile?: { fullName: string };
  };
  triggerer?: {
    email: string;
    profile?: { fullName: string };
  };
}

export interface Pagination {
  page: number;
  total: number;
  pages?: number;
  totalPages: number;
}

export interface NotificationTypeConfig {
  labelKey: string;
  icon: string;
  color: string;
  bg: string;
}

export const NOTIFICATION_TYPE_CONFIG: Record<string, NotificationTypeConfig> = {
  ORDER_CREATED:       { labelKey: 'notifTypeOrderCreated',       icon: 'ShoppingCart',  color: 'text-blue-700',    bg: 'bg-blue-50' },
  ORDER_COMPLETED:     { labelKey: 'notifTypeOrderCompleted',     icon: 'CheckCircle2',  color: 'text-green-700',   bg: 'bg-green-50' },
  PAYMENT_SUCCESSFUL:  { labelKey: 'notifTypePaymentSuccess',     icon: 'CreditCard',    color: 'text-emerald-700', bg: 'bg-emerald-50' },
  PAYMENT_FAILED:      { labelKey: 'notifTypePaymentFailed',      icon: 'XCircle',       color: 'text-red-700',     bg: 'bg-red-50' },
  LOW_STOCK:           { labelKey: 'notifTypeLowStock',           icon: 'AlertTriangle', color: 'text-orange-700',  bg: 'bg-orange-50' },
  NEW_USER_CREATED:    { labelKey: 'notifTypeNewUser',            icon: 'UserPlus',      color: 'text-sky-700',     bg: 'bg-sky-50' },
  REFUND_ISSUED:       { labelKey: 'notifTypeRefund',             icon: 'RotateCcw',     color: 'text-purple-700',  bg: 'bg-purple-50' },
  SYSTEM_ALERT:        { labelKey: 'notifTypeSystemAlert',        icon: 'Bell',          color: 'text-[#5B5FC7]',   bg: 'bg-[#5B5FC7]/10' },
  QUOTATION_APPROVED:  { labelKey: 'notifTypeQuotationApproved',  icon: 'FileCheck',     color: 'text-teal-700',    bg: 'bg-teal-50' },
  QUOTATION_EXPIRED:   { labelKey: 'notifTypeQuotationExpired',   icon: 'FileX',         color: 'text-gray-600',    bg: 'bg-gray-100' },
  QUOTATION_CREATED:   { labelKey: 'notifTypeQuotationCreated',   icon: 'FileText',      color: 'text-indigo-700',  bg: 'bg-indigo-50' },
};

export const DEFAULT_TYPE_CONFIG: NotificationTypeConfig = {
  labelKey: 'notifTypeSystem',
  icon: 'Bell',
  color: 'text-gray-600',
  bg: 'bg-gray-100',
};
