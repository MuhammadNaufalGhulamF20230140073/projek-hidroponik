'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { StatusBanner } from '@/components/dashboard/StatusBanner';
import { PumpControlPanel } from '@/components/control/PumpControlPanel';
import { CalibrationInfo } from '@/components/control/CalibrationInfo';
import { Badge } from '@/components/ui/Badge';
import { RefreshCw, Database, Cpu, Sliders, Menu, X, Activity, History } from 'lucide-react';
import { SystemControl } from '@/lib/types/hidroponik';

interface LogItem {
  packet_id: string;
  timestamp: string;
  adc_raw: number;
  voltage: string;
  ppm_raw: number;
  ppm_filtered: number;
  relay: string;
  is_active: boolean;
}

interface CooldownInfo {
  is_in_cooldown: boolean;
  remaining_seconds: number;
  remaining_minutes: number;
}

const LOGO_SRC = '/Bagas%20Hidrponik.jpg';

function formatShortTimestamp(tsRaw: unknown): string {
  if (!tsRaw) return '-';
  const parsed = new Date(String(tsRaw));
  if (Number.isNaN(parsed.getTime())) return String(tsRaw);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const hh = String(parsed.getHours()).padStart(2, '0');
  const mm = String(parsed.getMinutes()).padStart(2, '0');
  const ss = String(parsed.getSeconds()).padStart(2, '0');
  return `${parsed.getDate()} ${months[parsed.getMonth()]}, ${hh}:${mm}.${ss}`;
}

