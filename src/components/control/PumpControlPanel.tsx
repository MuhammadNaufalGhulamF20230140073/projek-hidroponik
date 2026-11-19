'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SystemControl } from '@/lib/types/hidroponik';
import { Zap, Check, Save, Power, Timer, AlertCircle, Loader2 } from 'lucide-react';

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
  }) => Promise<void> | void;
}

export function PumpControlPanel({
  control,
  actualPumpActive,
  cooldownInfo,
  onUpdateControl,
}: PumpControlPanelProps) {
  const [successMsg, setSuccessMsg] = useState('');
  
  // State transisi aksi yang sedang aktif (agar ada fase loading halus dan tidak kedut-kedut)
  const [pendingPumpState, setPendingPumpState] = useState<boolean | null>(null);
  const [pendingMode, setPendingMode] = useState<'auto' | 'manual' | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // State lokal nilai input
  const [ppmMin, setPpmMin] = useState<string>(String(control.target_ppm_min ?? 560));
  const [ppmMax, setPpmMax] = useState<string>(String(control.target_ppm_max ?? 840));
  const [cooldownMins, setCooldownMins] = useState<string>(String(control.cooldown_minutes ?? 60));

  // Flag apakah user telah mengedit angka (jika true, polling background DILARANG menimpa!)
  const [isDirty, setIsDirty] = useState(false);

  // Sinkronkan dari server HANYA saat pertama kali atau saat user TIDAK sedang memiliki draft editan
  useEffect(() => {
    if (!isDirty) {
      if (control.target_ppm_min !== undefined) setPpmMin(String(control.target_ppm_min));
      if (control.target_ppm_max !== undefined) setPpmMax(String(control.target_ppm_max));
      if (control.cooldown_minutes !== undefined) setCooldownMins(String(control.cooldown_minutes));
    }
  }, [control.target_ppm_min, control.target_ppm_max, control.cooldown_minutes, isDirty]);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const isManual = control.pump_mode === 'manual';
  // Pada mode manual, ikuti kehendak tombol saklar seketika agar tidak delay kebalik-balik
  const isSwitchActive = isManual ? Boolean(control.pump_state) : actualPumpActive;

  const handleToggleMode = async (newMode: 'auto' | 'manual') => {
    if (control.pump_mode === newMode) return;
    setPendingMode(newMode);
    try {
      await onUpdateControl({ mode: newMode });
      showNotification(`MODE BERGANTI: ${newMode === 'auto' ? 'OTOMATIS (AUTO)' : 'MANUAL (SAKLAR)'}`);
    } finally {
      setPendingMode(null);
    }
  };

  const handleTogglePumpState = async (newState: boolean) => {
    setPendingPumpState(newState);
    try {
      await onUpdateControl({ mode: 'manual', state: newState });
      showNotification(`SAKLAR MANUAL: POMPA ${newState ? 'DINYALAKAN (ON)' : 'DIMATIKAN (OFF)'}`);
    } finally {
      setPendingPumpState(null);
    }
  };

  const handleSaveConfig = async () => {
    const valMin = parseFloat(ppmMin);
    const valMax = parseFloat(ppmMax);
    const valCd = parseInt(cooldownMins, 10);

    if (Number.isNaN(valMin) || Number.isNaN(valMax) || Number.isNaN(valCd)) {
      alert('Mohon masukkan angka yang valid!');
      return;
    }

    if (valMin >= valMax) {
      alert('Peringatan: Nilai Target Min harus lebih kecil dari Target Max!');
      return;
    }

    setIsSavingConfig(true);
    try {
      await onUpdateControl({
        target_ppm_min: valMin,
        target_ppm_max: valMax,
        cooldown_minutes: valCd,
      });
      setIsDirty(false); // Reset status dirty setelah sukses disimpan
      showNotification(`KONFIGURASI TERSIMPAN: MIN ${valMin} PPM • MAX ${valMax} PPM • JEDA ${valCd}m`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveConfig();
    }
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
            KONTROL POMPA NUTRISI
          </h2>
          <p className="font-mono text-xs font-bold text-zinc-800 mt-0.5">
            Saklar Listrik Pompa Air Nutrisi
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-black border transition-all duration-300 ${
            (pendingMode ? pendingMode === 'auto' : control.pump_mode === 'auto')
              ? 'bg-emerald-100 text-emerald-900 border-emerald-400' 
              : 'bg-zinc-200 text-zinc-900 border-zinc-400'
          }`}>
            {pendingMode !== null
              ? (pendingMode === 'auto' ? 'MENGUBAH AUTO...' : 'MENGUBAH MANUAL...')
              : (control.pump_mode === 'auto' ? 'OTOMATIS AKTIF' : 'MANUAL AKTIF')}
          </span>
          <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-black border shadow-xs transition-all duration-300 ${
            pendingPumpState !== null
              ? (pendingPumpState ? 'bg-emerald-700 text-white border-emerald-800' : 'bg-rose-700 text-white border-rose-800')
              : isSwitchActive 
                ? 'bg-emerald-600 text-white border-emerald-700' 
                : 'bg-zinc-900 text-white border-zinc-950'
          }`}>
            {pendingPumpState !== null
              ? (pendingPumpState ? '● PROSES MENYALA...' : '● PROSES MEMATIKAN...')
              : isSwitchActive 
                ? '● POMPA: MENYALA (ON)' 
                : '● POMPA: MATI (OFF)'}
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
              ? `WAKTU ISTIRAHAT POMPA AKTIF (Sisa jeda: ${remainingTimeStr} agar pupuk larut merata)`
              : `SISTEM OTOMATIS SIAP \u2022 Pompa ON jika PPM < ${control.target_ppm_min} \u2022 Pompa OFF di ${control.target_ppm_max} PPM`}
          </span>
        </div>
        <span className="hidden sm:inline text-[11px] font-semibold text-zinc-600">
          {isInCooldown && control.pump_mode === 'auto'
            ? 'Mencegah kelebihan pupuk'
            : 'Mati otomatis saat nutrisi cukup'}
        </span>
      </div>

      {/* Mode Operasi & Saklar Manual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kolom 1: Pilihan Mode */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
          <span className="font-mono text-[10px] font-extrabold text-zinc-700 uppercase tracking-wider block">
            CARA KERJA POMPA
          </span>
          <p className="font-mono text-xs text-zinc-800 font-semibold leading-relaxed">
            Pilih mode otomatis agar dikontrol sensor atau mode manual untuk menyalakan langsung.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
            <button
              type="button"
              onClick={() => handleToggleMode('auto')}
              disabled={pendingMode !== null || pendingPumpState !== null}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-black rounded-lg border transition-all duration-200 cursor-pointer ${
                control.pump_mode === 'auto'
                  ? 'bg-emerald-700 border-emerald-800 text-white shadow-sm ring-2 ring-emerald-500/30'
                  : 'bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-100'
              } ${pendingMode === 'auto' ? 'opacity-85' : ''}`}
            >
              {pendingMode === 'auto' ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  MEMPROSES...
                </>
              ) : (
                'OTOMATIS (SENSOR)'
              )}
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode('manual')}
              disabled={pendingMode !== null || pendingPumpState !== null}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-black rounded-lg border transition-all duration-200 cursor-pointer ${
                control.pump_mode === 'manual'
                  ? 'bg-zinc-900 border-zinc-950 text-white shadow-sm ring-2 ring-zinc-700/30'
                  : 'bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-100'
              } ${pendingMode === 'manual' ? 'opacity-85' : ''}`}
            >
              {pendingMode === 'manual' ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  MEMPROSES...
                </>
              ) : (
                'MANUAL (TOMBOL)'
              )}
            </button>
          </div>
        </div>

        {/* Kolom 2: Saklar Manual */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] font-extrabold text-zinc-700 uppercase tracking-wider">
              TOMBOL SAKLAR POMPA
            </span>
            <span className="font-mono text-[10px] font-bold text-zinc-800">Pompa Nutrisi</span>
          </div>

          <div className="flex items-center justify-between font-mono text-xs bg-white p-2.5 rounded-lg border border-zinc-200 transition-all duration-200">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                pendingPumpState !== null 
                  ? 'bg-amber-500' 
                  : isSwitchActive 
                    ? 'bg-emerald-500' 
                    : 'bg-zinc-400'
              }`} />
              <span className="font-bold text-zinc-900">
                STATUS:{' '}
                <strong className={
                  pendingPumpState !== null 
                    ? 'text-amber-700' 
                    : isSwitchActive 
                      ? 'text-emerald-700' 
                      : 'text-zinc-600'
                }>
                  {pendingPumpState !== null
                    ? (pendingPumpState ? 'PROSES MENYALAKAN...' : 'PROSES MEMATIKAN...')
                    : isSwitchActive 
                      ? 'POMPA MENYALA (ON)' 
                      : 'POMPA MATI (OFF)'}
                </strong>
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors duration-200 ${
              pendingPumpState !== null
                ? 'text-amber-900 bg-amber-100 border-amber-300'
                : 'text-emerald-800 bg-emerald-100 border-emerald-300'
            }`}>
              {pendingPumpState !== null ? 'Mengirim...' : 'Tersinkron'}
            </span>
          </div>

          {/* 1 Tombol Toggle Tunggal (Cerdas, Animasi Loading Mulus & Anti-Kedut) */}
          <div className="pt-1 font-mono">
            {pendingPumpState !== null ? (
              <button
                type="button"
                disabled
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-black rounded-lg border shadow-sm transition-all duration-200 cursor-wait opacity-90 text-white ${
                  pendingPumpState
                    ? 'border-emerald-700 bg-emerald-600 ring-2 ring-emerald-500/30'
                    : 'border-rose-700 bg-rose-600 ring-2 ring-rose-500/30'
                }`}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                {pendingPumpState ? 'MENYALAKAN POMPA...' : 'MEMATIKAN POMPA...'}
              </button>
            ) : isSwitchActive ? (
              <button
                type="button"
                disabled={pendingMode !== null || isSavingConfig}
                onClick={() => handleTogglePumpState(false)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-black rounded-lg border border-rose-700 bg-rose-600 hover:bg-rose-700 text-white shadow-sm ring-2 ring-rose-500/30 transition-all duration-200 cursor-pointer active:scale-[0.99]"
              >
                <Power className="h-4 w-4" />
                MATIKAN POMPA (OFF)
              </button>
            ) : (
              <button
                type="button"
                disabled={pendingMode !== null || isSavingConfig}
                onClick={() => handleTogglePumpState(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-black rounded-lg border border-emerald-700 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/30 transition-all duration-200 cursor-pointer active:scale-[0.99]"
              >
                <Power className="h-4 w-4" />
                NYALAKAN POMPA (ON)
              </button>
            )}
            <p className="text-[10px] font-semibold text-zinc-700 text-center mt-1.5 transition-all duration-200">
              {pendingPumpState !== null
                ? (pendingPumpState ? 'Sedang mengirim sinyal aktivasi ke pompa...' : 'Sedang mengirim sinyal mati ke pompa...')
                : isSwitchActive 
                  ? '● Pompa sedang AKTIF — Klik tombol untuk mematikan' 
                  : '○ Pompa sedang MATI — Klik tombol untuk menyalakan'}
            </p>
          </div>
        </div>
      </div>

      {/* Setpoints & Rest Window Parameters */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-zinc-700 uppercase tracking-wider block">
                TARGET PPM (MIN / MAX) &amp; COOLDOWN
              </span>
              {isDirty && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  <AlertCircle className="h-3 w-3" />
                  Ada Perubahan Belum Disimpan
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-600 font-semibold mt-0.5">
              Atur parameter Target Min, Target Max, dan durasi Cooldown pompa
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={isSavingConfig || pendingMode !== null || pendingPumpState !== null}
            className={`flex items-center gap-1.5 self-start sm:self-auto rounded-lg px-3.5 py-1.5 text-xs font-black transition-all duration-200 cursor-pointer shadow-xs ${
              isDirty
                ? 'bg-amber-600 border border-amber-700 text-white hover:bg-amber-700 ring-2 ring-amber-400/40'
                : 'bg-emerald-700 border border-emerald-800 text-white hover:bg-emerald-800'
            }`}
          >
            {isSavingConfig ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                MENYIMPAN...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {isDirty ? 'SIMPAN PERUBAHAN' : 'SIMPAN PENGATURAN'}
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-800 uppercase block">Target PPM Min (Pompa ON)</label>
            <div className="flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-emerald-500">
              <input
                type="number"
                value={ppmMin}
                onChange={(e) => {
                  setPpmMin(e.target.value);
                  setIsDirty(true);
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-sm font-bold text-zinc-950 focus:outline-none"
                placeholder="560"
              />
              <span className="text-xs font-bold text-zinc-700 ml-2">PPM</span>
            </div>
            <span className="text-[10px] text-zinc-700 font-semibold block">Pompa ON otomatis saat PPM &lt; angka ini</span>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-800 uppercase block">Target PPM Max (Pompa OFF)</label>
            <div className="flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-emerald-500">
              <input
                type="number"
                value={ppmMax}
                onChange={(e) => {
                  setPpmMax(e.target.value);
                  setIsDirty(true);
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-sm font-bold text-zinc-950 focus:outline-none"
                placeholder="840"
              />
              <span className="text-xs font-bold text-zinc-700 ml-2">PPM</span>
            </div>
            <span className="text-[10px] text-zinc-700 font-semibold block">Pompa OFF otomatis saat PPM &gt;= angka ini</span>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-800 uppercase block">Cooldown Time (Jeda Istirahat)</label>
            <div className="flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-emerald-500">
              <input
                type="number"
                value={cooldownMins}
                onChange={(e) => {
                  setCooldownMins(e.target.value);
                  setIsDirty(true);
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-sm font-bold text-zinc-950 focus:outline-none"
                placeholder="60"
              />
              <span className="text-xs font-bold text-zinc-700 ml-2">MENIT</span>
            </div>
            <span className="text-[10px] text-zinc-700 font-semibold block">Jeda tunggu agar nutrisi larut merata</span>
          </div>
        </div>
      </div>
    </div>
  );
}
