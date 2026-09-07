import { FC } from 'react';
import { X } from 'lucide-react';

interface RecipientChipProps {
  email: string;
  onRemove: () => void;
}

export const RecipientChip: FC<RecipientChipProps> = ({ email, onRemove }) => {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-800 border border-green-200 shadow-2xs max-w-full min-w-0">
      <span className="truncate max-w-[160px] sm:max-w-xs">{email}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-green-600 hover:text-green-900 hover:bg-green-100 rounded-full p-0.5 transition-colors focus:outline-none shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
};
