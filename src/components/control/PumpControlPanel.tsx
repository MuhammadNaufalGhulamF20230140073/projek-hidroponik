'use client';

import React, { useState, useEffect } from 'react';
import { Power, Cpu, Sliders, AlertCircle, Check, Save, Clock, ShieldCheck, Timer } from 'lucide-react';
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

  // Local states untuk pengaturan
  const [ppmMin, setPpmMin] = useState<number>(control.target_ppm_min || 560);
  const [ppmMax, setPpmMax] = useState<number>(control.target_ppm_max || 840);
  const [cooldownMins, setCooldownMins] = useState<number>(control.cooldown_minutes || 60);

  // Sync saat control berubah dari server
  useEffect(() => {
    if (control.target_ppm_min) setPpmMin(control.target_ppm_min);
    if (control.target_ppm_max) setPpmMax(control.target_ppm_max);
    if (control.cooldown_minutes) setCooldownMins(control.cooldown_minutes);
  }, [control]);

  const handleToggleMode = async (newMode: 'auto' | 'manual') => {
    try {
      setLoading(true);
      await onUpdateControl({ mode: newMode });
      showSuccess(`Mode berhasil diubah ke ${newMode === 'auto' ? 'OTOMATIS (Threshold PPM)' : 'MANUAL'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePumpState = async (newState: boolean) => {
    try {
      setLoading(true);
      await onUpdateControl({ mode: 'manual', state: newState });
      showSuccess(`Pompa ${newState ? 'DINYALAKAN (ON)' : 'DIMATIKAN (OFF)'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      await onUpdateControl({
        target_ppm_min: Number(ppmMin),
        target_ppm_max: Number(ppmMax),
        cooldown_minutes: Number(cooldownMins),
      });
      showSuccess(`Pengaturan disimpan: Target ${ppmMin}-${ppmMax} PPM, Jeda Cooldown ${cooldownMins} Menit`);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const isInCooldown = Boolean(cooldownInfo?.is_in_cooldown);
  const remainingMins = cooldownInfo?.remaining_minutes || 0;

  return (
    <Card
      title="Kontrol Pompa Nutrisi & Anti-Overdosis"
      subtitle="Pengaturan logika aktuasi pompa relay ESP32 (Pin 23)"
      action={
        <div className="flex items-center gap-2">
          {control.pump_mode === 'auto' && (
            <Badge variant={isInCooldown ? 'warning' : 'success'} dot>
              {isInCooldown ? `Cooldown (${remainingMins}m)` : 'Dosing Siap'}
            </Badge>
          )}
          <Badge variant={actualPumpActive ? 'success' : 'default'} dot={actualPumpActive}>
            Relay: {actualPumpActive ? 'ON' : 'OFF'}
          </Badge>
        </div>
      }
    >
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Check className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Banner Status Anti-Overdosis / Cooldown */}
      {control.pump_mode === 'auto' && (
        <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 ${
          isInCooldown
            ? 'border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-200'
            : 'border-emerald-300/80 bg-emerald-50 text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-200'
        }`}>
          {isInCooldown ? (
            <Timer className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
          ) : (
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold">
                {isInCooldown ? `Masa Cooldown Aktif (Tersisa: ~${remainingMins} Menit)` : 'Sistem Siap Dosing Nutrisi'}
              </h4>
            </div>
            <p className="mt-0.5 text-xs opacity-90 leading-relaxed">
              {isInCooldown
                ? `Pompa baru saja menyelesaikan siklus penambahan nutrisi. Demi mencegah overdosis, pompa dikunci maksimal 1x dalam ${control.cooldown_minutes || 60} menit agar larutan memiliki waktu sirkulasi yang cukup.`
                : `Jika sensor mendeteksi PPM < ${control.target_ppm_min || 560}, pompa akan otomatis menyala dan terus mengisi sampai PPM mencapai ${control.target_ppm_max || 840}, lalu masuk masa istirahat ${control.cooldown_minutes || 60} menit.`}
            </p>
          </div>
        </div>
      )}

      {/* Grid Mode & Saklar Manual */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Mode Selector */}
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <Cpu className="h-4 w-4 text-emerald-600" />
            Mode Operasi Pompa
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Pilih apakah pompa bekerja otomatis sesuai ambang PPM nutrisi atau dikontrol manual lewat tombol web.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => handleToggleMode('auto')}
              disabled={loading}
              className={`flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all cursor-pointer ${
                control.pump_mode === 'auto'
                  ? 'border-2 border-emerald-500 bg-white font-semibold text-emerald-600 shadow-sm dark:bg-zinc-800 dark:text-emerald-400'
                  : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
              }`}
            >
              <span className="text-xs font-bold">OTOMATIS (AUTO)</span>
              <span className="text-[10px] text-zinc-400">Target PPM + Cooldown</span>
            </button>

            <button
              onClick={() => handleToggleMode('manual')}
              disabled={loading}
              className={`flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all cursor-pointer ${
                control.pump_mode === 'manual'
                  ? 'border-2 border-emerald-500 bg-white font-semibold text-emerald-600 shadow-sm dark:bg-zinc-800 dark:text-emerald-400'
                  : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
              }`}
            >
              <span className="text-xs font-bold">MANUAL (WEB)</span>
              <span className="text-[10px] text-zinc-400">Override Saklar</span>
            </button>
          </div>
        </div>

        {/* Manual Switch Override */}
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <Power className="h-4 w-4 text-emerald-600" />
            Override Saklar Pompa
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {control.pump_mode === 'auto'
              ? 'Mode saat ini adalah AUTO. Menekan tombol akan otomatis mengalihkan sistem ke mode MANUAL.'
              : 'Mode MANUAL aktif. Pompa dikontrol langsung lewat tombol saklar di bawah ini.'}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <Button
              variant={actualPumpActive ? 'danger' : 'primary'}
              size="md"
              loading={loading}
              onClick={() => handleTogglePumpState(!actualPumpActive)}
              className="w-full justify-center"
            >
              <Power className="h-4 w-4" />
              {actualPumpActive ? 'MATIKAN POMPA (OFF)' : 'NYALAKAN POMPA (ON)'}
            </Button>
          </div>
        </div>
      </div>

      {/* Pengaturan Ambang Batas Nutrisi & Jeda Cooldown */}
      <div className="mt-6 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <Sliders className="h-4 w-4 text-emerald-600" />
              Konfigurasi Ambang Batas & Interval Cooldown (Anti-Overdosis)
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              Pompa aktif saat PPM &lt; Min, terus memompa sampai PPM &gt;= Max, lalu istirahat selama jeda cooldown.
            </p>
          </div>
          <Button size="sm" onClick={handleSaveSettings} loading={loading}>
            <Save className="h-3.5 w-3.5" />
            Simpan Konfigurasi
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Batas Ambang Minimum (Pompa Mulai ON)
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                value={ppmMin}
                onChange={(e) => setPpmMin(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-mono font-bold text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="560"
              />
              <span className="text-xs font-semibold text-zinc-500">PPM</span>
            </div>
            <span className="mt-1 block text-[11px] text-zinc-400">
              Standar selada: 560 PPM
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Batas Ambang Target (Pompa Selesai / OFF)
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                value={ppmMax}
                onChange={(e) => setPpmMax(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-mono font-bold text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="840"
              />
              <span className="text-xs font-semibold text-zinc-500">PPM</span>
            </div>
            <span className="mt-1 block text-[11px] text-zinc-400">
              Standar selada: 840 PPM
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
              <Clock className="h-3 w-3 text-emerald-600" />
              Jeda Cooldown Maksimal 1x per
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                value={cooldownMins}
                onChange={(e) => setCooldownMins(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-mono font-bold text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="60"
              />
              <span className="text-xs font-semibold text-zinc-500">Menit</span>
            </div>
            <span className="mt-1 block text-[11px] text-zinc-400">
              Disarankan: 60 Menit (1 Jam)
            </span>
          </div>
        </div>
      </div>

      {/* Info Hardware Relay */}
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-[11px] text-amber-700 dark:text-amber-400 border border-amber-500/20">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <strong>Info Hardware ESP32:</strong> Relay menggunakan pin GPIO 23 (Aktif LOW). Saat ON bernilai <code>LOW</code>, dan saat OFF bernilai <code>HIGH</code>.
        </div>
      </div>
    </Card>
  );
}
