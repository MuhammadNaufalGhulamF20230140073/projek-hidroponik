import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AlertTriangle, Cpu, Zap } from 'lucide-react';

interface VoltageCardProps {
  tegangan: number;
  adcRaw: number;
  temperature?: number;
}

export function VoltageCard({ tegangan, adcRaw, temperature = 25.0 }: VoltageCardProps) {
  const voltagePercent = Math.min(Math.max((tegangan / 3.3) * 100, 0), 100);
  const isSensorDisconnected = tegangan <= 0.01 && adcRaw === 0;

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 ${
        isSensorDisconnected 
          ? 'border-rose-500/50 bg-linear-to-br from-rose-500/4 to-transparent shadow-[0_4px_20px_rgba(244,63,94,0.08)]' 
          : 'hover:border-sky-500/40 hover:shadow-[0_4px_20px_rgba(14,165,233,0.06)]'
      }`}
      title={
        <span className="flex items-center gap-2 font-mono text-zinc-700 dark:text-zinc-200">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-500">
            <Cpu className="h-3.5 w-3.5" />
          </span>
          ANALOG-TO-DIGITAL CONVERSION (ADC)
        </span>
      }
      subtitle="ESP32 ADC1_CH4 • GPIO 34 • 11dB Attenuation"
      action={
        isSensorDisconnected ? (
          <Badge variant="danger" dot className="animate-pulse shadow-sm">SENSOR TERPUTUS</Badge>
        ) : (
          <Badge variant="neutral" className="font-mono">12-BIT (4096 LSB)</Badge>
        )
      }
    >
      {/* Peringatan Kritis Jika Sensor 0V */}
      {isSensorDisconnected && (
        <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 font-mono text-xs text-rose-600 dark:text-rose-400 backdrop-blur-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 animate-bounce" />
          <span className="font-medium">Tegangan 0.000V — Periksa koneksi fisik probe TDS di GPIO 34!</span>
        </div>
      )}

      {/* Primary Value Readout */}
      <div className="flex items-baseline justify-between pt-1">
        <div className="flex items-baseline gap-2.5">
          <span className={`font-mono text-4xl sm:text-5xl font-extrabold tracking-tight transition-colors ${
            isSensorDisconnected ? 'text-rose-500' : 'text-zinc-950 dark:text-zinc-50'
          }`}>
            {tegangan.toFixed(3)}
          </span>
          <span className="font-mono text-xs font-bold text-zinc-400 tracking-wider">VOLTS (DC)</span>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-[10px] uppercase text-zinc-400 font-semibold tracking-wider block">BIT DENSITY</span>
          <span className="inline-flex items-center gap-1 font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
            <Zap className="h-3 w-3 text-amber-500" />
            {adcRaw} <span className="text-[10px] font-normal text-zinc-400">/ 4095</span>
          </span>
        </div>
      </div>

      {/* Voltage Scale Bar */}
      <div className="mt-5 space-y-2">
        <div className="flex justify-between font-mono text-[10px] text-zinc-400 font-medium">
          <span>0.00 V</span>
          <span className="text-zinc-500 dark:text-zinc-400">Scale Capacity: {voltagePercent.toFixed(1)}%</span>
          <span>3.30 V</span>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800/80 p-0.5 border border-zinc-200/60 dark:border-zinc-700/50">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isSensorDisconnected 
                ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' 
                : 'bg-zinc-900 dark:bg-zinc-100 shadow-[0_0_10px_rgba(0,0,0,0.2)]'
            }`}
            style={{ width: `${voltagePercent}%` }}
          />
        </div>
      </div>

      {/* Sensor Coefficients Footer */}
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-3.5 text-xs font-mono text-zinc-500 dark:border-zinc-800/80">
        <div className="rounded-md bg-zinc-50/50 dark:bg-zinc-800/30 p-2 border border-zinc-200/40 dark:border-zinc-800/60">
          <span className="text-[9px] uppercase text-zinc-400 tracking-wider block">Temperature Ref</span>
          <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
            {temperature.toFixed(1)} °C <span className="text-[10px] font-normal text-zinc-400">(2.0%/°C)</span>
          </div>
        </div>
        <div className="rounded-md bg-zinc-50/50 dark:bg-zinc-800/30 p-2 border border-zinc-200/40 dark:border-zinc-800/60">
          <span className="text-[9px] uppercase text-zinc-400 tracking-wider block">Quantization Step</span>
          <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
            ~0.806 <span className="text-[10px] font-normal text-zinc-400">mV / LSB</span>
          </div>
        </div>
      </div>
    </Card>
  );
}