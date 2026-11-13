import { sql } from '@vercel/postgres';
import { Pool } from '@neondatabase/serverless';

// Deteksi apakah koneksi Vercel Postgres / Neon tersedia
export const isDbConfigured = Boolean(
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL
);

// Fallback in-memory state saat dijalankan di local dev tanpa Vercel Postgres
interface MockDB {
  logs: any[];
  control: {
    id: string;
    pump_mode: 'auto' | 'manual';
    pump_state: boolean;
    target_ppm_min: number;
    target_ppm_max: number;
    updated_at: string;
  };
}

export const mockDB: MockDB = {
  logs: [
    {
      id: 1,
      created_at: new Date(Date.now() - 60000 * 4).toISOString(),
      adc_raw: 1420,
      tegangan: 1.144,
      ppm_raw: 615.2,
      ppm_stabil: 612.0,
      status_pompa: true,
    },
    {
      id: 2,
      created_at: new Date(Date.now() - 60000 * 2).toISOString(),
      adc_raw: 1445,
      tegangan: 1.164,
      ppm_raw: 628.7,
      ppm_stabil: 622.4,
      status_pompa: false,
    },
    {
      id: 3,
      created_at: new Date().toISOString(),
      adc_raw: 1460,
      tegangan: 1.176,
      ppm_raw: 635.0,
      ppm_stabil: 630.5,
      status_pompa: false,
    },
  ],
  control: {
    id: 'default',
    pump_mode: 'auto',
    pump_state: false,
    target_ppm_min: 560.0,
    target_ppm_max: 840.0,
    updated_at: new Date().toISOString(),
  },
};

export { sql };

