import { SolutionStatus, CalibrationParams } from '../types/hidroponik';

export const ARDUINO_CALIBRATION: CalibrationParams = {
  calibrationFactor: 0.9344,
  calibrationSlope: 0.9200,
  calibrationOffset: 68.50,
  emaAlpha: 0.20,
  temperature: 25.0,
  relayPin: 23,
  tdsPin: 34,
};

/**
 * Menentukan status larutan nutrisi berdasarkan PPM
 */
export function getSolutionStatus(ppm: number, min = 560, max = 840): {
  status: SolutionStatus;
  label: string;
  color: string;
  badgeBg: string;
  description: string;
} {
  if (ppm < min) {
    return {
      status: 'rendah',
      label: 'Nutrisi Rendah',
      color: 'text-amber-500',
      badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
      description: 'PPM di bawah target ideal. Pertimbangkan untuk menambah pekatan nutrisi A&B.',
    };
  }

  if (ppm > max) {
    return {
      status: 'tinggi',
      label: 'Nutrisi Mencukupi / Di Atas Target',
      color: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
      description: 'PPM telah mencapai batas target. Pompa dinonaktifkan otomatis agar tidak over pemberian nutrisi pada tanaman.',
    };
  }

  return {
    status: 'optimal',
    label: 'Kondisi Optimal',
    color: 'text-emerald-500',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    description: 'Kandungan nutrisi TDS berada pada rentang ideal pertumbuhan tanaman.',
  };
}

/**
 * Format tanggal & jam lokal Indonesia
 */
export function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: 'numeric',
      month: 'short',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Format jam menit saja untuk sumbu X grafik
 */
export function formatTimeOnly(isoString?: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch {
    return '';
  }
}

