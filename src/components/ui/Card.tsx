import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  headerClassName?: string;
}

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
  headerClassName = '',
}: CardProps) {
  return (
    <div
      className={`rounded-xl border border-zinc-200/90 bg-white p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all dark:border-zinc-800 dark:bg-zinc-900/80 dark:backdrop-blur-sm ${className}`}
    >
      {(title || action || subtitle) && (
        <div
          className={`mb-4 flex items-start justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800/70 ${headerClassName}`}
        >
          <div>
            {title && (
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                {subtitle}
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
