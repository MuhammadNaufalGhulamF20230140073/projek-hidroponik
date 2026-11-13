-- ============================================================
-- SKEMA DATABASE VERCEL POSTGRES / NEON (PROJEK HIDROPONIK)
-- ============================================================

-- 1. Tabel Log Sensor (Data dikirim berkala oleh ESP32)
CREATE TABLE IF NOT EXISTS sensor_logs (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    adc_raw INTEGER NOT NULL,
    tegangan REAL NOT NULL,
    ppm_raw REAL NOT NULL,
    ppm_stabil REAL NOT NULL,
    status_pompa BOOLEAN NOT NULL DEFAULT false
);

-- Index waktu untuk kueri grafik yang cepat
CREATE INDEX IF NOT EXISTS idx_sensor_logs_created_at ON sensor_logs(created_at DESC);

-- 2. Tabel Kontrol Sistem & Pompa (Diatur via Web Dashboard / ESP32)
CREATE TABLE IF NOT EXISTS system_control (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
    pump_mode VARCHAR(16) NOT NULL DEFAULT 'auto', -- 'auto' (sesuai timer ESP32) atau 'manual' (override web)
    pump_state BOOLEAN NOT NULL DEFAULT false,     -- Status ON (true) / OFF (false)
    target_ppm_min REAL NOT NULL DEFAULT 560.0,
    target_ppm_max REAL NOT NULL DEFAULT 840.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Masukkan default row kontrol jika belum ada
INSERT INTO system_control (id, pump_mode, pump_state, target_ppm_min, target_ppm_max)
VALUES ('default', 'auto', false, 560.0, 840.0)
ON CONFLICT (id) DO NOTHING;

