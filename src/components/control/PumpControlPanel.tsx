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
  ChevronDown
} from 'lucide-react';

interface CooldownInfo {
  enabled?: boolean;
  is_in_cooldown: boolean;
  remaining_seconds: number;
  remaining_minutes: number;
  max_cycles?: number;
  current_cycles?: number;
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
    cooldown_enabled?: boolean;
    cooldown_max_cycles?: number;
    reset_cooldown?: boolean;
  }) => Promise<any> | void;
}

export function PumpControlPanel({
  control,
  actualPumpActive,
  cooldownInfo,
  onUpdateControl,
}: PumpControlPanelProps) {
  const [successMsg, setSuccessMsg] = useState('');
  
  // Dropdown target setting (default tertutup agar minimalis)
  const [isTargetOpen, setIsTargetOpen] = useState(false);

  // State transisi aksi yang sedang aktif
  const [pendingPumpState, setPendingPumpState] = useState<boolean | null>(null);
  const [pendingMode, setPendingMode] = useState<'auto' | 'manual' | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // State lokal nilai input
  const [ppmMin, setPpmMin] = useState<string>(String(control.target_ppm_min ?? 560));
  const [ppmMax, setPpmMax] = useState<string>(String(control.target_ppm_max ?? 840));
  const [cooldownMins, setCooldownMins] = useState<string>(String(control.cooldown_minutes ?? 60));
  const [cooldownEnabled, setCooldownEnabled] = useState<boolean>(control.cooldown_enabled !== false);
  const [cooldownMaxCycles, setCooldownMaxCycles] = useState<string>(String(control.cooldown_max_cycles ?? 1));

  // Flag apakah user telah mengedit angka
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      if (control.target_ppm_min !== undefined) setPpmMin(String(control.target_ppm_min));
      if (control.target_ppm_max !== undefined) setPpmMax(String(control.target_ppm_max));
      if (control.cooldown_minutes !== undefined) setCooldownMins(String(control.cooldown_minutes));
      if (control.cooldown_enabled !== undefined) setCooldownEnabled(control.cooldown_enabled !== false);
      if (control.cooldown_max_cycles !== undefined) setCooldownMaxCycles(String(control.cooldown_max_cycles));
    }
  }, [control.target_ppm_min, control.target_ppm_max, control.cooldown_minutes, control.cooldown_enabled, control.cooldown_max_cycles, isDirty]);

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
      showNotification(`MODE AKTIF: ${newMode === 'auto' ? 'OTOMATIS (SENSOR)' : 'MANUAL (SAKLAR)'}`);
    } finally {
      setPendingMode(null);
    }
  };

  const handleTogglePumpState = async (newState: boolean) => {
    setPendingPumpState(newState);
    try {
      await onUpdateControl({ mode: 'manual', state: newState });
      showNotification(`SAKLAR: POMPA ${newState ? 'DINYALAKAN (ON)' : 'DIMATIKAN (OFF)'}`);
    } finally {
      setPendingPumpState(null);
    }
  };

  const handleSaveConfig = async () => {
    const valMin = parseFloat(ppmMin);
    const valMax = parseFloat(ppmMax);
    const valCd = parseInt(cooldownMins, 10);
    const valCycles = Math.max(1, parseInt(cooldownMaxCycles, 10) || 1);

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
        cooldown_enabled: cooldownEnabled,
        cooldown_max_cycles: valCycles,
      });
      setIsDirty(false);
      showNotification(
        cooldownEnabled
          ? `PENGATURAN DISIMPAN: COOLDOWN ${valCd}m (${valCycles}x per jeda)`
          : `PENGATURAN DISIMPAN: TANPA COOLDOWN (BEBAS ATURAN)`
      );
    } catch (err: any) {
      alert(`Gagal menyimpan pengaturan: ${err?.message || 'Terjadi kesalahan sistem'}`);
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

  const isCdActive = Boolean(cooldownInfo?.is_in_cooldown && cooldownInfo?.enabled !== false);
  const remainingSecs = cooldownInfo?.remaining_seconds || 0;
  const remainingTimeStr = remainingSecs >= 60 
    ? `${Math.floor(remainingSecs / 60)}m ${(remainingSecs % 60).toString().padStart(2, '0')}s` 
    : `${remainingSecs}s`;

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4 font-sans">
      {/* Header Ringkas */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2.5 border-b border-zinc-100 pb-3.5">
        <div>
          <h2 className="text-xs font-black tracking-wider text-zinc-950 uppercase flex items-center gap-1.5 font-mono">
            <Sliders className="h-4 w-4 text-emerald-800" />
            KONTROL POMPA NUTRISI
          </h2>
          <p className="text-[11px] font-semibold text-zinc-500 mt-0.5">
            Pilih mode operasi untuk mengontrol pompa air hidroponik
          </p>
        </div>
        <div className="flex flex-col items-start xs:items-end gap-1 self-start xs:self-auto shrink-0">
          {/* Indikator Realtime Sisa Waktu Cooldown & Jatah Terpakai di Atas Pompa ON/OFF (Kecil Rapi) */}
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
            {cooldownEnabled ? (
              <>
                <span className={`px-1.5 py-0.5 rounded border ${
                  isCdActive 
                    ? 'bg-amber-100 text-amber-950 border-amber-300 animate-pulse' 
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                }`}>
                  {isCdActive ? `⏳ ${remainingTimeStr}` : '⏱️ SIAP'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                  JATAH: {cooldownInfo?.current_cycles ?? 0}/{cooldownInfo?.max_cycles ?? 1}x
                </span>
              </>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-900 border border-sky-200">
                BEBAS JEDA (0 ATURAN)
              </span>
            )}
          </div>

          <span className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border transition-all duration-300 ${
            isSwitchActive 
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' 
              : 'bg-zinc-100 text-zinc-700 border-zinc-200'
          }`}>
            {isSwitchActive ? '● POMPA ON' : '○ POMPA OFF'}
          </span>
        </div>
      </div>

      {/* Notifikasi Cepat */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-2xs animate-in fade-in duration-150">
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Selector Mode (Minimalist Segmented Tabs) */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 block">
          PILIH MODE OPERASI
        </label>
        <div className="grid grid-cols-2 gap-2 bg-zinc-100/80 p-1 rounded-xl border border-zinc-200/80">
          <button
            type="button"
            onClick={() => handleToggleMode('auto')}
            disabled={pendingMode !== null || pendingPumpState !== null}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
              control.pump_mode === 'auto'
                ? 'bg-emerald-700 text-white shadow-xs font-extrabold'
                : 'text-zinc-700 hover:text-zinc-950 hover:bg-white/60'
            } ${pendingMode === 'auto' ? 'opacity-75' : ''}`}
          >
            {pendingMode === 'auto' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            <span>Otomatis (Sensor)</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleMode('manual')}
            disabled={pendingMode !== null || pendingPumpState !== null}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
              control.pump_mode === 'manual'
                ? 'bg-zinc-900 text-white shadow-xs font-extrabold'
                : 'text-zinc-700 hover:text-zinc-950 hover:bg-white/60'
            } ${pendingMode === 'manual' ? 'opacity-75' : ''}`}
          >
            {pendingMode === 'manual' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Power className="h-3.5 w-3.5" />
            )}
            <span>Manual (Saklar)</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          KONDISI 1: JIKA MODE MANUAL -> HANYA TAMPILKAN SAKLAR POMPA
          (Pengaturan otomatis disembunyikan agar minimalis & fokus)
         ========================================================================= */}
      {isManual ? (
        <div className="pt-1 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between font-mono text-xs bg-zinc-50 p-3 rounded-xl border border-zinc-200">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                pendingPumpState !== null 
                  ? 'bg-amber-500' 
                  : isSwitchActive 
                    ? 'bg-emerald-500' 
                    : 'bg-zinc-400'
              }`} />
              <span className="font-bold text-zinc-800">
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
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
              pendingPumpState !== null
                ? 'text-amber-900 bg-amber-50 border-amber-300'
                : 'text-emerald-800 bg-emerald-50 border-emerald-300'
            }`}>
              {pendingPumpState !== null ? 'Mengirim...' : 'Tersinkron'}
            </span>
          </div>

          {/* Tombol Saklar Utama */}
          <div>
            {pendingPumpState !== null ? (
              <button
                type="button"
                disabled
                className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs sm:text-sm font-black rounded-xl border shadow-sm transition-all duration-200 cursor-wait opacity-90 text-white ${
                  pendingPumpState
                    ? 'border-emerald-700 bg-emerald-600 ring-2 ring-emerald-500/30'
                    : 'border-rose-700 bg-rose-600 ring-2 ring-rose-500/30'
                }`}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                {pendingPumpState ? 'Menyalakan Pompa...' : 'Mematikan Pompa...'}
              </button>
            ) : isSwitchActive ? (
              <button
                type="button"
                disabled={pendingMode !== null || isSavingConfig}
                onClick={() => handleTogglePumpState(false)}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs sm:text-sm font-extrabold rounded-xl border border-rose-700 bg-rose-600 hover:bg-rose-700 text-white shadow-xs ring-2 ring-rose-500/25 transition-all duration-200 cursor-pointer active:scale-[0.98]"
              >
                <Power className="h-4 w-4" />
                MATIKAN POMPA (OFF)
              </button>
            ) : (
              <button
                type="button"
                disabled={pendingMode !== null || isSavingConfig}
                onClick={() => handleTogglePumpState(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs sm:text-sm font-extrabold rounded-xl border border-emerald-700 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/25 transition-all duration-200 cursor-pointer active:scale-[0.98]"
              >
                <Power className="h-4 w-4" />
                NYALAKAN POMPA (ON)
              </button>
            )}
            <p className="text-[11px] font-medium text-zinc-500 text-center mt-2">
              {pendingPumpState !== null
                ? 'Sedang mengirim sinyal ke modul ESP32...'
                : isSwitchActive 
                  ? '● Pompa sedang aktif — Tekan tombol merah untuk mematikan' 
                  : '○ Pompa dalam kondisi mati — Tekan tombol hijau untuk menyalakan'}
            </p>
          </div>
        </div>
      ) : (
        /* =========================================================================
           KONDISI 2: JIKA MODE OTOMATIS -> SAKLAR MANUAL DI-HIDE TOTAL
           (Hanya tampil status otomatis dan pengaturan Target Min/Max & Cooldown)
           ========================================================================= */
        <div className="pt-1 space-y-3 animate-in fade-in duration-200">
          {/* Banner Status Otomatis */}
          <div className={`flex items-center justify-between gap-2.5 rounded-xl border p-3 text-xs font-medium transition-all ${
            !control.cooldown_enabled
              ? 'border-sky-300 bg-sky-50 text-sky-950'
              : isCdActive
                ? 'border-amber-300 bg-amber-50 text-amber-950'
                : 'border-emerald-200 bg-emerald-50 text-emerald-950'
          }`}>
            <div className="flex items-center gap-2">
              {!control.cooldown_enabled ? (
                <Zap className="h-4 w-4 shrink-0 text-sky-700" />
              ) : isCdActive ? (
                <Timer className="h-4 w-4 shrink-0 text-amber-700 animate-spin" style={{ animationDuration: '6s' }} />
              ) : (
                <Zap className="h-4 w-4 shrink-0 text-emerald-700" />
              )}
              <span>
                {!control.cooldown_enabled
                  ? `Mode Bebas Cooldown Aktif \u2022 Pompa ON saat PPM < ${control.target_ppm_min} \u2022 OFF di >= ${control.target_ppm_max} (Tanpa Jeda)`
                  : isCdActive
                    ? `Jeda Cooldown Aktif (Sisa: ${remainingTimeStr} \u2022 Batas ${control.cooldown_max_cycles ?? 1}x per ${control.cooldown_minutes} menit)`
                    : `Sistem Otomatis Siap \u2022 ON di < ${control.target_ppm_min} PPM \u2022 OFF di >= ${control.target_ppm_max} (Maks ${control.cooldown_max_cycles ?? 1}x per ${control.cooldown_minutes}m)`}
              </span>
            </div>
          </div>

          {/* Dropdown Pengaturan Target PPM & Cooldown */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setIsTargetOpen(!isTargetOpen)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-zinc-50 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-8 w-8 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/70 flex items-center justify-center shrink-0">
                  <Settings2 className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-zinc-950 block truncate">
                    Target PPM &amp; Aturan Cooldown
                  </span>
                  <span className="text-[11px] text-zinc-500 font-medium block truncate">
                    {cooldownEnabled 
                      ? `Min: ${control.target_ppm_min} • Max: ${control.target_ppm_max} PPM • Jeda: ${control.cooldown_minutes}m (${control.cooldown_max_cycles ?? 1}x)`
                      : `Min: ${control.target_ppm_min} • Max: ${control.target_ppm_max} PPM • Tanpa Cooldown`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pl-2">
                {isDirty && (
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                    EDIT
                  </span>
                )}
                <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${isTargetOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {isTargetOpen && (
              <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 space-y-4 animate-in fade-in duration-150">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-200/60 pb-3">
                  <div>
                    <span className="text-xs font-black text-zinc-950 uppercase block font-mono">
                      KONFIGURASI BATAS &amp; JEDA NUTRISI
                    </span>
                    <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                      Pompa menyala saat PPM &lt; Min, dan mati saat &gt;= Max
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={isSavingConfig || pendingMode !== null || pendingPumpState !== null}
                    className={`flex items-center gap-1.5 self-start sm:self-auto rounded-lg px-3.5 py-1.5 text-xs font-bold font-mono transition-all duration-200 cursor-pointer shadow-xs ${
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

                {/* 1. Pengaturan Target Min & Max */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
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
                    <span className="text-[10px] text-zinc-600 font-semibold block">Pompa ON jika PPM &lt; ini</span>
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
                    <span className="text-[10px] text-zinc-600 font-semibold block">Pompa OFF jika PPM &gt;= ini</span>
                  </div>
                </div>

                {/* 2. Pilihan Radio Button: Pakai Cooldown vs Tanpa Cooldown */}
                <div className="pt-2 border-t border-zinc-200/60 space-y-2.5">
                  <span className="text-[10px] font-mono font-bold text-zinc-800 uppercase tracking-wider block">
                    PILIHAN SISTEM COOLDOWN (JEDA POMPA)
                  </span>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Radio Option A: Aktifkan Cooldown */}
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                      cooldownEnabled 
                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/40 shadow-2xs' 
                        : 'bg-white border-zinc-200 hover:bg-zinc-50'
                    }`}>
                      <input
                        type="radio"
                        name="cooldown_toggle"
                        checked={cooldownEnabled}
                        onChange={() => {
                          setCooldownEnabled(true);
                          setIsDirty(true);
                        }}
                        className="mt-0.5 h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-xs font-bold text-zinc-950 block">
                          Gunakan Aturan Cooldown (Batas Frekuensi &amp; Jeda)
                        </span>
                        <span className="text-[11px] text-zinc-600 font-medium block">
                          Mencegah over-nutrisi dengan membatasi berapa kali pompa boleh aktif dalam periode waktu tertentu agar pupuk larut merata.
                        </span>
                      </div>
                    </label>

                    {/* Radio Option B: Tanpa Cooldown */}
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                      !cooldownEnabled 
                        ? 'bg-sky-50/70 border-sky-300 ring-1 ring-sky-400/40 shadow-2xs' 
                        : 'bg-white border-zinc-200 hover:bg-zinc-50'
                    }`}>
                      <input
                        type="radio"
                        name="cooldown_toggle"
                        checked={!cooldownEnabled}
                        onChange={() => {
                          setCooldownEnabled(false);
                          setIsDirty(true);
                        }}
                        className="mt-0.5 h-4 w-4 text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-xs font-bold text-zinc-950 block">
                          Tanpa Cooldown (Bebas Aturan / Selalu Siap)
                        </span>
                        <span className="text-[11px] text-zinc-600 font-medium block">
                          Pompa langsung menyala kapan saja begitu PPM &lt; Target Min tanpa batasan timer atau jeda waktu.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Input Parameter Cooldown (Hanya Muncul jika Cooldown Aktif) */}
                  {cooldownEnabled && (
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-800 uppercase block">
                          Durasi Periode Jeda
                        </label>
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
                        <span className="text-[10px] text-zinc-500 font-medium block">
                          Jendela waktu pemantauan jeda pompa
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-800 uppercase block">
                          Maksimal Siklus per Periode
                        </label>
                        <div className="flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-emerald-500">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={cooldownMaxCycles}
                            onChange={(e) => {
                              setCooldownMaxCycles(e.target.value);
                              setIsDirty(true);
                            }}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-transparent text-sm font-bold text-zinc-950 focus:outline-none"
                            placeholder="1"
                          />
                          <span className="text-xs font-bold text-zinc-700 ml-2">KALI</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-medium block">
                          Maksimal pompa aktif dalam {cooldownMins} menit (misal: 1x, 2x, 3x)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
