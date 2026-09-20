import { useState, useEffect, useRef, useCallback } from 'react';
import type { 
  Esp32TelemetryResponse, 
  Esp32Config, 
  ClientConnectionStatus, 
  ScadaLogItem 
} from '../types/scada.ts';

const CONFIG_STORAGE_KEY = 'NWT2026_ESP32_SCADA_CONFIG_V1';

function getDefaultConfig(): Esp32Config {
  if (typeof window === 'undefined') {
    return {
      baseUrl: 'http://192.168.178.50',
      apiKey: 'NWT2026',
      pollingIntervalMs: 400,
      useProxyFallback: false,
    };
  }

  // Default to current host or typical ESP32 LAN IP
  const currentOrigin = window.location.origin;
  return {
    baseUrl: currentOrigin,
    apiKey: 'NWT2026',
    pollingIntervalMs: 400,
    useProxyFallback: false,
  };
}

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
    if (typeof window === 'undefined') return getDefaultConfig();
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        return { ...getDefaultConfig(), ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load saved SCADA config', e);
    }
    return getDefaultConfig();
  });

  const [telemetry, setTelemetry] = useState<Esp32TelemetryResponse>(INITIAL_TELEMETRY);
  const [connectionStatus, setConnectionStatus] = useState<ClientConnectionStatus>('STANDBY');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [logs, setLogs] = useState<ScadaLogItem[]>([
    {
      id: 'log-init',
      timestamp: new Date().toLocaleTimeString('de-DE', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0'),
      type: 'SYS',
      message: 'SCADA Leitstand initialisiert. Starte zyklische Abfrage (GET_STATUS)...',
    },
  ]);

  const consecutiveErrorsRef = useRef<number>(0);
  const isRequestInProgressRef = useRef<boolean>(false);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef<Esp32Config>(config);

  useEffect(() => {
    configRef.current = config;
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to persist SCADA config', e);
    }
  }, [config]);

  const addLog = useCallback((type: ScadaLogItem['type'], message: string, latency?: number) => {
    const timeStr = new Date().toLocaleTimeString('de-DE', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0');
    setLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: timeStr,
        type,
        message,
        latencyMs: latency,
      },
      ...prev.slice(0, 199),
    ]);
  }, []);

  // Construct target URL
  const buildRequestUrl = useCallback((cmd: string, params?: Record<string, string | number>, proxy = false) => {
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

    const directUrl = `${base}/api?${query.toString()}`;

    if (proxy && typeof window !== 'undefined' && !base.startsWith(window.location.origin)) {
      return `/api/proxy?targetUrl=${encodeURIComponent(directUrl)}`;
    }

    return directUrl;
  }, []);

  // Universal API Requester
  const sendRequest = useCallback(async (
    cmd: string,
    params?: Record<string, string | number>,
    isManual = false
  ): Promise<boolean> => {
    const currentCfg = configRef.current;
    const startTime = performance.now();
    const url = buildRequestUrl(cmd, params, currentCfg.useProxyFallback);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2800);

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
        setConnectionStatus('AUTH_ERROR');
        setLatencyMs(roundTrip);
        addLog('ERROR', `ESP32 Authentifizierungsfehler (HTTP 401): Ungültiger API-Key '${currentCfg.apiKey}'`, roundTrip);
        return false;
      }

      if (!res.ok) {
        throw new Error(`HTTP-Status ${res.status} ${res.statusText}`);
      }

      const data: Esp32TelemetryResponse = await res.json();
      
      // Successfully received valid telemetry payload
      consecutiveErrorsRef.current = 0;
      setLatencyMs(roundTrip);
      setLastHeartbeat(new Date());
      setTelemetry(data);

      if (data.running) {
        setConnectionStatus('ONLINE');
      } else if (data.status === 'STANDBY') {
        setConnectionStatus('STANDBY');
      } else {
        setConnectionStatus('ONLINE');
      }

      if (isManual) {
        addLog('CMD', `Befehl '${cmd}' erfolgreich ausgeführt: Status ${data.status}, Takt ${data.cycle_ms}ms`, roundTrip);
      }

      return true;
    } catch (err: unknown) {
      const roundTrip = Math.round(performance.now() - startTime);
      consecutiveErrorsRef.current += 1;

      // After 2 consecutive failures, switch to OFFLINE
      if (consecutiveErrorsRef.current >= 2) {
        setConnectionStatus('OFFLINE');
        setLatencyMs(null);
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

  // Polling cycle
  useEffect(() => {
    let isActive = true;

    const poll = async () => {
      if (!isActive) return;
      if (!isRequestInProgressRef.current) {
        isRequestInProgressRef.current = true;
        await sendRequest('GET_STATUS', undefined, false);
        isRequestInProgressRef.current = false;
      }

      if (isActive) {
        const interval = Math.max(250, Math.min(2000, config.pollingIntervalMs || 400));
        pollingTimerRef.current = setTimeout(poll, interval);
      }
    };

    poll();

    return () => {
      isActive = false;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, [config.baseUrl, config.apiKey, config.pollingIntervalMs, config.useProxyFallback, sendRequest]);

  // Public Actions
  const executeCommand = useCallback(async (
    cmd: string,
    params?: Record<string, string | number>
  ): Promise<boolean> => {
    return sendRequest(cmd, params, true);
  }, [sendRequest]);

  const updateConfig = useCallback((partial: Partial<Esp32Config>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const triggerPollingNow = useCallback(() => {
    sendRequest('GET_STATUS', undefined, false);
  }, [sendRequest]);

  return {
    telemetry,
    connectionStatus,
    latencyMs,
    lastHeartbeat,
    config,
    updateConfig,
    executeCommand,
    logs,
    clearLogs,
    triggerPollingNow,
  };
}
