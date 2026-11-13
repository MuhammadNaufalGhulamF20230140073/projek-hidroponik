import React from 'react';
import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getSolutionStatus } from '@/lib/utils/hydroCalc';

interface StatusBannerProps {
  ppm: number;
}

export function StatusBanner({ ppm }: StatusBannerProps) {
  const { status, label, description, badgeBg } = getSolutionStatus(ppm);

  return (
    <div className={`flex items-start gap-3.5 rounded-2xl border p-4 transition-all ${badgeBg}`}>
      <div className="mt-0.5">
        {status === 'optimal' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        {status === 'rendah' && <Info className="h-5 w-5 text-amber-500" />}
        {status === 'tinggi' && <AlertTriangle className="h-5 w-5 text-rose-500" />}
      </div>
      <div>
        <h4 className="text-sm font-semibold">{label}</h4>
        <p className="mt-0.5 text-xs opacity-90">{description}</p>
      </div>
    </div>
  );
}

