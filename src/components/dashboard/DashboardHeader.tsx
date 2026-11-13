'use client';

import React from 'react';
import { Sprout, RefreshCw, Wifi, WifiOff, Database } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatDateTime } from '@/lib/utils/hydroCalc';

interface DashboardHeaderProps {
  lastUpdated?: string;
  isOnline: boolean;
  isDbActive: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  activeTab: 'dashboard' | 'control' | 'history';
  setActiveTab: (tab: 'dashboard' | 'control' | 'history') => void;
}

export function DashboardHeader({
  lastUpdated,
  isOnline,
  isDbActive,
  isRefreshing,
  onRefresh,
  activeTab,
  setActiveTab,
}: DashboardHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200/80 pb-5 dark:border-zinc-800">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-md shadow-emerald-500/20">
            <Sprout className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Hydroponic IoT Center
              </h1>
              <Badge variant="info">Next.js + Vercel</Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Monitoring TDS Meter & Kontrol Pompa Realtime (ESP32)
            </p>
          </div>
        </div>

        {/* Status Indicators & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge
            variant={isOnline ? 'success' : 'danger'}
            dot
            className={
              !isOnline
                ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-sm shadow-rose-500/10 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400 font-semibold'
                : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
            }
          >
            {isOnline ? (
              <span className="flex items-center gap-1.5">
                <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ESP32 Terhubung (Online)
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <WifiOff className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                ESP32 Terputus (Offline)
              </span>
            )}
          </Badge>

          <Badge variant={isDbActive ? 'info' : 'warning'}>
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              {isDbActive ? 'Vercel Postgres' : 'Mode Demo (Mock)'}
            </span>
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            loading={isRefreshing}
            title="Muat ulang data terbaru"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between">
        <nav className="flex space-x-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Dashboard Monitoring
          </button>
          <button
            onClick={() => setActiveTab('control')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'control'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Kontrol Pompa & Aktuator
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Log Riwayat & Kalibrasi
          </button>
        </nav>

        <span className="hidden text-xs text-zinc-400 sm:inline">
          Update: {formatDateTime(lastUpdated)}
        </span>
      </div>
    </header>
  );
}

