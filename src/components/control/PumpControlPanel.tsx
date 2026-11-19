'use client';

import React, { useState, useEffect } from 'react';
import { SystemControl } from '@/lib/types/hidroponik';
import { Zap, Check, Save, Power, Timer, ShieldCheck } from 'lucide-react';

interface CooldownInfo {
  is_in_cooldown: boolean;
  remaining_seconds: number;
  remaining_minutes: number;
}

interface PumpControlPanelProps {
  control: SystemControl;
  actualPumpActive: boolean;
  cooldownInfo?: CooldownInfo;
  onUpdateControl: (params: {
    mode?: 'auto' | 'manual';
    state?: boolean;
    target_ppm_min?: number;
    target_ppm_max?: number;
    cooldown_minutes?: number;
  }) => void;
}

export function PumpControlPanel({
  control,
  actualPumpActive,
  cooldownInfo,
  onUpdateControl,
}: PumpControlPanelProps) {
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Buffer input lokal agar user bisa mengetik/menghapus angka dengan leluasa tanpa langsung terkirim separuh
  const [ppmMin, setPpmMin] = useState<string>(String(control.target_ppm_min || 560));
  const [ppmMax, setPpmMax] = useState<string>(String(control.target_ppm_max || 840));
  const [cooldownMins, setCooldownMins] = useState<string>(String(control.cooldown_minutes || 60));
  const [isUserEditing, setIsUserEditing] = useState(false);

  useEffect(() => {
    if (!isUserEditing) {
      if (control.target_ppm_min !== undefined) setPpmMin(String(control.target_ppm_min));
      if (control.target_ppm_max !== undefined) setPpmMax(String(control.target_ppm_max));
      if (control.cooldown_minutes !== undefined) setCooldownMins(String(control.cooldown_minutes));
    }
  }, [control, isUserEditing]);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const isManual = control.pump_mode === 'manual';
  // Pada mode manual, ikuti kehendak tombol saklar seketika agar tidak delay kebalik-balik
  const isSwitchActive = isManual ? Boolean(control.pump_state) : actualPumpActive;

  const handleToggleMode = async (newMode: 'auto' | 'manual') => {
    setLoading(true);
    try {
      await onUpdateControl({ mode: newMode });
      showNotification(`MODE BERGANTI: ${newMode === 'auto' ? 'OTOMATIS (AUTO)' : 'MANUAL (SAKLAR)'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePumpState = async (newState: boolean) => {
    setLoading(true);
    try {
      await onUpdateControl({ mode: 'manual', state: newState });
      showNotification(`SAKLAR: POMPA ${newState ? 'DINYALAKAN (ON)' : 'DIMATIKAN (OFF)'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    const valMin = parseFloat(ppmMin) || 560;
    const valMax = parseFloat(ppmMax) || 840;
    const valCd = parseInt(cooldownMins, 10) || 60;

    if (valMin >= valMax) {
      alert('Peringatan: Nilai Batas Minimum harus lebih kecil dari Batas Target Maksimum!');
      return;
    }

    setLoading(true);
    try {
      await onUpdateControl({
        target_ppm_min: valMin,
        target_ppm_max: valMax,
        cooldown_minutes: valCd,
      });
      setIsUserEditing(false);
      showNotification(`KONFIGURASI TERSIMPAN: ${valMin}-${valMax} PPM | JEDA: ${valCd}m`);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (min: number, max: number) => {
    setIsUserEditing(true);
    setPpmMin(String(min));
    setPpmMax(String(max));
  };

  const isInCooldown = Boolean(cooldownInfo?.is_in_cooldown);
  const remainingSecs = cooldownInfo?.remaining_seconds || 0;
  const remainingTimeStr = remainingSecs >= 60 
    ? `${Math.floor(remainingSecs / 60)}m ${(remainingSecs % 60).toString().padStart(2, '0')}s` 
    : `${remainingSecs}s`;

  return (
    <div className="rounded-2xl border border-zinc-300 bg-white p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header Status Pompa */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <h2 className="font-mono text-xs font-black tracking-wider text-zinc-950 uppercase">
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
          <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-black border shadow-xs transition-colors ${
            isSwitchActive 
              ? 'bg-emerald-600 text-white border-emerald-700 animate-pulse' 
              : 'bg-zinc-900 text-white border-zinc-950'
          }`}>
            {isSwitchActive ? '● POMPA: MENYALA (ON)' : '● POMPA: MATI (OFF)'}
          </span>
        </div>
      </div>

      {/* Notifikasi Sukses Cepat */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400 bg-emerald-50 px-3.5 py-2.5 font-mono text-xs font-bold text-emerald-900 shadow-xs">
          <Check className="h-4 w-4 shrink-0 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Banner Status Sistem & Cooldown */}
      <div className={`flex items-center justify-between gap-2.5 rounded-xl border px-4 py-3 font-mono text-xs font-bold transition-all ${
        isInCooldown && control.pump_mode === 'auto'
          ? 'border-amber-400 bg-amber-50 text-amber-950'
          : 'border-emerald-300 bg-emerald-50 text-emerald-900'
      }`}>
        <div className="flex items-center gap-2">
          {isInCooldown && control.pump_mode === 'auto' ? (
            <Timer className="h-4 w-4 shrink-0 text-amber-700 animate-spin" style={{ animationDuration: '6s' }} />
          ) : (
            <Zap className="h-4 w-4 shrink-0 text-emerald-700" />
          )}
          <span>
            {isInCooldown && control.pump_mode === 'auto'
              ? `JEDA COOLDOWN NUTRISI AKTIF (Tersisa: ${remainingTimeStr})`
              : `SISTEM SIAP MEMOMPA SECARA OTOMATIS \u2022 Pompa menyala saat PPM < ${control.target_ppm_min}`}
          </span>
        </div>
        <span className="hidden sm:inline text-[11px] font-semibold text-zinc-600">
          {isInCooldown && control.pump_mode === 'auto'
            ? 'Proteksi overdosis tanaman'
            : 'Mati saat PPM >= target'}
        </span>
      </div>

      {/* Mode Operasi & Saklar Manual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kolom 1: Pilihan Mode */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
          <span className="font-mono text-[10px] font-extrabold text-zinc-700 uppercase tracking-wider block">
            PILIH MODE OPERASI POMPA
          </span>
          <p className="font-mono text-xs text-zinc-800 font-semibold leading-relaxed">
            Gunakan mode otomatis agar dikontrol sensor atau mode manual untuk saklar langsung.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
            <button
              type="button"
              onClick={() => handleToggleMode('auto')}
              disabled={loading}
              className={`py-2 px-3 text-xs font-black rounded-lg border transition cursor-pointer ${
                control.pump_mode === 'auto'
                  ? 'bg-emerald-700 border-emerald-800 text-white shadow-sm ring-2 ring-emerald-500/30'
                  : 'bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              OTOMATIS (AUTO)
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode('manual')}
              disabled={loading}
              className={`py-2 px-3 text-xs font-black rounded-lg border transition cursor-pointer ${
                control.pump_mode === 'manual'
                  ? 'bg-zinc-900 border-zinc-950 text-white shadow-sm ring-2 ring-zinc-700/30'
                  : 'bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              MANUAL (SAKLAR)
            </button>
          </div>
        </div>

        {/* Kolom 2: Saklar Manual */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] font-extrabold text-zinc-700 uppercase tracking-wider">
              SAKLAR KONTROL MANUAL
            </span>
            <span className="font-mono text-[10px] font-bold text-zinc-800">Relay Pin 23</span>
          </div>

          <div className="flex items-center justify-between font-mono text-xs bg-white p-2.5 rounded-lg border border-zinc-200">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${isSwitchActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
              <span className="font-bold text-zinc-900">
                STATUS: <strong className={isSwitchActive ? 'text-emerald-700' : 'text-zinc-600'}>
                  {isSwitchActive ? 'POMPA MENYALA (ON)' : 'POMPA MATI (OFF)'}
                </strong>
              </span>
            </div>
            <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
              Tersinkron
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleTogglePumpState(true)}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-black rounded-lg border transition cursor-pointer shadow-xs ${
                isSwitchActive
                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-md ring-2 ring-emerald-500/40'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              NYALAKAN (ON)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleTogglePumpState(false)}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-black rounded-lg border transition cursor-pointer shadow-xs ${
                !isSwitchActive
                  ? 'bg-rose-600 border-rose-700 text-white shadow-md ring-2 ring-rose-500/40'
                  : 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
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
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-zinc-600 font-semibold">Preset Cepat:</span>
              <button
                type="button"
                onClick={() => applyPreset(560, 840)}
                className="text-[11px] rounded bg-zinc-200 px-2 py-0.5 hover:bg-zinc-300 text-zinc-900 font-bold cursor-pointer"
              >
                Selada (560-840)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(1000, 1400)}
                className="text-[11px] rounded bg-zinc-200 px-2 py-0.5 hover:bg-zinc-300 text-zinc-900 font-bold cursor-pointer"
              >
                Sayur Buah (1000-1400)
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={loading}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-emerald-700 border border-emerald-800 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-800 transition cursor-pointer shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            SIMPAN CONFIG
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-800 uppercase block">Min Threshold (Trigger ON)</label>
            <div className="flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 shadow-xs">
              <input
                type="number"
                value={ppmMin}
                onFocus={() => setIsUserEditing(true)}
                onChange={(e) => {
                  setIsUserEditing(true);
                  setPpmMin(e.target.value);
                }}
                className="w-full bg-transparent text-sm font-bold text-zinc-950 focus:outline-none"
                placeholder="560"
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
                value={ppmMax}
                onFocus={() => setIsUserEditing(true)}
                onChange={(e) => {
                  setIsUserEditing(true);
                  setPpmMax(e.target.value);
                }}
                className="w-full bg-transparent text-sm font-bold text-zinc-950 focus:outline-none"
                placeholder="840"
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
                value={cooldownMins}
                onFocus={() => setIsUserEditing(true)}
                onChange={(e) => {
                  setIsUserEditing(true);
                  setCooldownMins(e.target.value);
                }}
                className="w-full bg-transparent text-sm font-bold text-zinc-950 focus:outline-none"
                placeholder="60"
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
