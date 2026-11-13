import React from 'react';
import { getSolutionStatus } from '@/lib/utils/hydroCalc';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface StatusBannerProps {
  ppm: number;
}

export function StatusBanner({ ppm }: StatusBannerProps) {
  const { status, label, description } = getSolutionStatus(ppm);

  const statusConfig = {
    optimal: {
      border: 'border-emerald-500/30 dark:border-emerald-500/20',
      bg: 'bg-emerald-500/5 dark:bg-emerald-500/5',
      text: 'text-emerald-800 dark:text-emerald-300',
      tag: 'SYS_STATUS: OPTIMAL',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    },
    rendah: {
      border: 'border-amber-500/30 dark:border-amber-500/20',
      bg: 'bg-amber-500/5 dark:bg-amber-500/5',
      text: 'text-amber-800 dark:text-amber-300',
      tag: 'SYS_STATUS: BELOW_MINIMUM',
      icon: <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />,
    },
    tinggi: {
      border: 'border-rose-500/30 dark:border-rose-500/20',
      bg: 'bg-rose-500/5 dark:bg-rose-500/5',
      text: 'text-rose-800 dark:text-rose-300',
      tag: 'SYS_STATUS: CRITICAL_HIGH',
      icon: <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />,
    },
  };

  const current = statusConfig[status];

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-xs font-mono transition-all ${current.border} ${current.bg}`}
    >
      <div className="flex items-center gap-2.5">
        {current.icon}
        <span className={`font-semibold tracking-tight ${current.text}`}>
          [{current.tag}] &bull; {label}
        </span>
      </div>
      <div className="hidden sm:block text-[11px] text-zinc-500 dark:text-zinc-400 font-sans">
        {description}
      </div>
    </div>
  );
}
