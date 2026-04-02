export interface DashboardOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

export interface DashboardQuotation {
  id: string;
  referenceNumber: string;
  status: string;
  amount: number;
  createdAt: string;
}

export interface DashboardActivityItem {
  id: string;
  type: 'ORDER' | 'QUOTATION';
  label: string;
  status: string;
  createdAt: string;
  href: string;
}
