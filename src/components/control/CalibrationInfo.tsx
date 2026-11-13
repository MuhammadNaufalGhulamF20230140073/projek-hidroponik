import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ARDUINO_CALIBRATION } from '@/lib/utils/hydroCalc';
import { Cpu, Terminal, Sliders } from 'lucide-react';

export function CalibrationInfo() {
  const p = ARDUINO_CALIBRATION;

  return (
    <Card
      title="FIRMWARE CALIBRATION & ADC POLYNOMIAL MODEL"
      subtitle="Embedded Coefficients on ESP32 Core"
      action={<Badge variant="neutral">CAL_PROFILE: 500/1000PPM</Badge>}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
          <span className="text-[10px] uppercase text-zinc-400 block tracking-wider">Calibration Factor</span>
          <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {p.calibrationFactor.toFixed(4)}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
          <span className="text-[10px] uppercase text-zinc-400 block tracking-wider">Slope Multiplier</span>
          <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {p.calibrationSlope.toFixed(4)}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
          <span className="text-[10px] uppercase text-zinc-400 block tracking-wider">Zero Offset</span>
          <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            +{p.calibrationOffset.toFixed(2)} <span className="text-[10px] font-normal text-zinc-400">ppm</span>
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
          <span className="text-[10px] uppercase text-zinc-400 block tracking-wider">EMA Filter Alpha</span>
          <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {p.emaAlpha.toFixed(2)} <span className="text-[10px] font-normal text-zinc-400">/ 10 smp</span>
          </p>
        </div>
      </div>

      {/* Mathematical transfer function formula */}
      <div className="mt-3.5 rounded-lg border border-zinc-200/90 bg-zinc-100/70 p-3 font-mono text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">Transfer Function (C++ Embedded):</div>
        <p className="leading-relaxed">
          k_temp = 1.0 + 0.02 * (T - 25.0) &bull; V_comp = V_raw / k_temp
          <br />
          tds_raw = (133.42 * Vc&sup3; - 255.86 * Vc&sup2; + 857.39 * Vc) * 0.5
          <br />
          PPM = (0.9200 * (tds_raw * 0.9344)) + 68.50
        </p>
      </div>
    </Card>
  );
}
