'use client';

import React, { useState } from 'react';
import { Power, Cpu, Sliders, AlertCircle, Check } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SystemControl } from '@/lib/types/hidroponik';

interface PumpControlPanelProps {
  control: SystemControl;
  actualPumpActive: boolean;
  onUpdateControl: (mode: 'auto' | 'manual', state: boolean) => Promise<void>;
}

export function PumpControlPanel({
  control,
  actualPumpActive,
  onUpdateControl,
}: PumpControlPanelProps) {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleToggleMode = async (newMode: 'auto' | 'manual') => {
    try {
      setLoading(true);
      await onUpdateControl(newMode, control.pump_state);
      showSuccess(`Mode berhasil diubah ke ${newMode.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePumpState = async (newState: boolean) => {
    try {
      setLoading(true);
      // Ketika menekan tombol manual ON/OFF, otomatis set mode ke manual
      await onUpdateControl('manual', newState);
      showSuccess(`Pompa ${newState ? 'DINYALAKAN (ON)' : 'DIMATIKAN (OFF)'}`);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <Card
      title="Kontrol Pompa Nutrisi & Sirkulasi"
      subtitle="Pengaturan aktuator relay ESP32 (Pin 23 - Aktif LOW)"
      action={
        <Badge variant={actualPumpActive ? 'success' : 'default'} dot={actualPumpActive}>
          Relay: {actualPumpActive ? 'PUMP ACTIVE (ON)' : 'PUMP IDLE (OFF)'}
        </Badge>
      }
    >
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Check className="h-4 w-4" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Mode Selector */}
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <Cpu className="h-4 w-4 text-emerald-600" />
            Mode Operasi Pompa
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Pilih apakah pompa dikontrol otomatis oleh timer firmware ESP32 atau manual lewat web ini.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => handleToggleMode('auto')}
              disabled={loading}
              className={`flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all ${
                control.pump_mode === 'auto'
                  ? 'border-2 border-emerald-500 bg-white font-semibold text-emerald-600 shadow-sm dark:bg-zinc-800 dark:text-emerald-400'
                  : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
              }`}
            >
              <span className="text-xs font-bold">OTOMATIS (AUTO)</span>
              <span className="text-[10px] text-zinc-400">Siklus 5s ON / 5s OFF</span>
            </button>

            <button
              onClick={() => handleToggleMode('manual')}
              disabled={loading}
              className={`flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all ${
                control.pump_mode === 'manual'
                  ? 'border-2 border-emerald-500 bg-white font-semibold text-emerald-600 shadow-sm dark:bg-zinc-800 dark:text-emerald-400'
                  : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
              }`}
            >
              <span className="text-xs font-bold">MANUAL (WEB)</span>
              <span className="text-[10px] text-zinc-400">Kontrol Langsung</span>
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
              ? 'Mode saat ini adalah AUTO. Menekan tombol di bawah akan mengalihkan ke mode MANUAL.'
              : 'Mode MANUAL aktif. Pompa akan mengikuti status perintah di bawah ini.'}
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

      {/* Note Relay LOW Warning */}
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-[11px] text-amber-700 dark:text-amber-400 border border-amber-500/20">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <strong>Info Hardware ESP32:</strong> Relay menggunakan konfigurasi <em>Aktif LOW</em>. Saat status ON, pin 23 akan berlogika <code>LOW</code>. Saat OFF, pin 23 berlogika <code>HIGH</code>.
        </div>
      </div>
    </Card>
  );
}

