'use client';

import React from 'react';
import { RefreshCw, Wifi, WifiOff, Database, Activity, Terminal } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

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
    <header className="mb-6 border-b border-zinc-200/90 pb-4 dark:border-zinc-800">
      {/* Top Identity & Status Row */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        {/* Brand System Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-900 text-emerald-400 dark:border-zinc-700 dark:bg-zinc-950">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                HYDRO//LAB.OS
              </span>
              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">v2.4-edge</span>
            </div>
            <p className="text-[11px] font-mono text-zinc-500">
              ESP32 GPIO 34 (TDS) • GPIO 23 (Relay) • Vercel Postgres
            </p>
          </div>
        </div>

        {/* Telemetry Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hardware Heartbeat */}
          <Badge
            variant={isOnline ? 'success' : 'danger'}
            dot
            className={!isOnline ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400' : ''}
          >
            {isOnline ? (
              <span className="flex items-center gap-1">
                <Wifi className="h-3 w-3" /> ONLINE (5s ping)
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" /> DISCONNECTED
              </span>
            )}
          </Badge>

          {/* Database link */}
          <Badge variant={isDbActive ? 'info' : 'warning'}>
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              {isDbActive ? 'POSTGRES LIVE' : 'SIMULATOR'}
            </span>
          </Badge>

          {/* Refresh Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            loading={isRefreshing}
            className="h-6.5 text-[11px] font-mono"
            title="Manual Poll"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            SYNC
          </Button>
        </div>
      </div>

      {/* Segmented Tab Navigation (Linear Style) */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 text-xs dark:border-zinc-800 dark:bg-zinc-900/90">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`rounded-md px-3 py-1 font-medium transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Telemetry Overview
          </button>
          <button
            onClick={() => setActiveTab('control')}
            className={`rounded-md px-3 py-1 font-medium transition-all cursor-pointer ${
              activeTab === 'control'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Actuator & Dosing Engine
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded-md px-3 py-1 font-medium transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Database Log & Calibration
          </button>
        </div>

        {lastUpdated && (
          <div className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
            LAST PACKET: <span className="text-zinc-700 dark:text-zinc-300">{lastUpdated.split('T')[1]?.slice(0, 8) || '-'} UTC</span>
          </div>
        )}
      </div>
    </header>
  );
}