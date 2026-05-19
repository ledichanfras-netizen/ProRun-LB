import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}

const variantMap: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_18px_36px_rgba(16,185,129,0.16)]',
  secondary: 'bg-white/10 text-white hover:bg-white/20 shadow-none',
  ghost: 'bg-transparent text-white hover:bg-white/10 shadow-none border border-white/10',
  danger: 'bg-red-500 text-white hover:bg-red-400 shadow-[0_18px_36px_rgba(239,68,68,0.18)]'
};

const sizeMap: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-4 py-2 text-[10px] uppercase tracking-widest',
  md: 'px-6 py-3 text-[11px] uppercase tracking-[0.14em]',
  lg: 'px-8 py-4 text-[12px] uppercase tracking-[0.18em]'
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-[1.75rem] font-black transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-50 disabled:pointer-events-none ${variantMap[variant]} ${sizeMap[size]} ${className}`}
    >
      {children}
    </button>
  );
};
