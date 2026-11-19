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
  RotateCcw,
  WifiOff,
  AlertTriangle,
  Lock
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
  isOnline?: boolean;
  onTriggerOfflineModal?: () => void;
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
  onDirtyChange?: (isDirty: boolean) => void;
  saveRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
  discardRef?: React.MutableRefObject<(() => void) | null>;
}

export function PumpControlPanel({
  control,
  actualPumpActive,
  cooldownInfo,
  isOnline = true,
  onTriggerOfflineModal,
  onUpdateControl,
  onDirtyChange,
  saveRef,
  discardRef,
}: PumpControlPanelProps) {
  const [successMsg, setSuccessMsg] = useState('');
  
  // Dropdown target setting (default tertutup agar minimalis)
  const [isTargetOpen, setIsTargetOpen] = useState(false);

  // State transisi aksi yang sedang aktif
  const [pendingPumpState, setPendingPumpState] = useState<boolean | null>(null);
  const [pendingMode, setPendingMode] = useState<'auto' | 'manual' | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Status tersimpan di alat (bukan draf lokal)
  const isSavedCooldownActive = control.cooldown_enabled !== false;

  // State lokal nilai input (draf saat mengedit)
  const [ppmMin, setPpmMin] = useState<string>(String(control.target_ppm_min ?? 560));
  const [ppmMax, setPpmMax] = useState<string>(String(control.target_ppm_max ?? 840));
  const [cooldownMins, setCooldownMins] = useState<string>(String(control.cooldown_minutes ?? 60));
  const [cooldownEnabled, setCooldownEnabled] = useState<boolean>(isSavedCooldownActive);
  const [cooldownMaxCycles, setCooldownMaxCycles] = useState<string>(String(control.cooldown_max_cycles ?? 1));

  // Flag apakah user telah mengedit angka
  const [isDirty, setIsDirty] = useState(false);

  // Kabari parent jika ada perubahan yang belum disimpan
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

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
    if (!isOnline) {
      onTriggerOfflineModal?.();
      return;
    }
    if (control.pump_mode === newMode) return;
    setPendingMode(newMode);
    try {
      // Sebelum beralih mode (terutama dari otomatis ke manual saat pompa ON):
      // Selalu kirim sinyal MATI terlebih dahulu (state: false) ke server & ESP32 demi keamanan!
      await onUpdateControl({ mode: newMode, state: false });
      showNotification(`MODE AKTIF: ${newMode === 'auto' ? 'OTOMATIS (SENSOR)' : 'MANUAL (SAKLAR)'}`);
    } catch (err: any) {
      alert(`Gagal beralih mode: ${err?.message || 'Terjadi kesalahan'}`);
    } finally {
      setPendingMode(null);
    }
  };

  const handleTogglePumpState = async (newState: boolean) => {
    if (!isOnline) {
      onTriggerOfflineModal?.();
      return;
    }
    setPendingPumpState(newState);
    try {
      await onUpdateControl({ mode: 'manual', state: newState });
      showNotification(`SAKLAR: POMPA ${newState ? 'DINYALAKAN (ON)' : 'DIMATIKAN (OFF)'}`);
    } finally {
      setPendingPumpState(null);
    }
  };

  const handleDiscardChanges = () => {
    setPpmMin(String(control.target_ppm_min ?? 560));
    setPpmMax(String(control.target_ppm_max ?? 840));
    setCooldownMins(String(control.cooldown_minutes ?? 60));
    setCooldownEnabled(control.cooldown_enabled !== false);
    setCooldownMaxCycles(String(control.cooldown_max_cycles ?? 1));
    setIsDirty(false);
  };

  const handleSaveConfig = async (): Promise<boolean> => {
    if (!isOnline) {
      onTriggerOfflineModal?.();
      return false;
    }
    const valMin = parseFloat(ppmMin);
    const valMax = parseFloat(ppmMax);
    const valCd = parseInt(cooldownMins, 10);
    const valCycles = Math.max(1, parseInt(cooldownMaxCycles, 10) || 1);

    if (Number.isNaN(valMin) || Number.isNaN(valMax) || Number.isNaN(valCd)) {
      alert('Mohon masukkan angka yang valid!');
      return false;
    }

    if (valMin >= valMax) {
      alert('Peringatan: Nilai Target Min harus lebih kecil dari Target Max!');
      return false;
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
      return true;
    } catch (err: any) {
      alert(`Gagal menyimpan pengaturan: ${err?.message || 'Terjadi kesalahan sistem'}`);
      return false;
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Kaitkan ref agar parent (page.tsx) dapat memicu simpan atau buang perubahan saat pindah menu
  useEffect(() => {
    if (saveRef) {
      saveRef.current = async () => {
        return await handleSaveConfig();
      };
    }
    if (discardRef) {
      discardRef.current = () => {
        handleDiscardChanges();
      };
    }
  });

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
          {/* Indikator Realtime Sisa Waktu Cooldown & Berapa Kali Pompa Nyala (Kecil Rapi) */}
          <div className="flex flex-wrap items-center gap-1 font-mono text-[10px] font-bold">
            {isSavedCooldownActive ? (
              <>
                <span className={`px-2 py-0.5 rounded border font-extrabold ${
                  isCdActive 
                    ? 'bg-amber-100 text-amber-950 border-amber-300 animate-pulse' 
                    : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}>
                  {isCdActive ? `⏳ JEDA: ${remainingTimeStr}` : '⏱️ SIAP'}
                </span>
                <span className={`px-2 py-0.5 rounded border font-extrabold ${
                  (cooldownInfo?.current_cycles ?? 0) >= (cooldownInfo?.max_cycles ?? 1)
                    ? 'bg-amber-100 text-amber-950 border-amber-300'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                }`}>
                  NYALA: {cooldownInfo?.current_cycles ?? 0}/{cooldownInfo?.max_cycles ?? 1}x
                </span>
              </>
            ) : (
              <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-900 border border-sky-300 font-extrabold">
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

      {/* Banner Peringatan Menonjol Jika Alat Fisik Offline */}
      {!isOnline && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl border-2 border-rose-400 bg-rose-50 text-rose-950 font-sans shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0 mt-0.5">
              <WifiOff className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-black uppercase font-mono tracking-wide text-rose-950 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-rose-600" />
                SEMUA FITUR KONTROL TERKUNCI (ALAT OFFLINE)
              </span>
              <p className="text-[11px] font-semibold text-rose-800 mt-0.5 leading-snug">
                ESP32 tidak terhubung. Saklar pompa, mode operasi, dan pengaturan dikunci otomatis demi keamanan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onTriggerOfflineModal}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 active:scale-95 text-white font-mono text-xs font-black shadow-xs cursor-pointer shrink-0 transition"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>TOLONG PERIKSA ALAT FISIK</span>
          </button>
        </div>
      )}

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
            disabled={pendingMode !== null || pendingPumpState !== null || !isOnline}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold rounded-lg transition-all duration-200 ${
              !isOnline ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            } ${
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
            disabled={pendingMode !== null || pendingPumpState !== null || !isOnline}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold rounded-lg transition-all duration-200 ${
              !isOnline ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            } ${
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
          TRANSISI AMAN KETIKA SEDANG BERPINDAH MODE
          (Tampilan manual TIDAK akan di-load dulu sebelum sinyal OFF selesai terkirim)
         ========================================================================= */}
      {pendingMode !== null ? (
        <div className="py-8 px-4 rounded-xl border border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center text-center space-y-2.5 animate-in fade-in duration-150 font-mono">
          <Loader2 className="h-6 w-6 text-emerald-700 animate-spin" />
          <span className="text-xs font-black text-zinc-950 uppercase tracking-wide">
            {pendingMode === 'manual' 
              ? 'Mematikan Pompa & Mengamankan Sistem...' 
              : 'Mengalihkan Sistem ke Mode Otomatis...'}
          </span>
          <span className="text-[11px] text-zinc-500 font-sans font-medium max-w-xs">
            {pendingMode === 'manual'
              ? 'Memastikan sinyal pompa mati terkirim ke ESP32 sebelum memuat saklar manual'
              : 'Menyiapkan pemantauan sensor nutrisi otomatis'}
          </span>
        </div>
      ) : isManual ? (
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
                disabled={pendingMode !== null || isSavingConfig || !isOnline}
                onClick={() => handleTogglePumpState(false)}
                className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs sm:text-sm font-extrabold rounded-xl border border-rose-700 bg-rose-600 hover:bg-rose-700 text-white shadow-xs ring-2 ring-rose-500/25 transition-all duration-200 ${
                  !isOnline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'
                }`}
              >
                <Power className="h-4 w-4" />
                MATIKAN POMPA (OFF)
              </button>
            ) : (
              <button
                type="button"
                disabled={pendingMode !== null || isSavingConfig || !isOnline}
                onClick={() => handleTogglePumpState(true)}
                className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs sm:text-sm font-extrabold rounded-xl border border-emerald-700 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/25 transition-all duration-200 ${
                  !isOnline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'
                }`}
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
        <div className="pt-1 space-y-3.5 animate-in fade-in duration-200">
          {/* =========================================================================
              KARTU INFORMASI BATAS AKTIF (MIN / MAX & JEDA TERSIMPAN)
              Selalu tampil jelas di atas agar user tahu nilai yang tersimpan di sistem
             ========================================================================= */}
          <div className="rounded-xl border border-emerald-300/80 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 p-3 sm:p-3.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2 border-b border-emerald-200/60 pb-2 mb-2.5 font-mono">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950 truncate">
                  BATAS NUTRISI AKTIF (TERSIMPAN)
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300 shrink-0 shadow-2xs">
                ✓ Tersimpan di Alat
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
              {/* Target Min Aktif */}
              <div className="bg-white p-2.5 rounded-lg border border-emerald-200/80 shadow-2xs">
                <span className="text-[9px] font-bold text-zinc-500 uppercase block">Target Min (ON)</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg sm:text-xl font-black text-emerald-900">{control.target_ppm_min ?? 560}</span>
                  <span className="text-[10px] font-bold text-zinc-700">PPM</span>
                </div>
                <span className="text-[9px] text-zinc-500 block truncate font-sans">Pompa ON jika PPM &lt; ini</span>
              </div>

              {/* Target Max Aktif */}
              <div className="bg-white p-2.5 rounded-lg border border-emerald-200/80 shadow-2xs">
                <span className="text-[9px] font-bold text-zinc-500 uppercase block">Target Max (OFF)</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg sm:text-xl font-black text-zinc-950">{control.target_ppm_max ?? 840}</span>
                  <span className="text-[10px] font-bold text-zinc-700">PPM</span>
                </div>
                <span className="text-[9px] text-zinc-500 block truncate font-sans">Pompa OFF jika PPM &gt;= ini</span>
              </div>

              {/* Aturan Cooldown Aktif */}
              <div className="col-span-2 sm:col-span-1 bg-white p-2.5 rounded-lg border border-emerald-200/80 shadow-2xs">
                <span className="text-[9px] font-bold text-zinc-500 uppercase block">Aturan Jeda</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-sm sm:text-base font-black text-zinc-900">
                    {control.cooldown_enabled !== false ? `${control.cooldown_minutes ?? 60} Menit` : 'Bebas Jeda'}
                  </span>
                </div>
                <span className="text-[9px] text-zinc-500 block truncate font-sans">
                  {control.cooldown_enabled !== false ? `Maksimal ${control.cooldown_max_cycles ?? 1}x nyala` : '0 aturan pembatasan'}
                </span>
              </div>
            </div>
          </div>

          {/* Banner Status Otomatis & Rincian Frekuensi Pompa (Berdasarkan Aturan Tersimpan di Alat) */}
          <div className={`rounded-xl border p-3.5 space-y-2 transition-all text-xs font-sans shadow-2xs ${
            !isSavedCooldownActive
              ? 'border-sky-300 bg-sky-50/90 text-sky-950'
              : isCdActive
                ? 'border-amber-300 bg-amber-50/95 text-amber-950'
                : 'border-emerald-300 bg-emerald-50/90 text-emerald-950'
          }`}>
            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-1.5 border-b border-black/5 pb-2 font-mono text-[11px] font-bold">
              <div className="flex items-center gap-2">
                {!isSavedCooldownActive ? (
                  <Zap className="h-4 w-4 shrink-0 text-sky-700" />
                ) : isCdActive ? (
                  <Timer className="h-4 w-4 shrink-0 text-amber-700 animate-spin" style={{ animationDuration: '6s' }} />
                ) : (
                  <Zap className="h-4 w-4 shrink-0 text-emerald-700" />
                )}
                <span className="uppercase font-black tracking-wide">
                  {!isSavedCooldownActive
                    ? 'STATUS: BEBAS ATURAN (TANPA COOLDOWN)'
                    : isCdActive
                      ? 'STATUS: DALAM JEDA COOLDOWN (TERKUNCI)'
                      : 'STATUS: SIAP MENYALA OTOMATIS'}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded border text-[10px] self-start xs:self-auto font-mono ${
                isCdActive 
                  ? 'bg-amber-100 text-amber-950 border-amber-300 font-black' 
                  : 'bg-white/80 text-zinc-800 border-zinc-200'
              }`}>
                {isSavedCooldownActive 
                  ? (isCdActive ? `Sisa Waktu: ${remainingTimeStr}` : 'Jeda: Siaga / Siap') 
                  : 'Tanpa Jeda Waktu'}
              </span>
            </div>

            {/* Rincian Sangat Jelas Berapa Kali Pompa Sudah Nyala */}
            <div className="space-y-1.5 text-xs">
              {isSavedCooldownActive ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-[11px]">
                  <div>
                    <span className="text-zinc-600 font-medium">Frekuensi Pompa: </span>
                    <strong className="text-zinc-950 font-mono text-xs font-black">
                      Sudah menyala {cooldownInfo?.current_cycles ?? 0} kali
                    </strong>{' '}
                    <span className="text-zinc-600 font-medium">
                      dari batas maksimal {cooldownInfo?.max_cycles ?? 1} kali per {control.cooldown_minutes} menit.
                    </span>
                  </div>

                  <div className="font-mono font-bold text-[10px] shrink-0">
                    {(cooldownInfo?.current_cycles ?? 0) >= (cooldownInfo?.max_cycles ?? 1) ? (
                      <span className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-bold">
                        Jatah Habis ({cooldownInfo?.max_cycles ?? 1}x) &bull; Terkunci sampai jeda selesai
                      </span>
                    ) : (cooldownInfo?.current_cycles ?? 0) > 0 ? (
                      <span className="text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-bold">
                        Sisa {(cooldownInfo?.max_cycles ?? 1) - (cooldownInfo?.current_cycles ?? 0)}x jatah nyala lagi
                      </span>
                    ) : (
                      <span className="text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-bold">
                        Jatah baru penuh ({cooldownInfo?.max_cycles ?? 1}x) &bull; Siap menyala
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-sky-900 font-medium">
                  <strong>Mode Bebas:</strong> Pompa akan langsung menyala kapan saja begitu nilai PPM &lt; {control.target_ppm_min} tanpa batasan frekuensi dan tanpa jeda timer.
                </p>
              )}
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
                    {isSavedCooldownActive 
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
                {/* Header Info & Tombol Aksi Simpan / Batal di Bagian Atas */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-zinc-200/80 pb-3">
                  <div>
                    <span className="text-xs font-black text-zinc-950 uppercase block font-mono">
                      KONFIGURASI BATAS &amp; JEDA NUTRISI
                    </span>
                    <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                      {isDirty 
                        ? '⚠️ Ada perubahan belum disimpan ke alat' 
                        : 'Pompa menyala saat PPM < Min, dan mati saat >= Max'}
                    </p>
                  </div>

                  {/* Tombol Simpan & Batal (Di atas konfigurasi agar tidak ribet scroll jauh) */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 font-mono text-xs">
                    {/* Tombol Batal: hanya aktif jika isDirty dan isOnline */}
                    <button
                      type="button"
                      onClick={handleDiscardChanges}
                      disabled={!isDirty || isSavingConfig || !isOnline}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-150 ${
                        isDirty && !isSavingConfig && isOnline
                          ? 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer shadow-2xs active:scale-95'
                          : 'border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-50'
                      }`}
                      title={isDirty ? 'Batalkan perubahan dan kembalikan nilai tersimpan' : 'Tidak ada perubahan'}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>BATAL</span>
                    </button>

                    {/* Tombol Simpan: NGEBLOK jika tidak ada perubahan (!isDirty) atau jika offline */}
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      disabled={!isDirty || isSavingConfig || pendingMode !== null || pendingPumpState !== null || !isOnline}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all duration-200 ${
                        isDirty && !isSavingConfig && isOnline
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer active:scale-95 ring-2 ring-emerald-500/20 font-black'
                          : 'bg-zinc-200 border border-zinc-200 text-zinc-400 cursor-not-allowed opacity-60'
                      }`}
                      title={!isOnline ? 'Alat offline: Kontrol terkunci' : isDirty ? 'Simpan perubahan ke alat ESP32' : 'Tidak ada perubahan untuk disimpan'}
                    >
                      {isSavingConfig ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>MENYIMPAN...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          <span>SIMPAN</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 1. Pengaturan Target Min & Max */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-800 uppercase block">Target PPM Min (Pompa ON)</label>
                    <div className="flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-emerald-500">
                      <input
                        type="number"
                        disabled={!isOnline}
                        value={ppmMin}
                        onClick={() => {
                          if (!isOnline) onTriggerOfflineModal?.();
                        }}
                        onChange={(e) => {
                          setPpmMin(e.target.value);
                          setIsDirty(true);
                        }}
                        onKeyDown={handleKeyDown}
                        className={`w-full bg-transparent text-sm font-bold text-zinc-950 focus:outline-none ${!isOnline ? 'cursor-not-allowed text-zinc-400' : ''}`}
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
                        disabled={!isOnline}
                        value={ppmMax}
                        onClick={() => {
                          if (!isOnline) onTriggerOfflineModal?.();
                        }}
                        onChange={(e) => {
                          setPpmMax(e.target.value);
                          setIsDirty(true);
                        }}
                        onKeyDown={handleKeyDown}
                        className={`w-full bg-transparent text-sm font-bold text-zinc-950 focus:outline-none ${!isOnline ? 'cursor-not-allowed text-zinc-400' : ''}`}
                        placeholder="840"
                      />
                      <span className="text-xs font-bold text-zinc-700 ml-2">PPM</span>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-semibold block">Pompa OFF jika PPM &gt;= ini</span>
                  </div>
                </div>

                {/* 2. Katup Kontrol Cooldown (Jeda Pompa): Segmented Switch Kiri-Kanan */}
                <div className="pt-2 border-t border-zinc-200/60 space-y-3 font-sans">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-zinc-200 shadow-2xs">
                    <div>
                      <span className="text-xs font-black text-zinc-950 uppercase tracking-wide block font-mono">
                        KATUP FITUR COOLDOWN
                      </span>
                      <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                        {cooldownEnabled 
                          ? '● Katup Terbuka (Aktif): Pompa dibatasi waktu jeda & frekuensi nyala' 
                          : '○ Katup Tertutup (Mati): Fitur dimatikan, pompa bebas menyala tanpa jeda'}
                      </p>
                    </div>

                    {/* Segmented Button Kiri - Kanan seperti Katup */}
                    <div className="inline-flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200/80 self-start sm:self-auto shrink-0 shadow-inner">
                      <button
                        type="button"
                        disabled={!isOnline}
                        onClick={() => {
                          if (!isOnline) {
                            onTriggerOfflineModal?.();
                            return;
                          }
                          setCooldownEnabled(false);
                          setIsDirty(true);
                        }}
                        className={`flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-mono font-bold rounded-lg transition-all duration-200 ${
                          !isOnline ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                        } ${
                          !cooldownEnabled
                            ? 'bg-zinc-900 text-white shadow-xs font-extrabold'
                            : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/60'
                        }`}
                      >
                        <span>TUTUP (MATI)</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isOnline}
                        onClick={() => {
                          if (!isOnline) {
                            onTriggerOfflineModal?.();
                            return;
                          }
                          setCooldownEnabled(true);
                          setIsDirty(true);
                        }}
                        className={`flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-mono font-bold rounded-lg transition-all duration-200 ${
                          !isOnline ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                        } ${
                          cooldownEnabled
                            ? 'bg-emerald-700 text-white shadow-xs font-extrabold'
                            : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/60'
                        }`}
                      >
                        <span>BUKA (AKTIF)</span>
                      </button>
                    </div>
                  </div>

                  {/* KONDISI: Jika Dipakai -> Munculkan Settingan. Jika Ditutup -> Matikan & Sembunyikan Settingan */}
                  {cooldownEnabled ? (
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-800 uppercase block">
                          Durasi Periode Jeda
                        </label>
                        <div className="flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-emerald-500">
                          <input
                            type="number"
                            min="1"
                            disabled={!isOnline}
                            value={cooldownMins}
                            onClick={() => {
                              if (!isOnline) onTriggerOfflineModal?.();
                            }}
                            onChange={(e) => {
                              setCooldownMins(e.target.value);
                              setIsDirty(true);
                            }}
                            onKeyDown={handleKeyDown}
                            className={`w-full bg-transparent text-sm font-bold text-zinc-950 focus:outline-none ${!isOnline ? 'cursor-not-allowed text-zinc-400' : ''}`}
                            placeholder="60"
                          />
                          <span className="text-xs font-bold text-zinc-700 ml-2">MENIT</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-medium block font-sans">
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
                            disabled={!isOnline}
                            value={cooldownMaxCycles}
                            onClick={() => {
                              if (!isOnline) onTriggerOfflineModal?.();
                            }}
                            onChange={(e) => {
                              setCooldownMaxCycles(e.target.value);
                              setIsDirty(true);
                            }}
                            onKeyDown={handleKeyDown}
                            className={`w-full bg-transparent text-sm font-bold text-zinc-950 focus:outline-none ${!isOnline ? 'cursor-not-allowed text-zinc-400' : ''}`}
                            placeholder="1"
                          />
                          <span className="text-xs font-bold text-zinc-700 ml-2">KALI</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-medium block font-sans">
                          Maksimal pompa aktif dalam {cooldownMins} menit (misal: 1x, 2x, 3x)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-600 text-xs font-sans animate-in fade-in duration-150">
                      <span className="font-bold text-zinc-900">○ Katup Tertutup (Fitur Jeda Mati):</span> Pompa beroperasi bebas menyala kapan saja begitu PPM &lt; {ppmMin} PPM tanpa timer jeda.
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
