import { FC, useState, KeyboardEvent } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Send,
  Upload,
  ChevronDown,
} from 'lucide-react';
import { RecipientChip } from './RecipientChip';
import { EditorToolbar } from './EditorToolbar';
import { SchedulePopover } from './SchedulePopover';
import { Button } from '../ui/Button';

interface ComposeFormProps {
  fromEmail: string;
  onBack: () => void;
  onSubmitSend: (data: any) => void;
}

export const ComposeForm: FC<ComposeFormProps> = ({
  fromEmail,
  onBack,
  onSubmitSend,
}) => {
  const [recipients, setRecipients] = useState<string[]>([
    'alpha@example.com',
    'beta@example.com',
  ]);
  const [recipientInput, setRecipientInput] = useState<string>('');
  const [subject, setSubject] = useState<string>('Q4 Product Update');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(10);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);
  const [body, setBody] = useState<string>(
    'Hi team,\n\nHere is the latest product update for Q4. Please review the attached document and let us know if you have any questions.\n\nBest regards,\nReachInbox Team'
  );
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);

  const [showSendLater, setShowSendLater] = useState<boolean>(false);
  const [showSendDropdown, setShowSendDropdown] = useState<boolean>(false);

  const handleAddRecipient = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = recipientInput.trim().replace(/,/g, '');
      if (trimmed && !recipients.includes(trimmed)) {
        setRecipients([...recipients, trimmed]);
        setRecipientInput('');
      }
    }
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    setRecipients(recipients.filter((r) => r !== emailToRemove));
  };

  const handleSendNow = () => {
    onSubmitSend({
      fromEmail,
      recipients,
      subject,
      delayBetweenEmails,
      hourlyLimit,
      body,
      scheduledAt: scheduledAt || new Date().toISOString(),
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col min-h-[600px]">
      {/* Top Header Controls Bar */}
      <div className="px-6 py-3.5 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-md hover:bg-gray-200/60 text-gray-600 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <h2 className="text-base font-bold text-gray-900 tracking-tight">
            Compose New Email
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Visual Attachment Icon */}
          <button
            type="button"
            className="p-2 rounded-md hover:bg-gray-200/60 text-gray-500 hover:text-gray-900 transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Clock / Send Later Icon */}
          <button
            type="button"
            onClick={() => setShowSendLater(true)}
            className="p-2 rounded-md hover:bg-gray-200/60 text-gray-500 hover:text-gray-900 transition-colors"
            title="Schedule send time"
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Green Send / Send Later CTA Dropdown Button */}
          <div className="relative inline-flex rounded-md shadow-sm">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSendNow}
              className="rounded-r-none pr-3"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{scheduledAt ? 'Schedule Send' : 'Send'}</span>
            </Button>
            <button
              type="button"
              onClick={() => setShowSendDropdown(!showSendDropdown)}
              className="bg-green-700 hover:bg-green-800 text-white px-2 rounded-r-md border-l border-green-800 flex items-center justify-center focus:outline-none"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showSendDropdown && (
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg py-1 w-44 z-30">
                <button
                  onClick={() => {
                    setShowSendDropdown(false);
                    handleSendNow();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5 text-green-600" />
                  Send Now
                </button>
                <button
                  onClick={() => {
                    setShowSendDropdown(false);
                    setShowSendLater(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                >
                  <Clock className="w-3.5 h-3.5 text-green-600" />
                  Schedule for Later...
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scheduled Info Banner if active */}
      {scheduledAt && (
        <div className="px-6 py-2 bg-green-50 border-b border-green-200 flex items-center justify-between text-xs text-green-900 font-medium">
          <span>Scheduled to send at: {new Date(scheduledAt).toLocaleString()}</span>
          <button
            onClick={() => setScheduledAt(null)}
            className="text-green-700 underline hover:text-green-900 text-[11px]"
          >
            Clear schedule
          </button>
        </div>
      )}

      {/* Form Fields */}
      <div className="p-6 space-y-4 flex-1 flex flex-col">
        {/* From Field */}
        <div className="flex items-center border-b border-gray-100 pb-3">
          <span className="w-24 text-xs font-bold text-gray-500 uppercase tracking-wider">
            From:
          </span>
          <span className="text-sm font-semibold text-gray-800">{fromEmail}</span>
        </div>

        {/* To Field with Recipient Chips & Upload List Visual Control */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <span className="w-24 text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">
              To:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              {recipients.map((r) => (
                <RecipientChip
                  key={r}
                  email={r}
                  onRemove={() => handleRemoveRecipient(r)}
                />
              ))}
              <input
                type="email"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleAddRecipient}
                placeholder={recipients.length === 0 ? 'Type email & press Enter...' : 'Add email...'}
                className="text-sm text-gray-800 placeholder-gray-400 focus:outline-none min-w-[160px] flex-1 py-1"
              />
            </div>
          </div>

          {/* Visual CSV/Text List Upload Control per Correction 5 */}
          <button
            type="button"
            className="text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors shrink-0"
            title="Upload CSV or TXT recipient list (Visual control)"
          >
            <Upload className="w-3.5 h-3.5 text-green-600" />
            <span>Upload List</span>
          </button>
        </div>

        {/* Subject Field */}
        <div className="flex items-center border-b border-gray-100 pb-3">
          <span className="w-24 text-xs font-bold text-gray-500 uppercase tracking-wider">
            Subject:
          </span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
            className="w-full text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none py-1"
          />
        </div>

        {/* Delay & Hourly Limit Configuration Numeric Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/70 p-3.5 rounded-md border border-gray-200">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Delay between 2 emails (seconds)
            </label>
            <input
              type="number"
              min={0}
              value={delayBetweenEmails}
              onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Hourly Limit (emails per hour)
            </label>
            <input
              type="number"
              min={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* Message Editor Area */}
        <div className="flex-1 flex flex-col border border-gray-200 rounded-md overflow-hidden min-h-[220px]">
          <EditorToolbar />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email body here..."
            className="flex-1 w-full p-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none resize-none font-sans leading-relaxed"
          />
        </div>
      </div>

      {/* Send Later Popover Modal */}
      <SchedulePopover
        isOpen={showSendLater}
        onClose={() => setShowSendLater(false)}
        onSelectSchedule={(isoTime) => setScheduledAt(isoTime)}
      />
    </div>
  );
};
