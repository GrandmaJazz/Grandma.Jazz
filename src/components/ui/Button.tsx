import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  rounded?: 'default' | 'full';
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  rounded = 'default',
  disabled,
  ...props
}: ButtonProps) {
  // Base styles
  const baseStyles = "font-suisse-intl-mono uppercase tracking-tight transition-all duration-300 flex items-center justify-center";
  
  // Size styles
  const sizeStyles = {
    sm: "text-xs py-2 px-3",
    md: "text-sm py-2.5 px-4",
    lg: "text-base py-3 px-6"
  };
  
  // Rounded styles
  const roundedStyles = {
    default: "rounded-[5px]",
    full: "rounded-full"
  };
  
  // Variant styles
  const variantStyles = {
    primary: "bg-[#b88c41] text-[#0A0A0A] hover:bg-[#a67d3a] shadow-sm",
    secondary: "bg-[#7c4d33] text-[#F5F1E6] hover:bg-[#9C6554] shadow-sm",
    outline: "border border-[#b88c41] text-[#b88c41] hover:bg-[#b88c41]/10 backdrop-blur-sm",
    ghost: "text-[#b88c41] hover:bg-[#b88c41]/10 focus:bg-[#b88c41]/15",
    danger: "bg-[#E67373] text-[#0A0A0A] hover:bg-[#E67373]/90 shadow-sm"
  };
  
  // Width style
  const widthStyle = fullWidth ? "w-full" : "";
  
  // Disabled style
  const disabledStyle = (disabled || loading) 
    ? "opacity-50 cursor-not-allowed pointer-events-none" 
    : "";
  
  // Loading state
  const loadingDisplay = loading ? "gap-2" : "";
  
  // Combine all styles
  const buttonStyles = twMerge(
    baseStyles,
    sizeStyles[size],
    roundedStyles[rounded],
    variantStyles[variant],
    widthStyle,
    disabledStyle,
    loadingDisplay,
    className
  );
  
  return (
    <button 
      className={buttonStyles} 
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading</span>
        </>
      ) : children}
    </button>
  );
}