'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { TDSMetricCard } from '@/components/dashboard/TDSMetricCard';
import { VoltageCard } from '@/components/dashboard/VoltageCard';
import { StatusBanner } from '@/components/dashboard/StatusBanner';
import { SensorChart } from '@/components/dashboard/SensorChart';
import { PumpControlPanel } from '@/components/control/PumpControlPanel';
import { CalibrationInfo } from '@/components/control/CalibrationInfo';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SensorLog, SystemControl } from '@/lib/types/hidroponik';
import { formatDateTime } from '@/lib/utils/hydroCalc';
import { Database, Terminal, Shield, Clock } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'control' | 'history'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [dbInitMsg, setDbInitMsg] = useState('');

  // State data
  const [latestLog, setLatestLog] = useState<SensorLog>({
    adc_raw: 0,
    tegangan: 0.0,
    ppm_raw: 68.5,
    ppm_stabil: 68.5,
    status_pompa: false,
    created_at: '',
  });

  const [history, setHistory] = useState<SensorLog[]>([]);
  const [control, setControl] = useState<SystemControl>({
    id: 'default',
    pump_mode: 'auto',
    pump_state: false,
    target_ppm_min: 560.0,
    target_ppm_max: 840.0,
    cooldown_minutes: 60,
  });

  const [cooldownInfo, setCooldownInfo] = useState<{
    is_in_cooldown: boolean;
    remaining_seconds: number;
    remaining_minutes: number;
  }>({
    is_in_cooldown: false,
    remaining_seconds: 0,
    remaining_minutes: 0,
  });

  const [isDbActive, setIsDbActive] = useState(false);
  const [isOnline, setIsOnline] = useState(false); // Default: Offline (Merah)

  // Fetch telemetry & history
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const resSensor = await fetch('/api/sensor');
      if (resSensor.ok) {
        const json = await resSensor.json();
        if (json.data) {
          setLatestLog(json.data);
        }
        // Heartbeat verification (ESP32 sends every 5s; if >15s without packets -> OFFLINE)
        if (json.is_online !== undefined) {
          setIsOnline(Boolean(json.is_online));
        } else if (json.data?.created_at) {
          const logTime = new Date(json.data.created_at).getTime();
          const diff = Math.round((Date.now() - logTime) / 1000);
          setIsOnline(diff >= 0 && diff <= 15);
        } else {
          setIsOnline(false);
        }
        if (json.control) {
          setControl(json.control);
        }
        if (json.cooldown) {
          setCooldownInfo(json.cooldown);
        }
      } else {
        setIsOnline(false);
      }

      const resHist = await fetch('/api/history?limit=30');
      if (resHist.ok) {
        const jsonHist = await resHist.json();
        if (jsonHist.data) {
          setHistory(jsonHist.data);
          setIsDbActive(true);
        }
      }
    } catch (err) {
      console.warn('Network sync error:', err);
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling loop
  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Handle control update
  const handleUpdateControl = async (params: {
    mode?: 'auto' | 'manual';
    state?: boolean;
    target_ppm_min?: number;
    target_ppm_max?: number;
    cooldown_minutes?: number;
  }) => {
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const json = await res.json();
        setControl(json.control);
      }
    } catch (err) {
      console.error('Failed to update control:', err);
    }
  };

  // Re-run DB check
  const handleInitDb = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/init-db');
      const data = await res.json();
      setDbInitMsg(data.message || 'Database Ready');
      setIsDbActive(data.status === 'success');
      fetchData();
    } catch (err: any) {
      setDbInitMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-4 font-sans text-zinc-900 antialiased dark:bg-[#090a0b] dark:text-zinc-100 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Top Header Command Bar */}
        <DashboardHeader
          lastUpdated={latestLog?.created_at}
          isOnline={isOnline}
          isDbActive={isDbActive}
          isRefreshing={loading}
          onRefresh={fetchData}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* TAB 1: TELEMETRY OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5">
            {/* Minimalist Status Strip */}
            <StatusBanner ppm={latestLog.ppm_stabil} />

            {/* Core KPI Telemetry Deck */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TDSMetricCard
                ppmStabil={latestLog.ppm_stabil}
                ppmRaw={latestLog.ppm_raw}
              />
              <VoltageCard
                tegangan={latestLog.tegangan}
                adcRaw={latestLog.adc_raw}
              />
            </div>

            {/* Actuator & Threshold Status Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 font-mono">
              <Card>
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  RELAY ACTUATOR [GPIO 23]
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-bold tracking-tight">
                    {latestLog.status_pompa ? 'ACTIVE (PUMP ON)' : 'IDLE (PUMP OFF)'}
                  </span>
                  <Badge variant={latestLog.status_pompa ? 'danger' : 'neutral'} dot={latestLog.status_pompa}>
                    {latestLog.status_pompa ? 'LOW' : 'HIGH'}
                  </Badge>
                </div>
              </Card>

              <Card>
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  CONTROL PARADIGM
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-bold tracking-tight uppercase">
                    {control.pump_mode}
                  </span>
                  <Badge variant={control.pump_mode === 'auto' ? 'success' : 'neutral'}>
                    {control.pump_mode === 'auto' ? 'CLOSED-LOOP' : 'MANUAL'}
                  </Badge>
                </div>
              </Card>

              <Card>
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  TARGET WINDOW & COOLDOWN
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-bold tracking-tight">
                    {control.target_ppm_min || 560} &ndash; {control.target_ppm_max || 840}{' '}
                    <span className="text-xs font-normal text-zinc-400">PPM</span>
                  </span>
                  <Badge variant={cooldownInfo.is_in_cooldown ? 'warning' : 'neutral'}>
                    {cooldownInfo.is_in_cooldown
                      ? `REST: ~${cooldownInfo.remaining_minutes}m`
                      : `${control.cooldown_minutes || 60}m CD`}
                  </Badge>
                </div>
              </Card>
            </div>

            {/* Rolling Time-Series Chart */}
            <SensorChart
              data={history.length > 0 ? history : [latestLog]}
              targetMin={control.target_ppm_min || 560}
              targetMax={control.target_ppm_max || 840}
            />

            {/* Recent Telemetry Stream (Latest on top) */}
            <Card
              title="RECENT INCOMING TELEMETRY STREAM"
              subtitle="Latest 5 sample packets received via HTTPS &bull; Newest on top"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-zinc-200 bg-zinc-50/80 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                    <tr>
                      <th className="py-2 px-3">PACKET_ID</th>
                      <th className="py-2 px-3">TIMESTAMP</th>
                      <th className="py-2 px-3">ADC_RAW</th>
                      <th className="py-2 px-3">VOLTAGE</th>
                      <th className="py-2 px-3">PPM_RAW</th>
                      <th className="py-2 px-3">PPM_FILTERED</th>
                      <th className="py-2 px-3">RELAY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                    {[...(history.length > 0 ? history : [latestLog])]
                      .reverse()
                      .slice(0, 5)
                      .map((log, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${
                            idx === 0 ? 'bg-emerald-500/5 font-semibold text-zinc-950 dark:text-zinc-50' : 'text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          <td className="py-2 px-3">
                            <span className="flex items-center gap-1.5">
                              #{log.id ?? (history.length - idx)}
                              {idx === 0 && (
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              )}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-zinc-500">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="py-2 px-3">{log.adc_raw}</td>
                          <td className="py-2 px-3">{log.tegangan.toFixed(3)} V</td>
                          <td className="py-2 px-3">{log.ppm_raw.toFixed(1)}</td>
                          <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                            {log.ppm_stabil.toFixed(1)}
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant={log.status_pompa ? 'danger' : 'neutral'}>
                              {log.status_pompa ? 'ON' : 'OFF'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: ACTUATOR & DOSING ENGINE */}
        {activeTab === 'control' && (
          <div className="space-y-5">
            <PumpControlPanel
              control={control}
              actualPumpActive={latestLog.status_pompa}
              cooldownInfo={cooldownInfo}
              onUpdateControl={handleUpdateControl}
            />
            <CalibrationInfo />
          </div>
        )}

        {/* TAB 3: DATABASE LOG & CALIBRATION */}
        {activeTab === 'history' && (
          <div className="space-y-5">
            {/* Database Diagnostics */}
            <Card
              title="DATABASE STORAGE CONNECTOR"
              subtitle="Vercel Postgres (Neon Serverless Pool)"
              action={
                <Button size="sm" onClick={handleInitDb} loading={loading} className="font-mono text-xs h-7">
                  <Database className="h-3 w-3" />
                  INIT SCHEMA
                </Button>
              }
            >
              <div className="text-xs font-mono text-zinc-500">
                <p>
                  Schema Tables: <code>sensor_logs</code> (telemetry time-series) &bull;{' '}
                  <code>system_control</code> (actuator setpoints & cooldown timers).
                </p>
                {dbInitMsg && (
                  <p className="mt-2 font-mono text-emerald-600 dark:text-emerald-400">
                    &gt; {dbInitMsg}
                  </p>
                )}
              </div>
            </Card>

            {/* Complete Historical Table */}
            <Card
              title="TELEMETRY ARCHIVE (POSTGRES LOGS)"
              subtitle="Chronological audit trail of all sensor transmissions &bull; Newest first"
            >
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/90 dark:text-zinc-400">
                    <tr>
                      <th className="py-2 px-3">ID</th>
                      <th className="py-2 px-3">TIMESTAMP</th>
                      <th className="py-2 px-3">ADC</th>
                      <th className="py-2 px-3">VOLT</th>
                      <th className="py-2 px-3">PPM_RAW</th>
                      <th className="py-2 px-3">PPM_STABIL</th>
                      <th className="py-2 px-3">RELAY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                    {[...(history.length > 0 ? history : [latestLog])].reverse().map((log, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/30 ${
                          idx === 0 ? 'bg-emerald-500/5 font-semibold text-zinc-950 dark:text-zinc-50' : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <td className="py-1.5 px-3">
                          <span className="flex items-center gap-1.5">
                            #{log.id ?? (history.length - idx)}
                            {idx === 0 && (
                              <Badge variant="success" className="text-[9px] py-0 px-1">
                                LATEST
                              </Badge>
                            )}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-zinc-500">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="py-1.5 px-3">{log.adc_raw}</td>
                        <td className="py-1.5 px-3">{log.tegangan.toFixed(3)} V</td>
                        <td className="py-1.5 px-3">{log.ppm_raw.toFixed(1)}</td>
                        <td className="py-1.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                          {log.ppm_stabil.toFixed(1)}
                        </td>
                        <td className="py-1.5 px-3">
                          <Badge variant={log.status_pompa ? 'danger' : 'neutral'}>
                            {log.status_pompa ? 'ON' : 'OFF'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <CalibrationInfo />
          </div>
        )}

        {/* Minimal Engineering Footer */}
        <footer className="border-t border-zinc-200/80 pt-4 text-center font-mono text-[11px] text-zinc-400 dark:border-zinc-800/80">
          HYDRO//LAB &bull; Next.js 16 (Turbopack) &bull; Vercel Serverless &bull; Neon Postgres &bull; ESP32 IoT
        </footer>
      </div>
    </div>
  );
}
