// SCADA & Mechatronics Types for ESP32 Table Tennis Ball Sorter

export type SlotState = 0 | 1 | 2 | 99;

export type SystemRunStatus = 'RUNNING' | 'STOPPED' | 'PAUSED' | 'ERROR';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface SensorRaw {
  r: number;
  g: number;
  b: number;
  clear: number;
}

export interface MachineStats {
  total_processed: number;
  count_red: number;
  count_white: number;
  count_error: number;
  throughput_bpm: number;
}

export interface TelemetryPayload {
  status: SystemRunStatus;
  uptime_sec: number;
  current_cycle_time_ms: number;
  conveyor_array: SlotState[];
  sensor_raw: SensorRaw;
  sensor_detected: 'ROT' | 'WEISS' | 'LEER' | 'UNBEKANNT';
  stats: MachineStats;
  ejector_active?: {
    station: number;
    active: boolean;
  };
  sensor_active?: boolean;
}

export interface LogPayload {
  id?: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

export type OutgoingCommand = 
  | { command: 'START' }
  | { command: 'STOP' }
  | { command: 'PAUSE' }
  | { command: 'RESET_STATS' }
  | { command: 'MANUAL_STEP' }
  | { command: 'TRIGGER_EJECTOR'; station: number }
  | { command: 'SET_STEP_DELAY'; delay_ms: number }
  | { command: 'PING'; timestamp: number };

export type ConnectionState = 'ONLINE' | 'OFFLINE' | 'CONNECTING';

export interface ConnectionConfig {
  host: string;
  port: number;
  path: string;
  protocol: 'ws' | 'wss';
  autoReconnect: boolean;
  reconnectIntervalMs: number;
}
