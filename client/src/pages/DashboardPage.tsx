import { FC } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { EmailList } from '../components/email/EmailList';
import { EmailItem, UserProfile } from '../types/email';

interface DashboardPageProps {
  user: UserProfile;
  activeNav: 'scheduled' | 'sent';
  emails: EmailItem[];
  scheduledCount: number;
  sentCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate: (nav: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onSelectEmail: (email: EmailItem) => void;
  onToggleStar: (emailId: string) => void;
  onLogout: () => void;
}

export const DashboardPage: FC<DashboardPageProps> = ({
  user,
  activeNav,
  emails,
  scheduledCount,
  sentCount,
  searchQuery,
  onSearchChange,
  onNavigate,
  onOpenCompose,
  onSelectEmail,
  onToggleStar,
  onLogout,
}) => {
  const filteredEmails = emails.filter((email) => {
    // Filter by Nav tab status
    if (activeNav === 'scheduled' && email.status !== 'SCHEDULED') return false;
    if (activeNav === 'sent' && email.status !== 'SENT' && email.status !== 'FAILED') return false;

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        email.recipientEmail.toLowerCase().includes(q) ||
        email.subject.toLowerCase().includes(q) ||
        email.body.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <AppLayout
      user={user}
      activeNav={activeNav}
      scheduledCount={scheduledCount}
      sentCount={sentCount}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      onNavigate={onNavigate}
      onOpenCompose={onOpenCompose}
      onLogout={onLogout}
    >
      <div className="space-y-4">
        {/* Email Table Header Info */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800">
              {activeNav === 'scheduled' ? 'Scheduled Queue' : 'Sent History'}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
              {filteredEmails.length} items
            </span>
          </div>

          <span className="text-xs text-gray-400 font-medium">
            Showing {filteredEmails.length} of {activeNav === 'scheduled' ? scheduledCount : sentCount}
          </span>
        </div>

        {/* Render Email List */}
        <EmailList
          emails={filteredEmails}
          onSelectEmail={onSelectEmail}
          onToggleStar={onToggleStar}
          emptyTitle={activeNav === 'scheduled' ? 'No scheduled emails' : 'No sent emails'}
          emptyDescription={
            activeNav === 'scheduled'
              ? 'Click the "+ Compose" button to schedule your first campaign email.'
              : 'Emails sent through Ethereal SMTP will appear here once processed.'
          }
        />
      </div>
    </AppLayout>
  );
};
