import { FC } from 'react';
import { Search, SlidersHorizontal, RotateCw } from 'lucide-react';
import { IconButton } from '../ui/IconButton';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh?: () => void;
  title: string;
}

export const Header: FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
  title,
}) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-10">
      {/* Title */}
      <h1 className="text-lg font-bold text-gray-900 capitalize tracking-tight shrink-0">
        {title}
      </h1>

      {/* Right Controls: Search bar & Toolbar Buttons */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search emails..."
            className="w-full bg-gray-50 border border-gray-200 rounded-md pl-9 pr-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 border-l border-gray-200 pl-2 shrink-0">
          <IconButton title="Filter" className="hover:text-green-600">
            <SlidersHorizontal className="w-4 h-4" />
          </IconButton>
          <IconButton title="Refresh" onClick={onRefresh} className="hover:text-green-600">
            <RotateCw className="w-4 h-4" />
          </IconButton>
        </div>
      </div>
    </header>
  );
};
