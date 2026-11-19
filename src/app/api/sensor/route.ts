import { NextResponse } from 'next/server';
import { insertSensorLog, getLatestSensorLog, getSystemControl, updatePumpControl } from '@/lib/db/queries';

/**
 * GET /api/sensor
 * Mengambil data sensor terbaru untuk dashboard, status online, & status cooldown
 */
export async function GET() {
  try {
    const latest = await getLatestSensorLog();
    const control = await getSystemControl();

    // 1. Server-side heartbeat detection
    const nowServer = Date.now();
    const logTime = latest?.created_at ? new Date(latest.created_at).getTime() : 0;
    const diffSeconds = logTime > 0 ? Math.round((nowServer - logTime) / 1000) : 9999;
    const is_online = Boolean(latest && diffSeconds >= 0 && diffSeconds <= 15);

    // 2. Hitung sisa waktu Cooldown 1 Jam (dalam detik & menit)
    let cooldown_remaining_seconds = 0;
    const cooldownTotalSeconds = (control.cooldown_minutes || 60) * 60;

    if (control.last_dosing_at) {
      const lastDosingMs = new Date(control.last_dosing_at).getTime();
      const elapsedSeconds = Math.round((nowServer - lastDosingMs) / 1000);
      if (elapsedSeconds < cooldownTotalSeconds) {
        cooldown_remaining_seconds = cooldownTotalSeconds - elapsedSeconds;
      }
    }

    // 3. Status pompa yang selaras dengan mode operasi (cegah flicker delay status tunda saat mode manual)
    const effectiveLatest = latest ? {
      ...latest,
      status_pompa: control.pump_mode === 'manual' ? Boolean(control.pump_state) : Boolean(latest.status_pompa),
    } : null;

    return NextResponse.json({
      success: true,
      data: effectiveLatest,
      control,
      is_online,
      last_seen_seconds: diffSeconds,
      cooldown: {
        is_in_cooldown: cooldown_remaining_seconds > 0,
        remaining_seconds: cooldown_remaining_seconds,
        remaining_minutes: Math.ceil(cooldown_remaining_seconds / 60),
      },
    });
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
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const adc_raw = Number(body.adcRaw ?? body.adc_raw ?? 0);
    const tegangan = Number(body.teganganRaw ?? body.tegangan ?? 0);
    const ppm_raw = Number(body.ppmRaw ?? body.ppm_raw ?? 0);
    const ppm_stabil = Number(body.ppmStabil ?? body.ppmFiltered ?? body.ppm_stabil ?? 0);
    const status_pompa = Boolean(body.pompaAktif ?? body.status_pompa ?? false);
    const dosing_started = Boolean(body.dosingStarted ?? body.dosing_started ?? false);
    const dosing_completed = Boolean(body.dosingCompleted ?? body.dosing_completed ?? false);

    // Simpan ke Vercel Postgres
    const savedLog = await insertSensorLog({
      adc_raw,
      tegangan,
      ppm_raw,
      ppm_stabil,
      status_pompa,
    });

    let control = await getSystemControl();
    const cooldownTotalSeconds = (control.cooldown_minutes || 60) * 60;
    const nowServerPost = Date.now();

    // Hitung apakah saat ini sedang dalam cooldown
    let isCurrentlyInCooldown = false;
    let cooldown_remaining_seconds = 0;
    if (control.last_dosing_at) {
      const lastDosingMs = new Date(control.last_dosing_at).getTime();
      const elapsed = Math.round((nowServerPost - lastDosingMs) / 1000);
      if (elapsed < cooldownTotalSeconds) {
        isCurrentlyInCooldown = true;
        cooldown_remaining_seconds = cooldownTotalSeconds - elapsed;
      }
    }

    // RATE LIMITING / MAX 1 KALI PER PERIODE:
    // Kunci timestamp siklus sejak pompa MULAI aktif memompa (jika belum dalam cooldown)
    if ((dosing_started || (status_pompa && control.pump_mode === 'auto')) && !isCurrentlyInCooldown) {
      control = await updatePumpControl({
        last_dosing_at: new Date().toISOString(),
      });
      isCurrentlyInCooldown = true;
      cooldown_remaining_seconds = cooldownTotalSeconds;
    } else if (dosing_completed && !isCurrentlyInCooldown) {
      // Fallback jika laporan start terlewat
      control = await updatePumpControl({
        last_dosing_at: new Date().toISOString(),
      });
      isCurrentlyInCooldown = true;
      cooldown_remaining_seconds = cooldownTotalSeconds;
    }

    return NextResponse.json({
      success: true,
      message: 'Data sensor tersimpan',
      saved_id: savedLog.id,
      // Respon instruksi kontrol untuk ESP32
      control: {
        mode: control.pump_mode,
        state: control.pump_state,
        target_ppm_min: Number(control.target_ppm_min ?? 560),
        target_ppm_max: Number(control.target_ppm_max ?? 840),
        cooldown_minutes: Number(control.cooldown_minutes ?? 60),
        in_cooldown: isCurrentlyInCooldown,
        cooldown_remaining_seconds: cooldown_remaining_seconds,
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
