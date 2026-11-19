'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { StatusBanner } from '@/components/dashboard/StatusBanner';
import { SensorChart } from '@/components/dashboard/SensorChart';
import { PumpControlPanel } from '@/components/control/PumpControlPanel';
import { CalibrationInfo } from '@/components/control/CalibrationInfo';
import { Badge } from '@/components/ui/Badge';
import { RefreshCw, Database, Cpu, Sliders, Menu, X, Activity, History, Droplets, AlertTriangle } from 'lucide-react';
import { SystemControl } from '@/lib/types/hidroponik';
import { ManualSafetyAlertModal } from '@/components/control/ManualSafetyAlertModal';

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
  enabled?: boolean;
  is_in_cooldown: boolean;
  remaining_seconds: number;
  remaining_minutes: number;
  max_cycles?: number;
  current_cycles?: number;
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

  const mapped = rawData.map((row: Record<string, unknown>, idx: number) => {
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

    const sortTime = row.created_at || row.timestamp
      ? new Date(String(row.created_at || row.timestamp)).getTime()
      : 0;
    const sortId = Number(row.id ?? 0);

    return {
      packet_id,
      timestamp,
      adc_raw: Number.isFinite(adc_raw) ? adc_raw : 0,
      voltage,
      ppm_raw: Number.isFinite(ppm_raw) ? ppm_raw : 0,
      ppm_filtered: Number.isFinite(ppm_filtered) ? ppm_filtered : 0,
      relay,
      is_active,
      _sortTime: Number.isNaN(sortTime) ? 0 : sortTime,
      _sortId: Number.isNaN(sortId) ? 0 : sortId,
    };
  });

  // Urutkan selalu dari data terbaru ke data yang lama (Newest First)
  return mapped.sort((a, b) => {
    if (b._sortTime !== a._sortTime) {
      return b._sortTime - a._sortTime;
    }
    return b._sortId - a._sortId;
  });
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'control' | 'history'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitializingDb, setIsInitializingDb] = useState(false);
  const [dbInitMessage, setDbInitMessage] = useState<string | null>(null);

  // State untuk Pop-up Alert Keselamatan Mode Manual saat Pindah Menu
  const [pendingTargetTab, setPendingTargetTab] = useState<'dashboard' | 'control' | 'history' | null>(null);
  const [showManualAlert, setShowManualAlert] = useState(false);
  const [isSwitchingAuto, setIsSwitchingAuto] = useState(false);

  // Mencegah race-condition polling background menimpa state transisi user (anti-kedut)
  const lastControlUpdateRef = useRef<number>(0);

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
    id: 'default',
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

      const isRecentlyUpdated = Date.now() - lastControlUpdateRef.current < 3500;

      if (sensorData?.success) {
        deviceOnline = Boolean(sensorData.is_online);
        seenSeconds =
          typeof sensorData.last_seen_seconds === 'number'
            ? sensorData.last_seen_seconds
            : 9999;

        if (sensorData.cooldown) {
          setCooldown({
            enabled: Boolean(sensorData.cooldown.enabled !== false),
            is_in_cooldown: Boolean(sensorData.cooldown.is_in_cooldown),
            remaining_seconds: Number(sensorData.cooldown.remaining_seconds || 0),
            remaining_minutes: Number(sensorData.cooldown.remaining_minutes || 0),
            max_cycles: Number(sensorData.cooldown.max_cycles ?? 1),
            current_cycles: Number(sensorData.cooldown.current_cycles ?? 0),
          });
        }

        // Jangan menimpa state jika user baru saja klik tombol dalam 3.5 detik (mencegah flickering)
        if (sensorData.control && !isRecentlyUpdated) {
          setControlState((prev) => ({ ...prev, ...sensorData.control }));
        }

        if (sensorData.data) {
          const d = sensorData.data as Record<string, unknown>;
          const parsedPpmStabil = Number(d.ppm_stabil ?? d.ppmStabil ?? d.ppm_filtered);
          const parsedPpmRaw = Number(d.ppm_raw ?? d.ppmRaw);
          const parsedVoltage = Number(d.tegangan ?? d.teganganRaw ?? d.voltage);
          const parsedAdcRaw = Number(d.adc_raw ?? d.adcRaw);
          const nextPumpActive = Boolean(
            d.status_pompa ?? d.pompaAktif ?? d.pump_state ?? false
          );

          setTelemetry((prev) => ({
            ...prev,
            ppmStabil: Number.isFinite(parsedPpmStabil) ? parsedPpmStabil : prev.ppmStabil,
            ppmRaw: Number.isFinite(parsedPpmRaw) ? parsedPpmRaw : prev.ppmRaw,
            voltage: Number.isFinite(parsedVoltage) ? parsedVoltage : prev.voltage,
            adcRaw: Number.isFinite(parsedAdcRaw) ? parsedAdcRaw : prev.adcRaw,
            actualPumpActive: isRecentlyUpdated ? prev.actualPumpActive : nextPumpActive,
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

      if (controlData?.success && controlData.control && !isRecentlyUpdated) {
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
  }, []);

  // Polling loop adaptif: 2 detik saat mode manual agar sat-set seketika, 3.5 detik saat auto
  useEffect(() => {
    syncAllData(false);
    const intervalMs = controlState.pump_mode === 'manual' ? 2000 : 3500;
    const interval = setInterval(() => {
      syncAllData(false);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [syncAllData, controlState.pump_mode]);

  // Realtime countdown local ticker: mengurangi 1 detik per detik agar timer countdown berjalan mulus (misal: 1m 22s -> 1m 21s)
  useEffect(() => {
    if (!cooldown.is_in_cooldown || cooldown.remaining_seconds <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (!prev.is_in_cooldown || prev.remaining_seconds <= 1) {
          return {
            ...prev,
            is_in_cooldown: false,
            remaining_seconds: 0,
            remaining_minutes: 0,
            current_cycles: 0, // Reset tampilan siklus ke 0 saat timer cooldown selesai
          };
        }
        const nextSec = prev.remaining_seconds - 1;
        return {
          ...prev,
          is_in_cooldown: true,
          remaining_seconds: nextSec,
          remaining_minutes: Math.ceil(nextSec / 60),
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown.is_in_cooldown, cooldown.remaining_seconds > 0]);

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
    cooldown_enabled?: boolean;
    cooldown_max_cycles?: number;
    reset_cooldown?: boolean;
  }) => {
    lastControlUpdateRef.current = Date.now();

    const optimisticState: SystemControl = {
      ...controlState,
      ...(params.mode !== undefined && { pump_mode: params.mode }),
      ...(params.state !== undefined && { pump_state: params.state }),
      ...(params.target_ppm_min !== undefined && { target_ppm_min: params.target_ppm_min }),
      ...(params.target_ppm_max !== undefined && { target_ppm_max: params.target_ppm_max }),
      ...(params.cooldown_minutes !== undefined && { cooldown_minutes: params.cooldown_minutes }),
      ...(params.cooldown_enabled !== undefined && { cooldown_enabled: params.cooldown_enabled }),
      ...(params.cooldown_max_cycles !== undefined && { cooldown_max_cycles: params.cooldown_max_cycles }),
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
        if (data.control.cooldown_enabled !== undefined) {
          setCooldown((prev) => ({
            ...prev,
            enabled: Boolean(data.control.cooldown_enabled !== false),
            max_cycles: Number(data.control.cooldown_max_cycles ?? prev.max_cycles ?? 1),
            current_cycles: Number(data.control.cycle_count ?? prev.current_cycles ?? 0),
          }));
        }
        return data.control;
      } else {
        throw new Error(data.error || 'Gagal memperbarui konfigurasi');
      }
    } catch (err) {
      console.error('handleUpdateControl error:', err);
      throw err;
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
        relay: Boolean(params.state) ? 'MENYALA' : 'MATI',
        is_active: Boolean(params.state),
      };

      setLogs((prevLogs) => [newLogItem, ...prevLogs]);
    }
  };

  const isManualMode = controlState.pump_mode === 'manual';
  const isPumpActive = isManualMode ? Boolean(controlState.pump_state) : telemetry.actualPumpActive;

  // Pencegahan jika user menutup/reload tab browser saat pompa manual sedang aktif ON
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isManualMode && isPumpActive) {
        e.preventDefault();
        e.returnValue = 'Pompa masih menyala dalam mode manual!';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isManualMode, isPumpActive]);

  const getTargetTabName = (tab: 'dashboard' | 'control' | 'history' | null) => {
    if (tab === 'dashboard') return 'Ringkasan Nutrisi Air';
    if (tab === 'history') return 'Riwayat Data Sensor';
    return 'Pengaturan Pompa';
  };

  const handleSelectTab = (tab: 'dashboard' | 'control' | 'history') => {
    setMobileMenuOpen(false);

    // Jika sistem saat ini dalam posisi MANUAL dan user berpindah ke tab lain (dashboard atau history):
    if (tab !== 'control' && isManualMode) {
      setPendingTargetTab(tab);
      setShowManualAlert(true);
      return;
    }

    setActiveTab(tab);
  };

  const handleCancelManualAlert = () => {
    setShowManualAlert(false);
    setPendingTargetTab(null);
    setActiveTab('control'); // Tetap di tab kontrol
  };

  const handleConfirmLeaveManual = () => {
    if (pendingTargetTab) {
      setActiveTab(pendingTargetTab);
    }
    setShowManualAlert(false);
    setPendingTargetTab(null);
  };

  const handleSwitchToAutoAndLeave = async () => {
    setIsSwitchingAuto(true);
    try {
      // Matikan saklar dan ubah mode ke otomatis demi keselamatan tanaman & alat
      await handleUpdateControl({
        mode: 'auto',
        state: false,
      });
      if (pendingTargetTab) {
        setActiveTab(pendingTargetTab);
      }
      setShowManualAlert(false);
      setPendingTargetTab(null);
    } catch (err: any) {
      alert(`Gagal mengamankan sistem: ${err?.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSwitchingAuto(false);
    }
  };

  const rawDelta = (telemetry.ppmStabil - telemetry.ppmRaw).toFixed(1);

  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-950 font-sans">
      {/* Pop-up Alert Peringatan Keselamatan jika Meninggalkan Mode Manual */}
      <ManualSafetyAlertModal
        isOpen={showManualAlert}
        isPumpOn={isPumpActive}
        targetTabName={getTargetTabName(pendingTargetTab)}
        onCancel={handleCancelManualAlert}
        onConfirmLeave={handleConfirmLeaveManual}
        onSwitchToAutoAndLeave={handleSwitchToAutoAndLeave}
        isProcessing={isSwitchingAuto}
      />

      {/* Pop-up Menu Navigasi (Muncul saat tombol MENU diklik, tidak memenuhi layar) */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        isOnline={telemetry.isOnline}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-8 sm:pb-12">
        {/* Header Atas Responsif & Rapi untuk HP (Android & iOS) maupun Desktop */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-zinc-200 bg-white/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3.5 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Tombol Buka Menu Pop-up (Tampil di HP & Desktop) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-emerald-700/30 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 active:scale-95 transition-all cursor-pointer shrink-0 font-extrabold text-xs shadow-2xs"
            >
              <Menu className="h-4 w-4 text-emerald-800" />
              <span className="font-mono text-xs font-black tracking-tight">MENU</span>
            </button>

            {/* Logo Brand */}
            <img
              src={LOGO_SRC}
              alt="Logo Bagas Hidroponik"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-cover border border-zinc-300 shadow-2xs shrink-0"
            />

            {/* Judul & Nama Layar Aktif */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-extrabold text-xs sm:text-sm text-zinc-950 truncate">
                  Bagas Hidroponik
                </span>
                <span className="text-zinc-300 hidden sm:inline font-bold">|</span>
                <span className="hidden sm:inline-block text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 truncate">
                  {activeTab === 'dashboard' && 'Ringkasan Nutrisi'}
                  {activeTab === 'control' && 'Pengaturan Pompa'}
                  {activeTab === 'history' && 'Riwayat Sensor'}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-zinc-500 font-medium truncate block">
                {activeTab === 'dashboard' && 'Kadar nutrisi & kondisi pompa'}
                {activeTab === 'control' && 'Saklar listrik & batas takaran'}
                {activeTab === 'history' && 'Catatan rekam riwayat sensor'}
              </p>
            </div>
          </div>

          {/* Sisi Kanan: Status Koneksi & Tombol Refresh */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {cooldown.enabled !== false ? (
              <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded-md border ${
                cooldown.is_in_cooldown
                  ? 'text-amber-900 bg-amber-50 border-amber-300 animate-pulse'
                  : 'text-zinc-600 bg-zinc-50 border-zinc-200'
              }`}>
                {cooldown.is_in_cooldown ? (
                  <>
                    <span>⏳ JEDA:</span>
                    <span>
                      {Math.floor(cooldown.remaining_seconds / 60)}m {(cooldown.remaining_seconds % 60).toString().padStart(2, '0')}s
                    </span>
                  </>
                ) : (
                  <span>⏱️ JEDA SIAP</span>
                )}
              </span>
            ) : (
              <span className="hidden sm:inline-flex text-[10px] font-mono font-bold text-sky-800 bg-sky-50 px-2 py-1 rounded-md border border-sky-200">
                BEBAS JEDA
              </span>
            )}

            {/* Indikator Online/Offline Responsif */}
            <div className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg border text-[10px] sm:text-xs font-mono font-bold ${
              telemetry.isOnline 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                telemetry.isOnline ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'
              }`} />
              <span className="hidden sm:inline">{telemetry.isOnline ? 'ALAT TERHUBUNG' : 'TERPUTUS'}</span>
              <span className="sm:hidden">{telemetry.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            {/* Tombol Refresh Data */}
            <button
              onClick={() => syncAllData(true)}
              disabled={isRefreshing}
              aria-label="Segarkan data sensor"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-bold text-zinc-900 shadow-2xs hover:bg-zinc-50 active:scale-95 disabled:opacity-60 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Memuat...' : 'Perbarui'}</span>
            </button>
          </div>
        </header>

        {/* Banner Peringatan jika Sedang Berada di Luar Tab Kontrol dalam Mode Manual */}
        {isManualMode && (
          <div className={`px-3 sm:px-6 py-2 text-xs font-mono font-bold flex flex-wrap items-center justify-between gap-2 border-b shadow-2xs transition-colors duration-200 ${
            isPumpActive 
              ? 'bg-rose-100/90 text-rose-950 border-rose-400' 
              : 'bg-amber-50 text-amber-950 border-amber-300'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                isPumpActive ? 'bg-rose-600 animate-ping' : 'bg-amber-500'
              }`} />
              <span className="truncate">
                {isPumpActive 
                  ? '⚠️ BAHAYA: POMPA MENYALA DALAM MODE MANUAL (ON)' 
                  : '⚠️ PERINGATAN: SAKLAR POMPA DALAM MODE MANUAL'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleUpdateControl({ mode: 'auto', state: false })}
                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold cursor-pointer shadow-xs transition"
              >
                Ubah ke Otomatis
              </button>
            </div>
          </div>
        )}

        {/* Konten Utama */}
        <div className="p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-5 max-w-5xl w-full mx-auto">
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-5">
                {/* Kartu 1: Kadar Nutrisi Air */}
                <div className="rounded-2xl border border-zinc-300 bg-white p-3.5 sm:p-5 shadow-xs hover:shadow-sm transition">
                  <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 border-b border-zinc-200 pb-2.5 sm:pb-3">
                    <span className="font-mono text-[11px] sm:text-xs font-black tracking-wider text-zinc-900 flex items-center gap-1.5">
                      <Droplets className="h-4 w-4 text-emerald-700" />
                      KADAR NUTRISI AIR (TDS)
                    </span>
                    
                    {/* Status Pompa & Jatah/Cooldown di atasnya (Kecil Rapi) */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1 font-mono text-[9px] font-bold">
                        {cooldown.enabled !== false ? (
                          <>
                            <span className={`px-1.5 py-0.5 rounded border ${
                              cooldown.is_in_cooldown 
                                ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse' 
                                : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                            }`}>
                              {cooldown.is_in_cooldown 
                                ? `⏳ ${Math.floor(cooldown.remaining_seconds / 60)}m ${(cooldown.remaining_seconds % 60).toString().padStart(2, '0')}s` 
                                : '⏱️ JEDA SIAP'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              NYALA: {cooldown.current_cycles ?? 0}/{cooldown.max_cycles ?? 1}x
                            </span>
                          </>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                            BEBAS JEDA
                          </span>
                        )}
                      </div>

                      <span className={`shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-bold border transition-colors duration-300 ${
                        (controlState.pump_mode === 'manual' ? Boolean(controlState.pump_state) : telemetry.actualPumpActive)
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-400'
                          : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                      }`}>
                        {(controlState.pump_mode === 'manual' ? Boolean(controlState.pump_state) : telemetry.actualPumpActive)
                          ? 'POMPA MENYALA'
                          : 'POMPA STANDBY'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-black text-zinc-950">
                        {telemetry.ppmStabil.toFixed(1)}
                      </span>
                      <span className="ml-1.5 sm:ml-2 font-mono text-xs sm:text-sm font-bold text-zinc-800">PPM</span>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="text-zinc-700 block text-[10px] font-bold">DATA MENTAH</span>
                      <span className="font-extrabold text-amber-800">{telemetry.ppmRaw.toFixed(1)} ppm</span>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-zinc-200 flex flex-col xs:flex-row xs:justify-between gap-1 font-mono text-xs text-zinc-900 font-bold">
                    <span>
                      STATUS BACAAN: <strong className="text-emerald-700">Stabil (Tersaring)</strong>
                    </span>
                    <span>
                      SELISIH FILTER: <strong className="text-zinc-950">{rawDelta} ppm</strong>
                    </span>
                  </div>
                </div>

                {/* Kartu 2: Sinyal Listrik Sensor & Suhu Air */}
                <div className="rounded-2xl border border-zinc-300 bg-white p-3.5 sm:p-5 shadow-xs hover:shadow-sm transition">
                  <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 border-b border-zinc-200 pb-2.5 sm:pb-3">
                    <span className="font-mono text-[11px] sm:text-xs font-black tracking-wider text-zinc-900 flex items-center gap-1.5">
                      <Cpu className="h-4 w-4 shrink-0 text-sky-800" />
                      SINYAL LISTRIK SENSOR &amp; SUHU
                    </span>
                    <span className="shrink-0 rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-900 border border-emerald-300">
                      SENSOR AKTIF
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-black text-zinc-950">
                        {telemetry.voltage.toFixed(3)}
                      </span>
                      <span className="ml-1.5 sm:ml-2 font-mono text-xs sm:text-sm font-bold text-zinc-800">VOLT</span>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="text-zinc-700 block text-[10px] font-bold">BACAAN SENSOR</span>
                      <span className="font-extrabold text-zinc-950">{telemetry.adcRaw} / 4095</span>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-zinc-200 flex flex-col xs:flex-row xs:justify-between gap-1 font-mono text-xs text-zinc-900 font-bold">
                    <span>
                      SUHU AIR ACUAN: <strong className="text-zinc-950">{telemetry.temperature.toFixed(1)} &deg;C</strong>
                    </span>
                    <span>
                      KONDISI LISTRIK: <strong className="text-emerald-700">Normal &amp; Terkalibrasi</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Kartu 3: Grafik Perjalanan Nutrisi Air */}
              <div className="rounded-2xl border border-zinc-300 bg-white p-3.5 sm:p-5 lg:p-6 shadow-xs">
                <div className="mb-3 sm:mb-4">
                  <h2 className="font-mono text-xs font-black tracking-wider text-zinc-950 uppercase">
                    GRAFIK PERJALANAN NUTRISI AIR
                  </h2>
                  <p className="font-mono text-xs text-zinc-800 mt-0.5 font-bold">
                    Riwayat pergerakan nutrisi &bull; {logs.length} data pemantauan terakhir
                  </p>
                </div>
                <SensorChart
                  logs={logs}
                  targetMin={Number(controlState.target_ppm_min ?? 560)}
                  targetMax={Number(controlState.target_ppm_max ?? 840)}
                />
              </div>
            </>
          )}

          {/* TAB 2: PENGATURAN & SAKLAR POMPA */}
          {activeTab === 'control' && (
            <div className="space-y-4 max-w-4xl w-full mx-auto">
              <PumpControlPanel
                control={controlState}
                actualPumpActive={telemetry.actualPumpActive}
                cooldownInfo={cooldown}
                onUpdateControl={handleUpdateControl}
              />
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
                      STATUS PENYIMPANAN DATABASE
                    </h2>
                    <p className="text-xs text-zinc-300 mt-0.5 font-semibold">
                      Pusat Rekam Riwayat Data Sensor Hidroponik (Cloud Database)
                    </p>
                  </div>
                  <button
                    onClick={handleInitDatabase}
                    disabled={isInitializingDb}
                    className="self-start sm:self-auto rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-100 hover:bg-zinc-700 disabled:opacity-60 transition cursor-pointer"
                  >
                    {isInitializingDb ? 'MEMPROSES...' : 'PERIKSA TABEL'}
                  </button>
                </div>
                <p className="text-xs text-zinc-300 border-t border-zinc-800/80 pt-3 font-semibold">
                  Tabel Tersedia: <span className="text-emerald-400 font-bold">sensor_logs (Riwayat)</span> &bull;{' '}
                  <span className="text-emerald-400 font-bold">system_control (Aturan Kontrol)</span>.
                </p>
                {dbInitMessage && (
                  <p className="text-xs text-emerald-300 mt-2 font-semibold">
                    {dbInitMessage}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-[#121418] p-4 sm:p-6 text-zinc-100 shadow-lg">
                <div className="mb-4">
                  <h2 className="text-xs font-bold tracking-wider text-white uppercase">RIWAYAT REKAM DATA SENSOR &amp; POMPA</h2>
                  <p className="text-xs text-zinc-300 mt-0.5 font-semibold">
                    Catatan riwayat kondisi nutrisi dan pompa (data terbaru di atas)
                  </p>
                  <p className="text-[10px] text-zinc-400 sm:hidden block mt-1 font-sans">
                    💡 Geser ke samping untuk melihat kolom lainnya &rarr;
                  </p>
                </div>

                <div className="overflow-x-auto max-h-96 rounded-xl border border-zinc-800 bg-[#0d0f12] touch-pan-x">
                  <table className="w-full min-w-160 text-left text-xs">
                    <thead className="sticky top-0 bg-[#121418] border-b border-zinc-800 text-zinc-300 font-bold">
                      <tr>
                        <th className="p-3 whitespace-nowrap">NO</th>
                        <th className="p-3 whitespace-nowrap">WAKTU</th>
                        <th className="p-3 whitespace-nowrap">BACAAN SENSOR</th>
                        <th className="p-3 whitespace-nowrap">TEGANGAN</th>
                        <th className="p-3 whitespace-nowrap">PPM MENTAH</th>
                        <th className="p-3 whitespace-nowrap">PPM STABIL</th>
                        <th className="p-3 whitespace-nowrap">STATUS POMPA</th>
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
                                className={`inline-block h-2 w-2 rounded-full transition-colors duration-300 ${
                                  log.is_active ? 'bg-emerald-400' : 'bg-zinc-400'
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
    </div>
  );
}