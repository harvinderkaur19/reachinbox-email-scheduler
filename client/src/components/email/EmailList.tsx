import { FC } from 'react';
import { Mail } from 'lucide-react';
import { EmailItem } from '../../types/email';
import { EmailRow } from './EmailRow';

interface EmailListProps {
  emails: EmailItem[];
  onSelectEmail: (email: EmailItem) => void;
  onToggleStar?: (emailId: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const EmailList: FC<EmailListProps> = ({
  emails,
  onSelectEmail,
  onToggleStar,
  emptyTitle = 'No emails found',
  emptyDescription = 'There are no emails matching your criteria.',
}) => {
  if (emails.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-3">
          <Mail className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">{emptyTitle}</h3>
        <p className="text-xs text-gray-500 max-w-sm mt-1">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white divide-y divide-gray-100 shadow-sm">
      {emails.map((email) => (
        <EmailRow
          key={email.id}
          email={email}
          onClick={() => onSelectEmail(email)}
          onToggleStar={() => onToggleStar?.(email.id)}
        />
      ))}
    </div>
  );
};
