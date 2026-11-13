import React from 'react';
import { Card } from '../ui/Card';
import { ARDUINO_CALIBRATION } from '@/lib/utils/hydroCalc';
import { Settings2, Cpu, Hash, Activity } from 'lucide-react';

export function CalibrationInfo() {
  const p = ARDUINO_CALIBRATION;

  return (
    <Card
      title="Parameter Kalibrasi & Filter (Firmware Arduino)"
      subtitle="Nilai koefisien yang aktif pada ESP32"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
          <span className="text-[11px] text-zinc-500">Calibration Factor</span>
          <p className="mt-1 font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
            {p.calibrationFactor}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
          <span className="text-[11px] text-zinc-500">Calibration Slope</span>
          <p className="mt-1 font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
            {p.calibrationSlope}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
          <span className="text-[11px] text-zinc-500">Calibration Offset</span>
          <p className="mt-1 font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
            +{p.calibrationOffset}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
          <span className="text-[11px] text-zinc-500">EMA Filter Alpha</span>
          <p className="mt-1 font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
            {p.emaAlpha}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200/60 bg-zinc-100/50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/30">
        <p className="font-semibold text-zinc-700 dark:text-zinc-300">Rumus Konversi TDS (ESP32):</p>
        <code className="mt-1 block font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
          compensationCoefficient = 1.0 + 0.02 * (T - 25.0)
          <br />
          tdsRaw = (133.42 * Vc³ - 255.86 * Vc² + 857.39 * Vc) * 0.5
          <br />
          ppm = (0.9200 * (tdsRaw * 0.9344)) + 68.50
        </code>
      </div>
    </Card>
  );
}

