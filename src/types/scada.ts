// ======================================================================
// SCADA & MECHATRONIK KONTRAKT - ESP32 TISCHTENNISBALL FARBSORTIERANLAGE
// ======================================================================

// 0 = LEER, 1 = ROT, 2 = WEISS, 99 = UNBEKANNT
export type SlotBall = 0 | 1 | 2 | 99;

export type SystemStatusText = 'AUTOMATIK' | 'GESTOPPT' | 'STANDBY';

export type SensorDetected = 'LEER' | 'ROT' | 'WEISS' | 'UNBEKANNT' | 'SENSOR_FEHLT';

export interface Esp32SensorData {
  detected: SensorDetected;
  r: number;
  g: number;
  b: number;
  c: number;
}

export interface Esp32Stats {
  total: number;
  red: number;
  white: number;
  unknown: number;
}

// Exakte JSON-Antwortstruktur des ESP32 gemäß Spezifikation
export interface Esp32TelemetryResponse {
  running: boolean;
  status: SystemStatusText;
  error: string;
  cycle_ms: number;
  slots: [SlotBall, SlotBall, SlotBall]; // Index 0: Sensor, Index 1: Auswurf Rot, Index 2: Auswurf Weiss
  stats: Esp32Stats;
  sensor: Esp32SensorData;
}

export interface Esp32AuthError {
  error: string;
}

export type ClientConnectionStatus = 'ONLINE' | 'STANDBY' | 'OFFLINE' | 'AUTH_ERROR';

export interface Esp32Config {
  baseUrl: string;
  apiKey: string;
  pollingIntervalMs: number;
  useProxyFallback: boolean;
}

export interface ScadaLogItem {
  id: string;
  timestamp: string;
  type: 'CMD' | 'TELEMETRY' | 'ERROR' | 'WARN' | 'SYS';
  message: string;
  latencyMs?: number;
}
