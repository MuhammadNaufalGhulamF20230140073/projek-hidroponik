import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { getSolutionStatus } from '@/lib/utils/hydroCalc';

interface TDSMetricCardProps {
  ppmStabil: number;
  ppmRaw: number;
  targetMin?: number;
  targetMax?: number;
}

export function TDSMetricCard({ ppmStabil, ppmRaw, targetMin = 560, targetMax = 840 }: TDSMetricCardProps) {
  const statusInfo = getSolutionStatus(ppmStabil, targetMin, targetMax);
  const percentage = Math.min(Math.max((ppmStabil / 1500) * 100, 0), 100);
  const delta = ppmStabil - ppmRaw;

  return (
    <Card
      title="NUTRIENT CONCENTRATION (TDS)"
      subtitle="Filtered Electrical Conductivity &bull; EMA Filter α=0.20"
      action={
        <Badge
          variant={
            statusInfo.status === 'optimal'
              ? 'success'
              : statusInfo.status === 'rendah'
              ? 'warning'
              : 'danger'
          }
        >
          {statusInfo.status === 'optimal'
            ? 'IN SPEC (OPTIMAL)'
            : statusInfo.status === 'rendah'
            ? 'SUB-OPTIMAL (LOW)'
            : 'CRITICAL (HIGH)'}
        </Badge>
      }
    >
      {/* Primary Value Readout */}
      <div className="flex items-baseline justify-between pt-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            {ppmStabil.toFixed(1)}
          </span>
          <span className="font-mono text-xs font-semibold text-zinc-400">PPM</span>
        </div>

        <div className="text-right font-mono text-xs text-zinc-500">
          <span className="text-[10px] uppercase text-zinc-400 block">RAW DELTA</span>
          <span className={delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}>
            {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} ppm
          </span>
        </div>
      </div>

      {/* Target Range Linear Gauge */}
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between font-mono text-[10px] text-zinc-400">
          <span>0</span>
          <span className="text-emerald-600 dark:text-emerald-400">
            Target Range: {targetMin} &ndash; {targetMax} PPM
          </span>
          <span>1500</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
          {/* Target Zone Highlight */}
          <div
            className="absolute top-0 bottom-0 bg-emerald-500/15 border-x border-emerald-500/30"
            style={{ 
              left: `${Math.min((targetMin / 1500) * 100, 100)}%`, 
              width: `${Math.min((Math.max(targetMax - targetMin, 0) / 1500) * 100, 100)}%` 
            }}
          />
          {/* Current Value Fill */}
          <div
            className={`h-full transition-all duration-500 ${
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

      {/* Telemetry Breakdown Footer */}
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 text-xs font-mono text-zinc-500 dark:border-zinc-800/80">
        <div>
          <span className="text-[10px] uppercase text-zinc-400">Unfiltered ADC Read</span>
          <div className="font-semibold text-zinc-800 dark:text-zinc-200">
            {ppmRaw.toFixed(1)} <span className="text-[10px] font-normal text-zinc-400">ppm</span>
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase text-zinc-400">Smoothing Factor</span>
          <div className="font-semibold text-zinc-800 dark:text-zinc-200">
            α = 0.20 <span className="text-[10px] font-normal text-zinc-400">(10 samples)</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
