import { FC, MouseEvent } from 'react';
import { Star } from 'lucide-react';
import { EmailItem } from '../../types/email';
import { Badge } from '../ui/Badge';

interface EmailRowProps {
  email: EmailItem;
  onClick: () => void;
  onToggleStar?: (e: MouseEvent) => void;
}

export const EmailRow: FC<EmailRowProps> = ({
  email,
  onClick,
  onToggleStar,
}) => {
  const isScheduled = email.status === 'SCHEDULED';
  const displayTime = isScheduled
    ? email.scheduledAt
    : email.sentAt || email.createdAt;

  return (
    <div
      onClick={onClick}
      className="group flex items-center justify-between px-4 py-3.5 border-b border-gray-100 hover:bg-green-50/40 transition-colors cursor-pointer select-none"
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Status Badge */}
        <div className="shrink-0 w-24">
          <Badge status={email.status} />
        </div>

        {/* Recipient */}
        <div className="w-48 shrink-0 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            To: {email.recipientEmail}
          </p>
        </div>

        {/* Subject & Preview */}
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate shrink-0 max-w-xs">
            {email.subject}
          </span>
          <span className="text-xs text-gray-400 font-medium">--</span>
          <span className="text-xs text-gray-500 truncate min-w-0">
            {email.body}
          </span>
        </div>
      </div>

      {/* Date & Action Icons */}
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
          {displayTime}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar?.(e);
          }}
          className="text-gray-300 hover:text-amber-400 transition-colors p-1"
        >
          <Star
            className={`w-4 h-4 ${
              email.isStarred ? 'text-amber-400 fill-amber-400' : ''
            }`}
          />
        </button>
      </div>
    </div>
  );
};
