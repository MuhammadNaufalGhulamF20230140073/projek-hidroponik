'use client';

import React from 'react';

interface SidebarProps {
  activeTab: 'dashboard' | 'control' | 'history';
  setActiveTab: (tab: 'dashboard' | 'control' | 'history') => void;
}

const LOGO_SRC = '/Bagas Hidrponik.jpg';

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <aside className="w-64 min-h-full bg-[#0A5C36] flex flex-col text-white p-5 select-none shadow-md">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8 px-1">
        <img
          src={LOGO_SRC}
          alt="Logo Bagas Hidroponik"
          className="h-11 w-11 rounded-xl object-cover border border-white/25 bg-white/10 shrink-0 shadow-xs"
        />
        <div className="min-w-0">
          <h1 className="font-bold text-sm tracking-wide text-white truncate">Bagas Hidroponik</h1>
          <p className="text-[10px] font-medium text-emerald-200 truncate">Sistem Cerdas Nutrisi Tanaman</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-1.5 flex-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
            activeTab === 'dashboard'
              ? 'bg-emerald-800 text-white shadow-sm border border-emerald-600/50'
              : 'text-emerald-100 hover:bg-emerald-800/50'
          }`}
        >
          Ringkasan Nutrisi Air
        </button>

        <button
          onClick={() => setActiveTab('control')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
            activeTab === 'control'
              ? 'bg-emerald-800 text-white shadow-sm border border-emerald-600/50'
              : 'text-emerald-100 hover:bg-emerald-800/50'
          }`}
        >
          Pengaturan &amp; Saklar Pompa
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
            activeTab === 'history'
              ? 'bg-emerald-800 text-white shadow-sm border border-emerald-600/50'
              : 'text-emerald-100 hover:bg-emerald-800/50'
          }`}
        >
          Riwayat Data &amp; Sensor
        </button>
      </nav>

      <div className="text-[10px] text-emerald-200/80 text-center pt-4 border-t border-emerald-700/50 font-medium">
        &copy; 2026 Bagas Hidroponik
      </div>
    </aside>
  );
}