import { FC } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { ComposeForm } from '../components/email/ComposeForm';
import { UserProfile } from '../types/email';

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
  onSubmitSend: (data: any) => void;
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
  onSubmitSend,
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
        fromEmail={user.email}
        onBack={onBack}
        onSubmitSend={onSubmitSend}
      />
    </AppLayout>
  );
};
