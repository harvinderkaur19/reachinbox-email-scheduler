import { FC, ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { UserProfile } from '../../types/email';

interface AppLayoutProps {
  user: UserProfile;
  activeNav: 'scheduled' | 'sent';
  scheduledCount: number;
  sentCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate: (nav: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onLogout: () => void;
  children: ReactNode;
}

export const AppLayout: FC<AppLayoutProps> = ({
  user,
  activeNav,
  scheduledCount,
  sentCount,
  searchQuery,
  onSearchChange,
  onNavigate,
  onOpenCompose,
  onLogout,
  children,
}) => {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans antialiased overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        user={user}
        activeNav={activeNav}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
        onNavigate={onNavigate}
        onOpenCompose={onOpenCompose}
        onLogout={onLogout}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          title={activeNav === 'scheduled' ? 'Scheduled Emails' : 'Sent Emails'}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
        <main className="flex-1 overflow-y-auto bg-white p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
