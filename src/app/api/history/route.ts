import { NextResponse } from 'next/server';
import { getSensorLogs } from '@/lib/db/queries';

/**
 * GET /api/history?limit=30
 * Mengambil deret log histori untuk visualisasi grafik
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || 25), 100);

    const logs = await getSensorLogs(limit);
    return NextResponse.json({ success: true, count: logs.length, data: logs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal membaca riwayat log' },
      { status: 500 }
    );
  }
}

