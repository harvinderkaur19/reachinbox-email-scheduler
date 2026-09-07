import { FC, useState } from 'react';
import {
  Calendar,
  Send,
  Plus,
  ChevronDown,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../../types/email';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

interface SidebarProps {
  user: UserProfile;
  activeNav: 'scheduled' | 'sent';
  scheduledCount: number;
  sentCount: number;
  onNavigate: (nav: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onLogout: () => void;
}

export const Sidebar: FC<SidebarProps> = ({
  user,
  activeNav,
  scheduledCount,
  sentCount,
  onNavigate,
  onOpenCompose,
  onLogout,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
      <div className="flex flex-col">
        {/* Top Wordmark Branding - "ONE" Branding per Figma spec */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black text-white font-extrabold text-sm rounded flex items-center justify-center tracking-tighter">
              ONE
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">ONE</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
            v1.0
          </span>
        </div>

        {/* User Profile Section (Name, Email, Avatar, Logout per Correction 2) */}
        <div className="p-3 border-b border-gray-100 relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={user.name} src={user.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate leading-tight mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute left-3 right-3 top-16 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500">Signed in as</p>
                <p className="text-xs font-semibold text-gray-800 truncate">{user.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout();
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Compose Button */}
        <div className="p-4">
          <Button
            variant="outline"
            fullWidth
            onClick={onOpenCompose}
            className="border-green-600 text-green-700 hover:bg-green-50 font-semibold py-2.5 shadow-sm"
          >
            <Plus className="w-4 h-4 text-green-600" />
            Compose
          </Button>
        </div>

        {/* Navigation Core Section */}
        <div className="px-3 py-2">
          <div className="px-3 mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Core
            </span>
          </div>

          <nav className="flex flex-col gap-1">
            {/* Scheduled Navigation */}
            <button
              onClick={() => onNavigate('scheduled')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${
                activeNav === 'scheduled'
                  ? 'bg-green-50 text-green-800 font-semibold border-l-4 border-green-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar
                  className={`w-4 h-4 ${
                    activeNav === 'scheduled' ? 'text-green-600' : 'text-gray-400'
                  }`}
                />
                <span>Scheduled</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  activeNav === 'scheduled'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {scheduledCount}
              </span>
            </button>

            {/* Sent Navigation */}
            <button
              onClick={() => onNavigate('sent')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${
                activeNav === 'sent'
                  ? 'bg-green-50 text-green-800 font-semibold border-l-4 border-green-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Send
                  className={`w-4 h-4 ${
                    activeNav === 'sent' ? 'text-green-600' : 'text-gray-400'
                  }`}
                />
                <span>Sent</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  activeNav === 'sent'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {sentCount}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Sparkles className="w-3.5 h-3.5 text-green-600" />
          <span>ReachInbox Email Scheduler</span>
        </div>
      </div>
    </aside>
  );
};
