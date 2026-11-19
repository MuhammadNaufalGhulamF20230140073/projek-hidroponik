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

  // Gunakan driver Neon serverless Pool
  const pool = new Pool({ connectionString: connStr });
  try {
    const res = await pool.query(queryText, params);
    return res.rows as T[];
  } finally {
    // Di serverless edge/lambda, pool tidak perlu di-block
  }
}

/**
 * Pastikan semua tabel dan kolom mutakhir ada di database
 */
async function ensureSchemaUpdated() {
  if (!isDbConfigured()) return;
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
        cooldown_minutes INTEGER NOT NULL DEFAULT 60,
        cooldown_enabled BOOLEAN NOT NULL DEFAULT true,
        cooldown_max_cycles INTEGER NOT NULL DEFAULT 1,
        cycle_count INTEGER NOT NULL DEFAULT 0,
        window_started_at TIMESTAMP WITH TIME ZONE,
        last_dosing_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Tambahkan kolom mutakhir secara terisolasi (idempotent)
    const alterQueries = [
      `ALTER TABLE system_control ADD COLUMN IF NOT EXISTS cooldown_minutes INTEGER NOT NULL DEFAULT 60`,
      `ALTER TABLE system_control ADD COLUMN IF NOT EXISTS cooldown_enabled BOOLEAN NOT NULL DEFAULT true`,
      `ALTER TABLE system_control ADD COLUMN IF NOT EXISTS cooldown_max_cycles INTEGER NOT NULL DEFAULT 1`,
      `ALTER TABLE system_control ADD COLUMN IF NOT EXISTS cycle_count INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE system_control ADD COLUMN IF NOT EXISTS window_started_at TIMESTAMP WITH TIME ZONE`,
      `ALTER TABLE system_control ADD COLUMN IF NOT EXISTS last_dosing_at TIMESTAMP WITH TIME ZONE`
    ];

    for (const sql of alterQueries) {
      try {
        await executeQuery(sql);
      } catch (e: any) {
        console.warn('ALTER system_control note:', e.message);
      }
    }

    await executeQuery(`
      INSERT INTO system_control (id, pump_mode, pump_state, target_ppm_min, target_ppm_max, cooldown_minutes, cooldown_enabled, cooldown_max_cycles, cycle_count)
      VALUES ('default', 'auto', false, 560.0, 840.0, 60, true, 1, 0)
      ON CONFLICT (id) DO NOTHING;
    `);
  } catch (err: any) {
    console.warn('ensureSchemaUpdated notice:', err.message);
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
    await ensureSchemaUpdated();
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
export async function getSensorLogs(limit = 30): Promise<SensorLog[]> {
  if (!isDbConfigured()) {
    return mockDB.logs.slice(-limit).reverse();
  }

  try {
    const rows = await executeQuery<SensorLog>(
      `SELECT id, created_at, adc_raw, tegangan, ppm_raw, ppm_stabil, status_pompa
       FROM sensor_logs
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows; // Mengembalikan urutan terbaru ke yang lama (Newest First)
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
    // Reset otomatis di mock DB jika timer jendela waktu telah habis
    if (mockDB.control.window_started_at && (mockDB.control.cycle_count ?? 0) > 0) {
      const windowMs = new Date(mockDB.control.window_started_at).getTime();
      const elapsed = Math.round((Date.now() - windowMs) / 1000);
      const totalSecs = (mockDB.control.cooldown_minutes || 60) * 60;
      if (elapsed >= totalSecs) {
        mockDB.control.cycle_count = 0;
        mockDB.control.window_started_at = undefined;
      }
    }
    return mockDB.control;
  }

  const queryControl = async () => {
    const rows = await executeQuery<any>(
      `SELECT id, pump_mode, pump_state, target_ppm_min, target_ppm_max, 
              COALESCE(cooldown_minutes, 60) AS cooldown_minutes, 
              COALESCE(cooldown_enabled, true) AS cooldown_enabled,
              COALESCE(cooldown_max_cycles, 1) AS cooldown_max_cycles,
              COALESCE(cycle_count, 0) AS cycle_count,
              window_started_at,
              last_dosing_at, updated_at
       FROM system_control
       WHERE id = 'default'
       LIMIT 1`
    );
    if (rows && rows.length > 0) {
      let cycleCount = Number(rows[0].cycle_count ?? 0);
      let windowStarted = rows[0].window_started_at ? String(rows[0].window_started_at) : undefined;
      const cooldownMins = Number(rows[0].cooldown_minutes ?? 60);

      // RESET OTOMATIS: Jika jendela jeda sudah selesai, reset siklus ke 0
      if (windowStarted && cycleCount > 0) {
        const windowMs = new Date(windowStarted).getTime();
        const elapsedSecs = Math.round((Date.now() - windowMs) / 1000);
        if (elapsedSecs >= cooldownMins * 60) {
          cycleCount = 0;
          windowStarted = undefined;
          // Sinkronkan reset ke database Postgres secara background
          executeQuery(`UPDATE system_control SET cycle_count = 0, window_started_at = NULL WHERE id = 'default'`).catch(() => {});
        }
      }

      return {
        id: 'default',
        pump_mode: (rows[0].pump_mode === 'manual' ? 'manual' : 'auto') as 'auto' | 'manual',
        pump_state: Boolean(rows[0].pump_state),
        cooldown_minutes: cooldownMins,
        target_ppm_min: Number(rows[0].target_ppm_min ?? 560),
        target_ppm_max: Number(rows[0].target_ppm_max ?? 840),
        cooldown_enabled: Boolean(rows[0].cooldown_enabled ?? true),
        cooldown_max_cycles: Number(rows[0].cooldown_max_cycles ?? 1),
        cycle_count: cycleCount,
        window_started_at: windowStarted,
        last_dosing_at: rows[0].last_dosing_at ? String(rows[0].last_dosing_at) : undefined,
        updated_at: rows[0].updated_at ? String(rows[0].updated_at) : undefined,
      };
    }
    return null;
  };

  try {
    const control = await queryControl();
    if (control) return control;

    await ensureSchemaUpdated();
    const retryControl = await queryControl();
    if (retryControl) return retryControl;

    return {
      id: 'default',
      pump_mode: 'auto',
      pump_state: false,
      target_ppm_min: 560.0,
      target_ppm_max: 840.0,
      cooldown_minutes: 60,
      cooldown_enabled: true,
      cooldown_max_cycles: 1,
      cycle_count: 0,
    };
  } catch (error: any) {
    console.warn('Fallback getSystemControl schema check:', error.message);
    try {
      await ensureSchemaUpdated();
      const retryControl = await queryControl();
      if (retryControl) return retryControl;
    } catch (e: any) {
      console.warn('Second attempt getSystemControl failed:', e.message);
    }
    return mockDB.control;
  }
}

/**
 * Memperbarui status kontrol pompa, batas ambang nutrisi, & jeda cooldown dari Web Dashboard
 * Menggunakan UPSERT (INSERT ... ON CONFLICT DO UPDATE) agar selalu berhasil 100%!
 */
export async function updatePumpControl(params: {
  mode?: 'auto' | 'manual';
  state?: boolean;
  target_ppm_min?: number;
  target_ppm_max?: number;
  cooldown_minutes?: number;
  cooldown_enabled?: boolean;
  cooldown_max_cycles?: number;
  cycle_count?: number;
  window_started_at?: string | null;
  last_dosing_at?: string | null;
  reset_cooldown?: boolean;
}): Promise<SystemControl> {
  const current = await getSystemControl();
  const newMode = params.mode ?? current.pump_mode ?? 'auto';
  const newState = params.state !== undefined ? Boolean(params.state) : (current.pump_state ?? false);
  const newMin = params.target_ppm_min !== undefined ? Number(params.target_ppm_min) : (current.target_ppm_min ?? 560);
  const newMax = params.target_ppm_max !== undefined ? Number(params.target_ppm_max) : (current.target_ppm_max ?? 840);
  const newCooldown = params.cooldown_minutes !== undefined ? Number(params.cooldown_minutes) : (current.cooldown_minutes ?? 60);
  const newCooldownEnabled = params.cooldown_enabled !== undefined ? Boolean(params.cooldown_enabled) : (current.cooldown_enabled ?? true);
  const newMaxCycles = params.cooldown_max_cycles !== undefined ? Math.max(1, Number(params.cooldown_max_cycles)) : (current.cooldown_max_cycles ?? 1);
  const newCycleCount = params.reset_cooldown ? 0 : (params.cycle_count !== undefined ? Number(params.cycle_count) : (current.cycle_count ?? 0));
  
  // Pastikan string ISO atau null murni (JANGAN PERNAH undefined)
  const newWindowStarted = params.reset_cooldown 
    ? null 
    : (params.window_started_at !== undefined 
        ? (params.window_started_at ? new Date(params.window_started_at).toISOString() : null)
        : (current.window_started_at ? new Date(current.window_started_at).toISOString() : null));

  const newLastDosing = params.reset_cooldown 
    ? null 
    : (params.last_dosing_at !== undefined 
        ? (params.last_dosing_at ? new Date(params.last_dosing_at).toISOString() : null)
        : (current.last_dosing_at ? new Date(current.last_dosing_at).toISOString() : null));

  if (!isDbConfigured()) {
    mockDB.control.pump_mode = newMode;
    mockDB.control.pump_state = newState;
    mockDB.control.target_ppm_min = newMin;
    mockDB.control.target_ppm_max = newMax;
    mockDB.control.cooldown_minutes = newCooldown;
    mockDB.control.cooldown_enabled = newCooldownEnabled;
    mockDB.control.cooldown_max_cycles = newMaxCycles;
    mockDB.control.cycle_count = newCycleCount;
    mockDB.control.window_started_at = newWindowStarted || undefined;
    mockDB.control.last_dosing_at = newLastDosing || undefined;
    mockDB.control.updated_at = new Date().toISOString();
    return mockDB.control;
  }

  // Parameter yang dijamin 100% bebas 'undefined'
  const queryParams = [
    newMode,
    newState,
    newMin,
    newMax,
    newCooldown,
    newCooldownEnabled,
    newMaxCycles,
    newCycleCount,
    newWindowStarted,
    newLastDosing
  ];

  const executeUpsert = async () => {
    const rows = await executeQuery<any>(
      `INSERT INTO system_control (id, pump_mode, pump_state, target_ppm_min, target_ppm_max, cooldown_minutes, cooldown_enabled, cooldown_max_cycles, cycle_count, window_started_at, last_dosing_at, updated_at)
       VALUES ('default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (id) DO UPDATE
       SET pump_mode = EXCLUDED.pump_mode,
           pump_state = EXCLUDED.pump_state,
           target_ppm_min = EXCLUDED.target_ppm_min,
           target_ppm_max = EXCLUDED.target_ppm_max,
           cooldown_minutes = EXCLUDED.cooldown_minutes,
           cooldown_enabled = EXCLUDED.cooldown_enabled,
           cooldown_max_cycles = EXCLUDED.cooldown_max_cycles,
           cycle_count = ${params.reset_cooldown ? '0' : 'EXCLUDED.cycle_count'},
           window_started_at = ${params.reset_cooldown ? 'NULL' : 'COALESCE(EXCLUDED.window_started_at, system_control.window_started_at)'},
           last_dosing_at = ${params.reset_cooldown ? 'NULL' : 'COALESCE(EXCLUDED.last_dosing_at, system_control.last_dosing_at)'},
           updated_at = NOW()
       RETURNING id, pump_mode, pump_state, target_ppm_min, target_ppm_max, cooldown_minutes, cooldown_enabled, cooldown_max_cycles, cycle_count, window_started_at, last_dosing_at, updated_at`,
      queryParams
    );
    const r = rows[0];
    return {
      id: 'default',
      pump_mode: (r.pump_mode === 'manual' ? 'manual' : 'auto') as 'auto' | 'manual',
      pump_state: Boolean(r.pump_state),
      cooldown_minutes: Number(r.cooldown_minutes ?? 60),
      target_ppm_min: Number(r.target_ppm_min ?? 560),
      target_ppm_max: Number(r.target_ppm_max ?? 840),
      cooldown_enabled: Boolean(r.cooldown_enabled ?? true),
      cooldown_max_cycles: Number(r.cooldown_max_cycles ?? 1),
      cycle_count: Number(r.cycle_count ?? 0),
      window_started_at: r.window_started_at ? String(r.window_started_at) : undefined,
      last_dosing_at: r.last_dosing_at ? String(r.last_dosing_at) : undefined,
      updated_at: r.updated_at ? String(r.updated_at) : undefined,
    };
  };

  try {
    return await executeUpsert();
  } catch (err: any) {
    console.warn('First UPSERT attempt failed, running ensureSchemaUpdated:', err.message);
    await ensureSchemaUpdated();
    return await executeUpsert();
  }
}
