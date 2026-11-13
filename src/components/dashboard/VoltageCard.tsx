import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface VoltageCardProps {
  tegangan: number;
  adcRaw: number;
  temperature?: number;
}

export function VoltageCard({ tegangan, adcRaw, temperature = 25.0 }: VoltageCardProps) {
  const voltagePercent = Math.min(Math.max((tegangan / 3.3) * 100, 0), 100);

  return (
    <Card
      title="ANALOG-TO-DIGITAL CONVERSION (ADC)"
      subtitle="ESP32 ADC1_CH4 &bull; GPIO 34 &bull; 11dB Attenuation"
      action={<Badge variant="neutral">12-BIT RES (4096 LSB)</Badge>}
    >
      {/* Primary Value Readout */}
      <div className="flex items-baseline justify-between pt-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            {tegangan.toFixed(3)}
          </span>
          <span className="font-mono text-xs font-semibold text-zinc-400">VOLTS (DC)</span>
        </div>

        <div className="text-right font-mono text-xs text-zinc-500">
          <span className="text-[10px] uppercase text-zinc-400 block">BIT DENSITY</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {adcRaw} <span className="text-[10px] text-zinc-400">/ 4095</span>
          </span>
        </div>
      </div>

      {/* Voltage Scale Bar */}
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between font-mono text-[10px] text-zinc-400">
          <span>0.00 V</span>
          <span>Full Scale: 3.30 V ({voltagePercent.toFixed(1)}%)</span>
          <span>3.30 V</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full bg-zinc-900 transition-all duration-500 dark:bg-zinc-200"
            style={{ width: `${voltagePercent}%` }}
          />
        </div>
      </div>

      {/* Sensor Coefficients Footer */}
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 text-xs font-mono text-zinc-500 dark:border-zinc-800/80">
        <div>
          <span className="text-[10px] uppercase text-zinc-400">Temperature Ref</span>
          <div className="font-semibold text-zinc-800 dark:text-zinc-200">
            {temperature.toFixed(1)} &deg;C <span className="text-[10px] text-zinc-400">(2.0%/&deg;C)</span>
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase text-zinc-400">Quantization Step</span>
          <div className="font-semibold text-zinc-800 dark:text-zinc-200">
            ~0.806 <span className="text-[10px] text-zinc-400">mV / LSB</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
