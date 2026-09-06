import { FC } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { EmailList } from '../components/email/EmailList';
import { EmailItem, UserProfile } from '../types/email';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface DashboardPageProps {
  user: UserProfile;
  activeNav: 'scheduled' | 'sent';
  emails: EmailItem[];
  scheduledCount: number;
  sentCount: number;
  searchQuery: string;
  isFetching?: boolean;
  fetchError?: string | null;
  onSearchChange: (q: string) => void;
  onNavigate: (nav: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onSelectEmail: (email: EmailItem) => void;
  onToggleStar: (emailId: string) => void;
  onRefresh?: () => void;
  onLogout: () => void;
}

export const DashboardPage: FC<DashboardPageProps> = ({
  user,
  activeNav,
  emails,
  scheduledCount,
  sentCount,
  searchQuery,
  isFetching = false,
  fetchError = null,
  onSearchChange,
  onNavigate,
  onOpenCompose,
  onSelectEmail,
  onToggleStar,
  onRefresh,
  onLogout,
}) => {
  const isSearchActive = Boolean(searchQuery.trim());
  const displayEmails = emails;
  const totalCount = isSearchActive ? emails.length : activeNav === 'scheduled' ? scheduledCount : sentCount;

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
      onRefresh={onRefresh}
      onLogout={onLogout}
    >
      <div className="space-y-4">
        {/* Email Table Header Info */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800">
              {isSearchActive
                ? `Search Results for "${searchQuery.trim()}"`
                : activeNav === 'scheduled'
                ? 'Scheduled Queue'
                : 'Sent History'}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
              {displayEmails.length} items
            </span>
          </div>

          <span className="text-xs text-gray-400 font-medium">
            Showing {displayEmails.length} of {totalCount}
          </span>
        </div>

        {/* Loading Indicator */}
        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin text-green-600 mb-2" />
            <p className="text-xs font-semibold text-gray-600">
              {isSearchActive ? 'Searching emails...' : 'Loading emails...'}
            </p>
          </div>
        ) : fetchError ? (
          /* Error State */
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-md mx-auto my-8">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-red-900 mb-1">
              {isSearchActive ? 'Search Error' : 'Failed to load emails'}
            </h3>
            <p className="text-xs text-red-600 mb-4">{fetchError}</p>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} className="mx-auto">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-gray-600" />
                Retry
              </Button>
            )}
          </div>
        ) : (
          /* Render Email List */
          <EmailList
            emails={displayEmails}
            onSelectEmail={onSelectEmail}
            onToggleStar={onToggleStar}
            emptyTitle={
              isSearchActive
                ? 'No search results found'
                : activeNav === 'scheduled'
                ? 'No scheduled emails'
                : 'No sent emails'
            }
            emptyDescription={
              isSearchActive
                ? `No emails matched your search term "${searchQuery.trim()}".`
                : activeNav === 'scheduled'
                ? 'Click the "+ Compose" button to schedule your first campaign email.'
                : 'Emails sent through Ethereal SMTP will appear here once processed.'
            }
          />
        )}
      </div>
    </AppLayout>
  );
};
