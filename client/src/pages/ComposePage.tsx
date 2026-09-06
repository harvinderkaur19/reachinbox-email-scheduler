import { FC } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { ComposeForm } from '../components/email/ComposeForm';
import { UserProfile, ScheduleEmailInput } from '../types/email';

interface ComposePageProps {
  user: UserProfile;
  activeNav: 'scheduled' | 'sent';
  scheduledCount: number;
  sentCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate: (nav: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onBack: () => void;
  onSubmitSchedule: (payload: ScheduleEmailInput) => Promise<void>;
  onLogout: () => void;
}

export const ComposePage: FC<ComposePageProps> = ({
  user,
  activeNav,
  scheduledCount,
  sentCount,
  searchQuery,
  onSearchChange,
  onNavigate,
  onOpenCompose,
  onBack,
  onSubmitSchedule,
  onLogout,
}) => {
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
      <ComposeForm
        user={user}
        onBack={onBack}
        onSubmitSchedule={onSubmitSchedule}
      />
    </AppLayout>
  );
};
