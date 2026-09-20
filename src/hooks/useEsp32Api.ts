import { useState, useEffect, useRef, useCallback } from 'react';
import type { 
  Esp32TelemetryResponse, 
  Esp32Config, 
  ClientConnectionStatus, 
  ScadaLogItem 
} from '../types/scada.ts';

const CONFIG_STORAGE_KEY = 'NWT2026_ESP32_SCADA_CONFIG_PROD';

// Standard-Netzwerkadressen gemaess Spezifikation:
// Access-Point-Modus: http://192.168.4.1
// Authentifizierung: Zwingender Parameter ?key=NWT-2026-SORT-X79
const DEFAULT_CONFIG: Esp32Config = {
  baseUrl: 'http://192.168.4.1',
  apiKey: 'NWT-2026-SORT-X79',
  pollingIntervalMs: 500,
};

const INITIAL_TELEMETRY: Esp32TelemetryResponse = {
  running: false,
  status: 'STANDBY',
  error: 'Kein Fehler',
  cycle_ms: 1500,
  slots: [0, 0, 0],
  stats: {
    total: 0,
    red: 0,
    white: 0,
    unknown: 0,
  },
  sensor: {
    detected: 'LEER',
    r: 0,
    g: 0,
    b: 0,
    c: 0,
  },
};

