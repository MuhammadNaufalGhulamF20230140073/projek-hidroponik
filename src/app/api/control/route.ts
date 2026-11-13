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
 * Mengubah status mode ('auto' | 'manual') atau saklar pompa dari Web Dashboard
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode = body.mode === 'manual' ? 'manual' : 'auto';
    const state = Boolean(body.state);

    const updated = await updatePumpControl(mode, state);

    return NextResponse.json({
      success: true,
      message: `Kontrol berhasil diperbarui: Mode ${mode}, Pompa ${state ? 'ON' : 'OFF'}`,
      control: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui kontrol' },
      { status: 500 }
    );
  }
}

