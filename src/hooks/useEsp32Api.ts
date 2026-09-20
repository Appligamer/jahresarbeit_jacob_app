import { useState, useEffect, useRef, useCallback } from 'react';
import type { 
  Esp32TelemetryResponse, 
  Esp32Config, 
  ClientConnectionStatus, 
  ScadaLogItem 
} from '../types/scada.ts';

const CONFIG_STORAGE_KEY = 'NWT2026_ESP32_SCADA_CONFIG_PROD';

const isIpAddressOrLocal = (hostname: string): boolean => {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname === 'localhost' || hostname === '127.0.0.1';
};

const getInitialBaseUrl = (): string => {
  if (typeof window === 'undefined') return 'http://192.168.4.1';
  
  // 1. URL-Parameter Prioritaet (?host= oder ?baseUrl=)
  const urlParams = new URLSearchParams(window.location.search);
  const urlHost = urlParams.get('host') || urlParams.get('baseUrl');
  if (urlHost) return urlHost;

  // 2. Same-Origin Auto-Detection: Wenn Frontend direkt vom ESP32 oder lokaler IP ausgeliefert wird
  if (isIpAddressOrLocal(window.location.hostname)) {
    return window.location.origin;
  }

  // 3. LocalStorage gespeicherte Konfiguration
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.baseUrl) return parsed.baseUrl;
    }
  } catch (err) {
    console.warn('Fehler beim Laden der gespeicherten Konfiguration', err);
  }

  // 4. Default Fallback
  return 'http://192.168.4.1';
};

const getInitialApiKey = (): string => {
  if (typeof window === 'undefined') return 'NWT-2026-SORT-X79';
  const urlParams = new URLSearchParams(window.location.search);
  const urlKey = urlParams.get('apiKey') || urlParams.get('key');
  if (urlKey) return urlKey;

  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey) return parsed.apiKey;
    }
  } catch {
    // ignore
  }

  return 'NWT-2026-SORT-X79';
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
  const [config, setConfig] = useState<Esp32Config>(() => ({
    baseUrl: getInitialBaseUrl(),
    apiKey: getInitialApiKey(),
    pollingIntervalMs: 500,
  }));

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

  // Synchronisiere Ref und LocalStorage
  useEffect(() => {
    configRef.current = config;
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (err) {
      console.warn('Fehler beim Speichern der Konfiguration', err);
    }
  }, [config]);

  // Permanente Mixed-Content & PNA Diagnose
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isHttps = window.location.protocol === 'https:';
      const isHttpTarget = config.baseUrl.trim().toLowerCase().startsWith('http://');
      if (isHttps && isHttpTarget) {
        setMixedContentWarning(
          'Achtung: Cloud-HTTPS-Modus aktiv. Direkte HTTP-Verbindungen zu lokalen IPs werden vom Browser blockiert. Nutze entweder einen HTTPS-Tunnel (z. B. Cloudflare Tunnel ueber den Heimserver) oder oeffne die Standalone-Version lokal ueber HTTP.'
        );
      } else {
        setMixedContentWarning(null);
      }
    }
  }, [config.baseUrl]);

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
      ...prev.slice(0, 249),
    ]);
  }, []);

  // URL-Erstellung gemaess Spezifikation: Single-Endpoint <baseUrl>/api?key=...&cmd=...
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

  // REST-Anfrage mit AbortController Timeout (2000 ms) & Latenz-Tracking
  const sendRequest = useCallback(async (
    cmd: string,
    params?: Record<string, string | number>,
    isManual = false
  ): Promise<boolean> => {
    const currentCfg = configRef.current;
    const startTime = performance.now();
    const url = buildRequestUrl(cmd, params);

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

      consecutiveErrorsRef.current = 0;
      setLatencyMs(roundTrip);
      setLastHeartbeat(new Date());
      setTelemetry(data);
      setConnectionStatus('ONLINE');
      isConnectedRef.current = true;

      if (isManual) {
        addLog('CMD', `Befehl '${cmd}' bestaetigt: Status ${data.status}, Takt ${data.cycle_ms}ms`, roundTrip);
      } else {
        // Zyklischer Telemetrie-Eintrag
        addLog('TELEMETRY', `Telemetrie empfangen: Status ${data.status} | Takt ${data.cycle_ms}ms | Slots [${data.slots.join(', ')}]`, roundTrip);
      }

      return true;
    } catch (err: unknown) {
      const roundTrip = Math.round(performance.now() - startTime);
      consecutiveErrorsRef.current += 1;

      if (consecutiveErrorsRef.current >= 2) {
        setConnectionStatus('FEHLER');
        isConnectedRef.current = false;
        setLatencyMs(null);
      } else if (!isConnectedRef.current) {
        setConnectionStatus('VERBINDE...');
      }

      const errMsg = err instanceof Error ? err.message : 'Netzwerkfehler';

      if (isManual) {
        addLog('ERROR', `Fehler bei Befehl '${cmd}': ${errMsg} @ ${url}`, roundTrip);
      } else {
        addLog('WARN', `Verbindung zu ESP32 unterbrochen (${errMsg}) @ ${currentCfg.baseUrl} [${roundTrip}ms]`, roundTrip);
      }

      return false;
    }
  }, [buildRequestUrl, addLog]);

  // SCADA-Polling-Engine
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

      let nextDelay = 3000;
      if (isConnectedRef.current) {
        const dynInterval = telemetry.cycle_ms ? Math.floor(telemetry.cycle_ms / 2) : 500;
        nextDelay = Math.max(250, Math.min(1000, dynInterval));
      }

      pollingTimerRef.current = setTimeout(runEngine, nextDelay);
    };

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

  // Befehl: SET_WIFI zur dynamischen NVS-Flash-Speicherung von WLAN-Daten
  const configureWifi = useCallback(async (ssid: string, pass: string): Promise<boolean> => {
    const success = await sendRequest('SET_WIFI', { ssid, pass }, true);
    if (success) {
      addLog('SYS', 'WLAN-Daten an ESP32 uebertragen. Controller fuehrt Neustart durch (ca. 10s Wartezeit)...');
    }
    return success;
  }, [sendRequest, addLog]);

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
    configureWifi,
    logs,
    clearLogs,
    triggerReconnectNow,
  };
}
