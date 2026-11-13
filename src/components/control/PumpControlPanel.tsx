'use client';

import React, { useState } from 'react';
import { Power, Cpu, Sliders, AlertCircle, Check, Save } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SystemControl } from '@/lib/types/hidroponik';

interface PumpControlPanelProps {
  control: SystemControl;
  actualPumpActive: boolean;
  onUpdateControl: (params: {
    mode?: 'auto' | 'manual';
    state?: boolean;
    target_ppm_min?: number;
    target_ppm_max?: number;
  }) => Promise<void>;
}

export function PumpControlPanel({
  control,
  actualPumpActive,
  onUpdateControl,
}: PumpControlPanelProps) {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Local state untuk batas ambang PPM
  const [ppmMin, setPpmMin] = useState<number>(control.target_ppm_min || 560);
  const [ppmMax, setPpmMax] = useState<number>(control.target_ppm_max || 840);

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
      // Ketika menekan tombol manual ON/OFF, otomatis set mode ke manual
      await onUpdateControl({ mode: 'manual', state: newState });
      showSuccess(`Pompa ${newState ? 'DINYALAKAN (ON)' : 'DIMATIKAN (OFF)'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveThresholds = async () => {
    try {
      setLoading(true);
      await onUpdateControl({
        target_ppm_min: Number(ppmMin),
        target_ppm_max: Number(ppmMax),
      });
      showSuccess(`Batas ambang nutrisi disimpan: ${ppmMin} - ${ppmMax} PPM`);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  return (
    <Card
      title="Kontrol Pompa Nutrisi & Ambang Batas"
      subtitle="Pengaturan logika aktuasi pompa relay ESP32 (Pin 23)"
      action={
        <Badge variant={actualPumpActive ? 'success' : 'default'} dot={actualPumpActive}>
          Relay: {actualPumpActive ? 'PUMP ACTIVE (ON)' : 'PUMP IDLE (OFF)'}
        </Badge>
      }
    >
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Check className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Grid Mode & Saklar */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Mode Selector */}
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <Cpu className="h-4 w-4 text-emerald-600" />
            Mode Operasi Pompa
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Pilih apakah pompa bekerja otomatis berdasarkan batas ambang PPM nutrisi atau dikontrol manual via tombol web.
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
              <span className="text-[10px] text-zinc-400">Sesuai Batas PPM</span>
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
              ? 'Mode saat ini adalah AUTO. Menekan tombol akan otomatis mengubah mode ke MANUAL.'
              : 'Mode MANUAL aktif. Pompa dikontrol langsung lewat tombol di bawah ini.'}
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

      {/* Pengaturan Ambang Batas Nutrisi (Threshold PPM) */}
      <div className="mt-6 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <Sliders className="h-4 w-4 text-emerald-600" />
            Pengaturan Ambang Batas Nutrisi Otomatis (Threshold PPM)
          </div>
          <Button size="sm" onClick={handleSaveThresholds} loading={loading}>
            <Save className="h-3.5 w-3.5" />
            Simpan Ambang Batas
          </Button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Saat mode <strong>OTOMATIS (AUTO)</strong> aktif: Pompa akan <strong>MENYALA (ON)</strong> jika PPM sensor lebih rendah dari batas minimum, dan akan <strong>MATI (OFF)</strong> jika PPM sudah mencapai batas optimal/maksimum.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Batas Ambang Minimum (PPM Kurang / Pompa ON)
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
              Standar selada/sayur hijau: 560 PPM
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Batas Ambang Maksimum (PPM Cukup / Pompa OFF)
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
              Standar selada/sayur hijau: 840 PPM
            </span>
          </div>
        </div>
      </div>

      {/* Info Hardware Relay */}
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-[11px] text-amber-700 dark:text-amber-400 border border-amber-500/20">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <strong>Info Hardware ESP32:</strong> Relay menggunakan pin GPIO 23 dengan konfigurasi <em>Aktif LOW</em>. Saat ON bernilai <code>LOW</code>, dan saat OFF bernilai <code>HIGH</code>.
        </div>
      </div>
    </Card>
  );
}