function normalizeLogs(rawData: unknown, fallbackLogs: LogItem[]): LogItem[] {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return fallbackLogs;
  }

  return rawData.map((row: Record<string, unknown>, idx: number) => {
    const packetIdRaw = row.packet_id ?? row.id ?? rawData.length - idx;
    const packet_id = String(packetIdRaw).startsWith('#')
      ? String(packetIdRaw)
      : `#${packetIdRaw}`;

    const timestamp = formatShortTimestamp(row.timestamp ?? row.created_at ?? '');
    const adc_raw = Number(row.adc_raw ?? row.adcRaw ?? 0);

    const rawVolt = row.voltage ?? row.tegangan ?? row.teganganRaw ?? 0;
    const voltageNum = Number(rawVolt);
    const voltage =
      typeof rawVolt === 'string' && rawVolt.includes('V')
        ? rawVolt
        : `${Number.isFinite(voltageNum) ? voltageNum.toFixed(3) : '0.000'} V`;

    const ppm_raw = Number(row.ppm_raw ?? row.ppmRaw ?? 0);
    const ppm_filtered = Number(
      row.ppm_filtered ?? row.ppm_stabil ?? row.ppmStabil ?? row.ppm ?? ppm_raw
    );

    const is_active =
      typeof row.is_active === 'boolean'
        ? row.is_active
        : typeof row.status_pompa === 'boolean'
          ? row.status_pompa
          : typeof row.pompaAktif === 'boolean'
            ? row.pompaAktif
            : typeof row.pump_state === 'boolean'
              ? row.pump_state
              : String(row.relay ?? '').toUpperCase() === 'MENYALA' ||
                String(row.relay ?? '').toUpperCase() === 'ON' ||
                row.relay === true;

    const relay =
      typeof row.relay === 'string' && row.relay.trim() !== ''
        ? row.relay.toUpperCase()
        : is_active
          ? 'MENYALA'
          : 'MATI';

    return {
      packet_id,
      timestamp,
      adc_raw: Number.isFinite(adc_raw) ? adc_raw : 0,
      voltage,
      ppm_raw: Number.isFinite(ppm_raw) ? ppm_raw : 0,
      ppm_filtered: Number.isFinite(ppm_filtered) ? ppm_filtered : 0,
      relay,
      is_active,
    };
  });
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'control' | 'history'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitializingDb, setIsInitializingDb] = useState(false);
  const [dbInitMessage, setDbInitMessage] = useState<string | null>(null);

  const [telemetry, setTelemetry] = useState({
    ppmStabil: 630.5,
    ppmRaw: 635.0,
    voltage: 1.176,
    adcRaw: 1450,
    temperature: 25.0,
    actualPumpActive: false,
    isOnline: false,
    lastSeenSeconds: 9999,
  });

  const [cooldown, setCooldown] = useState<CooldownInfo>({
    is_in_cooldown: false,
    remaining_seconds: 0,
    remaining_minutes: 0,
  });

  const [controlState, setControlState] = useState<SystemControl>({
    id: '1',
    pump_mode: 'auto',
    pump_state: false,
    target_ppm_min: 560,
    target_ppm_max: 840,
    cooldown_minutes: 60,
  });

  const [logs, setLogs] = useState<LogItem[]>([
    { packet_id: '#5', timestamp: '18 Nov, 20:00.46', adc_raw: 1450, voltage: '1.176 V', ppm_raw: 635.0, ppm_filtered: 630.5, relay: 'MATI', is_active: false },
    { packet_id: '#4', timestamp: '18 Nov, 19:58.46', adc_raw: 1445, voltage: '1.164 V', ppm_raw: 628.7, ppm_filtered: 622.4, relay: 'MATI', is_active: false },
    { packet_id: '#3', timestamp: '18 Nov, 19:56.46', adc_raw: 1420, voltage: '1.144 V', ppm_raw: 615.2, ppm_filtered: 612.0, relay: 'MENYALA', is_active: true },
  ]);

  const syncAllData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const [sensorRes, controlRes, historyRes] = await Promise.all([
        fetch('/api/sensor', { cache: 'no-store' }),
        fetch('/api/control', { cache: 'no-store' }),
        fetch('/api/history?limit=25', { cache: 'no-store' }),
      ]);

      const sensorData = sensorRes.ok ? await sensorRes.json() : null;
      const controlData = controlRes.ok ? await controlRes.json() : null;
      const historyData = historyRes.ok ? await historyRes.json() : null;

      let deviceOnline = false;
      let seenSeconds = 9999;

      if (sensorData?.success) {
        deviceOnline = Boolean(sensorData.is_online);
        seenSeconds =
          typeof sensorData.last_seen_seconds === 'number'
            ? sensorData.last_seen_seconds
            : 9999;

        if (sensorData.cooldown) {
          setCooldown({
            is_in_cooldown: Boolean(sensorData.cooldown.is_in_cooldown),
            remaining_seconds: Number(sensorData.cooldown.remaining_seconds || 0),
            remaining_minutes: Number(sensorData.cooldown.remaining_minutes || 0),
          });
        }

        if (sensorData.control) {
          setControlState((prev) => ({ ...prev, ...sensorData.control }));
        }

        if (sensorData.data) {
          const d = sensorData.data as Record<string, unknown>;
          const nextPpmStabil = Number(
            d.ppm_stabil ?? d.ppmStabil ?? d.ppm_filtered ?? telemetry.ppmStabil
          );
          const nextPpmRaw = Number(d.ppm_raw ?? d.ppmRaw ?? telemetry.ppmRaw);
          const nextVoltage = Number(d.tegangan ?? d.teganganRaw ?? d.voltage ?? telemetry.voltage);
          const nextAdcRaw = Number(d.adc_raw ?? d.adcRaw ?? telemetry.adcRaw);
          const nextPumpActive = Boolean(
            d.status_pompa ?? d.pompaAktif ?? d.pump_state ?? false
          );

          setTelemetry((prev) => ({
            ...prev,
            ppmStabil: Number.isFinite(nextPpmStabil) ? nextPpmStabil : prev.ppmStabil,
            ppmRaw: Number.isFinite(nextPpmRaw) ? nextPpmRaw : prev.ppmRaw,
            voltage: Number.isFinite(nextVoltage) ? nextVoltage : prev.voltage,
            adcRaw: Number.isFinite(nextAdcRaw) ? nextAdcRaw : prev.adcRaw,
            actualPumpActive: nextPumpActive,
            isOnline: deviceOnline,
            lastSeenSeconds: seenSeconds,
          }));
        } else {
          setTelemetry((prev) => ({
            ...prev,
            isOnline: deviceOnline,
            lastSeenSeconds: seenSeconds,
          }));
        }
      } else {
        setTelemetry((prev) => ({
          ...prev,
          isOnline: false,
        }));
      }

      if (controlData?.success && controlData.control) {
        setControlState((prev) => ({ ...prev, ...controlData.control }));
      }

      if (historyData?.success && Array.isArray(historyData.data)) {
        setLogs((prevLogs) => normalizeLogs(historyData.data, prevLogs));
      }
    } catch {
      setTelemetry((prev) => ({
        ...prev,
        isOnline: false,
      }));
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }
  }, [telemetry.adcRaw, telemetry.ppmRaw, telemetry.ppmStabil, telemetry.voltage]);

  useEffect(() => {
    syncAllData(false);
    const interval = setInterval(() => {
      syncAllData(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [syncAllData]);

  const handleInitDatabase = async () => {
    setIsInitializingDb(true);
    setDbInitMessage(null);
    try {
      const res = await fetch('/api/init-db', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success) {
        setDbInitMessage(data.message || 'Skema database berhasil diinisialisasi.');
        await syncAllData(true);
      } else {
        setDbInitMessage(data.error || 'Gagal menginisialisasi database.');
      }
    } catch {
      setDbInitMessage('Gagal menghubungi endpoint /api/init-db.');
    } finally {
      setIsInitializingDb(false);
    }
  };

  const handleUpdateControl = async (params: {
    mode?: 'auto' | 'manual';
    state?: boolean;
    target_ppm_min?: number;
    target_ppm_max?: number;
    cooldown_minutes?: number;
  }) => {
    const optimisticState = {
      ...controlState,
      ...(params.mode !== undefined && { pump_mode: params.mode }),
      ...(params.state !== undefined && { pump_state: params.state }),
      ...(params.target_ppm_min !== undefined && { target_ppm_min: params.target_ppm_min }),
      ...(params.target_ppm_max !== undefined && { target_ppm_max: params.target_ppm_max }),
      ...(params.cooldown_minutes !== undefined && { cooldown_minutes: params.cooldown_minutes }),
    };

    setControlState(optimisticState);

    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();

      if (res.ok && data.success && data.control) {
        setControlState((prev) => ({ ...prev, ...data.control }));
        setTelemetry((prev) => ({
          ...prev,
          actualPumpActive: Boolean(data.control.pump_state),
        }));
      }
    } catch {
      // Tetap pertahankan state optimis dan biarkan polling menyinkronkan ulang
    }

    if (params.state !== undefined) {
      setTelemetry((prev) => ({ ...prev, actualPumpActive: params.state! }));

      const now = new Date();
      const timeString = formatShortTimestamp(now.toISOString());

      const newLogItem: LogItem = {
        packet_id: `#${logs.length + 1}`,
        timestamp: timeString,
        adc_raw: telemetry.adcRaw,
        voltage: `${telemetry.voltage.toFixed(3)} V`,
        ppm_raw: telemetry.ppmRaw,
        ppm_filtered: telemetry.ppmStabil,
        relay: params.state ? 'MENYALA' : 'MATI',
        is_active: params.state,
      };

      setLogs((prevLogs) => [newLogItem, ...prevLogs]);
    }
  };

  const handleSelectTab = (tab: 'dashboard' | 'control' | 'history') => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const rawDelta = (telemetry.ppmStabil - telemetry.ppmRaw).toFixed(1);

  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-950 font-sans">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex shrink-0">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Drawer Sidebar Mode HP */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-zinc-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 flex flex-col h-full shadow-2xl">
            <Sidebar activeTab={activeTab} setActiveTab={handleSelectTab} />
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup menu"
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-emerald-800 text-white border border-emerald-600/50 hover:bg-emerald-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-20 md:pb-0">
        {/* Header Atas Responsif dengan Indikator & Tombol Refresh */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-zinc-300 bg-white px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 shadow-xs">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu"
              className="md:hidden shrink-0 p-2 rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-900 hover:bg-zinc-100 cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>

            <img
              src={LOGO_SRC}
              alt="Logo Hydro"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl object-cover border border-zinc-300 shadow-xs shrink-0"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs sm:text-sm font-black tracking-wider text-emerald-800 uppercase">
                  HYDRO
                </span>
                <span className="text-zinc-400 font-bold">/</span>
                <h1 className="text-sm sm:text-base font-black tracking-tight text-zinc-950 truncate">
                  Monitoring &amp; Kontrol Hidroponik
                </h1>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-zinc-800 mt-0.5 truncate">
                ESP32 ADC GPIO 34 (TDS) &bull; GPIO 23 (Relay) &bull; Vercel Postgres
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden lg:flex flex-col items-end font-mono text-[10px] font-bold text-zinc-700">
              <span>
                LAST SEEN:{' '}
                <strong className="text-zinc-950">
                  {telemetry.lastSeenSeconds < 9999 ? `${telemetry.lastSeenSeconds}s ago` : 'NO DATA'}
                </strong>
              </span>
              {cooldown.is_in_cooldown && (
                <span className="text-amber-800">
                  COOLDOWN: {cooldown.remaining_minutes}m ({cooldown.remaining_seconds}s)
                </span>
              )}
            </div>

            <Badge
              variant={telemetry.isOnline ? 'success' : 'danger'}
              dot
              className="font-mono text-[10px] sm:text-xs font-bold"
            >
              {telemetry.isOnline ? 'ESP32 ONLINE' : 'ESP32 OFFLINE'}
            </Badge>

            <button
              onClick={() => syncAllData(true)}
              disabled={isRefreshing}
              aria-label="Refresh data sensor dan kontrol"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-400 bg-white px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-zinc-900 shadow-xs hover:bg-zinc-50 disabled:opacity-60 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        {/* Konten Utama */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
          {/* TAB 1: TELEMETRY OVERVIEW */}
          {activeTab === 'dashboard' && (
            <>
              <div suppressHydrationWarning>
                <StatusBanner
                  ppm={telemetry.ppmStabil}
                  targetMin={controlState.target_ppm_min}
                  targetMax={controlState.target_ppm_max}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="rounded-2xl border border-zinc-300 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between gap-2 mb-4 border-b border-zinc-200 pb-3">
                    <span className="font-mono text-[11px] sm:text-xs font-black tracking-wider text-zinc-900">
                      NUTRIENT CONCENTRATION (TDS)
                    </span>
                    <span className="shrink-0 rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-900 border border-emerald-300">
                      {telemetry.actualPumpActive ? 'PUMP ACTIVE' : 'RELAY STANDBY'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <span className="font-mono text-4xl sm:text-5xl font-black text-zinc-950">
                        {telemetry.ppmStabil.toFixed(1)}
                      </span>
                      <span className="ml-2 font-mono text-xs sm:text-sm font-bold text-zinc-800">PPM</span>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="text-zinc-700 block font-bold">RAW DELTA</span>
                      <span className="font-extrabold text-amber-800">{rawDelta} ppm</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row sm:justify-between gap-1 font-mono text-xs text-zinc-900 font-bold">
                    <span>
                      UNFILTERED ADC READ: <strong className="text-zinc-950">{telemetry.ppmRaw.toFixed(1)} ppm</strong>
                    </span>
                    <span>
                      SMOOTHING FACTOR: <strong className="text-zinc-950">&alpha; = 0.20</strong>
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-300 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between gap-2 mb-4 border-b border-zinc-200 pb-3">
                    <span className="font-mono text-[11px] sm:text-xs font-black tracking-wider text-zinc-900 flex items-center gap-1.5">
                      <Cpu className="h-4 w-4 shrink-0 text-sky-800" />
                      ANALOG-TO-DIGITAL CONVERSION (ADC)
                    </span>
                    <span className="shrink-0 rounded bg-zinc-200 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-900 border border-zinc-300">
                      12-BIT (4096 LSB)
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <span className="font-mono text-4xl sm:text-5xl font-black text-zinc-950">
                        {telemetry.voltage.toFixed(3)}
                      </span>
                      <span className="ml-2 font-mono text-xs sm:text-sm font-bold text-zinc-800">VOLTS (DC)</span>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="text-zinc-700 block font-bold">BIT DENSITY</span>
                      <span className="font-extrabold text-zinc-950">{telemetry.adcRaw} / 4095</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row sm:justify-between gap-1 font-mono text-xs text-zinc-900 font-bold">
                    <span>
                      TEMP REF: <strong className="text-zinc-950">{telemetry.temperature.toFixed(1)} &deg;C</strong>
                    </span>
                    <span>
                      QUANTIZATION: <strong className="text-zinc-950">~0.806 mV/LSB</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-300 bg-white p-4 sm:p-6 shadow-sm">
                <div className="mb-4">
                  <h2 className="font-mono text-xs font-black tracking-wider text-zinc-950">
                    TELEMETRY TIME-SERIES (TDS BUFFER)
                  </h2>
                  <p className="font-mono text-xs text-zinc-800 mt-0.5 font-bold">
                    Realtime Rolling Window &bull; {logs.length} Sample Points
                  </p>
                </div>
                <div className="h-44 sm:h-48 flex items-center justify-center border border-dashed border-zinc-300 rounded-xl bg-zinc-50 font-mono text-xs font-bold text-zinc-800 px-3 text-center">
                  [REALTIME ROLLING WINDOW CHART ACTIVE]
                </div>
              </div>
            </>
          )}

          {/* TAB 2: ACTUATOR & DOSING ENGINE */}
          {activeTab === 'control' && (
            <div className="space-y-5 sm:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <PumpControlPanel
                  control={controlState}
                  actualPumpActive={telemetry.actualPumpActive}
                  onUpdateControl={handleUpdateControl}
                />

                <div className="rounded-2xl border border-zinc-300 bg-white p-4 sm:p-6 shadow-sm space-y-4">
                  <div className="border-b border-zinc-200 pb-3">
                    <h2 className="font-mono text-xs font-black tracking-wider text-zinc-950 flex items-center gap-1.5">
                      <Sliders className="h-4 w-4 shrink-0 text-emerald-800" />
                      DOSING ENGINE PARAMETERS &amp; SETPOINTS
                    </h2>
                    <p className="font-mono text-xs text-zinc-800 mt-0.5 font-bold">
                      Configured relay trigger thresholds &amp; cooldown timers
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 font-mono">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4">
                      <span className="text-[10px] font-black text-zinc-800 uppercase">Min Threshold (ON)</span>
                      <div className="text-lg sm:text-xl font-black text-zinc-950 mt-1">
                        {controlState.target_ppm_min}{' '}
                        <span className="text-xs font-bold text-zinc-800">PPM</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4">
                      <span className="text-[10px] font-black text-zinc-800 uppercase">Target Cap (OFF)</span>
                      <div className="text-lg sm:text-xl font-black text-zinc-950 mt-1">
                        {controlState.target_ppm_max}{' '}
                        <span className="text-xs font-bold text-zinc-800">PPM</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4 font-mono">
                    <span className="text-[10px] font-black text-zinc-800 uppercase">Cooldown Window</span>
                    <div className="text-base sm:text-lg font-black text-zinc-950 mt-0.5">
                      {controlState.cooldown_minutes} Minutes{' '}
                      <span className="text-xs font-bold text-zinc-800">
                        {cooldown.is_in_cooldown
                          ? `(• Sisa ${cooldown.remaining_minutes} menit)`
                          : '(• Max 1x cycle per duration)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <CalibrationInfo />
            </div>
          )}

          {/* TAB 3: DATABASE LOG & CALIBRATION */}
          {activeTab === 'history' && (
            <div className="space-y-5 sm:space-y-6 font-mono">
              <div className="rounded-2xl border border-zinc-800 bg-[#121418] p-4 sm:p-6 text-zinc-100 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xs font-bold tracking-wider text-white flex items-center gap-2">
                      <Database className="h-4 w-4 shrink-0 text-emerald-400" />
                      DATABASE STORAGE CONNECTOR
                    </h2>
                    <p className="text-xs text-zinc-300 mt-0.5 font-semibold">
                      Vercel Postgres (Neon Serverless Pool)
                    </p>
                  </div>
                  <button
                    onClick={handleInitDatabase}
                    disabled={isInitializingDb}
                    className="self-start sm:self-auto rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-100 hover:bg-zinc-700 disabled:opacity-60 transition cursor-pointer"
                  >
                    {isInitializingDb ? 'INITIALIZING...' : 'INIT SCHEMA'}
                  </button>
                </div>
                <p className="text-xs text-zinc-300 border-t border-zinc-800/80 pt-3 font-semibold">
                  Schema Tables: <span className="text-emerald-400 font-bold">sensor_logs</span> &bull;{' '}
                  <span className="text-emerald-400 font-bold">system_control</span>.
                </p>
                {dbInitMessage && (
                  <p className="text-xs text-emerald-300 mt-2 font-semibold">
                    {dbInitMessage}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-[#121418] p-4 sm:p-6 text-zinc-100 shadow-lg">
                <div className="mb-4">
                  <h2 className="text-xs font-bold tracking-wider text-white">TELEMETRY ARCHIVE (POSTGRES LOGS)</h2>
                  <p className="text-xs text-zinc-300 mt-0.5 font-semibold">
                    Chronological audit trail of all sensor transmissions &bull; Newest first
                  </p>
                </div>

                <div className="overflow-x-auto max-h-96 rounded-xl border border-zinc-800 bg-[#0d0f12]">
                  <table className="w-full min-w-160 text-left text-xs">
                    <thead className="sticky top-0 bg-[#121418] border-b border-zinc-800 text-zinc-300 font-bold">
                      <tr>
                        <th className="p-3 whitespace-nowrap">PACKET_ID</th>
                        <th className="p-3 whitespace-nowrap">TIMESTAMP</th>
                        <th className="p-3 whitespace-nowrap">ADC_RAW</th>
                        <th className="p-3 whitespace-nowrap">VOLTAGE</th>
                        <th className="p-3 whitespace-nowrap">PPM_RAW</th>
                        <th className="p-3 whitespace-nowrap">PPM_FILTERED</th>
                        <th className="p-3 whitespace-nowrap">RELAY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-zinc-100 font-bold">
                      {logs.map((log, index) => (
                        <tr key={`${log.packet_id}-${index}`} className="hover:bg-zinc-900/50 transition">
                          <td className="p-3 whitespace-nowrap text-white">{log.packet_id}</td>
                          <td className="p-3 whitespace-nowrap text-zinc-300">{log.timestamp}</td>
                          <td className="p-3 whitespace-nowrap">{log.adc_raw}</td>
                          <td className="p-3 whitespace-nowrap">{log.voltage}</td>
                          <td className="p-3 whitespace-nowrap">{log.ppm_raw.toFixed(1)}</td>
                          <td className="p-3 whitespace-nowrap text-emerald-400">{log.ppm_filtered.toFixed(1)}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                  log.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'
                                }`}
                              />
                              {log.relay}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <CalibrationInfo />
            </div>
          )}
        </div>
      </main>

      {/* Bottom Tab Bar Khusus Mode HP */}
      <nav
        aria-label="Navigasi bawah mobile"
        className="fixed bottom-0 inset-x-0 z-30 flex md:hidden items-center justify-around border-t border-zinc-300 bg-white py-1.5 px-2 shadow-lg font-mono"
      >
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-black transition cursor-pointer ${
            activeTab === 'dashboard' ? 'bg-emerald-100 text-emerald-950' : 'text-zinc-700'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>TELEMETRY</span>
        </button>

        <button
          onClick={() => setActiveTab('control')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-black transition cursor-pointer ${
            activeTab === 'control' ? 'bg-emerald-100 text-emerald-950' : 'text-zinc-700'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>CONTROL</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-black transition cursor-pointer ${
            activeTab === 'history' ? 'bg-emerald-100 text-emerald-950' : 'text-zinc-700'
          }`}
        >
          <History className="h-4 w-4" />
          <span>LOGS</span>
        </button>
      </nav>
    </div>
  );
}