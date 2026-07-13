'use client';

import { X, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

type AlertType = 'error' | 'success' | 'warning' | 'info';

interface AuthAlertProps {
  type: AlertType;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const CONFIG: Record<AlertType, { icon: React.ReactNode; classes: string }> = {
  error: {
    icon: <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />,
    classes: 'bg-red-50 border-red-200 text-red-700',
  },
  success: {
    icon: <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />,
    classes: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />,
    classes: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  info: {
    icon: <Info className="w-4 h-4 shrink-0 mt-0.5" />,
    classes: 'bg-blue-50 border-blue-200 text-blue-700',
  },
};

export function AuthAlert({ type, message, onDismiss, className = '' }: AuthAlertProps) {
  const { icon, classes } = CONFIG[type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl border text-sm leading-snug ${classes} ${className}`}
    >
      {icon}
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
