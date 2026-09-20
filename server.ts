import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import type { 
  Esp32TelemetryResponse, 
  SlotBall, 
  SystemStatusText,
  SensorDetected 
} from './src/types/scada.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Authoritative ESP32 Machine State (Exact 3-slot shift register)
let runningState = false;
let systemStatus: SystemStatusText = 'STANDBY';
let errorMessage = 'Kein Fehler';
let cycleTimeMs = 1500;

// 3 Slots: [Pos 0 (Sensor), Pos 1 (Auswurf Rot), Pos 2 (Auswurf Weiss)]
let conveyorSlots: [SlotBall, SlotBall, SlotBall] = [0, 0, 0];

let stats = {
  total: 0,
  red: 0,
  white: 0,
  unknown: 0,
};

let sensorData = {
  detected: 'LEER' as SensorDetected,
  r: 120,
  g: 140,
  b: 160,
  c: 320,
};

let stepTimer: NodeJS.Timeout | null = null;

function buildTelemetryResponse(): Esp32TelemetryResponse {
  return {
    running: runningState,
    status: systemStatus,
    error: errorMessage,
    cycle_ms: cycleTimeMs,
    slots: [...conveyorSlots],
    stats: { ...stats },
    sensor: { ...sensorData },
  };
}

function advanceStep() {
  // Move belt by 75mm: Pos 1 -> Pos 2, Pos 0 -> Pos 1, New -> Pos 0
  const oldSlot0 = conveyorSlots[0];
  const oldSlot1 = conveyorSlots[1];
  const oldSlot2 = conveyorSlots[2];

  // Ejection check at station 2 (Weiss) if it was Weiss (2)
  if (oldSlot1 === 2) {
    stats.white += 1;
    stats.total += 1;
  }

  // Ejection check at station 1 (Rot) if oldSlot0 was Rot (1)
  if (oldSlot0 === 1) {
    stats.red += 1;
    stats.total += 1;
  }

  // Defect check if oldSlot2 fell off
  if (oldSlot2 === 99) {
    stats.unknown += 1;
    stats.total += 1;
  }

  // Determine new ball at Pos 0
  const rand = Math.random();
  let newBall: SlotBall = 0;
  if (rand < 0.40) {
    newBall = 1; // ROT
    sensorData = {
      detected: 'ROT',
      r: 1280 + Math.floor(Math.random() * 80),
      g: 340 + Math.floor(Math.random() * 40),
      b: 310 + Math.floor(Math.random() * 30),
      c: 2010 + Math.floor(Math.random() * 100),
    };
  } else if (rand < 0.78) {
    newBall = 2; // WEISS
    sensorData = {
      detected: 'WEISS',
      r: 1420 + Math.floor(Math.random() * 60),
      g: 1450 + Math.floor(Math.random() * 60),
      b: 1490 + Math.floor(Math.random() * 60),
      c: 3450 + Math.floor(Math.random() * 120),
    };
  } else if (rand < 0.85) {
    newBall = 99; // UNBEKANNT
    sensorData = {
      detected: 'UNBEKANNT',
      r: 650 + Math.floor(Math.random() * 50),
      g: 710 + Math.floor(Math.random() * 50),
      b: 220 + Math.floor(Math.random() * 30),
      c: 1200 + Math.floor(Math.random() * 80),
    };
  } else {
    newBall = 0; // LEER
    sensorData = {
      detected: 'LEER',
      r: 110,
      g: 125,
      b: 135,
      c: 280,
    };
  }

  // Advance conveyor slots
  // If slot was ejected, it empties
  const nextSlot2: SlotBall = oldSlot1 === 2 ? 0 : oldSlot1;
  const nextSlot1: SlotBall = oldSlot0 === 1 ? 0 : oldSlot0;
  const nextSlot0: SlotBall = newBall;

  conveyorSlots = [nextSlot0, nextSlot1, nextSlot2];
}

