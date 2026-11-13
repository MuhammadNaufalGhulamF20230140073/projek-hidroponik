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
import { Database } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'control' | 'history'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [dbInitMsg, setDbInitMsg] = useState('');

  // State data
  const [latestLog, setLatestLog] = useState<SensorLog>({
    adc_raw: 1460,
    tegangan: 1.176,
    ppm_raw: 635.0,
    ppm_stabil: 630.5,
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
  });

  const [isDbActive, setIsDbActive] = useState(false);
  const [isOnline, setIsOnline] = useState(false); // Default: Offline (Merah) sampai terbukti ada data masuk

  // Fetch telemetry & history
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch sensor terkini & kontrol
      const resSensor = await fetch('/api/sensor');
      if (resSensor.ok) {
        const json = await resSensor.json();
        if (json.data) {
          setLatestLog(json.data);
        }
        // Gunakan heartbeat server (ESP32 kirim tiap 5s; jika >15s tidak ada data, OFFLINE/MERAH)
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
      } else {
        setIsOnline(false);
      }

      // Fetch history untuk grafik
      const resHist = await fetch('/api/history?limit=20');
      if (resHist.ok) {
        const jsonHist = await resHist.json();
        if (jsonHist.data) {
          setHistory(jsonHist.data);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat data:', err);
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling berkala setiap 5 detik
  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Handle update kontrol pompa dari web
  const handleUpdateControl = async (params: {
    mode?: 'auto' | 'manual';
    state?: boolean;
    target_ppm_min?: number;
    target_ppm_max?: number;
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
      console.error('Gagal memperbarui kontrol:', err);
    }
  };

  // Inisialisasi DB Vercel Postgres dengan 1-klik
  const handleInitDb = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/init-db');
      const data = await res.json();
      setDbInitMsg(data.message || 'Database siap');
      setIsDbActive(data.status === 'success');
      fetchData();
    } catch (err: any) {
      setDbInitMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/60 p-4 font-sans text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-50 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header Bersih & Navigasi Tab */}
        <DashboardHeader
          lastUpdated={latestLog?.created_at}
          isOnline={isOnline}
          isDbActive={isDbActive}
          isRefreshing={loading}
          onRefresh={fetchData}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* TAB 1: DASHBOARD MONITORING */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Banner Status Nutrisi Hidroponik */}
            <StatusBanner ppm={latestLog.ppm_stabil} />

            {/* Grid Kartu Metrik Utama */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <TDSMetricCard
                ppmStabil={latestLog.ppm_stabil}
                ppmRaw={latestLog.ppm_raw}
              />
              <VoltageCard
                tegangan={latestLog.tegangan}
                adcRaw={latestLog.adc_raw}
              />
            </div>

            {/* Quick Status Pompa & Mode */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <Card>
                <span className="text-xs text-zinc-500">Status Relay Pompa</span>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xl font-bold">
                    {latestLog.status_pompa ? 'AKTIF (ON)' : 'MATI (OFF)'}
                  </span>
                  <Badge variant={latestLog.status_pompa ? 'success' : 'default'} dot={latestLog.status_pompa}>
                    Pin 23
                  </Badge>
                </div>
              </Card>

              <Card>
                <span className="text-xs text-zinc-500">Mode Kontrol</span>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xl font-bold uppercase">{control.pump_mode}</span>
                  <Badge variant="info">
                    {control.pump_mode === 'auto' ? 'Otomatis (Threshold PPM)' : 'Manual (Web Override)'}
                  </Badge>
                </div>
              </Card>

              <Card>
                <span className="text-xs text-zinc-500">Rentang Target Nutrisi (Threshold)</span>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xl font-bold">
                    {control.target_ppm_min || 560} - {control.target_ppm_max || 840}
                  </span>
                  <span className="text-xs text-zinc-400">PPM Target</span>
                </div>
              </Card>
            </div>

            {/* Visualisasi Grafik Riwayat Tren PPM */}
            <SensorChart data={history.length > 0 ? history : [latestLog]} />

            {/* Cuplikan 5 Data Sensor Terakhir (Paling Baru di Atas) */}
            <Card
              title="5 Data Sensor Terkini"
              subtitle="Data paling baru yang diterima dari ESP32 (Urut dari yang paling atas)"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                    <tr>
                      <th className="py-2 px-3">No</th>
                      <th className="py-2 px-3">Waktu</th>
                      <th className="py-2 px-3">ADC</th>
                      <th className="py-2 px-3">Tegangan</th>
                      <th className="py-2 px-3">PPM Stabil</th>
                      <th className="py-2 px-3">Pompa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {[...(history.length > 0 ? history : [latestLog])]
                      .reverse()
                      .slice(0, 5)
                      .map((log, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 ${
                            idx === 0 ? 'bg-emerald-500/5 font-semibold' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-mono text-zinc-400">
                            #{log.id ?? (history.length - idx)}
                            {idx === 0 && (
                              <span className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Paling Baru" />
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-zinc-500">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="py-2 px-3 font-mono">{log.adc_raw}</td>
                          <td className="py-2 px-3 font-mono">{log.tegangan.toFixed(3)} V</td>
                          <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                            {log.ppm_stabil.toFixed(1)} ppm
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant={log.status_pompa ? 'success' : 'default'}>
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

        {/* TAB 2: KONTROL POMPA & AKTUATOR */}
        {activeTab === 'control' && (
          <div className="space-y-6">
            <PumpControlPanel
              control={control}
              actualPumpActive={latestLog.status_pompa}
              onUpdateControl={handleUpdateControl}
            />
            <CalibrationInfo />
          </div>
        )}

        {/* TAB 3: LOG RIWAYAT & KALIBRASI */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Vercel Postgres Quick Initializer */}
            <Card
              title="Koneksi & Setup Vercel Postgres"
              subtitle="Pastikan database Vercel Postgres sudah dikaitkan di Vercel Dashboard"
              action={
                <Button size="sm" onClick={handleInitDb} loading={loading}>
                  <Database className="h-3.5 w-3.5" />
                  Inisialisasi Tabel DB
                </Button>
              }
            >
              <div className="text-xs text-zinc-500">
                <p>
                  Tabel <code>sensor_logs</code> dan <code>system_control</code> akan dibuat secara otomatis di Vercel Postgres / Neon.
                </p>
                {dbInitMsg && (
                  <p className="mt-2 font-mono text-emerald-600 dark:text-emerald-400">
                    {dbInitMsg}
                  </p>
                )}
              </div>
            </Card>

            {/* Tabel Log Riwayat (Data Terbaru di Atas) */}
            <Card
              title="Tabel Log Telemetri ESP32"
              subtitle="Data pembacaan realtime (Data terbaru di urutan paling atas)"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                    <tr>
                      <th className="py-2.5 px-3">No / ID</th>
                      <th className="py-2.5 px-3">Waktu</th>
                      <th className="py-2.5 px-3">ADC RAW</th>
                      <th className="py-2.5 px-3">Tegangan</th>
                      <th className="py-2.5 px-3">PPM RAW</th>
                      <th className="py-2.5 px-3">PPM Stabil</th>
                      <th className="py-2.5 px-3">Status Pompa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {[...(history.length > 0 ? history : [latestLog])].reverse().map((log, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 ${
                          idx === 0 ? 'bg-emerald-500/5 font-medium' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-mono text-zinc-400">
                          <span className="flex items-center gap-1.5">
                            #{log.id ?? (history.length - idx)}
                            {idx === 0 && (
                              <Badge variant="success" className="text-[10px] py-0 px-1.5">
                                Terbaru
                              </Badge>
                            )}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-zinc-500">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="py-2 px-3 font-mono">{log.adc_raw}</td>
                        <td className="py-2 px-3 font-mono">{log.tegangan.toFixed(3)} V</td>
                        <td className="py-2 px-3 font-mono">{log.ppm_raw.toFixed(1)}</td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {log.ppm_stabil.toFixed(1)}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant={log.status_pompa ? 'success' : 'default'}>
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

        {/* Footer */}
        <footer className="mt-12 border-t border-zinc-200/80 pt-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
          Hydroponic Monitoring System • Next.js & Vercel Postgres Serverless • ESP32 IoT
        </footer>
      </div>
    </div>
  );
}
