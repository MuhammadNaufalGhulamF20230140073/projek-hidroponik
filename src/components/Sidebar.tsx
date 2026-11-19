'use client';

import React, { useEffect } from 'react';
import { X, Droplets, Sliders, History, ChevronRight, CheckCircle2, Wifi, WifiOff } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'dashboard' | 'control' | 'history';
  setActiveTab: (tab: 'dashboard' | 'control' | 'history') => void;
  isOnline?: boolean;
}

const LOGO_SRC = '/Bagas Hidrponik.jpg';

export function Sidebar({ isOpen, onClose, activeTab, setActiveTab, isOnline = true }: SidebarProps) {
  // Tutup menu jika user menekan tombol Escape di keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Kunci scroll body saat pop-up menu terbuka di HP/Desktop agar tidak bergeser
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const menuItems = [
    {
      id: 'dashboard' as const,
      label: 'Ringkasan Nutrisi Air',
      desc: 'Pantau kadar TDS, voltase sensor & pompa',
      badge: 'MONITORING',
      icon: <Droplets className="h-5 w-5 shrink-0" />,
    },
    {
      id: 'control' as const,
      label: 'Pengaturan & Saklar Pompa',
      desc: 'Saklar pompa manual & batas takaran',
      badge: 'KONTROL',
      icon: <Sliders className="h-5 w-5 shrink-0" />,
    },
    {
      id: 'history' as const,
      label: 'Riwayat Data & Sensor',
      desc: 'Rekam riwayat log sensor & database',
      badge: 'DATABASE',
      icon: <History className="h-5 w-5 shrink-0" />,
    },
  ];

  const handleItemClick = (id: 'dashboard' | 'control' | 'history') => {
    setActiveTab(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      {/* Backdrop semi-transparan dengan blur (klik luar untuk menutup) */}
      <div
        className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Pop-up Drawer Navigasi (Responsif untuk Android, iOS & Desktop) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi utama"
        className="relative z-10 w-80 max-w-[85vw] bg-[#0A5C36] text-white flex flex-col shadow-2xl p-4 sm:p-5 select-none overflow-y-auto animate-in slide-in-from-left duration-250 ease-out"
      >
        {/* Header Pop-up: Brand & Tombol Tutup */}
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={LOGO_SRC}
              alt="Logo Bagas Hidroponik"
              className="h-10 w-10 rounded-xl object-cover border border-white/30 bg-white/10 shrink-0 shadow-xs"
            />
            <div className="min-w-0">
              <h2 className="font-extrabold text-sm tracking-wide text-white truncate">
                Bagas Hidroponik
              </h2>
              <p className="text-[10px] font-medium text-emerald-200 truncate">
                Sistem Cerdas Nutrisi Tanaman
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Tutup menu navigasi"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/15 transition-all cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status Singkat Alat di Dalam Menu */}
        <div className="my-3 px-3 py-2 rounded-xl bg-emerald-950/40 border border-white/10 flex items-center justify-between text-[11px] font-mono">
          <span className="flex items-center gap-1.5 font-bold text-emerald-200">
            {isOnline ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                Alat Terhubung
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-rose-400" />
                Alat Terputus
              </>
            )}
          </span>
          <span className={`inline-block h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
        </div>

        {/* Label Navigasi */}
        <div className="pt-2 pb-1.5 px-1 font-mono text-[10px] font-black tracking-wider text-emerald-200/90 uppercase">
          PILIH MENU HALAMAN
        </div>

        {/* Daftar 3 Menu Navigasi Utama */}
        <nav className="flex flex-col gap-2.5 flex-1 py-1">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-xl text-left transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  isActive
                    ? 'bg-white text-[#0A5C36] shadow-md font-extrabold ring-2 ring-emerald-300'
                    : 'bg-white/10 text-white hover:bg-white/15 border border-white/10 font-bold'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-100 text-[#0A5C36]' : 'bg-white/15 text-white'}`}>
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs truncate block">{item.label}</span>
                    </div>
                    <span className={`text-[10px] line-clamp-1 block mt-0.5 ${isActive ? 'text-emerald-800 font-semibold' : 'text-emerald-200/90 font-normal'}`}>
                      {item.desc}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 pl-1">
                  {isActive ? (
                    <CheckCircle2 className="h-4 w-4 text-[#0A5C36]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-emerald-300/70" />
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer Pop-up */}
        <div className="pt-4 border-t border-white/15 text-center text-[10px] text-emerald-200/80 font-medium">
          &copy; 2026 Bagas Hidroponik &bull; IoT Dashboard
        </div>
      </aside>
    </div>
  );
}
