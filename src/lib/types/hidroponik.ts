export interface SensorLog {
  id?: number;
  created_at?: string;
  adc_raw: number;
  tegangan: number;
  ppm_raw: number;
  ppm_stabil: number;
  status_pompa: boolean;
}

export interface SystemControl {
  id: string;
  pump_mode: 'auto' | 'manual';
  pump_state: boolean;
  target_ppm_min: number;
  target_ppm_max: number;
  cooldown_minutes: number;
  cooldown_enabled?: boolean;
  cooldown_max_cycles?: number;
  cycle_count?: number;
  window_started_at?: string;
  last_dosing_at?: string;
  updated_at?: string;
}

export interface DashboardData {
  latestLog: SensorLog | null;
  history: SensorLog[];
  control: SystemControl;
  isLive: boolean;
}

export type SolutionStatus = 'rendah' | 'optimal' | 'tinggi';

export interface CalibrationParams {
  calibrationFactor: number;
  calibrationSlope: number;
  calibrationOffset: number;
  emaAlpha: number;
  temperature: number;
  relayPin: number;
  tdsPin: number;
}
