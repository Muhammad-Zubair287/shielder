'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Clock, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { UserStatus } from './types';

interface Props {
  status: UserStatus | string;
  size?: 'sm' | 'md';
}

const ACTIVE_CONFIG = {
  labelKey: 'userActive',
  classes: 'bg-green-50 text-green-700 border-green-200',
  Icon: CheckCircle2 as LucideIcon,
};

const INACTIVE_CONFIG = {
  labelKey: 'userInactive',
  classes: 'bg-red-50 text-red-700 border-red-200',
  Icon: XCircle as LucideIcon,
};

const STATUS_CONFIG: Record<string, { labelKey: string; classes: string; Icon: LucideIcon }> = {
  ACTIVE:               { labelKey: 'userActive',      classes: 'bg-green-50 text-green-700 border-green-200',      Icon: CheckCircle2 },
  INACTIVE:             { labelKey: 'userInactive',    classes: 'bg-red-50 text-red-700 border-red-200',            Icon: XCircle      },
  SUSPENDED:            { labelKey: 'userSuspended',   classes: 'bg-orange-50 text-orange-700 border-orange-200',   Icon: AlertCircle  },
  PENDING_VERIFICATION: { labelKey: 'userPending',     classes: 'bg-amber-50 text-amber-700 border-amber-200',      Icon: Clock        },
  PENDING:              { labelKey: 'userPending',     classes: 'bg-amber-50 text-amber-700 border-amber-200',      Icon: Clock        },
};

export default function StatusBadge({ status, size = 'md' }: Props) {
  const { t } = useLanguage();

  function resolveConfig(): { labelKey: string; classes: string; Icon: LucideIcon } {
    if (status && STATUS_CONFIG[status]) {
      return STATUS_CONFIG[status];
    }
    // Fallback to ACTIVE if status is not recognized
    return ACTIVE_CONFIG;
  }
  
  const config = resolveConfig();

  const { Icon } = config;
  const label = t(config.labelKey);
  const iconSize = size === 'sm' ? 11 : 13;
  const textSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]';
  const px = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 font-black uppercase tracking-wider border rounded-full whitespace-nowrap ${config.classes} ${textSize} ${px}`}
    >
      <Icon size={iconSize} />
      {label}
    </span>
  );
}
