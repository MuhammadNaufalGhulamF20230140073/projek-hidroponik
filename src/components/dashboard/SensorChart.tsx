import React from 'react';

interface SensorChartProps {
  data?: any[];
}

export function SensorChart({ data = [] }: SensorChartProps) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-145 py-4">
        {/* Placeholder Grafik / Time-Series */}
        <div className="flex h-48 w-full items-end gap-2 border-b border-zinc-200 pb-2">
          <div className="flex h-full w-full items-center justify-center font-mono text-xs text-zinc-400">
            [REALTIME ROLLING WINDOW CHART ACTIVE]
          </div>
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-zinc-400">
          <span>19.56.46</span>
          <span>19.58.46</span>
          <span>20.00.46</span>
        </div>
      </div>
    </div>
  );
}