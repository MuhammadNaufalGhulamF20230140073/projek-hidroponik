import { sql, isDbConfigured, getDbConnectionString, mockDB } from './client';
import { Pool } from '@neondatabase/serverless';
import { SensorLog, SystemControl } from '../types/hidroponik';

// Helper eksekusi SQL serbaguna (mendukung @vercel/postgres & Neon)
async function executeQuery<T = any>(queryText: string, params: any[] = []): Promise<T[]> {
  const connStr = getDbConnectionString();
  if (!connStr) {
    throw new Error('Database connection string tidak ditemukan');
  }

  // Jika POSTGRES_URL ada, coba gunakan @vercel/postgres lebih dulu
  if (process.env.POSTGRES_URL) {
    try {
      const res = await sql.query(queryText, params);
      return res.rows as T[];
    } catch (err: any) {
      console.warn('Fallback dari @vercel/postgres ke Neon Pool:', err.message);
    }
  }

  // Gunakan driver Neon serverless Pool (paling kompatibel dengan segala DATABASE_URL)
  const pool = new Pool({ connectionString: connStr });
  try {
    const res = await pool.query(queryText, params);
    return res.rows as T[];
  } finally {
    // Di serverless edge/lambda, pool tidak perlu di-block
  }
}

/**
 * Inisialisasi skema tabel Vercel Postgres jika belum ada
 */
export async function initDatabase() {
  if (!isDbConfigured()) {
    return {
      status: 'mock',
      message: 'Vercel Postgres belum terkonfigurasi, menggunakan mode simulasi',
      detectedVars: Object.keys(process.env).filter(k =>
        k.includes('POSTGRES') || k.includes('DATABASE') || k.includes('NEON') || k.includes('URL')
      )
    };
  }

  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS sensor_logs (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        adc_raw INTEGER NOT NULL,
        tegangan REAL NOT NULL,
        ppm_raw REAL NOT NULL,
        ppm_stabil REAL NOT NULL,
        status_pompa BOOLEAN NOT NULL DEFAULT false
      );
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_sensor_logs_created_at ON sensor_logs(created_at DESC);
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS system_control (
        id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
        pump_mode VARCHAR(16) NOT NULL DEFAULT 'auto',
        pump_state BOOLEAN NOT NULL DEFAULT false,
        target_ppm_min REAL NOT NULL DEFAULT 560.0,
        target_ppm_max REAL NOT NULL DEFAULT 840.0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await executeQuery(`
      INSERT INTO system_control (id, pump_mode, pump_state, target_ppm_min, target_ppm_max)
      VALUES ('default', 'auto', false, 560.0, 840.0)
      ON CONFLICT (id) DO NOTHING;
    `);

    return {
      status: 'success',
      message: 'Tabel database berhasil diinisialisasi!',
      detectedVars: Object.keys(process.env).filter(k =>
        k.includes('POSTGRES') || k.includes('DATABASE') || k.includes('NEON')
      )
    };
  } catch (error: any) {
    console.error('Error initDatabase:', error);
    throw new Error(`Gagal inisialisasi tabel: ${error.message}`);
  }
}

/**
 * Menyimpan data pembacaan sensor dari ESP32
 */
export async function insertSensorLog(data: {
  adc_raw: number;
  tegangan: number;
  ppm_raw: number;
  ppm_stabil: number;
  status_pompa: boolean;
}): Promise<SensorLog> {
  if (!isDbConfigured()) {
    const newLog: SensorLog = {
      id: mockDB.logs.length + 1,
      created_at: new Date().toISOString(),
      adc_raw: data.adc_raw,
      tegangan: data.tegangan,
      ppm_raw: data.ppm_raw,
      ppm_stabil: data.ppm_stabil,
      status_pompa: data.status_pompa,
    };
    mockDB.logs.push(newLog);
    if (mockDB.logs.length > 100) mockDB.logs.shift();
    return newLog;
  }

  const rows = await executeQuery<SensorLog>(
    `INSERT INTO sensor_logs (adc_raw, tegangan, ppm_raw, ppm_stabil, status_pompa)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at, adc_raw, tegangan, ppm_raw, ppm_stabil, status_pompa`,
    [data.adc_raw, data.tegangan, data.ppm_raw, data.ppm_stabil, data.status_pompa]
  );

  return rows[0];
}

