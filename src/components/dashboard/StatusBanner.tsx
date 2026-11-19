'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Timer, ShieldCheck } from 'lucide-react';

interface StatusBannerProps {
  ppm: number;
  targetMin?: number;
  targetMax?: number;
  isCooldown?: boolean;
  cooldownRemaining?: number;
  cooldownEnabled?: boolean;
}

export function StatusBanner({
  ppm,
  targetMin = 560,
  targetMax = 840,
  isCooldown = false,
  cooldownRemaining = 0,
  cooldownEnabled = true,
}: StatusBannerProps) {
  // 1. Kasus: PPM sudah mencapai atau melebihi batas maksimal (targetMax)
  // Alasan pompa mati adalah agar tidak over pemberian nutrisi
  if (ppm >= targetMax) {
    return (
      <div
        suppressHydrationWarning
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs font-mono shadow-xs transition-all border-emerald-300 bg-emerald-50 text-emerald-950"
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
          <span className="font-black tracking-tight text-emerald-950">
            [BATAS MAKSIMAL] &bull; Nutrisi Mencukupi / Di Atas Target
          </span>
        </div>
        <div className="text-xs font-semibold text-zinc-900 font-sans">
          PPM telah mencapai batas target. Pompa otomatis mati agar tidak over pemberian nutrisi pada tanaman.
        </div>
      </div>
    );
  }

  // 2. Kasus: PPM di bawah batas minimal (ppm < targetMin) TETAPI pompa sedang jeda cooldown
  if (ppm < targetMin && isCooldown && cooldownEnabled) {
    const remainingStr = cooldownRemaining >= 60 
      ? `${Math.floor(cooldownRemaining / 60)}m ${(cooldownRemaining % 60).toString().padStart(2, '0')}s` 
      : `${cooldownRemaining}s`;

    return (
      <div
        suppressHydrationWarning
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs font-mono shadow-xs transition-all border-amber-300 bg-amber-50 text-amber-950"
      >
        <div className="flex items-center gap-2.5">
          <Timer className="h-4 w-4 text-amber-700 shrink-0 animate-pulse" />
          <span className="font-black tracking-tight text-amber-950">
            [JEDA PELARUTAN] &bull; Pompa Dijeda (Sisa: {remainingStr})
          </span>
        </div>
        <div className="text-xs font-semibold text-zinc-900 font-sans">
          Pompa dijeda sementara agar pupuk larut merata dan mencegah over pemberian nutrisi.
        </div>
      </div>
    );
  }

  // 3. Kasus: PPM di bawah batas minimal (ppm < targetMin) dan siap menyuntikkan nutrisi
  if (ppm < targetMin) {
    return (
      <div
        suppressHydrationWarning
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs font-mono shadow-xs transition-all border-amber-400 bg-amber-50 text-amber-950"
      >
        <div className="flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
          <span className="font-black tracking-tight text-amber-950">
            [NUTRISI KURANG] &bull; Di Bawah Target Minimum
          </span>
        </div>
        <div className="text-xs font-semibold text-zinc-900 font-sans">
          PPM di bawah target minimum. Pompa siap menyuntikkan nutrisi hingga mencapai batas optimal.
        </div>
      </div>
    );
  }

  // 4. Kasus: PPM berada dalam rentang ideal (targetMin <= ppm < targetMax)
  return (
    <div
      suppressHydrationWarning
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs font-mono shadow-xs transition-all border-emerald-400 bg-emerald-50 text-emerald-950"
    >
      <div className="flex items-center gap-2.5">
        <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
        <span className="font-black tracking-tight text-emerald-950">
          [KONDISI BAIK] &bull; Kadar Nutrisi Ideal
        </span>
      </div>
      <div className="text-xs font-semibold text-zinc-900 font-sans">
        Kandungan nutrisi TDS berada pada rentang ideal pertumbuhan tanaman.
      </div>
    </div>
  );
}
