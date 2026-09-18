import { useState, useEffect, useRef, useCallback } from 'react';
import type { 
  TelemetryPayload, 
  LogPayload, 
  OutgoingCommand, 
  ConnectionState, 
  ConnectionConfig 
} from '../types/scada.ts';

const DEFAULT_CONFIG: ConnectionConfig = {
  host: typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1',
  port: typeof window !== 'undefined' && window.location.port ? Number(window.location.port) : 3000,
  path: '/ws',
  protocol: typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws',
  autoReconnect: true,
  reconnectIntervalMs: 2500,
};

const STORAGE_KEY = 'scada_esp32_connection_config';

export function useEsp32WebSocket() {
  const [config, setConfig] = useState<ConnectionConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_CONFIG;
  });

  const [connectionState, setConnectionState] = useState<ConnectionState>('OFFLINE');
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryPayload>({
    status: 'STOPPED',
    uptime_sec: 0,
    current_cycle_time_ms: 1200,
    conveyor_array: [0, 0, 0, 0, 0],
    sensor_raw: { r: 0, g: 0, b: 0, clear: 0 },
    sensor_detected: 'LEER',
    stats: {
      total_processed: 0,
      count_red: 0,
      count_white: 0,
      count_error: 0,
      throughput_bpm: 0,
    },
  });
  const [logs, setLogs] = useState<LogPayload[]>([]);
  const [minCycleTime, setMinCycleTime] = useState<number | null>(null);
  const [maxCycleTime, setMaxCycleTime] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pingSentTimeRef = useRef<number>(0);
  const manualDisconnectRef = useRef<boolean>(false);

  // Save config changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  const addLog = useCallback((log: LogPayload) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setLogs((prev) => [
      { ...log, id },
      ...prev.slice(0, 499), // keep last 500 logs
    ]);
  }, []);

  const sendCommand = useCallback((cmd: OutgoingCommand): boolean => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog({
        timestamp: new Date().toLocaleTimeString('de-DE', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(Date.now() % 1000).padStart(3, '0'),
        level: 'WARN',
        message: `Befehl ${cmd.command} nicht gesendet: Keine aktive WebSocket-Verbindung.`,
      });
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify(cmd));
      return true;
    } catch (err) {
      addLog({
        timestamp: new Date().toLocaleTimeString('de-DE', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(Date.now() % 1000).padStart(3, '0'),
        level: 'ERROR',
        message: `Fehler beim Senden von ${cmd.command}: ${err instanceof Error ? err.message : 'Unbekannt'}`,
      });
      return false;
    }
  }, [addLog]);

  const connect = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    manualDisconnectRef.current = false;
    setConnectionState('CONNECTING');

    // Build URL: if port is 80 or 443 or already in host, handle cleanly
    let url = '';
    const hostWithPort = config.port && config.port !== 80 && config.port !== 443 
      ? `${config.host}:${config.port}` 
      : config.host;
    const cleanPath = config.path.startsWith('/') ? config.path : `/${config.path}`;
    url = `${config.protocol}://${hostWithPort}${cleanPath}`;

    try {
      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = () => {
        setConnectionState('ONLINE');
        addLog({
          timestamp: new Date().toLocaleTimeString('de-DE', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(Date.now() % 1000).padStart(3, '0'),
          level: 'INFO',
          message: `WebSocket-Verbindung hergestellt zu ${url}`,
        });

        // Start ping interval
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            pingSentTimeRef.current = performance.now();
            socket.send(JSON.stringify({ command: 'PING', timestamp: Date.now() }));
          }
        }, 5000);
      };

      socket.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          
          if (raw.event === 'TELEMETRY' && raw.payload) {
            const data = raw.payload as TelemetryPayload;
            setTelemetry(data);
            
            if (data.current_cycle_time_ms && data.current_cycle_time_ms > 0) {
              setMinCycleTime((prev) => prev === null ? data.current_cycle_time_ms : Math.min(prev, data.current_cycle_time_ms));
              setMaxCycleTime((prev) => prev === null ? data.current_cycle_time_ms : Math.max(prev, data.current_cycle_time_ms));
            }
          } else if (raw.event === 'LOG' && raw.payload) {
            addLog(raw.payload as LogPayload);
          } else if (raw.event === 'PONG') {
            const rtt = Math.round(performance.now() - pingSentTimeRef.current);
            setPingMs(Math.max(1, rtt));
          } else if (raw.type === 'PONG') {
            const rtt = Math.round(performance.now() - pingSentTimeRef.current);
            setPingMs(Math.max(1, rtt));
          }
        } catch {
          // Non-JSON or raw text
        }
      };

      socket.onerror = () => {
        setConnectionState('OFFLINE');
      };

      socket.onclose = () => {
        setConnectionState('OFFLINE');
        setPingMs(null);
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (!manualDisconnectRef.current && config.autoReconnect) {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, config.reconnectIntervalMs);
        }
      };
    } catch (err) {
      setConnectionState('OFFLINE');
      addLog({
        timestamp: new Date().toLocaleTimeString('de-DE', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(Date.now() % 1000).padStart(3, '0'),
        level: 'ERROR',
        message: `WebSocket Verbindungsfehler: ${err instanceof Error ? err.message : 'Verbindung verweigert'}`,
      });
    }
  }, [config, addLog]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState('OFFLINE');
    setPingMs(null);
    addLog({
      timestamp: new Date().toLocaleTimeString('de-DE', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(Date.now() % 1000).padStart(3, '0'),
      level: 'INFO',
      message: 'WebSocket-Verbindung manuell getrennt.',
    });
  }, [addLog]);

  const updateConfig = useCallback((newConfig: Partial<ConnectionConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Initial connection on mount
  useEffect(() => {
    connect();
    return () => {
      manualDisconnectRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    connectionState,
    pingMs,
    telemetry,
    logs,
    minCycleTime,
    maxCycleTime,
    config,
    updateConfig,
    connect,
    disconnect,
    sendCommand,
    clearLogs,
  };
}
