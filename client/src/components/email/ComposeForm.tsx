import { FC, useState, KeyboardEvent, ChangeEvent, useRef } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Send,
  Upload,
  ChevronDown,
  Loader2,
  AlertCircle,
  FileText,
  X,
} from 'lucide-react';
import { RecipientChip } from './RecipientChip';
import { EditorToolbar } from './EditorToolbar';
import { SchedulePopover } from './SchedulePopover';
import { Button } from '../ui/Button';
import { UserProfile, ScheduleEmailInput, EmailItem } from '../../types/email';
import { updateScheduledEmailApi } from '../../services/emailService';

interface ComposeFormProps {
  user: UserProfile;
  editingEmail?: EmailItem | null;
  onBack: () => void;
  onSubmitSchedule: (payload: ScheduleEmailInput) => Promise<void>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ComposeForm: FC<ComposeFormProps> = ({
  user,
  editingEmail,
  onBack,
  onSubmitSchedule,
}) => {
  // 1. Sender Account Resolution
  const activeSender =
    user.senderAccounts && user.senderAccounts.length > 0
      ? user.senderAccounts[0]
      : null;

  // Extract initial body and attachments if editing an existing scheduled email
  const parseInitialEmail = () => {
    if (!editingEmail) {
      return {
        recipients: ['alpha@example.com', 'beta@example.com'],
        subject: 'Q4 Product Release Update',
        body: 'Hi team,\n\nHere is the latest product update for Q4. Please review the attached schedule and let us know if you have any questions.\n\nBest regards,\nReachInbox Team',
        attachments: [],
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    let cleanBody = editingEmail.body || '';
    let parsedAttachments: any[] = [];

    if (editingEmail.attachments && Array.isArray(editingEmail.attachments) && editingEmail.attachments.length > 0) {
      parsedAttachments = editingEmail.attachments;
    } else {
      const attachmentMatch = cleanBody.match(/<!--ATTACHMENTS:(.*?)-->$/s);
      if (attachmentMatch && attachmentMatch[1]) {
        try {
          parsedAttachments = JSON.parse(attachmentMatch[1]);
          cleanBody = cleanBody.replace(/<!--ATTACHMENTS:(.*?)-->$/s, '').trim();
        } catch (e) {}
      }
    }

    return {
      recipients: [editingEmail.recipientEmail],
      subject: editingEmail.subject,
      body: cleanBody,
      attachments: parsedAttachments.map((att) => ({
        name: att.filename || att.name,
        size: Math.round(((att.content || att.base64 || '').length * 3) / 4),
        type: att.contentType || att.type || 'application/octet-stream',
        base64: att.content || att.base64 || '',
      })),
      scheduledAt: editingEmail.scheduledAt || new Date().toISOString(),
    };
  };

  const initialData = parseInitialEmail();

  // 2. Form State
  const [recipients, setRecipients] = useState<string[]>(initialData.recipients);
  const [recipientInput, setRecipientInput] = useState<string>('');
  const [subject, setSubject] = useState<string>(initialData.subject);
  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(10);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);
  const [body, setBody] = useState<string>(initialData.body);
  const [scheduledAt, setScheduledAt] = useState<string>(initialData.scheduledAt);

  // UI state
  const [showSendLater, setShowSendLater] = useState<boolean>(false);
  const [showSendDropdown, setShowSendDropdown] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    fileName: string;
    count: number;
  } | null>(null);

  // File Attachment State & References
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{ name: string; size: number; type: string; base64: string }>
  >(initialData.attachments);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const handleAttachmentSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setFormError(`File "${file.name}" exceeds maximum allowed attachment size (5MB).`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        if (!result) return;
        const base64Data = result.split(',')[1] || '';

        setAttachedFiles((prev) => [
          ...prev.filter((f) => f.name !== file.name),
          {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            base64: base64Data,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (filename: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== filename));
  };

  // 3. Recipient Add Handler (Enter, comma, semicolon)
  const addSingleRecipient = (rawInput: string) => {
    const cleaned = rawInput.trim().toLowerCase().replace(/[,;]/g, '');
    if (!cleaned) return;

    if (!EMAIL_REGEX.test(cleaned)) {
      setFormError(`"${cleaned}" is not a valid email address.`);
      return;
    }

    setFormError(null);
    if (!recipients.includes(cleaned)) {
      setRecipients((prev) => [...prev, cleaned]);
    }
  };

  const handleKeyDownRecipient = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      addSingleRecipient(recipientInput);
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    setRecipients(recipients.filter((r) => r !== emailToRemove));
  };

  // 4. File Upload Handler (.csv & .txt parsing)
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const reader = new FileReader();

    reader.onload = (evt) => {
      const textContent = evt.target?.result as string;
      if (!textContent) return;

      // Extract emails via Regex pattern
      const emailMatches =
        textContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];

      const normalizedExtracted = Array.from(
        new Set(emailMatches.map((em) => em.trim().toLowerCase()))
      );

      if (normalizedExtracted.length === 0) {
        setFormError(`No valid email addresses detected in ${fileName}`);
        return;
      }

      setFormError(null);

      // Merge and deduplicate with existing recipients
      const updatedList = Array.from(new Set([...recipients, ...normalizedExtracted]));

      setRecipients(updatedList);
      setUploadedFileInfo({ fileName, count: normalizedExtracted.length });
    };

    reader.readAsText(file);
    // Reset file input value to allow re-uploading the same file if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 5. Submit Schedule Handler
  const handleScheduleSubmit = async () => {
    if (isSubmitting) return; // Prevent double submission

    setFormError(null);

    // Form Validation
    const senderId = activeSender?.id;
    if (!senderId) {
      setFormError('No valid sender account found for user. Please check your account.');
      return;
    }

    // Flush any pending recipient text in the input box
    let finalRecipients = [...recipients];
    if (recipientInput.trim()) {
      const pendingClean = recipientInput.trim().toLowerCase().replace(/[,;]/g, '');
      if (EMAIL_REGEX.test(pendingClean) && !finalRecipients.includes(pendingClean)) {
        finalRecipients.push(pendingClean);
        setRecipientInput('');
      }
    }

    if (finalRecipients.length === 0) {
      setFormError('At least one recipient email address is required.');
      return;
    }

    if (!subject.trim()) {
      setFormError('Subject line cannot be empty.');
      return;
    }

    if (!body.trim()) {
      setFormError('Email body content cannot be empty.');
      return;
    }

    const startTimeMs = new Date(scheduledAt).getTime();
    if (isNaN(startTimeMs)) {
      setFormError('Start time must be a valid date and time.');
      return;
    }

    if (isNaN(delayBetweenEmails) || delayBetweenEmails < 0) {
      setFormError('Delay between emails must be an integer greater than or equal to 0.');
      return;
    }

    if (isNaN(hourlyLimit) || hourlyLimit < 1) {
      setFormError('Hourly limit must be a positive integer >= 1.');
      return;
    }

    const payload: ScheduleEmailInput = {
      senderAccountId: senderId,
      subject: subject.trim(),
      body: body.trim(),
      recipients: finalRecipients,
      startTime: new Date(scheduledAt).toISOString(),
      delayBetweenEmails: Math.floor(delayBetweenEmails),
      hourlyLimit: Math.floor(hourlyLimit),
      attachments: attachedFiles.map((f) => ({
        filename: f.name,
        contentType: f.type,
        content: f.base64,
      })),
    };

    try {
      setIsSubmitting(true);
      if (editingEmail) {
        await updateScheduledEmailApi(editingEmail.id, {
          subject: payload.subject,
          body: payload.body,
          recipientEmail: payload.recipients[0],
          scheduledAt: payload.startTime,
          attachments: payload.attachments,
        });
        onBack();
      } else {
        await onSubmitSchedule(payload);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to schedule campaign');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col min-h-[500px] sm:min-h-[600px] w-full max-w-full">
      {/* Hidden File Input for CSV/TXT Recipient List Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv,.txt"
        className="hidden"
      />

      {/* Hidden File Input for Email Attachments */}
      <input
        type="file"
        ref={attachmentInputRef}
        onChange={handleAttachmentSelect}
        multiple
        className="hidden"
      />

      {/* Top Header Controls Bar */}
      <div className="px-3 sm:px-6 py-3 sm:py-3.5 border-b border-gray-200 bg-gray-50/50 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="p-1.5 rounded-md hover:bg-gray-200/60 text-gray-600 transition-colors flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="h-4 w-px bg-gray-200 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight truncate">
            Compose New Email
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Functional Attachment Button */}
          <button
            type="button"
            onClick={() => attachmentInputRef.current?.click()}
            className="p-2 rounded-md hover:bg-gray-200/60 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer relative"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
            {attachedFiles.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {attachedFiles.length}
              </span>
            )}
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

          {/* Green Send / Schedule CTA Dropdown Button */}
          <div className="relative inline-flex rounded-md shadow-sm">
            <Button
              variant="primary"
              size="sm"
              onClick={handleScheduleSubmit}
              disabled={isSubmitting}
              className="rounded-r-none pr-3"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{isSubmitting ? 'Scheduling...' : 'Schedule Campaign'}</span>
            </Button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowSendDropdown(!showSendDropdown)}
              className="bg-green-700 hover:bg-green-800 text-white px-2 rounded-r-md border-l border-green-800 flex items-center justify-center focus:outline-none disabled:opacity-50"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showSendDropdown && (
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg py-1 w-48 z-30">
                <button
                  onClick={() => {
                    setShowSendDropdown(false);
                    handleScheduleSubmit();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5 text-green-600" />
                  Schedule Now
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

      {/* Form Error Banner */}
      {formError && (
        <div className="px-3 sm:px-6 py-2.5 bg-red-50 border-b border-red-200 flex items-center gap-2 text-xs text-red-700 font-semibold">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span className="flex-1 min-w-0">{formError}</span>
          <button
            onClick={() => setFormError(null)}
            className="text-red-500 hover:text-red-700 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Scheduled Info Banner */}
      {scheduledAt && (
        <div className="px-3 sm:px-6 py-2 bg-green-50 border-b border-green-200 flex items-center justify-between text-xs text-green-900 font-medium flex-wrap gap-1">
          <span className="truncate min-w-0">
            Scheduled Start Time:{' '}
            {new Date(scheduledAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
          </span>
          <button
            type="button"
            onClick={() => setShowSendLater(true)}
            className="text-green-700 underline hover:text-green-900 text-[11px] shrink-0"
          >
            Change schedule
          </button>
        </div>
      )}

      {/* Uploaded File Banner */}
      {uploadedFileInfo && (
        <div className="px-3 sm:px-6 py-2 bg-blue-50 border-b border-blue-200 flex items-center justify-between text-xs text-blue-900 font-medium flex-wrap gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">
              Loaded <strong>{uploadedFileInfo.count}</strong> email addresses from{' '}
              <strong>{uploadedFileInfo.fileName}</strong>
            </span>
          </div>
          <button
            onClick={() => setUploadedFileInfo(null)}
            className="text-blue-700 underline hover:text-blue-900 text-[11px] shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Attached Files Chips Banner */}
      {attachedFiles.length > 0 && (
        <div className="px-3 sm:px-6 py-2 bg-purple-50 border-b border-purple-200 flex items-center gap-2 flex-wrap text-xs text-purple-900 font-medium">
          <Paperclip className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span className="shrink-0 font-bold">Attachments ({attachedFiles.length}):</span>
          {attachedFiles.map((file) => (
            <div
              key={file.name}
              className="inline-flex items-center gap-1.5 bg-white border border-purple-200 text-purple-800 px-2 py-0.5 rounded shadow-2xs text-xs font-semibold max-w-full min-w-0"
            >
              <span className="truncate max-w-[120px] sm:max-w-[150px]">{file.name}</span>
              <span className="text-[10px] text-purple-500 font-normal shrink-0">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(file.name)}
                className="text-purple-400 hover:text-purple-700 p-0.5 rounded cursor-pointer shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}


      {/* Form Fields */}
      <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 flex-1 flex flex-col min-w-0 max-w-full">
        {/* From Field */}
        <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-100 pb-3 gap-1 sm:gap-0">
          <span className="w-16 sm:w-24 text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">
            From:
          </span>
          <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
            {activeSender ? `${activeSender.name} <${activeSender.email}>` : user.email}
          </span>
        </div>

        {/* To Field with Recipient Chips & Upload List Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-gray-100 pb-3 gap-2 sm:gap-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
            <span className="w-16 sm:w-24 text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">
              To:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
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
                onKeyDown={handleKeyDownRecipient}
                onBlur={() => {
                  if (recipientInput.trim()) {
                    addSingleRecipient(recipientInput);
                    setRecipientInput('');
                  }
                }}
                placeholder={recipients.length === 0 ? 'Type email & press Enter or comma...' : 'Add email...'}
                className="text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none min-w-[120px] flex-1 py-1"
              />
            </div>
          </div>

          {/* Functional CSV/TXT Upload Control */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
            title="Upload CSV or TXT recipient list"
          >
            <Upload className="w-3.5 h-3.5 text-green-600" />
            <span>Upload List</span>
          </button>
        </div>

        {/* Subject Field */}
        <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-100 pb-3 gap-1 sm:gap-0">
          <span className="w-16 sm:w-24 text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">
            Subject:
          </span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
            className="w-full text-xs sm:text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none py-1"
          />
        </div>

        {/* Delay & Hourly Limit Configuration Numeric Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-gray-50/70 p-3 sm:p-3.5 rounded-md border border-gray-200">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Delay between 2 emails (seconds)
            </label>
            <input
              type="number"
              min={0}
              value={delayBetweenEmails}
              onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-1.5 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
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
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-1.5 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* Message Editor Area */}
        <div className="flex-1 flex flex-col border border-gray-200 rounded-md overflow-hidden min-h-[180px] sm:min-h-[220px] min-w-0 max-w-full">
          <EditorToolbar />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email body here..."
            className="flex-1 w-full p-3 sm:p-4 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none resize-none font-sans leading-relaxed min-w-0"
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
