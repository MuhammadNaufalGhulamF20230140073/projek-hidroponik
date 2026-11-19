'use client';

import React from 'react';
import { SystemControl } from '@/lib/types/hidroponik';
import { Zap } from 'lucide-react';

interface PumpControlPanelProps {
  control: SystemControl;
  actualPumpActive: boolean;
  onUpdateControl: (params: {
    mode?: 'auto' | 'manual';
    state?: boolean;
    target_ppm_min?: number;
    target_ppm_max?: number;
    cooldown_minutes?: number;
  }) => void;
}

export function PumpControlPanel({ control, actualPumpActive, onUpdateControl }: PumpControlPanelProps) {
  return (
    <div className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm space-y-6">
      {/* Header Status Pompa */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-300 pb-4">
        <div>
          <h2 className="font-mono text-xs font-black tracking-wider text-zinc-950">
            KONTROL AKTIVASI POMPA &amp; ENGINE NUTRISI
          </h2>
          <p className="font-mono text-xs font-bold text-zinc-800 mt-0.5">
            Relay Pompa Air &bull; GPIO 23
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-black border ${
            control.pump_mode === 'auto' 
              ? 'bg-emerald-100 text-emerald-900 border-emerald-400' 
              : 'bg-zinc-200 text-zinc-900 border-zinc-400'
          }`}>
            {control.pump_mode === 'auto' ? 'OTOMATIS AKTIF' : 'MANUAL AKTIF'}
          </span>
          <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-black border shadow-xs ${
            actualPumpActive 
              ? 'bg-rose-100 text-rose-950 border-rose-400 animate-pulse' 
              : 'bg-zinc-900 text-white border-zinc-950'
          }`}>
            {actualPumpActive ? '● POMPA FISIK: MENYALA (ON)' : '● POMPA FISIK: MATI (OFF)'}
          </span>
        </div>
      </div>

      {/* Banner Status Sistem */}
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 font-mono text-xs text-emerald-900 font-bold">
        <Zap className="h-4 w-4 shrink-0 text-emerald-700" />
        <span>SISTEM SIAP MEMOMPA SECARA OTOMATIS &bull; Pompa menyala saat PPM &lt; {control.target_ppm_min}</span>
      </div>

      {/* Mode Operasi & Saklar Manual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
          <span className="font-mono text-[10px] font-extrabold text-zinc-700 uppercase tracking-wider block">
            PILIH MODE OPERASI POMPA
          </span>
          <p className="font-mono text-xs text-zinc-800 font-semibold leading-relaxed">
            Gunakan mode otomatis agar dikontrol sensor atau mode manual untuk saklar langsung.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
            <button
              onClick={() => onUpdateControl({ mode: 'auto' })}
              className={`py-2 px-3 text-xs font-bold rounded-lg border transition cursor-pointer ${
                control.pump_mode === 'auto'
                  ? 'bg-emerald-700 border-emerald-800 text-white shadow-xs'
                  : 'bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              OTOMATIS (AUTO)
            </button>
            <button
              onClick={() => onUpdateControl({ mode: 'manual' })}
              className={`py-2 px-3 text-xs font-bold rounded-lg border transition cursor-pointer ${
                control.pump_mode === 'manual'
                  ? 'bg-zinc-900 border-zinc-950 text-white shadow-xs'
                  : 'bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              MANUAL (SAKLAR)
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] font-extrabold text-zinc-700 uppercase tracking-wider">
              SAKLAR KONTROL MANUAL
            </span>
            <span className="font-mono text-[10px] font-bold text-zinc-800">Relay Pin 23</span>
          </div>
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="font-bold text-zinc-900">
              STATUS: <strong className={actualPumpActive ? 'text-emerald-700' : 'text-zinc-900'}>{actualPumpActive ? 'POMPA MENYALA (ON)' : 'POMPA MATI (OFF)'}</strong>
            </span>
            <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">Tersinkron</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
            <button
              onClick={() => onUpdateControl({ mode: 'manual', state: true })}
              className="py-2 px-3 text-xs font-bold rounded-lg border bg-emerald-700 border-emerald-800 text-white hover:bg-emerald-800 transition cursor-pointer shadow-xs"
            >
              NYALAKAN (ON)
            </button>
            <button
              onClick={() => onUpdateControl({ mode: 'manual', state: false })}
              className="py-2 px-3 text-xs font-bold rounded-lg border bg-rose-700 border-rose-800 text-white hover:bg-rose-800 transition cursor-pointer shadow-xs"
            >
              MATIKAN (OFF)
            </button>
          </div>
        </div>
      </div>

      {/* Setpoints & Rest Window Parameters */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-200 pb-3">
          <div>
            <span className="text-[10px] font-extrabold text-zinc-700 uppercase tracking-wider block">
              SETPOINTS &amp; REST WINDOW PARAMETERS
            </span>
            <span className="text-xs text-zinc-800 font-semibold">Preset Cepat: Selada (560-840) &bull; Sayur Buah (1000-1400)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-800 uppercase block">Min Threshold (Trigger ON)</label>
            <div className="flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 shadow-xs">
              <input
                type="number"
                value={control.target_ppm_min}
                onChange={(e) => onUpdateControl({ target_ppm_min: Number(e.target.value) })}
                className="w-full bg-transparent text-sm font-bold text-zinc-950 focus:outline-none"
              />
              <span className="text-xs font-bold text-zinc-700 ml-2">PPM</span>
            </div>
            <span className="text-[10px] text-zinc-700 font-semibold block">Pompa ON jika PPM &lt; ini</span>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-800 uppercase block">Target Cap (Cutoff OFF)</label>
            <div className="flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 shadow-xs">
              <input
                type="number"
                value={control.target_ppm_max}
                onChange={(e) => onUpdateControl({ target_ppm_max: Number(e.target.value) })}
                className="w-full bg-transparent text-sm font-bold text-zinc-950 focus:outline-none"
              />
              <span className="text-xs font-bold text-zinc-700 ml-2">PPM</span>
            </div>
            <span className="text-[10px] text-zinc-700 font-semibold block">Pompa OFF saat PPM &gt;= ini</span>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-800 uppercase block">Cooldown Window</label>
            <div className="flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 shadow-xs">
              <input
                type="number"
                value={control.cooldown_minutes}
                onChange={(e) => onUpdateControl({ cooldown_minutes: Number(e.target.value) })}
                className="w-full bg-transparent text-sm font-bold text-zinc-950 focus:outline-none"
              />
              <span className="text-xs font-bold text-zinc-700 ml-2">MINS</span>
            </div>
            <span className="text-[10px] text-zinc-700 font-semibold block">Maks 1x siklus per durasi ini</span>
          </div>
        </div>
      </div>
    </div>
  );
}