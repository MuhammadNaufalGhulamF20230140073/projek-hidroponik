import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Card({ children, className = '', title, subtitle, action }: CardProps) {
  return (
    <div className={`rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800/60">
          <div>
            {title && <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>}
            {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

