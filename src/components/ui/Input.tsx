import { InputHTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, fullWidth = false, ...props }, ref) => {
    return (
      <div className={`mb-4 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label className="block font-suisse-intl-mono text-xs uppercase tracking-wide mb-1 text-zinc-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={twMerge(
            `bg-zinc-800 border text-white rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition duration-200 font-suisse-intl text-sm`,
            error ? 'border-red-500' : 'border-zinc-700',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-red-500 text-xs font-suisse-intl">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';