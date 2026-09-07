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
  const rawTime = isScheduled ? email.scheduledAt : email.sentAt || email.createdAt;
  let formattedTime = rawTime || '';
  if (rawTime) {
    const d = new Date(rawTime);
    if (!isNaN(d.getTime())) {
      formattedTime = d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  return (
    <div
      onClick={onClick}
      className="group flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 py-3 sm:py-3.5 border-b border-gray-100 hover:bg-green-50/40 transition-colors cursor-pointer select-none gap-2 sm:gap-4 min-w-0"
    >
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 flex-wrap sm:flex-nowrap">
        {/* Status Badge */}
        <div className="shrink-0 w-20 sm:w-24">
          <Badge status={email.status} />
        </div>

        {/* Recipient */}
        <div className="w-full sm:w-48 shrink-0 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
            To: {email.recipientEmail}
          </p>
        </div>

        {/* Subject & Preview */}
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate shrink-0 max-w-[150px] sm:max-w-xs">
            {email.subject}
          </span>
          {email.body && (
            <>
              <span className="hidden sm:inline text-xs text-gray-400 font-medium">--</span>
              <span className="hidden sm:inline text-xs text-gray-500 truncate min-w-0">
                {email.body}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Date & Action Icons */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 sm:ml-4 w-full sm:w-auto">
        <span className="text-[11px] sm:text-xs text-gray-500 font-medium whitespace-nowrap">
          {formattedTime}
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
