import { sql, isDbConfigured, mockDB } from './client';
import { SensorLog, SystemControl } from '../types/hidroponik';

/**
 * Inisialisasi skema tabel Vercel Postgres jika belum ada
 */
export async function initDatabase() {
  if (!isDbConfigured) {
    return { status: 'mock', message: 'Vercel Postgres belum terkonfigurasi, menggunakan mode simulasi' };
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS sensor_logs (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        adc_raw INTEGER NOT NULL,
        tegangan REAL NOT NULL,
        ppm_raw REAL NOT NULL,
        ppm_stabil REAL NOT NULL,
        status_pompa BOOLEAN NOT NULL DEFAULT false
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_sensor_logs_created_at ON sensor_logs(created_at DESC);
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS system_control (
        id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
        pump_mode VARCHAR(16) NOT NULL DEFAULT 'auto',
        pump_state BOOLEAN NOT NULL DEFAULT false,
        target_ppm_min REAL NOT NULL DEFAULT 560.0,
        target_ppm_max REAL NOT NULL DEFAULT 840.0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    await sql`
      INSERT INTO system_control (id, pump_mode, pump_state, target_ppm_min, target_ppm_max)
      VALUES ('default', 'auto', false, 560.0, 840.0)
      ON CONFLICT (id) DO NOTHING;
    `;

    return { status: 'success', message: 'Tabel database berhasil diinisialisasi!' };
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
  if (!isDbConfigured) {
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

  const result = await sql<SensorLog>`
    INSERT INTO sensor_logs (adc_raw, tegangan, ppm_raw, ppm_stabil, status_pompa)
    VALUES (${data.adc_raw}, ${data.tegangan}, ${data.ppm_raw}, ${data.ppm_stabil}, ${data.status_pompa})
    RETURNING id, created_at, adc_raw, tegangan, ppm_raw, ppm_stabil, status_pompa;
  `;

  return result.rows[0];
}

/**
 * Mengambil log sensor paling baru (terkini)
 */
export async function getLatestSensorLog(): Promise<SensorLog | null> {
  if (!isDbConfigured) {
    return mockDB.logs[mockDB.logs.length - 1] || null;
  }

  try {
    const result = await sql<SensorLog>`
      SELECT id, created_at, adc_raw, tegangan, ppm_raw, ppm_stabil, status_pompa
      FROM sensor_logs
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.warn('Gagal mengambil latest log dari DB, pastikan tabel sudah dibuat:', error);
    return null;
  }
}

/**
 * Mengambil histori log sensor untuk grafik
 */
export async function getSensorLogs(limit = 20): Promise<SensorLog[]> {
  if (!isDbConfigured) {
    return mockDB.logs.slice(-limit);
  }

  try {
    const result = await sql<SensorLog>`
      SELECT id, created_at, adc_raw, tegangan, ppm_raw, ppm_stabil, status_pompa
      FROM sensor_logs
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;
    // Urutkan ascending untuk grafik
    return result.rows.reverse();
  } catch (error) {
    console.warn('Gagal mengambil history log dari DB:', error);
    return [];
  }
}

/**
 * Mengambil konfigurasi kontrol sistem (mode & status pompa)
 */
export async function getSystemControl(): Promise<SystemControl> {
  if (!isDbConfigured) {
    return mockDB.control;
  }

  try {
    const result = await sql<SystemControl>`
      SELECT id, pump_mode, pump_state, target_ppm_min, target_ppm_max, updated_at
      FROM system_control
      WHERE id = 'default'
      LIMIT 1;
    `;
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    // Jika belum ada row default
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
 * Memperbarui status kontrol pompa dari Web Dashboard
 */
export async function updatePumpControl(
  mode: 'auto' | 'manual',
  state: boolean
): Promise<SystemControl> {
  if (!isDbConfigured) {
    mockDB.control.pump_mode = mode;
    mockDB.control.pump_state = state;
    mockDB.control.updated_at = new Date().toISOString();
    return mockDB.control;
  }

  const result = await sql<SystemControl>`
    UPDATE system_control
    SET pump_mode = ${mode},
        pump_state = ${state},
        updated_at = NOW()
    WHERE id = 'default'
    RETURNING id, pump_mode, pump_state, target_ppm_min, target_ppm_max, updated_at;
  `;

  return result.rows[0];
}

