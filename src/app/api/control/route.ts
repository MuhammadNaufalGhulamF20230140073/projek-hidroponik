import { NextResponse } from 'next/server';
import { getSystemControl, updatePumpControl } from '@/lib/db/queries';

/**
 * GET /api/control
 * Membaca status mode dan switch pompa
 */
export async function GET() {
  try {
    const control = await getSystemControl();
    return NextResponse.json({ success: true, control });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal membaca kontrol' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/control
 * Mengubah mode, saklar pompa, ambang batas PPM, atau jeda cooldown
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode = body.mode !== undefined ? (body.mode === 'manual' ? 'manual' : 'auto') : undefined;
    const state = body.state !== undefined ? Boolean(body.state) : undefined;
    const target_ppm_min = body.target_ppm_min !== undefined ? Number(body.target_ppm_min) : undefined;
    const target_ppm_max = body.target_ppm_max !== undefined ? Number(body.target_ppm_max) : undefined;
    const cooldown_minutes = body.cooldown_minutes !== undefined ? Number(body.cooldown_minutes) : undefined;
    // Reset cooldown agar sistem langsung siap memompa seketika saat config/mode diubah
    const reset_cooldown = Boolean(body.reset_cooldown || (target_ppm_min !== undefined) || (mode === 'auto'));

    const updated = await updatePumpControl({
      mode,
      state,
      target_ppm_min,
      target_ppm_max,
      cooldown_minutes,
      reset_cooldown,
    });

    return NextResponse.json({
      success: true,
      message: 'Konfigurasi kontrol berhasil diperbarui',
      control: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui kontrol' },
      { status: 500 }
    );
  }
}