export function useEsp32Api() {
  const [config, setConfig] = useState<Esp32Config>(() => {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          baseUrl: parsed.baseUrl || DEFAULT_CONFIG.baseUrl,
          apiKey: parsed.apiKey || DEFAULT_CONFIG.apiKey,
          pollingIntervalMs: parsed.pollingIntervalMs || DEFAULT_CONFIG.pollingIntervalMs,
        };
      }
    } catch (err) {
      console.warn('Fehler beim Laden der gespeicherten Konfiguration', err);
    }
    return DEFAULT_CONFIG;
  });

  const [telemetry, setTelemetry] = useState<Esp32TelemetryResponse>(INITIAL_TELEMETRY);
  const [connectionStatus, setConnectionStatus] = useState<ClientConnectionStatus>('GETRENNT');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [mixedContentWarning, setMixedContentWarning] = useState<string | null>(null);
  const [logs, setLogs] = useState<ScadaLogItem[]>([
    {
      id: 'log-init',
      timestamp: new Date().toLocaleTimeString('de-DE', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0'),
      type: 'SYS',
      message: 'SCADA Leitstand initialisiert. Ziel: ' + (config.baseUrl || 'http://192.168.4.1'),
    },
  ]);

  const consecutiveErrorsRef = useRef<number>(0);
  const isRequestInProgressRef = useRef<boolean>(false);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef<Esp32Config>(config);
  const isConnectedRef = useRef<boolean>(false);

  useEffect(() => {
    configRef.current = config;
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (err) {
      console.warn('Fehler beim Speichern der Konfiguration', err);
    }
  }, [config]);

  const addLog = useCallback((type: ScadaLogItem['type'], message: string, latency?: number) => {
    const timeStr = new Date().toLocaleTimeString('de-DE', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0');
    setLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: timeStr,
        type,
        message,
        latencyMs: latency,
      },
      ...prev.slice(0, 199),
    ]);
  }, []);

  // URL-Erstellung gemaess Controller-Spezifikation:
  // Single-Endpoint: <baseUrl>/api?key=<apiKey>&cmd=<cmd>...
  const buildRequestUrl = useCallback((cmd: string, params?: Record<string, string | number>) => {
    const currentCfg = configRef.current;
    let base = currentCfg.baseUrl.trim();
    if (base.endsWith('/')) {
      base = base.slice(0, -1);
    }

    const query = new URLSearchParams();
    query.set('key', currentCfg.apiKey.trim());
    query.set('cmd', cmd);

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        query.set(k, String(v));
      });
    }

    return `${base}/api?${query.toString()}`;
  }, []);

  // Universelle REST-Anfrage mit AbortController Timeout (2000 ms)
  const sendRequest = useCallback(async (
    cmd: string,
    params?: Record<string, string | number>,
    isManual = false
  ): Promise<boolean> => {
    const currentCfg = configRef.current;
    const startTime = performance.now();
    const url = buildRequestUrl(cmd, params);

    // Pruefung auf Mixed-Content (HTTPS-Host versucht HTTP-Ziel aufzurufen)
    const isHttpsContext = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isHttpTarget = currentCfg.baseUrl.trim().toLowerCase().startsWith('http://');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': currentCfg.apiKey.trim(),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const roundTrip = Math.round(performance.now() - startTime);

      if (res.status === 401) {
        consecutiveErrorsRef.current += 1;
        setConnectionStatus('FEHLER');
        isConnectedRef.current = false;
        setLatencyMs(roundTrip);
        addLog('ERROR', `ESP32 Authentifizierungsfehler (HTTP 401): Ungueltiger API-Key '${currentCfg.apiKey}'`, roundTrip);
        return false;
      }

      if (!res.ok) {
        throw new Error(`HTTP-Status ${res.status} ${res.statusText}`);
      }

      const data: Esp32TelemetryResponse = await res.json();

      // Erfolgreich empfangen
      consecutiveErrorsRef.current = 0;
      setMixedContentWarning(null);
      setLatencyMs(roundTrip);
      setLastHeartbeat(new Date());
      setTelemetry(data);
      setConnectionStatus('ONLINE');
      isConnectedRef.current = true;

      if (isManual) {
        addLog('CMD', `Befehl '${cmd}' ausgefuehrt: Status ${data.status}, Takt ${data.cycle_ms}ms`, roundTrip);
      }

      return true;
    } catch (err: unknown) {
      const roundTrip = Math.round(performance.now() - startTime);
      consecutiveErrorsRef.current += 1;

      // Wenn im HTTPS-Kontext ein HTTP-Endpunkt fehlschlaegt, ist dies typischerweise eine Browser-Blockade
      if (isHttpsContext && isHttpTarget) {
        const warningMsg = "Mixed-Content-Blockade: Browser blockiert lokale HTTP-Aufrufe. Bitte Seite lokal ueber HTTP ausfuehren oder im Browser 'Unsichere Inhalte' fuer diese Seite aktivieren.";
        setMixedContentWarning(warningMsg);
      }

      // Sofortiger Status-Uebergang bei Verbindungsverlust
      if (consecutiveErrorsRef.current >= 2) {
        setConnectionStatus('FEHLER');
        isConnectedRef.current = false;
        setLatencyMs(null);
      } else if (!isConnectedRef.current) {
        setConnectionStatus('VERBINDE...');
      }

      const errMsg = err instanceof Error ? err.message : 'Verbindungsfehler';

      if (isManual) {
        addLog('ERROR', `Fehler bei Befehl '${cmd}': ${errMsg}`, roundTrip);
      } else if (consecutiveErrorsRef.current === 2) {
        addLog('WARN', `Verbindung zu ESP32 unterbrochen (${errMsg}) @ ${currentCfg.baseUrl}`, roundTrip);
      }

      return false;
    }
  }, [buildRequestUrl, addLog]);

  // SCADA-Polling-Engine:
  // - Wenn verbunden: zyklisch alle 500 ms (oder dyn. cycle_ms / 2) GET_STATUS
  // - Bei Verbindungsverlust: Stoppen des schnellen Pollings; periodischer Reconnect alle 3000 ms
  useEffect(() => {
    let isActive = true;

    const runEngine = async () => {
      if (!isActive) return;

      if (!isRequestInProgressRef.current) {
        isRequestInProgressRef.current = true;
        await sendRequest('GET_STATUS', undefined, false);
        isRequestInProgressRef.current = false;
      }

      if (!isActive) return;

      // Dynamisches Zeitintervall:
      // Bei ONLINE: 500ms (oder halbe Zykluszeit, wenn definiert)
      // Bei FEHLER / GETRENNT: Reconnect-Zyklus alle 3000ms
      let nextDelay = 3000;
      if (isConnectedRef.current) {
        const dynInterval = telemetry.cycle_ms ? Math.floor(telemetry.cycle_ms / 2) : 500;
        nextDelay = Math.max(250, Math.min(1000, dynInterval));
      }

      pollingTimerRef.current = setTimeout(runEngine, nextDelay);
    };

    // Sofortiger Start des ersten Abrufversuchs
    setConnectionStatus('VERBINDE...');
    runEngine();

    return () => {
      isActive = false;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [config.baseUrl, config.apiKey, sendRequest]);

  // Externe Aktionen
  const executeCommand = useCallback(async (
    cmd: string,
    params?: Record<string, string | number>
  ): Promise<boolean> => {
    return sendRequest(cmd, params, true);
  }, [sendRequest]);

  const updateConfig = useCallback((partial: Partial<Esp32Config>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
    consecutiveErrorsRef.current = 0;
    setConnectionStatus('VERBINDE...');
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const triggerReconnectNow = useCallback(() => {
    consecutiveErrorsRef.current = 0;
    setConnectionStatus('VERBINDE...');
    sendRequest('GET_STATUS', undefined, false);
  }, [sendRequest]);

  return {
    telemetry,
    connectionStatus,
    latencyMs,
    lastHeartbeat,
    config,
    mixedContentWarning,
    updateConfig,
    executeCommand,
    logs,
    clearLogs,
    triggerReconnectNow,
  };
}
