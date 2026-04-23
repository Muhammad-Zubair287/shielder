'use client';

import React from 'react';
import {
  Clock,
  Loader2,
  Truck,
  CheckCircle2,
  XCircle,
  Package,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OrderStatus } from './types';

interface Props {
  status: OrderStatus | string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  string,
  { labelKey: string; classes: string; Icon: LucideIcon }
> = {
  PENDING:    { labelKey: 'orderPending',    classes: 'bg-amber-50 text-amber-700 border-amber-200',     Icon: Clock       },
  READY_FOR_PICKUP: { labelKey: 'orderReadyForPickup', classes: 'bg-amber-50 text-amber-700 border-amber-200', Icon: MapPin },
  CONFIRMED:  { labelKey: 'orderConfirmed',  classes: 'bg-blue-50 text-blue-700 border-blue-200',        Icon: CheckCircle2 },
  PROCESSING: { labelKey: 'orderProcessing', classes: 'bg-blue-50 text-blue-700 border-blue-200',        Icon: Loader2     },
  SHIPPED:    { labelKey: 'orderShipped',    classes: 'bg-purple-50 text-purple-700 border-purple-200',  Icon: Truck       },
  DELIVERED:  { labelKey: 'orderDelivered',  classes: 'bg-green-50 text-green-700 border-green-200',     Icon: CheckCircle2 },
  COMPLETED:  { labelKey: 'orderCompleted',  classes: 'bg-green-50 text-green-700 border-green-200',     Icon: CheckCircle2 },
  CANCELLED:  { labelKey: 'orderCancelled',  classes: 'bg-red-50 text-red-700 border-red-200',           Icon: XCircle     },
};

export default function OrderStatusBadge({ status, size = 'md' }: Props) {
  const { t } = useLanguage();
  const config = STATUS_CONFIG[status] ?? {
    labelKey: '',
    classes: 'bg-gray-50 text-gray-600 border-gray-200',
    Icon: Package,
  };

  const { Icon } = config;
  const label = config.labelKey ? t(config.labelKey) : status;
  const iconSize = size === 'sm' ? 11 : 13;
  const textSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]';
  const px = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 font-black uppercase tracking-wider border rounded-full whitespace-nowrap ${config.classes} ${textSize} ${px}`}
    >
      <Icon size={iconSize} className={status === 'PROCESSING' ? 'animate-spin' : ''} />
      {label}
    </span>
  );
}
