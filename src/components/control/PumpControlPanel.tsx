
'use client';

import React, { useState, useEffect } from 'react';
import { Power, Cpu, Sliders, Check, Save, Clock, ShieldCheck, Timer, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SystemControl } from '@/lib/types/hidroponik';

interface PumpControlPanelProps {
  control: SystemControl;
  actualPumpActive: boolean;
  cooldownInfo?: {
    is_in_cooldown: boolean;
    remaining_seconds: number;
    remaining_minutes: number;
  };
  onUpdateControl: (params: {
    mode?: 'auto' | 'manual';
    state?: boolean;
    target_ppm_min?: number;
    target_ppm_max?: number;
    cooldown_minutes?: number;
  }) => Promise<void>;
}

export function PumpControlPanel({
  control,
  actualPumpActive,
  cooldownInfo,
  onUpdateControl,
}: PumpControlPanelProps) {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Simpan input sebagai string agar user bisa hapus/ketik angka dengan leluasa
  const [ppmMin, setPpmMin] = useState<string>(String(control.target_ppm_min || 560));
  const [ppmMax, setPpmMax] = useState<string>(String(control.target_ppm_max || 840));
  const [cooldownMins, setCooldownMins] = useState<string>(String(control.cooldown_minutes || 60));

  // Flag apakah user sedang mengetik (agar tidak tertimpa oleh polling 5 detik)
  const [isUserEditing, setIsUserEditing] = useState(false);

  // Sync hanya ketika user TIDAK sedang mengetik input
  useEffect(() => {
    if (!isUserEditing) {
      if (control.target_ppm_min) setPpmMin(String(control.target_ppm_min));
      if (control.target_ppm_max) setPpmMax(String(control.target_ppm_max));
      if (control.cooldown_minutes) setCooldownMins(String(control.cooldown_minutes));
    }
  }, [control, isUserEditing]);

  const isManual = control.pump_mode === 'manual';
  // Target status pompa yang diinginkan (optimistic / control state saat manual)
  const isDesiredActive = isManual ? Boolean(control.pump_state) : actualPumpActive;
  // Mengetahui apakah instruksi web sedang dalam perjalanan ke ESP32
  const isDeviceSyncing = isManual && (Boolean(control.pump_state) !== actualPumpActive);

  const handleToggleMode = async (newMode: 'auto' | 'manual') => {
    try {
      setLoading(true);
      await onUpdateControl({ mode: newMode });
      showSuccess(`MODE OPERASI DIUBAH: ${newMode === 'auto' ? 'OTOMATIS (AUTO)' : 'MANUAL (SAKLAR)'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePumpState = async (newState: boolean) => {
    try {
      setLoading(true);
      await onUpdateControl({ mode: 'manual', state: newState });
      showSuccess(`PERINTAH TERKIRIM: POMPA ${newState ? 'DINYALAKAN (ON)' : 'DIMATIKAN (OFF)'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    const valMin = parseFloat(ppmMin) || 560;
    const valMax = parseFloat(ppmMax) || 840;
    const valCd = parseInt(cooldownMins, 10) || 60;

    if (valMin >= valMax) {
      alert('Peringatan: Nilai Batas Minimum harus lebih kecil dari Batas Target Maksimum!');
      return;
    }

    try {
      setLoading(true);
      await onUpdateControl({
        target_ppm_min: valMin,
        target_ppm_max: valMax,
        cooldown_minutes: valCd,
      });
      setIsUserEditing(false); // Reset flag setelah sukses disimpan
      showSuccess(`CONFIG APPLIED: ${valMin}-${valMax} PPM | COOLDOWN: ${valCd}m`);
    } finally {
      setLoading(false);
    }
  };

  // Preset Cepat
  const applyPreset = (min: number, max: number) => {
    setIsUserEditing(true);
    setPpmMin(String(min));
    setPpmMax(String(max));
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const isInCooldown = Boolean(cooldownInfo?.is_in_cooldown);
  const remainingMins = cooldownInfo?.remaining_minutes || 0;

  return (
    <Card
      title="KONTROL AKTIVASI POMPA & ENGINE NUTRISI"
      subtitle="Relay Pompa Air &bull; GPIO 23"
      action={
        <div className="flex items-center gap-2">
          {control.pump_mode === 'auto' ? (
            <Badge variant={isInCooldown ? 'warning' : 'success'} dot>
              {isInCooldown ? `COOLDOWN: ~${remainingMins}m` : 'OTOMATIS AKTIF'}
            </Badge>
          ) : (
            <Badge variant="neutral">
              MODE MANUAL
            </Badge>
          )}
          <Badge variant={actualPumpActive ? 'danger' : 'neutral'} dot={actualPumpActive}>
            POMPA FISIK: {actualPumpActive ? 'MENYALA (ON)' : 'MATI (OFF)'}
          </Badge>
        </div>
      }
    >
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 font-mono text-xs text-emerald-700 dark:text-emerald-300">
          <Check className="h-3.5 w-3.5 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Industrial Cooldown State Bar */}
      {control.pump_mode === 'auto' && (
        <div
          className={`mb-5 flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-xs font-mono transition-all ${
            isInCooldown
              ? 'border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300'
              : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {isInCooldown ? (
              <Timer className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400" style={{ animationDuration: '6s' }} />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="font-semibold">
              {isInCooldown
                ? `JEDA COOLDOWN NUTRISI AKTIF (Tersisa: ~${remainingMins} Menit)`
                : 'SISTEM SIAP MEMOMPA SECARA OTOMATIS'}
            </span>
          </div>

          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {isInCooldown
              ? 'Proteksi overdosis: Pompa istirahat agar larutan homogen'
              : `Pompa menyala saat PPM < ${control.target_ppm_min || 560}`}
          </span>
        </div>
      )}

      {/* Grid: Mode Segmented Switch & Manual Override */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Segmented Mode Selector */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
            Pilih Mode Operasi Pompa
          </span>
          <p className="mt-0.5 text-xs text-zinc-400">
            Gunakan mode otomatis agar dikontrol sensor atau mode manual untuk saklar langsung.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => handleToggleMode('auto')}
              disabled={loading}
              className={`rounded-lg border px-3 py-2.5 text-center font-mono text-xs transition-all cursor-pointer ${
                control.pump_mode === 'auto'
                  ? 'border-emerald-600 bg-emerald-600 font-bold text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-600'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              OTOMATIS (AUTO)
            </button>

            <button
              onClick={() => handleToggleMode('manual')}
              disabled={loading}
              className={`rounded-lg border px-3 py-2.5 text-center font-mono text-xs transition-all cursor-pointer ${
                control.pump_mode === 'manual'
                  ? 'border-zinc-900 bg-zinc-900 font-bold text-white shadow-sm dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              MANUAL (SAKLAR)
            </button>
          </div>
        </div>

        {/* Manual Override Action with 2 Clear Buttons */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
              Saklar Kontrol Manual
            </span>
            <span className="font-mono text-[10px] text-zinc-400">Relay Pin 23</span>
          </div>

          {/* Banner Status Pompa yang Sangat Jelas */}
          <div
            className={`mt-2 flex items-center justify-between rounded-md border px-3 py-2 font-mono text-xs ${
              isDesiredActive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-400'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isDesiredActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                }`}
              />
              STATUS: {isDesiredActive ? 'POMPA MENYALA (ON)' : 'POMPA MATI (OFF)'}
            </div>
            {isDeviceSyncing ? (
              <span className="text-[10px] text-amber-500 animate-pulse">Menyinkronkan...</span>
            ) : (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Tersinkron</span>
            )}
          </div>

          {/* Dua Tombol Terpisah & Jelas: NYALAKAN & MATIKAN */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleTogglePumpState(true)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 px-3 font-mono text-xs font-bold transition-all cursor-pointer ${
                isDesiredActive
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/40'
                  : 'border-emerald-600/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              NYALAKAN (ON)
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleTogglePumpState(false)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 px-3 font-mono text-xs font-bold transition-all cursor-pointer ${
                !isDesiredActive
                  ? 'border-rose-600 bg-rose-600 text-white shadow-md ring-2 ring-rose-500/40'
                  : 'border-rose-600/30 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              MATIKAN (OFF)
            </button>
          </div>
        </div>
      </div>

      {/* Threshold & Cooldown Parameter Form */}
      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/60 dark:border-zinc-800 pb-2.5">
          <div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
              Setpoints & Rest Window Parameters
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-zinc-400">Preset Cepat:</span>
              <button
                type="button"
                onClick={() => applyPreset(560, 840)}
                className="text-[10px] font-mono rounded bg-zinc-200/80 px-2 py-0.5 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                Selada (560-840)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(1000, 1400)}
                className="text-[10px] font-mono rounded bg-zinc-200/80 px-2 py-0.5 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                Sayur Buah (1000-1400)
              </button>
            </div>
          </div>
          <Button size="sm" onClick={handleSaveSettings} loading={loading} className="font-mono text-[11px] h-7">
            <Save className="h-3 w-3" />
            COMMIT CONFIG
          </Button>
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-3 font-mono">
          <div>
            <label className="block text-[11px] uppercase text-zinc-500 dark:text-zinc-400 font-semibold">
              Min Threshold (Trigger ON)
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-zinc-100">
              <input
                type="number"
                value={ppmMin}
                onFocus={() => setIsUserEditing(true)}
                onChange={(e) => {
                  setIsUserEditing(true);
                  setPpmMin(e.target.value);
                }}
                className="w-full text-xs font-bold text-zinc-900 focus:outline-none dark:text-zinc-100"
                placeholder="560"
              />
              <span className="text-[10px] text-zinc-400">PPM</span>
            </div>
            <span className="mt-1 block text-[10px] text-zinc-400">Pompa ON jika PPM &lt; ini</span>
          </div>

          <div>
            <label className="block text-[11px] uppercase text-zinc-500 dark:text-zinc-400 font-semibold">
              Target Cap (Cutoff OFF)
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-zinc-100">
              <input
                type="number"
                value={ppmMax}
                onFocus={() => setIsUserEditing(true)}
                onChange={(e) => {
                  setIsUserEditing(true);
                  setPpmMax(e.target.value);
                }}
                className="w-full text-xs font-bold text-zinc-900 focus:outline-none dark:text-zinc-100"
                placeholder="840"
              />
              <span className="text-[10px] text-zinc-400">PPM</span>
            </div>
            <span className="mt-1 block text-[10px] text-zinc-400">Pompa OFF saat PPM &gt;= ini</span>
          </div>

          <div>
            <label className="block text-[11px] uppercase text-zinc-500 dark:text-zinc-400 font-semibold">
              Cooldown Window
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-zinc-100">
              <input
                type="number"
                value={cooldownMins}
                onFocus={() => setIsUserEditing(true)}
                onChange={(e) => {
                  setIsUserEditing(true);
                  setCooldownMins(e.target.value);
                }}
                className="w-full text-xs font-bold text-zinc-900 focus:outline-none dark:text-zinc-100"
                placeholder="60"
              />
              <span className="text-[10px] text-zinc-400">MINS</span>
            </div>
            <span className="mt-1 block text-[10px] text-zinc-400">Maks 1x siklus per durasi ini</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