function scheduleNextCycle() {
  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }
  if (!runningState) return;

  stepTimer = setTimeout(() => {
    advanceStep();
    scheduleNextCycle();
  }, cycleTimeMs);
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS Middleware for open ESP32 access
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Universal ESP32 Contract Endpoint: /api
  // Accepts GET or POST
  // Query param `?key=...` or Header `X-API-Key: ...`
  const handleApiRequest = (req: express.Request, res: express.Response) => {
    const queryKey = req.query.key as string | undefined;
    const headerKey = req.headers['x-api-key'] as string | undefined;
    const providedKey = queryKey || headerKey;

    // Check API Key
    // Any non-empty string or 'DEMO-KEY' is accepted. If empty, return 401.
    if (!providedKey || providedKey.trim() === '') {
      res.status(401).json({ error: 'Ungueltiger API-Key' });
      return;
    }

    const cmd = ((req.query.cmd || req.body.cmd) as string || 'GET_STATUS').toUpperCase();

    switch (cmd) {
      case 'GET_STATUS':
        // Just return current telemetry
        break;

      case 'START':
        runningState = true;
        systemStatus = 'AUTOMATIK';
        errorMessage = 'Kein Fehler';
        scheduleNextCycle();
        break;

      case 'STOP':
        runningState = false;
        systemStatus = 'GESTOPPT';
        if (stepTimer) {
          clearTimeout(stepTimer);
          stepTimer = null;
        }
        break;

      case 'STEP':
        if (!runningState) {
          advanceStep();
          systemStatus = 'STANDBY';
        }
        break;

      case 'TRIGGER_EJECTOR': {
        const target = ((req.query.target || req.body.target) as string || '').toUpperCase();
        if (target === 'RED') {
          // Trigger Station 1 (Rot)
          conveyorSlots[1] = 0;
          stats.red += 1;
          stats.total += 1;
        } else if (target === 'WHITE') {
          // Trigger Station 2 (Weiss)
          conveyorSlots[2] = 0;
          stats.white += 1;
          stats.total += 1;
        }
        break;
      }

      case 'RESET_STATS':
        stats = {
          total: 0,
          red: 0,
          white: 0,
          unknown: 0,
        };
        break;

      case 'SET_CYCLE_TIME': {
        const rawVal = req.query.value || req.body.value;
        const parsed = parseInt(String(rawVal), 10);
        if (!isNaN(parsed) && parsed >= 500 && parsed <= 10000) {
          cycleTimeMs = parsed;
          if (runningState) {
            scheduleNextCycle();
          }
        }
        break;
      }

      case 'SET_WIFI': {
        const ssid = (req.query.ssid || req.body.ssid || '') as string;
        console.log(`[ESP32 FIRMWARE MOCK] SET_WIFI empfangen: SSID='${ssid}' in NVS-Flash gesichert. Reboot simuliert.`);
        break;
      }

      default:
        // Return status on unknown
        break;
    }

    res.json(buildTelemetryResponse());
  };

  app.get('/api', handleApiRequest);
  app.post('/api', handleApiRequest);

  // Optional CORS Proxy endpoint for situations where the browser blocks raw HTTP to local ESP32 from HTTPS
  app.all('/api/proxy', async (req, res) => {
    const targetUrl = (req.query.targetUrl || req.body.targetUrl) as string;
    if (!targetUrl) {
      res.status(400).json({ error: 'Parameter targetUrl erforderlich' });
      return;
    }

    try {
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers['x-api-key'] ? { 'X-API-Key': req.headers['x-api-key'] as string } : {}),
        },
        body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Netzwerkfehler';
      res.status(502).json({ error: `Proxy-Fehler beim Zugriff auf ESP32: ${msg}` });
    }
  });

  // Health check
  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', service: 'ESP32 SCADA Web Gateway' });
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
    console.log(`[SCADA GATEWAY] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
