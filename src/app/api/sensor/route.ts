import { NextResponse } from 'next/server';
import { insertSensorLog, getLatestSensorLog, getSystemControl } from '@/lib/db/queries';

/**
 * GET /api/sensor
 * Mengambil data sensor terbaru untuk dashboard
 */
export async function GET() {
  try {
    const latest = await getLatestSensorLog();
    const control = await getSystemControl();
    return NextResponse.json({ success: true, data: latest, control });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal membaca sensor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sensor
 * Menerima payload telemetri dari ESP32
 * ESP32 mengirim: { adcRaw, teganganRaw, ppmRaw, ppmStabil, pompaAktif }
 * Mengembalikan: { success: true, pump_mode, pump_state } (instruksi aktuasi balik ke ESP32)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Normalisasi parameter (mendukung camelCase maupun snake_case dari ESP32)
    const adc_raw = Number(body.adcRaw ?? body.adc_raw ?? 0);
    const tegangan = Number(body.teganganRaw ?? body.tegangan ?? 0);
    const ppm_raw = Number(body.ppmRaw ?? body.ppm_raw ?? 0);
    const ppm_stabil = Number(body.ppmStabil ?? body.ppmFiltered ?? body.ppm_stabil ?? 0);
    const status_pompa = Boolean(body.pompaAktif ?? body.status_pompa ?? false);

    // Simpan ke Vercel Postgres
    const savedLog = await insertSensorLog({
      adc_raw,
      tegangan,
      ppm_raw,
      ppm_stabil,
      status_pompa,
    });

    // Ambil status kontrol saat ini untuk dikirim balik ke ESP32
    const control = await getSystemControl();

    return NextResponse.json({
      success: true,
      message: 'Data sensor tersimpan',
      saved_id: savedLog.id,
      // Respon instruksi kontrol untuk ESP32
      control: {
        mode: control.pump_mode,   // 'auto' atau 'manual'
        state: control.pump_state, // true (ON / LOW pin) atau false (OFF / HIGH pin)
      },
    });
  } catch (error: any) {
    console.error('Error POST /api/sensor:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan data sensor' },
      { status: 500 }
    );
  }
}

