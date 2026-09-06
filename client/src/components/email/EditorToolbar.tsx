import { FC } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  Image,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { IconButton } from '../ui/IconButton';

export const EditorToolbar: FC = () => {
  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-200 bg-gray-50/70 text-gray-600 rounded-t-md select-none">
      <IconButton title="Bold"><Bold className="w-4 h-4" /></IconButton>
      <IconButton title="Italic"><Italic className="w-4 h-4" /></IconButton>
      <IconButton title="Underline"><Underline className="w-4 h-4" /></IconButton>
      <IconButton title="Strikethrough"><Strikethrough className="w-4 h-4" /></IconButton>
      <div className="h-4 w-px bg-gray-200 mx-1" />
      <IconButton title="Insert Link"><Link className="w-4 h-4" /></IconButton>
      <IconButton title="Insert Image"><Image className="w-4 h-4" /></IconButton>
      <div className="h-4 w-px bg-gray-200 mx-1" />
      <IconButton title="Bullet List"><List className="w-4 h-4" /></IconButton>
      <IconButton title="Numbered List"><ListOrdered className="w-4 h-4" /></IconButton>
      <div className="h-4 w-px bg-gray-200 mx-1" />
      <IconButton title="Align Left"><AlignLeft className="w-4 h-4" /></IconButton>
      <IconButton title="Align Center"><AlignCenter className="w-4 h-4" /></IconButton>
      <IconButton title="Align Right"><AlignRight className="w-4 h-4" /></IconButton>
    </div>
  );
};
