import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    let baseStyles =
      'inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8860B] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99]';

    let variantStyles = '';
    switch (variant) {
      case 'primary':
        variantStyles = 'bg-[#B8860B] text-white hover:bg-[#9E7307] border border-transparent shadow-sm';
        break;
      case 'secondary':
        variantStyles = 'bg-[#C5A059] text-white hover:bg-[#B38D45] border border-transparent shadow-sm';
        break;
      case 'outline':
        variantStyles = 'border border-[#EAE4D9] bg-white text-[#231F1A] hover:bg-[#FAF9F5] hover:border-[#D6CCB8]';
        break;
      case 'ghost':
        variantStyles = 'text-[#231F1A] hover:bg-[#F4F0E8]';
        break;
      case 'destructive':
        variantStyles = 'bg-[#DC2626] text-white hover:bg-[#B91C1C] border border-transparent shadow-sm';
        break;
    }

    let sizeStyles = '';
    switch (size) {
      case 'sm':
        sizeStyles = 'h-8 px-3 text-xs';
        break;
      case 'md':
        sizeStyles = 'h-10 px-4 py-2 text-sm';
        break;
      case 'lg':
        sizeStyles = 'h-12 px-6 text-base font-semibold';
        break;
      case 'icon':
        sizeStyles = 'h-9 w-9 p-0';
        break;
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
