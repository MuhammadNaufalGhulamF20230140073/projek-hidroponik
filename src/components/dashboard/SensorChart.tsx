'use client';

import React, { useState, useMemo } from 'react';
import { Activity, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface ChartLogItem {
  packet_id: string;
  timestamp: string;
  adc_raw?: number;
  voltage?: string;
  ppm_raw: number;
  ppm_filtered: number;
  relay?: string;
  is_active: boolean;
}

interface SensorChartProps {
  logs: ChartLogItem[];
  targetMin?: number;
  targetMax?: number;
}

export function SensorChart({ logs = [], targetMin, targetMax }: SensorChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Balik urutan log agar menjadi urutan waktu kronologis (kiri = terlama, kanan = teranyar)
  const data = useMemo(() => {
    return [...logs].reverse();
  }, [logs]);

  // Hitung metrik statistik buffer
  const stats = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 0, avg: 0, current: 0, trend: 'flat' as const };
    const pValues = data.map(d => d.ppm_filtered);
    const min = Math.min(...pValues);
    const max = Math.max(...pValues);
    const avg = pValues.reduce((a, b) => a + b, 0) / pValues.length;
    const current = pValues[pValues.length - 1];
    const prev = pValues[Math.max(0, pValues.length - 2)];
    const diff = current - prev;
    const trend = diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'flat';
    return { min, max, avg, current, trend };
  }, [data]);

  // Dimensi SVG
  const width = 800;
  const height = 230;
  const padLeft = 55;
  const padRight = 45;
  const padTop = 22;
  const padBottom = 32;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  // Rentang Y (Min & Max PPM) dengan padding visual agar grafik tidak mentok
  const { yMin, yMax, yTicks } = useMemo(() => {
    if (data.length === 0) return { yMin: 0, yMax: 1000, yTicks: [0, 250, 500, 750, 1000] };

    const vals = data.flatMap(d => [d.ppm_filtered, d.ppm_raw]);
    if (targetMin !== undefined && targetMin > 0) vals.push(targetMin);
    if (targetMax !== undefined && targetMax > 0) vals.push(targetMax);

    let lowest = Math.min(...vals);
    let highest = Math.max(...vals);

    // Berikan ruang padding atas dan bawah minimal 40 PPM
    const buffer = Math.max((highest - lowest) * 0.15, 30);
    lowest = Math.max(0, Math.floor((lowest - buffer) / 20) * 20);
    highest = Math.ceil((highest + buffer) / 20) * 20;

    if (highest - lowest < 80) {
      highest = lowest + 80;
    }

    // 5 gridline horizontal
    const step = (highest - lowest) / 4;
    const ticks = [
      lowest,
      Math.round(lowest + step),
      Math.round(lowest + step * 2),
      Math.round(lowest + step * 3),
      highest,
    ];

    return { yMin: lowest, yMax: highest, yTicks: ticks };
  }, [data, targetMin, targetMax]);

  // Fungsi konversi koordinat Data -> SVG
  const getX = (idx: number) => {
    if (data.length <= 1) return padLeft + plotWidth / 2;
    return padLeft + (idx / (data.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    const ratio = (clamped - yMin) / (yMax - yMin);
    return padTop + (1 - ratio) * plotHeight;
  };

  // Koordinat titik kurva
  const points = useMemo(() => {
    return data.map((d, i) => ({
      x: getX(i),
      yStabil: getY(d.ppm_filtered),
      yRaw: getY(d.ppm_raw),
      item: d,
      index: i,
    }));
  }, [data, yMin, yMax]);

  // Path Line & Area
  const pathStabil = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.yStabil.toFixed(1)}`).join(' ');
  }, [points]);

  const pathRaw = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.yRaw.toFixed(1)}`).join(' ');
  }, [points]);

  const areaStabil = useMemo(() => {
    if (points.length === 0) return '';
    const bottomY = padTop + plotHeight;
    const firstX = points[0].x.toFixed(1);
    const lastX = points[points.length - 1].x.toFixed(1);
    return `${pathStabil} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  }, [points, pathStabil]);

  // Handle interaksi mouse hover
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - svgRect.left) / svgRect.width) * width;

    // Cari titik koordinat X terdekat
    let closestIdx = 0;
    let closestDist = Infinity;
    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    setHoverIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activeHover = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  return (
    <div className="w-full space-y-3 font-mono">
      {/* Header Info Bar & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        {/* Ringkasan Statistik */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-bold text-zinc-800">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-extrabold">Aktual:</span>
            <span className="text-sm font-black text-emerald-700">
              {stats.current.toFixed(1)} <span className="text-[10px] font-bold text-zinc-600">PPM</span>
            </span>
            {stats.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
            {stats.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-rose-600" />}
            {stats.trend === 'flat' && <Minus className="h-3.5 w-3.5 text-zinc-400" />}
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[11px]">
            <span className="text-zinc-500">Min:</span>
            <span className="font-black text-zinc-900">{stats.min.toFixed(1)}</span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-500">Max:</span>
            <span className="font-black text-zinc-900">{stats.max.toFixed(1)}</span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-500">Rata-rata:</span>
            <span className="font-black text-zinc-900">{stats.avg.toFixed(1)}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[10px] font-bold">
          <span className="flex items-center gap-1 text-emerald-800">
            <span className="h-2 w-3.5 rounded-xs bg-emerald-600 inline-block" />
            PPM Stabil
          </span>
          <span className="flex items-center gap-1 text-zinc-600">
            <span className="h-0.5 w-3 border-b-2 border-dashed border-zinc-400 inline-block" />
            PPM Raw
          </span>
          {targetMin !== undefined && targetMin > 0 && (
            <span className="flex items-center gap-1 text-amber-800">
              <span className="h-0.5 w-3 border-b-2 border-dashed border-amber-500 inline-block" />
              Target ({targetMin}-{targetMax})
            </span>
          )}
          <span className="flex items-center gap-1 text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600 inline-block ring-1 ring-blue-300" />
            Pompa ON
          </span>
        </div>
      </div>

      {/* Kontainer Grafik SVG */}
      <div className="relative w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 p-2 sm:p-3 select-none">
        {data.length === 0 ? (
          <div className="h-44 sm:h-48 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs font-bold text-center">
            <Activity className="h-8 w-8 text-zinc-400 animate-pulse" />
            <p>Menunggu data telemetri pertama dari ESP32...</p>
            <span className="text-[10px] text-zinc-400">Grafik time-series akan ter-render secara otomatis</span>
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto overflow-visible cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                {/* Gradient area bawah kurva PPM Stabil */}
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
                  <stop offset="65%" stopColor="#10b981" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>

                {/* Filter drop shadow titik hovered */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#059669" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* 1. Gridlines Horizontal & Label Sumbu Y */}
              {yTicks.map((tickVal) => {
                const yPos = getY(tickVal);
                return (
                  <g key={tickVal}>
                    <line
                      x1={padLeft}
                      y1={yPos}
                      x2={padLeft + plotWidth}
                      y2={yPos}
                      stroke="#e4e4e7"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padLeft - 8}
                      y={yPos + 3.5}
                      textAnchor="end"
                      fontSize="9"
                      fill="#71717a"
                      fontWeight="bold"
                    >
                      {tickVal}
                    </text>
                  </g>
                );
              })}

              {/* 2. Target Reference Lines (Ambang Min & Max) */}
              {targetMin !== undefined && targetMin >= yMin && targetMin <= yMax && (
                <g>
                  <line
                    x1={padLeft}
                    y1={getY(targetMin)}
                    x2={padLeft + plotWidth}
                    y2={getY(targetMin)}
                    stroke="#f59e0b"
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                  />
                  <text
                    x={padLeft + plotWidth + 4}
                    y={getY(targetMin) + 3}
                    fontSize="8.5"
                    fill="#b45309"
                    fontWeight="bold"
                  >
                    MIN {targetMin}
                  </text>
                </g>
              )}

              {targetMax !== undefined && targetMax >= yMin && targetMax <= yMax && (
                <g>
                  <line
                    x1={padLeft}
                    y1={getY(targetMax)}
                    x2={padLeft + plotWidth}
                    y2={getY(targetMax)}
                    stroke="#ea580c"
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                  />
                  <text
                    x={padLeft + plotWidth + 4}
                    y={getY(targetMax) + 3}
                    fontSize="8.5"
                    fill="#c2410c"
                    fontWeight="bold"
                  >
                    MAX {targetMax}
                  </text>
                </g>
              )}

              {/* 3. Area Fill di bawah kurva PPM Stabil */}
              {areaStabil && <path d={areaStabil} fill="url(#areaGradient)" />}

              {/* 4. Garis Kurva PPM Mentah (Raw Fluktuasi) */}
              {pathRaw && (
                <path
                  d={pathRaw}
                  fill="none"
                  stroke="#a1a1aa"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.85"
                />
              )}

              {/* 5. Garis Kurva PPM Stabil (Primary Line) */}
              {pathStabil && (
                <path
                  d={pathStabil}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* 6. Titik-titik pompa aktif (Relay ON) */}
              {points.map((p) => {
                if (!p.item.is_active) return null;
                return (
                  <g key={`pump-${p.index}`}>
                    <circle
                      cx={p.x}
                      cy={p.yStabil}
                      r="4.5"
                      fill="#2563eb"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}

              {/* 7. Label Timestamp Sumbu X (Awal, Tengah, Akhir) */}
              {points.length > 0 && (
                <g fontSize="9" fill="#71717a" fontWeight="bold">
                  <text x={padLeft} y={height - 8} textAnchor="start">
                    {points[0].item.timestamp}
                  </text>
                  {points.length > 2 && (
                    <text x={padLeft + plotWidth / 2} y={height - 8} textAnchor="middle">
                      {points[Math.floor(points.length / 2)].item.timestamp}
                    </text>
                  )}
                  <text x={padLeft + plotWidth} y={height - 8} textAnchor="end">
                    {points[points.length - 1].item.timestamp}
                  </text>
                </g>
              )}

              {/* 8. Kursor & Tooltip Garis Interaktif */}
              {activeHover && (
                <g>
                  {/* Garis vertikal kursor */}
                  <line
                    x1={activeHover.x}
                    y1={padTop}
                    x2={activeHover.x}
                    y2={padTop + plotHeight}
                    stroke="#059669"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />

                  {/* Dot sorotan PPM Raw */}
                  <circle
                    cx={activeHover.x}
                    cy={activeHover.yRaw}
                    r="3.5"
                    fill="#71717a"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />

                  {/* Dot sorotan PPM Stabil */}
                  <circle
                    cx={activeHover.x}
                    cy={activeHover.yStabil}
                    r="5.5"
                    fill="#059669"
                    stroke="#ffffff"
                    strokeWidth="2"
                    filter="url(#glow)"
                  />
                </g>
              )}
            </svg>

            {/* Floating Tooltip Card HTML */}
            {activeHover && (
              <div
                className="pointer-events-none absolute z-20 rounded-lg border border-zinc-300 bg-white/95 p-2.5 shadow-lg backdrop-blur-xs transition-transform duration-75 text-[11px] leading-tight space-y-1"
                style={{
                  left: `${Math.min(Math.max(activeHover.x - 60, 10), width - 180)}px`,
                  top: `${Math.max(activeHover.yStabil - 85, 12)}px`,
                  minWidth: '150px',
                }}
              >
                <div className="flex items-center justify-between border-b border-zinc-200 pb-1 text-[10px] text-zinc-500 font-bold">
                  <span>{activeHover.item.packet_id}</span>
                  <span>{activeHover.item.timestamp}</span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-zinc-600 font-bold">PPM Stabil:</span>
                  <span className="font-black text-emerald-700">{activeHover.item.ppm_filtered.toFixed(1)} ppm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">PPM Raw:</span>
                  <span className="font-bold text-zinc-700">{activeHover.item.ppm_raw.toFixed(1)} ppm</span>
                </div>
                {activeHover.item.voltage && (
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-zinc-500">Voltase:</span>
                    <span className="font-bold text-zinc-700">{activeHover.item.voltage}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-zinc-100">
                  <span className="text-zinc-500 text-[10px]">Status Pompa:</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                    activeHover.item.is_active
                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                      : 'bg-zinc-100 text-zinc-700'
                  }`}>
                    {activeHover.item.is_active ? 'ON (MENYALA)' : 'OFF (MATI)'}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
