'use client';

import React from 'react';
import { getSolutionStatus } from '@/lib/utils/hydroCalc';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface StatusBannerProps {
  ppm: number;
  targetMin?: number;
  targetMax?: number;
}

export function StatusBanner({ ppm, targetMin = 560, targetMax = 840 }: StatusBannerProps) {
  const { status, label, description } = getSolutionStatus(ppm, targetMin, targetMax);

  const statusConfig = {
    optimal: {
      border: 'border-emerald-400',
      bg: 'bg-emerald-50',
      text: 'text-emerald-950',
      tag: 'KONDISI BAIK',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />,
    },
    rendah: {
      border: 'border-amber-400',
      bg: 'bg-amber-50',
      text: 'text-amber-950',
      tag: 'NUTRISI KURANG',
      icon: <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />,
    },
    tinggi: {
      border: 'border-rose-400',
      bg: 'bg-rose-50',
      text: 'text-rose-950',
      tag: 'TERLALU PEKAT',
      icon: <AlertTriangle className="h-4 w-4 text-rose-700 shrink-0" />,
    },
  };

  const current = statusConfig[status];

  return (
    <div
      suppressHydrationWarning
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs font-mono shadow-xs transition-all ${current.border} ${current.bg}`}
    >
      <div className="flex items-center gap-2.5">
        {current.icon}
        <span className={`font-black tracking-tight ${current.text}`}>
          [{current.tag}] &bull; {label}
        </span>
      </div>
      <div className="text-xs font-semibold text-zinc-900 font-sans">
        {description}
      </div>
    </div>
  );
}