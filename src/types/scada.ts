// ======================================================================
// SCADA & MECHATRONIK KONTRAKT - ESP32 TISCHTENNISBALL FARBSORTIERANLAGE
// NWT-Jahresarbeit 2026 - Entwickler: Jacob Glathe
// ======================================================================

// 0 = LEER, 1 = ROT, 2 = WEISS, 99 = FEHLER / UNBEKANNT
export type SlotBall = number;

export type SystemStatusText = 'AUTOMATIK' | 'GESTOPPT' | 'STANDBY' | string;

export type SensorDetected = 'LEER' | 'ROT' | 'WEISS' | 'UNBEKANNT' | 'SENSOR_FEHLT' | string;

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

// Exakte JSON-Telemetriestruktur vom ESP32
// Modulare FIFO-Schieberegister-Definition (Array beliebiger Laenge N)
export interface Esp32TelemetryResponse {
  running: boolean;
  status: SystemStatusText;
  error: string;
  cycle_ms: number;
  slots: SlotBall[];
  stats: Esp32Stats;
  sensor: Esp32SensorData;
}

export type ClientConnectionStatus = 'GETRENNT' | 'VERBINDE...' | 'ONLINE' | 'FEHLER';

export interface Esp32Config {
  baseUrl: string;
  apiKey: string;
  pollingIntervalMs: number;
}

export interface ScadaLogItem {
  id: string;
  timestamp: string;
  type: 'CMD' | 'TELEMETRY' | 'ERROR' | 'WARN' | 'SYS';
  message: string;
  latencyMs?: number;
}

// Modulare Konfigurationstabelle fuer die Stationen des Foerderbands
export interface StationConfig {
  index: number;
  name: string;
  description: string;
  hardware: string;
  distanceMm: number;
}
