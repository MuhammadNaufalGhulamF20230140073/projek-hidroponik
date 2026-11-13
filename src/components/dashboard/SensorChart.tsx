'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { SensorLog } from '@/lib/types/hidroponik';
import { formatTimeOnly } from '@/lib/utils/hydroCalc';
import { LineChart as ChartIcon } from 'lucide-react';

interface SensorChartProps {
  data: SensorLog[];
}

export function SensorChart({ data }: SensorChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card title="Riwayat Tren PPM Sensor" subtitle="Grafik perubahan kadar nutrisi">
        <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
          Belum ada data log sensor yang tersimpan.
        </div>
      </Card>
    );
  }

  // Siapkan titik koordinat SVG
  const width = 600;
  const height = 180;
  const padding = 35;

  const ppms = data.map((d) => d.ppm_stabil);
  const minPpm = Math.max(0, Math.floor(Math.min(...ppms) * 0.9));
  const maxPpm = Math.ceil(Math.max(...ppms, 900) * 1.1);

  const getX = (index: number) => {
    if (data.length <= 1) return padding;
    return padding + (index / (data.length - 1)) * (width - padding * 2);
  };

  const getY = (val: number) => {
    if (maxPpm === minPpm) return height / 2;
    return height - padding - ((val - minPpm) / (maxPpm - minPpm)) * (height - padding * 2);
  };

  // Generate SVG Path untuk PPM Stabil
  const pointsStabil = data.map((d, i) => `${getX(i)},${getY(d.ppm_stabil)}`).join(' ');
  // Area fill
  const areaPath = `M ${getX(0)},${height - padding} L ${pointsStabil.replace(/ /g, ' L ')} L ${getX(data.length - 1)},${height - padding} Z`;

  return (
    <Card
      title="Riwayat Tren PPM (Realtime Log)"
      subtitle={`Menampilkan ${data.length} sampel terakhir`}
      action={
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> PPM Stabil
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-400" /> Pompa Aktif
          </span>
        </div>
      }
    >
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[500px] overflow-visible text-zinc-400"
        >
          {/* Grid lines horizontal */}
          <line
            x1={padding}
            y1={getY(minPpm)}
            x2={width - padding}
            y2={getY(minPpm)}
            stroke="currentColor"
            strokeDasharray="3 3"
            strokeOpacity="0.2"
          />
          <line
            x1={padding}
            y1={getY((minPpm + maxPpm) / 2)}
            x2={width - padding}
            y2={getY((minPpm + maxPpm) / 2)}
            stroke="currentColor"
            strokeDasharray="3 3"
            strokeOpacity="0.2"
          />
          <line
            x1={padding}
            y1={getY(maxPpm)}
            x2={width - padding}
            y2={getY(maxPpm)}
            stroke="currentColor"
            strokeDasharray="3 3"
            strokeOpacity="0.2"
          />

          {/* Y Axis Labels */}
          <text x={padding - 8} y={getY(maxPpm) + 4} textAnchor="end" className="text-[10px] fill-current">
            {Math.round(maxPpm)}
          </text>
          <text x={padding - 8} y={getY((minPpm + maxPpm) / 2) + 4} textAnchor="end" className="text-[10px] fill-current">
            {Math.round((minPpm + maxPpm) / 2)}
          </text>
          <text x={padding - 8} y={getY(minPpm) + 4} textAnchor="end" className="text-[10px] fill-current">
            {Math.round(minPpm)}
          </text>

          {/* Gradient Fill under line */}
          <defs>
            <linearGradient id="ppmGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#ppmGrad)" />

          {/* Line Path PPM Stabil */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsStabil}
          />

          {/* Data Points */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.ppm_stabil);
            return (
              <g key={i}>
                <circle
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  className="fill-white stroke-emerald-600 dark:fill-zinc-900"
                  strokeWidth="2"
                />
                {/* Indikator pompa jika aktif saat data dikirim */}
                {d.status_pompa && (
                  <circle
                    cx={cx}
                    cy={height - padding - 4}
                    r="2.5"
                    fill="#38bdf8"
                  />
                )}
              </g>
            );
          })}

          {/* X Axis Time Labels */}
          {data.map((d, i) => {
            if (i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) {
              return (
                <text
                  key={i}
                  x={getX(i)}
                  y={height - 8}
                  textAnchor="middle"
                  className="text-[10px] fill-zinc-400"
                >
                  {formatTimeOnly(d.created_at)}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>
    </Card>
  );
}

