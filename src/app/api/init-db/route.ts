import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db/queries';

/**
 * GET /api/init-db
 * Inisialisasi otomatis tabel Vercel Postgres
 */
export async function GET() {
  try {
    const res = await initDatabase();
    return NextResponse.json({ success: true, ...res });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

