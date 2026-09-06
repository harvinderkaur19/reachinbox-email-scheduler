import { ButtonHTMLAttributes, FC, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  active?: boolean;
  title?: string;
}

export const IconButton: FC<IconButtonProps> = ({
  children,
  active = false,
  title,
  className = '',
  ...props
}) => {
  return (
    <button
      type="button"
      title={title}
      className={`p-1.5 rounded-md transition-colors text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none ${
        active ? 'bg-gray-100 text-gray-900 font-semibold' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
