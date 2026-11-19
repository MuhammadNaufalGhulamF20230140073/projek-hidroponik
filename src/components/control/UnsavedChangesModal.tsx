'use client';

import React from 'react';
import { AlertCircle, Save, Trash2, X, Loader2 } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  targetTabName: string;
  onSaveAndLeave: () => Promise<void> | void;
  onDiscardAndLeave?: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function UnsavedChangesModal({
  isOpen,
  targetTabName,
  onSaveAndLeave,
  onCancel,
  isSaving = false,
}: UnsavedChangesModalProps) {
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
        aria-labelledby="unsaved-alert-title"
        aria-describedby="unsaved-alert-desc"
        className="relative z-10 w-full max-w-md rounded-2xl border-2 border-amber-500/80 bg-white p-5 sm:p-6 shadow-2xl space-y-4 font-sans animate-in zoom-in-95 duration-200"
      >
        {/* Tombol Close silang */}
        <button
          onClick={onCancel}
          disabled={isSaving}
          aria-label="Tutup dialog"
          className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Alert */}
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl shrink-0 bg-amber-100 text-amber-800 ring-4 ring-amber-50">
            <AlertCircle className="h-7 w-7 animate-pulse text-amber-700" />
          </div>

          <div className="min-w-0 pr-6">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded border inline-block mb-1 bg-amber-50 text-amber-900 border-amber-300">
              ⚠️ PERUBAHAN BELUM DISIMPAN
            </span>
            <h2 id="unsaved-alert-title" className="text-sm sm:text-base font-black text-zinc-950 leading-tight">
              Simpan Pengaturan Sebelum Pindah?
            </h2>
          </div>
        </div>

        {/* Isi Pesan Peringatan */}
        <div id="unsaved-alert-desc" className="space-y-2 text-xs sm:text-[13px] text-zinc-700 leading-relaxed bg-zinc-50 p-3.5 rounded-xl border border-zinc-200">
          <p>
            Anda telah mengubah pengaturan pompa (Target PPM / Katup Cooldown), namun <strong>belum mengklik tombol Simpan</strong>.
          </p>
          <p className="font-semibold text-zinc-900">
            Pilih <strong>SIMPAN</strong> untuk menyimpan ke alat ESP32 dan melanjutkan pindah menu, atau <strong>BATAL</strong> untuk tetap di pengaturan.
          </p>
        </div>

        {/* Tombol Opsi Aksi: Simpan dan Batal */}
        <div className="grid grid-cols-2 gap-2.5 pt-1 font-mono text-xs">
          {/* Tombol Batal */}
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 active:scale-98 text-zinc-700 font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <span>BATAL</span>
          </button>

          {/* Tombol Simpan */}
          <button
            type="button"
            onClick={onSaveAndLeave}
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-black shadow-xs transition-all cursor-pointer disabled:opacity-70"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>MENYIMPAN...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>SIMPAN</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

