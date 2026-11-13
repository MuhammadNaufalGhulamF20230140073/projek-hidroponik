import React from 'react';
import { Gauge, Zap, Thermometer } from 'lucide-react';
import { Card } from '../ui/Card';

interface VoltageCardProps {
  tegangan: number;
  adcRaw: number;
  temperature?: number;
}

export function VoltageCard({ tegangan, adcRaw, temperature = 25.0 }: VoltageCardProps) {
  // Rentang tegangan ESP32 0 - 3.3V
  const voltagePercent = Math.min(Math.max((tegangan / 3.3) * 100, 0), 100);

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Tegangan & ADC Sensor
            </h3>
            <p className="text-xs text-zinc-500">ESP32 Pin 34 (ADC 12-Bit 11dB)</p>
          </div>
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="my-4 flex items-baseline gap-3">
        <span className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 font-mono">
          {tegangan.toFixed(3)}
        </span>
        <span className="text-base font-semibold text-zinc-500 dark:text-zinc-400">Volt</span>
      </div>

      {/* Gauge Bar Tegangan */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-medium text-zinc-500">
          <span>0.00 V</span>
          <span>Tegangan Terbaca ({voltagePercent.toFixed(0)}%)</span>
          <span>3.30 V</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full bg-sky-500 transition-all duration-700 rounded-full"
            style={{ width: `${voltagePercent}%` }}
          />
        </div>
      </div>

      {/* Grid Sub-metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-zinc-400" />
          <div>
            <span className="block text-[11px] text-zinc-500">ADC RAW</span>
            <span className="font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {adcRaw} / 4095
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Thermometer className="h-4 w-4 text-zinc-400" />
          <div>
            <span className="block text-[11px] text-zinc-500">Suhu Acuan</span>
            <span className="font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {temperature.toFixed(1)} °C
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

