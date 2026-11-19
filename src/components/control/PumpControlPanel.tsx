'use client';

import React, { useState, useEffect } from 'react';
import { SystemControl } from '@/lib/types/hidroponik';
import { 
  Zap, 
  Check, 
  Save, 
  Power, 
  Timer, 
  AlertCircle, 
  Loader2, 
  Sliders, 
  Settings2, 
  ChevronDown, 
  ChevronUp, 
  Info 
} from 'lucide-react';

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
  
  // State dropdown buka-tutup (accordion) untuk masing-masing menu kontrol
  const [openDropdowns, setOpenDropdowns] = useState<{
    mode: boolean;
    switch: boolean;
    target: boolean;
  }>({
    mode: true,
    switch: true,
    target: false,
  });

  const toggleDropdown = (key: 'mode' | 'switch' | 'target') => {
    setOpenDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // State transisi aksi yang sedang aktif
  const [pendingPumpState, setPendingPumpState] = useState<boolean | null>(null);
  const [pendingMode, setPendingMode] = useState<'auto' | 'manual' | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // State lokal nilai input
  const [ppmMin, setPpmMin] = useState<string>(String(control.target_ppm_min ?? 560));
  const [ppmMax, setPpmMax] = useState<string>(String(control.target_ppm_max ?? 840));
  const [cooldownMins, setCooldownMins] = useState<string>(String(control.cooldown_minutes ?? 60));

  // Flag apakah user telah mengedit angka
  const [isDirty, setIsDirty] = useState(false);

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
  const isSwitchActive = isManual ? Boolean(control.pump_state) : actualPumpActive;

  const handleToggleMode = async (newMode: 'auto' | 'manual') => {
    if (control.pump_mode === newMode) return;
    setPendingMode(newMode);
    try {
      await onUpdateControl({ mode: newMode });
      showNotification(`MODE BERGANTI: ${newMode === 'auto' ? 'OTOMATIS (AUTO)' : 'MANUAL (TOMBOL)'}`);
      // Jika beralih ke manual, otomatis buka dropdown saklar agar tombol langsung terlihat
      if (newMode === 'manual') {
        setOpenDropdowns((prev) => ({ ...prev, switch: true }));
      }
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
      setIsDirty(false);
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
    <div className="rounded-2xl border border-zinc-300 bg-white p-4 sm:p-6 shadow-sm space-y-4">
      {/* Header Utama Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <h2 className="font-mono text-xs font-black tracking-wider text-zinc-950 uppercase flex items-center gap-1.5">
            <Sliders className="h-4 w-4 text-emerald-800" />
            PENGATURAN &amp; SAKLAR POMPA
          </h2>
          <p className="font-mono text-xs font-bold text-zinc-600 mt-0.5">
            Kelola cara kerja, tombol saklar manual, dan target nutrisi
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-black border transition-all duration-300 ${
            control.pump_mode === 'auto'
              ? 'bg-emerald-100 text-emerald-950 border-emerald-400' 
              : 'bg-zinc-800 text-white border-zinc-900'
          }`}>
            {control.pump_mode === 'auto' ? 'MODE: OTOMATIS' : 'MODE: MANUAL'}
          </span>
          <span className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-black border shadow-xs transition-all duration-300 ${
            isSwitchActive 
              ? 'bg-emerald-600 text-white border-emerald-700' 
              : 'bg-zinc-100 text-zinc-800 border-zinc-300'
          }`}>
            {isSwitchActive ? '● POMPA AKTIF (ON)' : '○ POMPA MATI (OFF)'}
          </span>
        </div>
      </div>

      {/* Notifikasi Cepat */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400 bg-emerald-50 px-3.5 py-2.5 font-mono text-xs font-bold text-emerald-900 shadow-xs animate-in fade-in duration-200">
          <Check className="h-4 w-4 shrink-0 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* =========================================================================
          DROPDOWN 1: CARA KERJA POMPA (MODE OTOMATIS VS MANUAL)
         ========================================================================= */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 overflow-hidden shadow-2xs transition-all duration-200">
        <button
          type="button"
          onClick={() => toggleDropdown('mode')}
          className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-zinc-100/80 active:bg-zinc-200/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 shrink-0">
              <Zap className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <span className="font-mono text-xs font-black text-zinc-950 uppercase tracking-wide block truncate">
                1. Mode Operasi Pompa
              </span>
              <span className="text-[11px] text-zinc-500 font-semibold block truncate">
                Pilih kontrol otomatis sensor atau manual
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              control.pump_mode === 'auto'
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                : 'bg-zinc-800 text-white border-zinc-900'
            }`}>
              {control.pump_mode === 'auto' ? 'OTOMATIS' : 'MANUAL'}
            </span>
            {openDropdowns.mode ? (
              <ChevronUp className="h-4 w-4 text-zinc-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-600" />
            )}
          </div>
        </button>

        {openDropdowns.mode && (
          <div className="p-3.5 sm:p-4 border-t border-zinc-200 bg-white space-y-3.5 font-mono animate-in fade-in duration-150">
            <p className="text-xs text-zinc-700 font-semibold leading-relaxed">
              Pilih <strong>Otomatis</strong> agar pompa menyiram nutrisi secara cerdas sesuai kadar PPM sensor TDS, atau <strong>Manual</strong> untuk mengendalikan tombol saklar sendiri.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleToggleMode('auto')}
                disabled={pendingMode !== null || pendingPumpState !== null}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-black rounded-xl border transition-all duration-200 cursor-pointer active:scale-[0.99] ${
                  control.pump_mode === 'auto'
                    ? 'bg-emerald-700 border-emerald-800 text-white shadow-sm ring-2 ring-emerald-500/30'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 hover:bg-zinc-100'
                } ${pendingMode === 'auto' ? 'opacity-85' : ''}`}
              >
                {pendingMode === 'auto' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-black rounded-xl border transition-all duration-200 cursor-pointer active:scale-[0.99] ${
                  control.pump_mode === 'manual'
                    ? 'bg-zinc-900 border-zinc-950 text-white shadow-sm ring-2 ring-zinc-700/30'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 hover:bg-zinc-100'
                } ${pendingMode === 'manual' ? 'opacity-85' : ''}`}
              >
                {pendingMode === 'manual' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    MEMPROSES...
                  </>
                ) : (
                  'MANUAL (TOMBOL)'
                )}
              </button>
            </div>

            {/* Banner Status Mode Auto / Cooldown */}
            {control.pump_mode === 'auto' && (
              <div className={`flex items-center justify-between gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all ${
                isInCooldown
                  ? 'border-amber-400 bg-amber-50 text-amber-950'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-950'
              }`}>
                <div className="flex items-center gap-2">
                  {isInCooldown ? (
                    <Timer className="h-4 w-4 shrink-0 text-amber-700 animate-spin" style={{ animationDuration: '6s' }} />
                  ) : (
                    <Zap className="h-4 w-4 shrink-0 text-emerald-700" />
                  )}
                  <span>
                    {isInCooldown
                      ? `Jeda Cooldown Aktif (Sisa jeda: ${remainingTimeStr})`
                      : `Sistem Siap \u2022 Pompa ON di < ${control.target_ppm_min} PPM \u2022 OFF di >= ${control.target_ppm_max} PPM`}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          DROPDOWN 2: SAKLAR POMPA MANUAL (TOMBOL HANYA MUNCUL DI MODE MANUAL)
         ========================================================================= */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 overflow-hidden shadow-2xs transition-all duration-200">
        <button
          type="button"
          onClick={() => toggleDropdown('switch')}
          className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-zinc-100/80 active:bg-zinc-200/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-900 border border-blue-200 shrink-0">
              <Power className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <span className="font-mono text-xs font-black text-zinc-950 uppercase tracking-wide block truncate">
                2. Saklar Pompa Manual
              </span>
              <span className="text-[11px] text-zinc-500 font-semibold block truncate">
                {isManual ? 'Tombol kontrol langsung ON/OFF' : 'Hanya aktif di Mode Manual'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              isManual
                ? (isSwitchActive ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-zinc-200 text-zinc-900 border-zinc-400')
                : 'bg-zinc-100 text-zinc-600 border-zinc-300'
            }`}>
              {isManual 
                ? (isSwitchActive ? 'POMPA ON' : 'POMPA OFF')
                : 'DISEMBUNYIKAN (AUTO)'}
            </span>
            {openDropdowns.switch ? (
              <ChevronUp className="h-4 w-4 text-zinc-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-600" />
            )}
          </div>
        </button>

        {openDropdowns.switch && (
          <div className="p-3.5 sm:p-4 border-t border-zinc-200 bg-white space-y-3 font-mono animate-in fade-in duration-150">
            {/* JIKA MODE MANUAL: TAMPILKAN TOMBOL SAKLAR */}
            {isManual ? (
              <>
                <div className="flex items-center justify-between font-mono text-xs bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                      pendingPumpState !== null 
                        ? 'bg-amber-500' 
                        : isSwitchActive 
                          ? 'bg-emerald-500' 
                          : 'bg-zinc-400'
                    }`} />
                    <span className="font-bold text-zinc-900">
                      STATUS POMPA:{' '}
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
                            ? 'MENYALA (ON)' 
                            : 'MATI (OFF)'}
                      </strong>
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    pendingPumpState !== null
                      ? 'text-amber-900 bg-amber-100 border-amber-300'
                      : 'text-emerald-800 bg-emerald-100 border-emerald-300'
                  }`}>
                    {pendingPumpState !== null ? 'Mengirim...' : 'Tersinkron'}
                  </span>
                </div>

                {/* 1 Tombol Saklar Utama */}
                <div className="pt-1">
                  {pendingPumpState !== null ? (
                    <button
                      type="button"
                      disabled
                      className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-black rounded-xl border shadow-sm transition-all duration-200 cursor-wait opacity-90 text-white ${
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
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-black rounded-xl border border-rose-700 bg-rose-600 hover:bg-rose-700 text-white shadow-sm ring-2 ring-rose-500/30 transition-all duration-200 cursor-pointer active:scale-[0.99]"
                    >
                      <Power className="h-4 w-4" />
                      MATIKAN POMPA (OFF)
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pendingMode !== null || isSavingConfig}
                      onClick={() => handleTogglePumpState(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-black rounded-xl border border-emerald-700 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/30 transition-all duration-200 cursor-pointer active:scale-[0.99]"
                    >
                      <Power className="h-4 w-4" />
                      NYALAKAN POMPA (ON)
                    </button>
                  )}
                  <p className="text-[10px] font-semibold text-zinc-600 text-center mt-2">
                    {pendingPumpState !== null
                      ? (pendingPumpState ? 'Sedang mengirim sinyal aktivasi ke pompa...' : 'Sedang mengirim sinyal mati ke pompa...')
                      : isSwitchActive 
                        ? '● Pompa sedang AKTIF — Tekan tombol merah untuk mematikan' 
                        : '○ Pompa sedang MATI — Tekan tombol hijau untuk menyalakan'}
                  </p>
                </div>
              </>
            ) : (
              /* JIKA MODE OTOMATIS: TOMBOL TIDAK MUNCUL */
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center space-y-2.5">
                <div className="inline-flex items-center justify-center p-2 rounded-full bg-emerald-100 text-emerald-800">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-zinc-950 uppercase">
                    Mode Otomatis Sedang Berjalan
                  </h4>
                  <p className="text-xs text-zinc-600 font-semibold mt-1 max-w-md mx-auto leading-relaxed">
                    Tombol saklar disembunyikan karena pompa sedang dikontrol otomatis oleh sensor TDS berdasarkan Target Min ({control.target_ppm_min} PPM) dan Target Max ({control.target_ppm_max} PPM).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleMode('manual')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg border border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95 transition cursor-pointer"
                >
                  <Power className="h-3.5 w-3.5" />
                  Aktifkan Mode Manual
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          DROPDOWN 3: PENGATURAN TARGET PPM & COOLDOWN TIME
         ========================================================================= */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 overflow-hidden shadow-2xs transition-all duration-200">
        <button
          type="button"
          onClick={() => toggleDropdown('target')}
          className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-zinc-100/80 active:bg-zinc-200/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
              <Settings2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <span className="font-mono text-xs font-black text-zinc-950 uppercase tracking-wide block truncate">
                3. Target PPM &amp; Cooldown
              </span>
              <span className="text-[11px] text-zinc-500 font-semibold block truncate">
                Min: {control.target_ppm_min} PPM &bull; Max: {control.target_ppm_max} PPM &bull; Jeda: {control.cooldown_minutes} Mnt
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDirty && (
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                DRAFT EDIT
              </span>
            )}
            {openDropdowns.target ? (
              <ChevronUp className="h-4 w-4 text-zinc-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-600" />
            )}
          </div>
        </button>

        {openDropdowns.target && (
          <div className="p-3.5 sm:p-4 border-t border-zinc-200 bg-white space-y-4 font-mono animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 pb-3">
              <div>
                <span className="text-xs font-black text-zinc-950 uppercase block">
                  KONFIGURASI AMBANG BATAS OTOMATIS
                </span>
                <p className="text-[11px] text-zinc-500 font-semibold mt-0.5">
                  Pompa menyala otomatis jika PPM &lt; Min, dan mati saat &gt;= Max
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
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
                <span className="text-[10px] text-zinc-600 font-semibold block">Pompa ON otomatis saat PPM &lt; angka ini</span>
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
                <span className="text-[10px] text-zinc-600 font-semibold block">Pompa OFF otomatis saat PPM &gt;= angka ini</span>
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
                <span className="text-[10px] text-zinc-600 font-semibold block">Jeda tunggu agar nutrisi larut merata</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
