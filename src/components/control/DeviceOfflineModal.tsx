'use client';

import React, { useState, useEffect, useRef } from 'react';
import { WifiOff, RefreshCw, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DeviceOfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckConnection: () => Promise<boolean | void> | void;
  isChecking?: boolean;
  isOnline?: boolean;
  lastSeenSeconds?: number;
  onDeviceRestored?: () => void;
}

export function DeviceOfflineModal({
  isOpen,
  onClose,
  onCheckConnection,
  isChecking = false,
  isOnline = false,
  lastSeenSeconds = 9999,
  onDeviceRestored,
}: DeviceOfflineModalProps) {
  const [checkState, setCheckState] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Bersihkan timeout saat modal di-unmount atau ditutup
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Reset state saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      if (isOnline) {
        setCheckState('success');
      } else {
        setCheckState('idle');
      }
    }
  }, [isOpen, isOnline]);

  // Jika isOnline mendadak menjadi true saat modal sedang terbuka (misal dari polling background)
  useEffect(() => {
    if (isOpen && isOnline && checkState !== 'success') {
      setCheckState('success');
      onDeviceRestored?.();
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 1200);
    }
  }, [isOpen, isOnline, checkState, onClose, onDeviceRestored]);

  if (!isOpen) return null;

  const lastSeenText = lastSeenSeconds < 9999 
    ? `${lastSeenSeconds} detik yang lalu` 
    : 'Tidak terdeteksi';

  const isActuallyChecking = isChecking || checkState === 'checking';

  const handleCheck = async () => {
    if (isActuallyChecking) return;
    setCheckState('checking');

    try {
      const result = await onCheckConnection();
      // Bila callback mengembalikan boolean true atau isOnline prop sudah bernilai true
      if (result === true || isOnline) {
        setCheckState('success');
        onDeviceRestored?.();
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setCheckState('failed');
      }
    } catch {
      setCheckState('failed');
    }
  };

  const isSuccess = checkState === 'success';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      {/* Backdrop Gelap Blur */}
      <div 
        className="fixed inset-0 bg-zinc-950/75 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div 
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="offline-alert-title"
        aria-describedby="offline-alert-desc"
        className={`relative z-10 w-full max-w-lg rounded-2xl border-2 bg-white p-5 sm:p-6 shadow-2xl space-y-4 font-sans transition-all duration-300 ${
          isSuccess 
            ? 'border-emerald-500 ring-4 ring-emerald-500/20 animate-in zoom-in-95' 
            : 'border-rose-500 animate-in zoom-in-95'
        }`}
      >
        {/* Tombol Close silang */}
        <button
          onClick={onClose}
          disabled={isActuallyChecking}
          aria-label="Tutup dialog"
          className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {isSuccess ? (
          /* TAMPILAN SUKSES: DEVICE SUDAH NORMAL */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header Sukses */}
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl shrink-0 bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50">
                <CheckCircle2 className="h-7 w-7 text-emerald-600 animate-bounce" />
              </div>

              <div className="min-w-0 pr-6">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded border inline-block mb-1 bg-emerald-50 text-emerald-900 border-emerald-300">
                  ✓ KONEKSI PULIH
                </span>
                <h2 id="offline-alert-title" className="text-sm sm:text-base font-black text-zinc-950 leading-tight">
                  Device Sudah Normal!
                </h2>
                <p className="text-[11px] text-emerald-700 font-bold font-mono mt-0.5">
                  ESP32 terhubung aktif dan telemetry berjalan lancar
                </p>
              </div>
            </div>

            {/* Pesan Sukses & Konfirmasi */}
            <div id="offline-alert-desc" className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-300 text-emerald-950 space-y-1.5 font-sans">
              <p className="text-xs font-semibold leading-relaxed">
                Alat fisik hidroponik berhasil dideteksi online. Seluruh fitur kontrol pompa dan pengaturan telah dibuka kembali.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-700 pt-1">
                <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />
                <span>Menutup pop-up otomatis...</span>
              </div>
            </div>

            {/* Tombol Konfirmasi Selesai */}
            <div className="pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-black shadow-xs transition-all cursor-pointer text-xs font-mono"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>DEVICE SUDAH NORMAL (TUTUP)</span>
              </button>
            </div>
          </div>
        ) : (
          /* TAMPILAN OFFLINE & PANDUAN PEMERIKSAAN */
          <>
            {/* Header Alert Offline */}
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl shrink-0 bg-rose-100 text-rose-700 ring-4 ring-rose-50">
                <WifiOff className="h-7 w-7 animate-pulse text-rose-600" />
              </div>

              <div className="min-w-0 pr-6">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded border inline-block mb-1 bg-rose-50 text-rose-900 border-rose-300">
                  ⚠️ ALAT FISIK TIDAK TERHUBUNG
                </span>
                <h2 id="offline-alert-title" className="text-sm sm:text-base font-black text-zinc-950 leading-tight">
                  Tolong Periksa Alat Fisik Hidroponik!
                </h2>
                <p className="text-[11px] text-zinc-500 font-medium font-mono mt-0.5">
                  Sinyal terakhir: {lastSeenText}
                </p>
              </div>
            </div>

            {/* Jika sebelumnya sudah coba klik cek koneksi tapi masih offline */}
            {checkState === 'failed' && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-rose-900">Alat Masih Belum Terhubung (Offline)</span>
                  <p className="text-[11px] text-rose-800 leading-snug">
                    Sinyal data terbaru dari ESP32 belum terdeteksi. Silakan periksa langkah pengecekan di bawah lalu coba klik &quot;Cek Koneksi Lagi&quot;.
                  </p>
                </div>
              </div>
            )}

            {/* Isi Pesan Peringatan & Alasan Fitur Dikunci */}
            <div id="offline-alert-desc" className="space-y-2.5 text-xs text-zinc-700 leading-relaxed bg-rose-50/80 p-3.5 rounded-xl border border-rose-200">
              <p className="font-semibold text-rose-950">
                Mikrokontroler ESP32 di tandon hidroponik saat ini <strong>terputus (offline)</strong>. 
                Semua saklar pompa manual, mode operasi, dan tombol simpan <strong>dikunci otomatis</strong> demi keselamatan alat fisik dan tanaman Anda.
              </p>
            </div>

            {/* Panduan Pemeriksaan Alat Fisik */}
            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-mono font-bold text-zinc-900 uppercase tracking-wide block">
                LANGKAH PEMERIKSAAN ALAT FISIK:
              </span>

              <div className="space-y-2 bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-zinc-700">
                <div className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-zinc-200 text-zinc-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-zinc-950 font-bold">Cek Catu Daya / Adaptor:</strong> Pastikan kabel adaptor ESP32 dan pompa terhubung kencang ke stopkontak listrik, dan lampu LED power pada board ESP32 menyala.
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-zinc-200 text-zinc-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-zinc-950 font-bold">Cek Jaringan WiFi / Hotspot:</strong> Pastikan router WiFi atau hotspot HP yang digunakan ESP32 aktif dengan akses internet lancar.
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-zinc-200 text-zinc-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-zinc-950 font-bold">Restart / Reboot Alat:</strong> Tekan tombol <code>RST / EN</code> pada ESP32 atau cabut kabel adaptor selama 5 detik lalu pasang kembali.
                  </div>
                </div>
              </div>
            </div>

            {/* Tombol Opsi Aksi */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 font-mono text-xs">
              {/* Tombol Tutup */}
              <button
                type="button"
                onClick={onClose}
                disabled={isActuallyChecking}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 active:scale-98 text-zinc-700 font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <span>TUTUP</span>
              </button>

              {/* Tombol Cek Koneksi Sekarang */}
              <button
                type="button"
                onClick={handleCheck}
                disabled={isActuallyChecking}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-black shadow-xs transition-all cursor-pointer disabled:opacity-70"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isActuallyChecking ? 'animate-spin' : ''}`} />
                <span>
                  {isActuallyChecking
                    ? 'MEMERIKSA...'
                    : checkState === 'failed'
                    ? 'CEK KONEKSI LAGI'
                    : 'CEK KONEKSI'}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
