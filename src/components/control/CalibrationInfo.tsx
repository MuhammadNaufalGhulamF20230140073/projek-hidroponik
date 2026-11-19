'use client';

import React from 'react';
import { Cpu, CheckCircle2 } from 'lucide-react';

export function CalibrationInfo() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#121418] p-5 sm:p-6 text-zinc-100 shadow-xl space-y-5 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xs font-black tracking-wider text-white flex items-center gap-2 uppercase">
            <Cpu className="h-4 w-4 text-emerald-400" />
            PENGATURAN KALIBRASI SENSOR (ESP32)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5 font-semibold">Rumus akurasi takaran nutrisi yang tersimpan di alat mikrokontroler</p>
        </div>
        <span className="flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-zinc-700 self-start sm:self-auto">
          <CheckCircle2 className="h-3 w-3" />
          TERKALIBRASI (500 - 1000 PPM)
        </span>
      </div>

      {/* Grid Koefisien */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-zinc-800 bg-[#0d0f12] p-3.5">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Faktor Kalibrasi</span>
          <div className="text-lg sm:text-xl font-black text-white mt-1">0.9344</div>
          <span className="text-[9px] text-zinc-500 font-semibold block mt-0.5">Penyesuai fisik sensor</span>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#0d0f12] p-3.5">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Faktor Kemiringan</span>
          <div className="text-lg sm:text-xl font-black text-white mt-1">0.9200</div>
          <span className="text-[9px] text-zinc-500 font-semibold block mt-0.5">Skala linier PPM</span>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#0d0f12] p-3.5">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Titik Nol (Offset)</span>
          <div className="text-lg sm:text-xl font-black text-white mt-1">+68.50 <span className="text-xs font-normal text-zinc-400">ppm</span></div>
          <span className="text-[9px] text-zinc-500 font-semibold block mt-0.5">Nilai awal saat di udara</span>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#0d0f12] p-3.5">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Kehalusan Sinyal</span>
          <div className="text-lg sm:text-xl font-black text-white mt-1">0.20 <span className="text-xs font-normal text-zinc-400">(EMA)</span></div>
          <span className="text-[9px] text-zinc-500 font-semibold block mt-0.5">Mencegah angka lompat</span>
        </div>
      </div>

      {/* Penjelasan Sederhana untuk Petani */}
      <div className="rounded-xl border border-zinc-800 bg-[#0d0f12] p-4 text-xs text-zinc-300 font-sans space-y-1">
        <p className="font-bold text-white font-mono text-[11px]">CARA KERJA SENSOR:</p>
        <p className="leading-relaxed text-zinc-400 text-xs">
          Sensor membaca kepekatan pupuk cair di dalam tandon air hidroponik secara berkala. Rumus kalibrasi di atas otomatis menyesuaikan hasil pengukuran dengan suhu air agar angka PPM nutrisi yang tampil selalu stabil, tepat, dan tanaman tidak over-nutrisi.
        </p>
      </div>
    </div>
  );
}
