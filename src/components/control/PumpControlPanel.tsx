'use client';

import React, { useState, useEffect } from 'react';
import { Power, Cpu, Sliders, Check, Save, Clock, ShieldCheck, Timer } from 'lucide-react';
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

  const [ppmMin, setPpmMin] = useState<number>(control.target_ppm_min || 560);
  const [ppmMax, setPpmMax] = useState<number>(control.target_ppm_max || 840);
  const [cooldownMins, setCooldownMins] = useState<number>(control.cooldown_minutes || 60);

  useEffect(() => {
    if (control.target_ppm_min) setPpmMin(control.target_ppm_min);
    if (control.target_ppm_max) setPpmMax(control.target_ppm_max);
    if (control.cooldown_minutes) setCooldownMins(control.cooldown_minutes);
  }, [control]);

  const handleToggleMode = async (newMode: 'auto' | 'manual') => {
    try {
      setLoading(true);
      await onUpdateControl({ mode: newMode });
      showSuccess(`ENGINE MODE: ${newMode.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePumpState = async (newState: boolean) => {
    try {
      setLoading(true);
      await onUpdateControl({ mode: 'manual', state: newState });
      showSuccess(`RELAY PIN 23: ${newState ? 'FORCE_ON (LOW)' : 'FORCE_OFF (HIGH)'}`);
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
      showSuccess(`CONFIG APPLIED: ${ppmMin}-${ppmMax} PPM | COOLDOWN: ${cooldownMins}m`);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const isInCooldown = Boolean(cooldownInfo?.is_in_cooldown);
  const remainingMins = cooldownInfo?.remaining_minutes || 0;

  return (
    <Card
      title="ACTUATOR LOGIC ENGINE & DOSING CONTROLLER"
      subtitle="Opto-Coupled Relay &bull; GPIO 23 (Active LOW)"
      action={
        <div className="flex items-center gap-2">
          {control.pump_mode === 'auto' && (
            <Badge variant={isInCooldown ? 'warning' : 'success'} dot>
              {isInCooldown ? `COOLDOWN: ~${remainingMins}m` : 'DOSING READY'}
            </Badge>
          )}
          <Badge variant={actualPumpActive ? 'danger' : 'neutral'} dot={actualPumpActive}>
            RELAY: {actualPumpActive ? 'ACTIVE [LOW]' : 'STANDBY [HIGH]'}
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
                ? `INTER-DOSING REST ACTIVE (Tersisa: ~${remainingMins} Menit)`
                : 'CLOSED-LOOP DOSER READY'}
            </span>
          </div>

          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {isInCooldown
              ? 'Lockout aktif: 1x siklus per jam agar nutrisi homogen'
              : `Trigger saat PPM < ${control.target_ppm_min || 560}`}
          </span>
        </div>
      )}

      {/* Grid: Mode Segmented Switch & Manual Override */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Segmented Mode Selector */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
            Control Paradigm
          </span>
          <p className="mt-0.5 text-xs text-zinc-400">
            Pilih antara otomasi closed-loop atau kontrol saklar manual.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => handleToggleMode('auto')}
              disabled={loading}
              className={`rounded-lg border px-3 py-2 text-center font-mono text-xs transition-all cursor-pointer ${
                control.pump_mode === 'auto'
                  ? 'border-zinc-900 bg-zinc-900 font-bold text-white shadow-sm dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              CLOSED-LOOP (AUTO)
            </button>

            <button
              onClick={() => handleToggleMode('manual')}
              disabled={loading}
              className={`rounded-lg border px-3 py-2 text-center font-mono text-xs transition-all cursor-pointer ${
                control.pump_mode === 'manual'
                  ? 'border-zinc-900 bg-zinc-900 font-bold text-white shadow-sm dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              MANUAL OVERRIDE
            </button>
          </div>
        </div>

        {/* Manual Override Action */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
              Physical Actuator Force
            </span>
            <span className="font-mono text-[10px] text-zinc-400">GPIO 23</span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            {control.pump_mode === 'auto'
              ? 'Menekan saklar akan otomatis mengalihkan sistem ke mode MANUAL.'
              : 'Mode manual aktif. Status relay mengikuti tombol ini.'}
          </p>

          <div className="mt-3">
            <Button
              variant={actualPumpActive ? 'danger' : 'primary'}
              size="md"
              loading={loading}
              onClick={() => handleTogglePumpState(!actualPumpActive)}
              className="w-full justify-center font-mono text-xs uppercase tracking-wider h-8.5"
            >
              <Power className="h-3.5 w-3.5" />
              {actualPumpActive ? 'FORCE RELAY OFF (HIGH)' : 'FORCE RELAY ON (LOW)'}
            </Button>
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
            <p className="text-[11px] text-zinc-400">
              Konfigurasi ambang aktivasi, target pengisian, dan jeda antar-dosing.
            </p>
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
            <div className="mt-1 flex items-center rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
              <input
                type="number"
                value={ppmMin}
                onChange={(e) => setPpmMin(Number(e.target.value))}
                className="w-full text-xs font-bold text-zinc-900 focus:outline-none dark:text-zinc-100"
              />
              <span className="text-[10px] text-zinc-400">PPM</span>
            </div>
            <span className="mt-1 block text-[10px] text-zinc-400">Default: 560 PPM</span>
          </div>

          <div>
            <label className="block text-[11px] uppercase text-zinc-500 dark:text-zinc-400 font-semibold">
              Target Cap (Cutoff OFF)
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
              <input
                type="number"
                value={ppmMax}
                onChange={(e) => setPpmMax(Number(e.target.value))}
                className="w-full text-xs font-bold text-zinc-900 focus:outline-none dark:text-zinc-100"
              />
              <span className="text-[10px] text-zinc-400">PPM</span>
            </div>
            <span className="mt-1 block text-[10px] text-zinc-400">Default: 840 PPM</span>
          </div>

          <div>
            <label className="block text-[11px] uppercase text-zinc-500 dark:text-zinc-400 font-semibold">
              Cooldown Window
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
              <input
                type="number"
                value={cooldownMins}
                onChange={(e) => setCooldownMins(Number(e.target.value))}
                className="w-full text-xs font-bold text-zinc-900 focus:outline-none dark:text-zinc-100"
              />
              <span className="text-[10px] text-zinc-400">MINS</span>
            </div>
            <span className="mt-1 block text-[10px] text-zinc-400">Maks 1x per 60 menit</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
