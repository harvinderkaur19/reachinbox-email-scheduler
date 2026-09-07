import { FC, ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { UserProfile } from '../../types/email';
import { Plus, LogOut } from 'lucide-react';

interface AppLayoutProps {
  user: UserProfile;
  activeNav: 'scheduled' | 'sent';
  scheduledCount: number;
  sentCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate: (nav: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onRefresh?: () => void;
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
  onRefresh,
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
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden max-w-full">
        {/* Mobile Header Navigation (< 768px) */}
        <div className="md:hidden bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between gap-2 shrink-0 select-none">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-black text-white font-extrabold text-xs rounded flex items-center justify-center tracking-tighter shrink-0">
              ONE
            </div>
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => onNavigate('scheduled')}
                className={`px-2 py-1 font-semibold rounded-md transition-colors ${
                  activeNav === 'scheduled'
                    ? 'bg-white text-green-800 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Scheduled ({scheduledCount})
              </button>
              <button
                onClick={() => onNavigate('sent')}
                className={`px-2 py-1 font-semibold rounded-md transition-colors ${
                  activeNav === 'sent'
                    ? 'bg-white text-green-800 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sent ({sentCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onOpenCompose}
              className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-1 text-xs font-semibold shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Compose</span>
            </button>
            <button
              onClick={onLogout}
              className="p-1.5 text-gray-500 hover:text-red-600 transition-colors rounded-md hover:bg-gray-100"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Header
          title={activeNav === 'scheduled' ? 'Scheduled Emails' : 'Sent Emails'}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onRefresh={onRefresh}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-white p-4 sm:p-6 w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

