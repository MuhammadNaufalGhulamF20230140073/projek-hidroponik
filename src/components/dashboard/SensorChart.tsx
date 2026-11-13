'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { SensorLog } from '@/lib/types/hidroponik';
import { formatTimeOnly } from '@/lib/utils/hydroCalc';

interface SensorChartProps {
  data: SensorLog[];
  targetMin?: number;
  targetMax?: number;
}

export function SensorChart({ data, targetMin = 560, targetMax = 840 }: SensorChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card title="TELEMETRY TIME-SERIES" subtitle="Concentration Trend Buffer">
        <div className="flex h-44 items-center justify-center font-mono text-xs text-zinc-400">
          WAITING_FOR_STREAM_PACKETS...
        </div>
      </Card>
    );
  }

  const width = 720;
  const height = 190;
  const paddingLeft = 45;
  const paddingRight = 65;
  const paddingTop = 20;
  const paddingBottom = 30;

  const ppms = data.map((d) => d.ppm_stabil);
  const minVal = Math.max(0, Math.floor(Math.min(...ppms, targetMin * 0.8) * 0.9));
  const maxVal = Math.ceil(Math.max(...ppms, targetMax * 1.15) * 1.05);

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft;
    return paddingLeft + (index / (data.length - 1)) * (width - paddingLeft - paddingRight);
  };

  const getY = (val: number) => {
    if (maxVal === minVal) return height / 2;
    return height - paddingBottom - ((val - minVal) / (maxVal - minVal)) * (height - paddingTop - paddingBottom);
  };

  const points = data.map((d, i) => `${getX(i)},${getY(d.ppm_stabil)}`).join(' ');
  const areaPath = `M ${getX(0)},${height - paddingBottom} L ${points.replace(/ /g, ' L ')} L ${getX(data.length - 1)},${height - paddingBottom} Z`;

  const yTargetMin = getY(targetMin);
  const yTargetMax = getY(targetMax);

  return (
    <Card
      title="TELEMETRY TIME-SERIES (TDS BUFFER)"
      subtitle={`Realtime Rolling Window &bull; ${data.length} Sample Points`}
      action={
        <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> PPM STABIL
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-zinc-400 border-b border-dashed border-zinc-400" /> TARGET SPEC
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-400" /> PUMP DOSING
          </span>
        </div>
      }
    >
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[580px] overflow-visible font-mono text-zinc-400 select-none"
        >
          {/* Subtle horizontal grid lines */}
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={width - paddingRight}
            y2={paddingTop}
            stroke="currentColor"
            strokeOpacity="0.08"
          />
          <line
            x1={paddingLeft}
            y1={(paddingTop + height - paddingBottom) / 2}
            x2={width - paddingRight}
            y2={(paddingTop + height - paddingBottom) / 2}
            stroke="currentColor"
            strokeOpacity="0.08"
          />
          <line
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
            stroke="currentColor"
            strokeOpacity="0.15"
          />

          {/* Target Min & Max Guideline Bars */}
          {yTargetMin >= paddingTop && yTargetMin <= height - paddingBottom && (
            <g>
              <line
                x1={paddingLeft}
                y1={yTargetMin}
                x2={width - paddingRight}
                y2={yTargetMin}
                stroke="#10b981"
                strokeDasharray="3 3"
                strokeWidth="1"
                strokeOpacity="0.5"
              />
              <text
                x={width - paddingRight + 6}
                y={yTargetMin + 3}
                fill="#10b981"
                className="text-[9px] font-semibold"
              >
                MIN {targetMin}
              </text>
            </g>
          )}

          {yTargetMax >= paddingTop && yTargetMax <= height - paddingBottom && (
            <g>
              <line
                x1={paddingLeft}
                y1={yTargetMax}
                x2={width - paddingRight}
                y2={yTargetMax}
                stroke="#10b981"
                strokeDasharray="3 3"
                strokeWidth="1"
                strokeOpacity="0.5"
              />
              <text
                x={width - paddingRight + 6}
                y={yTargetMax + 3}
                fill="#10b981"
                className="text-[9px] font-semibold"
              >
                MAX {targetMax}
              </text>
            </g>
          )}

          {/* Left Y-axis labels */}
          <text x={paddingLeft - 8} y={getY(maxVal) + 4} textAnchor="end" className="text-[9px] fill-current">
            {Math.round(maxVal)}
          </text>
          <text
            x={paddingLeft - 8}
            y={(paddingTop + height - paddingBottom) / 2 + 3}
            textAnchor="end"
            className="text-[9px] fill-current"
          >
            {Math.round((minVal + maxVal) / 2)}
          </text>
          <text x={paddingLeft - 8} y={getY(minVal) + 4} textAnchor="end" className="text-[9px] fill-current">
            {Math.round(minVal)}
          </text>

          {/* Gradient Underlay */}
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#chartGrad)" />

          {/* Clean Hairline Polyline */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Data Points */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.ppm_stabil);
            const isLast = i === data.length - 1;

            return (
              <g key={i}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isLast ? '4' : '2.5'}
                  className={
                    isLast
                      ? 'fill-emerald-500 stroke-white dark:stroke-zinc-900'
                      : 'fill-white stroke-emerald-600 dark:fill-zinc-900'
                  }
                  strokeWidth="1.5"
                />

                {/* Relay Active Indicator Tag */}
                {d.status_pompa && (
                  <circle
                    cx={cx}
                    cy={height - paddingBottom - 3}
                    r="2.5"
                    fill="#38bdf8"
                  />
                )}
              </g>
            );
          })}

          {/* Time stamps on X-axis */}
          {data.map((d, i) => {
            if (i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) {
              return (
                <text
                  key={i}
                  x={getX(i)}
                  y={height - 8}
                  textAnchor="middle"
                  className="text-[9px] fill-zinc-400"
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
