'use client';

import React from 'react';
import { AlertTriangle, Power, Zap, X, ShieldAlert, Loader2 } from 'lucide-react';

interface ManualSafetyAlertModalProps {
  isOpen: boolean;
  isPumpOn: boolean;
  targetTabName: string;
  onCancel: () => void;
  onConfirmLeave: () => void;
  onSwitchToAutoAndLeave: () => Promise<void> | void;
  isProcessing?: boolean;
}

export function ManualSafetyAlertModal({
  isOpen,
  isPumpOn,
  targetTabName,
  onCancel,
  onConfirmLeave,
  onSwitchToAutoAndLeave,
  isProcessing = false,
}: ManualSafetyAlertModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      {/* Backdrop Gelap Blur */}
      <div 
        className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xs transition-opacity" 
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div 
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="safety-alert-title"
        aria-describedby="safety-alert-desc"
        className="relative z-10 w-full max-w-md rounded-2xl border-2 border-rose-500/80 bg-white p-5 sm:p-6 shadow-2xl space-y-4 font-sans animate-in zoom-in-95 duration-200"
      >
        {/* Tombol Close silang */}
        <button
          onClick={onCancel}
          disabled={isProcessing}
          aria-label="Tutup peringatan"
          className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Alert */}
        <div className="flex items-start gap-3.5">
          <div className={`p-3 rounded-2xl shrink-0 ${
            isPumpOn 
              ? 'bg-rose-100 text-rose-700 ring-4 ring-rose-50' 
              : 'bg-amber-100 text-amber-700 ring-4 ring-amber-50'
          }`}>
            <ShieldAlert className="h-7 w-7 animate-bounce" />
          </div>

          <div className="min-w-0 pr-6">
            <span className={`text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded border inline-block mb-1 ${
              isPumpOn 
                ? 'bg-rose-50 text-rose-900 border-rose-300' 
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}>
              {isPumpOn ? '⚠️ BAHAYA: POMPA MENYALA' : '⚠️ PERINGATAN KONTROL'}
            </span>
            <h2 id="safety-alert-title" className="text-sm sm:text-base font-black text-zinc-950 leading-tight">
              {isPumpOn 
                ? 'Pompa Masih Menyala dalam Mode Manual!' 
                : 'Sistem Masih dalam Mode Manual!'}
            </h2>
          </div>
        </div>

        {/* Isi Pesan Peringatan */}
        <div id="safety-alert-desc" className="space-y-2 text-xs sm:text-[13px] text-zinc-700 leading-relaxed bg-zinc-50 p-3.5 rounded-xl border border-zinc-200">
          {isPumpOn ? (
            <p>
              Saat ini pompa nutrisi dalam kondisi <strong className="text-rose-700 font-extrabold uppercase">MENYALA (ON)</strong> secara manual.
              <br /><br />
              <span className="font-semibold text-zinc-900">
                Sangat berisiko jika ditinggalkan ke menu <u>{targetTabName}</u> tanpa pengawasan
              </span>, karena pompa <strong>tidak akan mati otomatis</strong> dan berpotensi menyebabkan luapan air atau kelebihan dosis nutrisi pada tanaman!
            </p>
          ) : (
            <p>
              Saat ini saklar pompa berada di <strong className="text-amber-800 font-extrabold uppercase">MODE MANUAL</strong> (kondisi pompa mati).
              <br /><br />
              Jika ditinggalkan dalam mode manual, pompa <strong>tidak akan bekerja otomatis</strong> saat kadar PPM air turun di bawah batas minimum.
            </p>
          )}
        </div>

        {/* Tombol Opsi Aksi */}
        <div className="space-y-2 pt-1 font-mono text-xs">
          {/* Tombol Rekomendasi Utama: Amankan & Switch ke Auto */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={onSwitchToAutoAndLeave}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 font-black rounded-xl border border-emerald-700 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white shadow-md transition cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                MENGAMANKAN SISTEM...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 shrink-0 text-emerald-300" />
                {isPumpOn 
                  ? 'Matikan Pompa & Ubah ke Otomatis (Aman)' 
                  : 'Aktifkan Mode Otomatis (Rekomendasi)'}
              </>
            )}
          </button>

          {/* Tombol Opsi 2: Tetap Pindah dengan Manual */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={onConfirmLeave}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 font-bold rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 transition cursor-pointer"
          >
            Tetap Pindah ke {targetTabName} (Biarkan Manual)
          </button>

          {/* Tombol Opsi 3: Batal / Tetap di Pengaturan Pompa */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="w-full py-2 px-3 text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 transition cursor-pointer text-center block"
          >
            Batal, Tetap di Pengaturan Pompa
          </button>
        </div>
      </div>
    </div>
  );
}

