import { FC } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { EmailDetail } from '../components/email/EmailDetail';
import { EmailItem, UserProfile } from '../types/email';

interface EmailDetailPageProps {
  user: UserProfile;
  activeNav: 'scheduled' | 'sent';
  email: EmailItem;
  scheduledCount: number;
  sentCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate: (nav: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onBack: () => void;
  onEdit?: (email: EmailItem) => void;
  onLogout: () => void;
}

export const EmailDetailPage: FC<EmailDetailPageProps> = ({
  user,
  activeNav,
  email,
  scheduledCount,
  sentCount,
  searchQuery,
  onSearchChange,
  onNavigate,
  onOpenCompose,
  onBack,
  onEdit,
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
      <EmailDetail email={email} user={user} onBack={onBack} onEdit={onEdit} />
    </AppLayout>
  );
};

