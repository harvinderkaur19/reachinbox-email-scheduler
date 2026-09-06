import { FC } from 'react';
import {
  ArrowLeft,
  Star,
  Trash2,
  Mail,
  Printer,
  FileText,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { EmailItem, UserProfile } from '../../types/email';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/IconButton';

interface EmailDetailProps {
  email: EmailItem;
  user: UserProfile;
  onBack: () => void;
}

export const EmailDetail: FC<EmailDetailProps> = ({
  email,
  user,
  onBack,
}) => {
  const isScheduled = email.status === 'SCHEDULED';

  return (
    <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Top Action Header Bar */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-md hover:bg-gray-200/60 text-gray-600 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to list</span>
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <Badge status={email.status} />
        </div>

        <div className="flex items-center gap-1">
          <IconButton title="Star">
            <Star className="w-4 h-4 text-gray-500 hover:text-amber-500" />
          </IconButton>
          <IconButton title="Mark as unread">
            <Mail className="w-4 h-4 text-gray-500" />
          </IconButton>
          <IconButton title="Print">
            <Printer className="w-4 h-4 text-gray-500" />
          </IconButton>
          <IconButton title="Delete">
            <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
          </IconButton>
        </div>
      </div>

      {/* Main Email Content */}
      <div className="p-8">
        {/* Subject Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">
          {email.subject}
        </h2>

        {/* Sender & Recipient Metadata */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-6 mb-6">
          <div className="flex items-start gap-3">
            <Avatar name={user.name} src={user.avatarUrl} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{user.name}</span>
                <span className="text-xs text-gray-500">&lt;{user.email}&gt;</span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                <span className="font-semibold text-gray-700">To:</span>{' '}
                {email.recipientEmail}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-gray-500 font-medium">
              {isScheduled ? `Scheduled for: ${email.scheduledAt}` : `Sent at: ${email.sentAt || email.createdAt}`}
            </span>
          </div>
        </div>

        {/* Message Body */}
        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed space-y-4">
          <p>{email.body}</p>

          {/* Highlighted Callout Content Block */}
          <div className="my-6 p-4 bg-green-50/60 border-l-4 border-green-600 rounded-r-md">
            <div className="flex items-center gap-2 text-green-800 font-semibold text-xs mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Automated Schedule Context</span>
            </div>
            <p className="text-xs text-green-900 font-medium leading-normal">
              This campaign email is managed by the ReachInbox Email Scheduler queue with minimum send spacing and hourly rate limiting active.
            </p>
          </div>
        </div>

        {/* Attachment Cards */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Attachments (1 file)
          </h4>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50/50 hover:bg-gray-50 w-64 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded bg-green-100 text-green-700 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    campaign_overview.pdf
                  </p>
                  <p className="text-[11px] text-gray-400">1.2 MB</p>
                </div>
              </div>
              <button
                type="button"
                className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
