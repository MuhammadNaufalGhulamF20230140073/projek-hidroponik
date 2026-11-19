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
      className={`rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)] ${className}`}
    >
      {(title || action || subtitle) && (
        <div
          className={`mb-4 flex items-start justify-between border-b border-zinc-100 pb-3.5 ${headerClassName}`}
        >
          <div>
            {title && (
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="mt-0.5 text-xs text-zinc-400">
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