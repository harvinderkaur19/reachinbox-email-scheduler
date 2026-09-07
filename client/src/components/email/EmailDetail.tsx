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
  Edit,
} from 'lucide-react';
import { EmailItem, UserProfile } from '../../types/email';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/IconButton';

interface EmailDetailProps {
  email: EmailItem;
  user: UserProfile;
  onBack: () => void;
  onEdit?: (email: EmailItem) => void;
}

export const EmailDetail: FC<EmailDetailProps> = ({
  email,
  user,
  onBack,
  onEdit,
}) => {
  const isScheduled = email.status === 'SCHEDULED';

  // Parse clean text body & attachments from email.body if serialized comment exists
  let cleanBody = email.body || '';
  let attachments: Array<{ filename: string; contentType?: string; content: string }> = [];

  if (email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0) {
    attachments = email.attachments.map((att: any) => ({
      filename: att.filename || att.name,
      contentType: att.contentType || att.type,
      content: att.content || att.base64,
    }));
  } else {
    const attachmentMatch = cleanBody.match(/<!--ATTACHMENTS:(.*?)-->$/s);
    if (attachmentMatch && attachmentMatch[1]) {
      try {
        attachments = JSON.parse(attachmentMatch[1]);
        cleanBody = cleanBody.replace(/<!--ATTACHMENTS:(.*?)-->$/s, '').trim();
      } catch (err) {}
    }
  }

  const downloadAttachment = (att: { filename: string; contentType?: string; content: string }) => {
    try {
      const link = document.createElement('a');
      link.href = `data:${att.contentType || 'application/octet-stream'};base64,${att.content}`;
      link.download = att.filename;
      link.click();
    } catch (e) {
      console.error('Failed to download attachment:', e);
    }
  };

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
          {isScheduled && onEdit && (
            <button
              onClick={() => onEdit(email)}
              className="mr-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Schedule</span>
            </button>
          )}

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
          <p className="whitespace-pre-wrap">{cleanBody}</p>

          {email.failureReason && (
            <div className="my-4 p-4 bg-red-50 border-l-4 border-red-600 rounded-r-md text-xs text-red-900">
              <strong className="font-bold">Delivery Error:</strong> {email.failureReason}
            </div>
          )}

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
        {attachments.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Attachments ({attachments.length} {attachments.length === 1 ? 'file' : 'files'})
            </h4>
            <div className="flex flex-wrap gap-3">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50/50 hover:bg-gray-50 w-64 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded bg-green-100 text-green-700 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {att.filename}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {Math.round((att.content.length * 3) / 4096)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadAttachment(att)}
                    className="p-1 text-gray-400 hover:text-green-600 transition-colors cursor-pointer"
                    title="Download attachment"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

