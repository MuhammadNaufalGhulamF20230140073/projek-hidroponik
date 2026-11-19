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
    // Jika beralih mode dan state tidak ditentukan, pastikan pompa dimatikan terlebih dahulu demi keselamatan (state: false)
    const state = body.state !== undefined 
      ? Boolean(body.state) 
      : (mode !== undefined ? false : undefined);
    const target_ppm_min = body.target_ppm_min !== undefined ? Number(body.target_ppm_min) : undefined;
    const target_ppm_max = body.target_ppm_max !== undefined ? Number(body.target_ppm_max) : undefined;
    const cooldown_minutes = body.cooldown_minutes !== undefined ? Number(body.cooldown_minutes) : undefined;
    const cooldown_enabled = body.cooldown_enabled !== undefined ? Boolean(body.cooldown_enabled) : undefined;
    const cooldown_max_cycles = body.cooldown_max_cycles !== undefined ? Math.max(1, Number(body.cooldown_max_cycles)) : undefined;
    // Cooldown TETAP berjalan dan tidak di-reset otomatis saat ubah angka/mode
    const reset_cooldown = Boolean(body.reset_cooldown);

    const updated = await updatePumpControl({
      mode,
      state,
      target_ppm_min,
      target_ppm_max,
      cooldown_minutes,
      cooldown_enabled,
      cooldown_max_cycles,
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
