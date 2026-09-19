import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import type { 
  TelemetryPayload, 
  LogPayload, 
  OutgoingCommand, 
  SlotState, 
  SystemRunStatus 
} from './src/types/scada.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Authoritative Machine State
let machineState: TelemetryPayload = {
  status: 'STOPPED',
  uptime_sec: 0,
  current_cycle_time_ms: 1200,
  conveyor_array: [0, 0, 0, 0, 0],
  sensor_raw: { r: 12, g: 15, b: 18, clear: 45 },
  sensor_detected: 'LEER',
  stats: {
    total_processed: 0,
    count_red: 0,
    count_white: 0,
    count_error: 0,
    throughput_bpm: 0,
  },
  ejector_active: {
    station: 0,
    active: false,
  },
  sensor_active: false,
};

// Rolling Log Buffer (last 500 events)
const recentLogs: LogPayload[] = [
  {
    id: 'init-1',
    timestamp: new Date().toLocaleTimeString('de-DE', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.000',
    level: 'INFO',
    message: 'SCADA Core Gateway gestartet. Bereit für ESP32 WebSocket & REST Telemetrie.',
  }
];

let uptimeTimer: NodeJS.Timeout | null = null;
let lastUptimeTimestamp = Date.now();

// Uptime tracker
setInterval(() => {
  if (machineState.status === 'RUNNING') {
    machineState.uptime_sec += 1;
    const bpm = machineState.current_cycle_time_ms > 0 ? (60000 / machineState.current_cycle_time_ms) : 0;
    machineState.stats.throughput_bpm = Number(bpm.toFixed(1));
  }
}, 1000);

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // WebSocket Server setup on /ws
  const wss = new WebSocketServer({ server, path: '/ws' });

  function broadcast(data: object) {
    const payload = JSON.stringify(data);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  function broadcastLog(level: 'INFO' | 'WARN' | 'ERROR', message: string) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('de-DE', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
      '.' + String(now.getMilliseconds()).padStart(3, '0');
    
    const logItem: LogPayload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: timeStr,
      level,
      message,
    };

    recentLogs.unshift(logItem);
    if (recentLogs.length > 500) recentLogs.pop();

    broadcast({
      event: 'LOG',
      payload: logItem,
    });
  }

  function handleIncomingCommand(cmd: OutgoingCommand, source: string) {
    switch (cmd.command) {
      case 'START':
        machineState.status = 'RUNNING';
        broadcastLog('INFO', `Maschine gestartet via ${source} (Automatik-Betrieb).`);
        break;

      case 'STOP':
        machineState.status = 'STOPPED';
        broadcastLog('WARN', `NOT-HALT / STOP ausgeführt via ${source}.`);
        break;

      case 'PAUSE':
        machineState.status = 'PAUSED';
        broadcastLog('INFO', `Maschine pausiert via ${source}.`);
        break;

      case 'RESET_STATS':
        machineState.stats = {
          total_processed: 0,
          count_red: 0,
          count_white: 0,
          count_error: 0,
          throughput_bpm: 0,
        };
        machineState.uptime_sec = 0;
        broadcastLog('INFO', `Zähler und Statistiken auf 0 zurückgesetzt (${source}).`);
        break;

      case 'SET_STEP_DELAY':
        if (typeof cmd.delay_ms === 'number' && cmd.delay_ms >= 300) {
          machineState.current_cycle_time_ms = cmd.delay_ms;
          const bpm = (60000 / cmd.delay_ms).toFixed(1);
          machineState.stats.throughput_bpm = machineState.status === 'RUNNING' ? Number(bpm) : 0;
          broadcastLog('INFO', `Taktzeit angepasst auf ${cmd.delay_ms} ms (~${bpm} BPM) via ${source}.`);
        }
        break;

      case 'MANUAL_STEP':
        // Shift conveyor array
        {
          const arr = [...machineState.conveyor_array];
          for (let i = arr.length - 1; i > 0; i--) {
            arr[i] = arr[i - 1];
          }
          arr[0] = 0;
          machineState.conveyor_array = arr;
          broadcastLog('INFO', `Manueller Einzeltakt (+75mm Vorschub) via ${source}.`);
        }
        break;

      case 'TRIGGER_EJECTOR':
        {
          const station = cmd.station || 1;
          machineState.ejector_active = { station, active: true };
          broadcastLog('INFO', `Manueller Auswurf Stößel Station ${station} getriggert via ${source}.`);
          setTimeout(() => {
            machineState.ejector_active = { station, active: false };
            broadcast({ event: 'TELEMETRY', payload: machineState });
          }, 300);
        }
        break;

      case 'PING':
        // Answer directly if sent over WS
        break;
    }

    // Broadcast updated telemetry
    broadcast({
      event: 'TELEMETRY',
      payload: machineState,
    });
  }

  // WebSocket connection lifecycle
  wss.on('connection', (ws, req) => {
    const remoteIp = req.socket.remoteAddress || 'unknown';
    broadcastLog('INFO', `Neuer Client verbunden: ${remoteIp}`);

    // Send initial telemetry state immediately
    ws.send(JSON.stringify({
      event: 'TELEMETRY',
      payload: machineState,
    }));

    // Send recent logs
    recentLogs.slice(0, 15).reverse().forEach((l) => {
      ws.send(JSON.stringify({
        event: 'LOG',
        payload: l,
      }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        // Handle incoming command
        if (msg.command) {
          if (msg.command === 'PING') {
            ws.send(JSON.stringify({ event: 'PONG', timestamp: Date.now() }));
            return;
          }
          handleIncomingCommand(msg as OutgoingCommand, `WS (${remoteIp})`);
          return;
        }

        // Handle incoming TELEMETRY update from physical ESP32
        if (msg.event === 'TELEMETRY' && msg.payload) {
          machineState = {
            ...machineState,
            ...msg.payload,
          };
          broadcast({
            event: 'TELEMETRY',
            payload: machineState,
          });
          return;
        }

        // Handle incoming LOG from ESP32
        if (msg.event === 'LOG' && msg.payload) {
          const logPayload = msg.payload as LogPayload;
          recentLogs.unshift(logPayload);
          if (recentLogs.length > 500) recentLogs.pop();
          broadcast({
            event: 'LOG',
            payload: logPayload,
          });
          return;
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    });

    ws.on('close', () => {
      broadcastLog('INFO', `Client getrennt: ${remoteIp}`);
    });
  });

  // REST API Endpoints for ESP32 and Browser Clients
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      wsClients: wss.clients.size,
      machineStatus: machineState.status,
      timestamp: Date.now(),
    });
  });

  app.get('/api/telemetry', (req, res) => {
    res.json({
      event: 'TELEMETRY',
      payload: machineState,
    });
  });

  // Physical ESP32 can POST telemetry here
  app.post('/api/telemetry', (req, res) => {
    const data = req.body;
    if (data) {
      machineState = {
        ...machineState,
        ...data,
      };
      broadcast({
        event: 'TELEMETRY',
        payload: machineState,
      });
      res.json({ success: true });
      return;
    }
    res.status(400).json({ error: 'Payload missing' });
  });

  // Command submission via REST
  app.post('/api/command', (req, res) => {
    const cmd = req.body as OutgoingCommand;
    if (!cmd || !cmd.command) {
      res.status(400).json({ error: 'Befehl fehlt' });
      return;
    }
    handleIncomingCommand(cmd, 'REST-API');
    res.json({ success: true, command: cmd.command, state: machineState.status });
  });

  // Post logs via REST
  app.post('/api/log', (req, res) => {
    const { level, message } = req.body || {};
    if (message) {
      broadcastLog(level || 'INFO', message);
      res.json({ success: true });
      return;
    }
    res.status(400).json({ error: 'Log message required' });
  });

  // Get recent logs
  app.get('/api/logs', (req, res) => {
    res.json(recentLogs);
  });

  // Vite middleware in dev, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SCADA GATEWAY] Listening on http://0.0.0.0:${PORT} and ws://0.0.0.0:${PORT}/ws`);
  });
}

startServer();
