'use client';

import React from 'react';
import { Cpu, Sliders } from 'lucide-react';

export function CalibrationInfo() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#121418] p-6 text-zinc-100 shadow-xl space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xs font-black tracking-wider text-white flex items-center gap-2">
            <Cpu className="h-4 w-4 text-emerald-400" />
            FIRMWARE CALIBRATION &amp; ADC POLYNOMIAL MODEL
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5 font-semibold">Embedded Coefficients on ESP32 Core</p>
        </div>
        <span className="rounded bg-zinc-800 px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-zinc-700">
          CAL_PROFILE: 500/1000PPM
        </span>
      </div>

      {/* Grid Koefisien */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-[#0d0f12] p-4">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Calibration Factor</span>
          <div className="text-xl font-black text-white mt-1">0.9344</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#0d0f12] p-4">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Slope Multiplier</span>
          <div className="text-xl font-black text-white mt-1">0.9200</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#0d0f12] p-4">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Zero Offset</span>
          <div className="text-xl font-black text-white mt-1">+68.50 <span className="text-xs font-normal text-zinc-400">ppm</span></div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#0d0f12] p-4">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">EMA Filter Alpha</span>
          <div className="text-xl font-black text-white mt-1">0.20 <span className="text-xs font-normal text-zinc-400">/ 10 smp</span></div>
        </div>
      </div>

      {/* Transfer Function Code Block */}
      <div className="rounded-xl border border-zinc-800 bg-[#0d0f12] p-4 space-y-2">
        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Transfer Function (C++ Embedded):</span>
        <pre className="text-xs font-mono text-emerald-400 leading-relaxed overflow-x-auto bg-black/40 p-3 rounded-lg border border-zinc-900">
{`k_temp = 1.0 + 0.02 * (T - 25.0) • V_comp = V_raw / k_temp
tds_raw = (133.42 * Vc³ - 255.86 * Vc² + 857.39 * Vc) * 0.5
PPM = (0.9200 * (tds_raw * 0.9344)) + 68.50`}
        </pre>
      </div>
    </div>
  );
}