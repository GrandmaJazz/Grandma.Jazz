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
  // Match the outlined, Space Mono calls to action used on the homepage.
  const baseStyles = "gj-cta select-none active:scale-[0.97] disabled:transform-none";
  
  // Size styles
  const sizeStyles = {
    sm: "gj-cta--compact",
    md: "text-xs px-6 py-3 sm:text-sm sm:px-8 sm:py-4",
    lg: "text-sm px-8 py-4"
  };
  
  // Rounded styles
  const roundedStyles = {
    default: "rounded-control",
    full: "rounded-control"
  };
  
  // Variant styles
  const variantStyles = {
    primary: "",
    secondary: "gj-cta--quiet",
    outline: "",
    ghost: "border-transparent hover:bg-[#B49B73]/10 hover:text-[#B49B73]",
    danger: "gj-cta--danger"
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