/**
 * Mengambil log sensor paling baru (terkini)
 */
export async function getLatestSensorLog(): Promise<SensorLog | null> {
  if (!isDbConfigured()) {
    return mockDB.logs[mockDB.logs.length - 1] || null;
  }

  try {
    const rows = await executeQuery<SensorLog>(
      `SELECT id, created_at, adc_raw, tegangan, ppm_raw, ppm_stabil, status_pompa
       FROM sensor_logs
       ORDER BY created_at DESC
       LIMIT 1`
    );
    return rows[0] || null;
  } catch (error) {
    console.warn('Gagal membaca latest log:', error);
    return null;
  }
}

/**
 * Mengambil histori log sensor untuk grafik
 */
export async function getSensorLogs(limit = 20): Promise<SensorLog[]> {
  if (!isDbConfigured()) {
    return mockDB.logs.slice(-limit);
  }

  try {
    const rows = await executeQuery<SensorLog>(
      `SELECT id, created_at, adc_raw, tegangan, ppm_raw, ppm_stabil, status_pompa
       FROM sensor_logs
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows.reverse();
  } catch (error) {
    console.warn('Gagal membaca history log:', error);
    return [];
  }
}

/**
 * Mengambil konfigurasi kontrol sistem (mode & status pompa)
 */
export async function getSystemControl(): Promise<SystemControl> {
  if (!isDbConfigured()) {
    return mockDB.control;
  }

  try {
    const rows = await executeQuery<SystemControl>(
      `SELECT id, pump_mode, pump_state, target_ppm_min, target_ppm_max, updated_at
       FROM system_control
       WHERE id = 'default'
       LIMIT 1`
    );
    if (rows.length > 0) {
      return rows[0];
    }
    await initDatabase();
    return {
      id: 'default',
      pump_mode: 'auto',
      pump_state: false,
      target_ppm_min: 560.0,
      target_ppm_max: 840.0,
    };
  } catch (error) {
    console.warn('Gagal membaca system_control:', error);
    return mockDB.control;
  }
}

/**
 * Memperbarui status kontrol pompa & batas ambang nutrisi dari Web Dashboard
 */
export async function updatePumpControl(params: {
  mode?: 'auto' | 'manual';
  state?: boolean;
  target_ppm_min?: number;
  target_ppm_max?: number;
}): Promise<SystemControl> {
  const current = await getSystemControl();
  const newMode = params.mode ?? current.pump_mode;
  const newState = params.state !== undefined ? params.state : current.pump_state;
  const newMin = params.target_ppm_min !== undefined ? params.target_ppm_min : current.target_ppm_min;
  const newMax = params.target_ppm_max !== undefined ? params.target_ppm_max : current.target_ppm_max;

  if (!isDbConfigured()) {
    mockDB.control.pump_mode = newMode;
    mockDB.control.pump_state = newState;
    mockDB.control.target_ppm_min = newMin;
    mockDB.control.target_ppm_max = newMax;
    mockDB.control.updated_at = new Date().toISOString();
    return mockDB.control;
  }

  const rows = await executeQuery<SystemControl>(
    `UPDATE system_control
     SET pump_mode = $1,
         pump_state = $2,
         target_ppm_min = $3,
         target_ppm_max = $4,
         updated_at = NOW()
     WHERE id = 'default'
     RETURNING id, pump_mode, pump_state, target_ppm_min, target_ppm_max, updated_at`,
    [newMode, newState, newMin, newMax]
  );

  return rows[0];
}
