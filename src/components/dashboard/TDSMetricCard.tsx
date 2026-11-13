import React from 'react';
import { Activity, Droplets } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { getSolutionStatus } from '@/lib/utils/hydroCalc';

interface TDSMetricCardProps {
  ppmStabil: number;
  ppmRaw: number;
}

export function TDSMetricCard({ ppmStabil, ppmRaw }: TDSMetricCardProps) {
  const statusInfo = getSolutionStatus(ppmStabil);

  // Kalkulasi persentase untuk gauge progress bar (rentang visual 0 - 1500 PPM)
  const percentage = Math.min(Math.max((ppmStabil / 1500) * 100, 0), 100);

  return (
    <Card className="relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl dark:bg-emerald-500/5" />

      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <Droplets className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Konsentrasi TDS (Nutrisi)
            </h3>
            <p className="text-xs text-zinc-500">Filter EMA (Alpha: 0.20)</p>
          </div>
        </div>
        <Badge variant={statusInfo.status === 'optimal' ? 'success' : statusInfo.status === 'rendah' ? 'warning' : 'danger'}>
          {statusInfo.label}
        </Badge>
      </div>

      {/* Main Metric Value */}
      <div className="my-4 flex items-baseline gap-3">
        <span className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          {ppmStabil.toFixed(1)}
        </span>
        <span className="text-base font-semibold text-zinc-500 dark:text-zinc-400">PPM STABIL</span>
      </div>

      {/* Visual Gauge Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-medium text-zinc-500">
          <span>0 PPM</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ideal: 560 - 840 PPM</span>
          <span>1500 PPM</span>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          {/* Ideal range indicator */}
          <div className="absolute left-[37%] right-[44%] top-0 bottom-0 bg-emerald-500/20" />
          {/* Value bar */}
          <div
            className={`h-full transition-all duration-700 rounded-full ${
              statusInfo.status === 'optimal'
                ? 'bg-emerald-500'
                : statusInfo.status === 'rendah'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Footer Info: PPM RAW Comparison */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800">
        <span className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-zinc-400" />
          PPM Raw (Sebelum Filter):
        </span>
        <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
          {ppmRaw.toFixed(1)} ppm
        </span>
      </div>
    </Card>
  );
}

