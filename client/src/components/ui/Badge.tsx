import { FC } from 'react';
import { EmailStatusType } from '../../types/email';

interface BadgeProps {
  status: EmailStatusType | string;
  className?: string;
}

export const Badge: FC<BadgeProps> = ({ status, className = '' }) => {
  const normalized = String(status).toUpperCase();

  let styles = 'bg-gray-100 text-gray-700 border-gray-200';
  let label = status;

  if (normalized === 'SCHEDULED') {
    styles = 'bg-green-50 text-green-700 border-green-200';
    label = 'Scheduled';
  } else if (normalized === 'SENT') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = 'Sent';
  } else if (normalized === 'FAILED') {
    styles = 'bg-red-50 text-red-700 border-red-200';
    label = 'Failed';
  } else if (normalized === 'PROCESSING') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
    label = 'Processing';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}
    >
      {label}
    </span>
  );
};
