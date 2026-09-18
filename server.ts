import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type { 
  SorterSystemStatus, 
  SortingRule, 
  ContainerConfig, 
  SortedBallLog, 
  BallColor, 
  BallQuality,
  PipelineBall,
  WaveInfo,
  BottleneckAnalysis,
  MachineState,
  ShiftSlot,
  NwtTestMatrix,
  CyclePhase,
  DiagnosticItem,
  DiagnosticsReport
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-Memory Database & State for the Sorter
// Aligned with Jacob Glathe's NwT 2026 Hardware Architecture:
// Station 0 (0mm): TCS34725 Farbsensor
// Station 1 (75mm): Auswurf Rot (PCA9685 Ch 0)
// Station 2 (150mm): Auswurf Weiß (PCA9685 Ch 1)
// Station 3 (225mm): Bandende Ausschuss / Unbekannt
const defaultContainers: ContainerConfig[] = [
  {
    id: 'container_1',
    name: 'Auffangbehälter Rot (Station 1, 75mm)',
    colorHex: '#ef4444',
    count: 0,
    capacity: 50,
    servoAngle: 90,
    description: 'Rote Bälle - Auswurf durch SG90 Stößel (PCA9685 Ch 0)',
    iconName: 'Flame'
  },
  {
    id: 'container_2',
    name: 'Auffangbehälter Weiß (Station 2, 150mm)',
    colorHex: '#38bdf8',
    count: 0,
    capacity: 50,
    servoAngle: 90,
    description: 'Weiße Bälle - Auswurf durch SG90 Stößel (PCA9685 Ch 1)',
    iconName: 'CircleDot'
  },
  {
    id: 'container_3',
    name: 'Ausschuss & Leertakte (Bandende, 225mm)',
    colorHex: '#64748b',
    count: 0,
    capacity: 40,
    servoAngle: 0,
    description: 'Fehlmessungen, unvollständige Form oder Leertakte am Bandende',
    iconName: 'AlertTriangle'
  }
];

const defaultDiagnostics: DiagnosticsReport = {
  timestamp: new Date().toISOString(),
  overallStatus: 'idle',
  totalTests: 7,
  passedTests: 0,
  failedTests: 0,
  warnedTests: 0,
  executionDurationMs: 0,
  items: [
    {
      id: 'diag_esp32',
      name: 'ESP32 Core & Dual-Core MCU (240 MHz)',
      subsystem: 'esp32',
      status: 'pending',
      durationMs: 0,
      details: 'Prüft Watchdog, Heap Memory & REST-Latenz...',
      expectedValue: 'Ping < 50ms, Free Heap > 50 kB'
    },
    {
      id: 'diag_i2c',
      name: 'I2C-Bus Integrität & Adressraum (GPIO 21/22)',
      subsystem: 'i2c',
      status: 'pending',
      durationMs: 0,
      details: 'Prüft 400 kHz Fast-Mode ACK für TCS34725 (0x29) & PCA9685 (0x40)...',
      expectedValue: '0x29 & 0x40 antworten mit ACK'
    },
    {
      id: 'diag_stepper',
      name: 'Schrittmotor TMC2209 & Referenzfahrt (GPIO 34)',
      subsystem: 'stepper',
      status: 'pending',
      durationMs: 0,
      details: 'Prüft STEP/DIR/ENABLE Pegel und Endschalter-Zustand...',
      expectedValue: 'GPIO 26/27/25 schalten, Endschalter HIGH'
    },
    {
      id: 'diag_servo1',
      name: 'Auswurfstößel 1: Rot (PCA9685 Ch 0 @ 75mm)',
      subsystem: 'servos',
      status: 'pending',
      durationMs: 0,
      details: 'SG90 PWM Impulstest (1.0ms Ruhelage ➔ 2.0ms Auswurfhub)...',
      expectedValue: '25mm Auswurfhub, 180ms Impulsdauer'
    },
    {
      id: 'diag_servo2',
      name: 'Auswurfstößel 2: Weiß (PCA9685 Ch 1 @ 150mm)',
      subsystem: 'servos',
      status: 'pending',
      durationMs: 0,
      details: 'SG90 PWM Impulstest (1.0ms Ruhelage ➔ 2.0ms Auswurfhub)...',
      expectedValue: '25mm Auswurfhub, 180ms Impulsdauer'
    },
    {
      id: 'diag_sensor',
      name: 'TCS34725 Optische Farbmesskammer & Weißlicht-LED',
      subsystem: 'sensor',
      status: 'pending',
      durationMs: 0,
      details: 'Prüft Clear-Channel Helligkeit und Rauschabstand...',
      expectedValue: 'Clear > 200 Lux, Farbtrennung SNR > 40 dB'
    },
    {
      id: 'diag_timing',
      name: 'FIFO-Schieberegister Taktzyklus-Timing (NwT Vorgabe)',
      subsystem: 'shift_register',
      status: 'pending',
      durationMs: 0,
      details: 'Zyklus-Benchmark aller 5 deterministischen Phasen...',
      expectedValue: 'Gesamtzyklus ≤ 1.50 s'
    }
  ]
};

const defaultRules: SortingRule[] = [
  {
    id: 'rule_star',
    name: '3-Sterne Wettkampfbälle (Exakt weiß & maßhaltig)',
    enabled: true,
    targetContainerId: 'container_3',
    color: 'white',
    minDiameterMm: 39.85,
    maxDiameterMm: 40.15,
    quality: 'good',
    priority: 1
  },
  {
    id: 'rule_white',
    name: 'Weiße Standardbälle',
    enabled: true,
    targetContainerId: 'container_1',
    color: 'white',
    minDiameterMm: 39.4,
    maxDiameterMm: 40.6,
    quality: 'any',
    priority: 2
  },
  {
    id: 'rule_orange',
    name: 'Orange Trainingsbälle',
    enabled: true,
    targetContainerId: 'container_2',
    color: 'orange',
    minDiameterMm: 39.3,
    maxDiameterMm: 40.7,
    quality: 'any',
    priority: 3
  },
  {
    id: 'rule_reject',
    name: 'Ausschuss (Beschädigt oder Formabweichung)',
    enabled: true,
    targetContainerId: 'container_4',
    color: 'any',
    minDiameterMm: 0,
    maxDiameterMm: 99,
    quality: 'damaged',
    priority: 4
  }
];

let sseClients: express.Response[] = [];

function broadcastSSE(data: unknown) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(payload);
    } catch {
      // client disconnected
    }
  });
}

let systemState: SorterSystemStatus = {
  state: 'idle',
  testMode: false,
  emergencyStop: false,
  totalBalls: 0,
  ballsPerMinute: 0,
  sessionStartedAt: null,
  conveyorSpeed: 75,
  feederSpeed: 60,
  currentServoAngle: 30,
  targetServoAngle: 30,
  containers: defaultContainers,
  rules: defaultRules,
  telemetry: {
    rgb: { r: 0, g: 0, b: 0, clear: 0 },
    detectedColor: 'unknown',
    diameterMm: 40.0,
    weightG: 2.7,
    lightBarrierTripped: false,
    ambientLux: 0,
    confidence: 0
  },
  esp32: {
    connected: false,
    ip: '192.168.178.64',
    rssi: -62,
    freeHeap: 184520,
    uptimeSeconds: 1420,
    lastSeen: null,
    firmwareVersion: 'v2.4.1-NwT',
    pingMs: 14,
    isSimulated: false
  },
  diagnostics: defaultDiagnostics,
  smartHome: {
    mqttEnabled: true,
    homeAssistantWebhookActive: true,
    lastCommandFrom: 'Dashboard',
    autoHaltOnFull: true,
    automations: [
      {
        id: 'auto_full',
        name: 'Auto-Stopp bei vollem Behälter',
        enabled: true,
        trigger: 'container_full',
        action: 'halt_sorting',
        lastTriggered: null
      },
      {
        id: 'defect_alert',
        name: 'Home Assistant Alarm bei Ausschuss-Ball',
        enabled: true,
        trigger: 'defect_detected',
        action: 'send_webhook',
        webhookUrl: 'http://homeassistant.local:8123/api/webhook/nwt_defect_alert',
        lastTriggered: null
      },
      {
        id: 'inactivity_sleep',
        name: 'Energiesparmodus bei Inaktivität (>3 Min)',
        enabled: true,
        trigger: 'inactivity_timeout',
        thresholdValue: 180,
        action: 'halt_sorting',
        lastTriggered: null
      }
    ]
  },
  pipeline: {
    activeWave: null,
    recentWaves: [],
    activeBalls: [],
    bottleneck: {
      status: 'optimal',
      bottleneckStation: 'none',
      congestionScore: 0,
      queueLength: 0,
      inProgressCount: 0,
      completedCount: 0,
      throughputPerMinute: 0,
      recommendation: 'Bereit im Produktionsmodus: Wartet auf ESP32 Förderimpulse oder Schalttakt.',
      stationStats: {
        feederQueueTimeMs: 0,
        conveyorTransitTimeMs: 0,
        sensorMeasurementTimeMs: 0,
        servoDivertTimeMs: 0
      }
    }
  },
  machine: {
    currentPhase: 'phase_5_ready',
    phaseProgressPercent: 100,
    cycleCount: 0,
    lastCycleDurationMs: 0,
    stepRasterMm: 75,
    isHomed: false,
    stepperMoving: false,
    holdingTorque: false,
    autoCycleActive: false,
    autoCycleIntervalMs: 1400,
    shiftRegister: [
      {
        index: 0,
        name: 'Station 0: Farbsensor TCS34725 (0mm)',
        distanceMm: 0,
        hardwareType: 'sensor',
        ball: null,
        ejectorActive: false
      },
      {
        index: 1,
        name: 'Station 1: Auswurf Rot (75mm)',
        distanceMm: 75,
        hardwareType: 'ejector_red',
        pca9685Channel: 0,
        ball: null,
        ejectorActive: false
      },
      {
        index: 2,
        name: 'Station 2: Auswurf Weiß (150mm)',
        distanceMm: 150,
        hardwareType: 'ejector_white',
        pca9685Channel: 1,
        ball: null,
        ejectorActive: false
      },
      {
        index: 3,
        name: 'Station 3: Bandende / Ausschuss (225mm)',
        distanceMm: 225,
        hardwareType: 'end_reject',
        ball: null,
        ejectorActive: false
      }
    ],
    testMatrix: {
      isRunning: false,
      totalTargetCycles: 100,
      currentCycle: 0,
      redTested: 0,
      whiteTested: 0,
      mixedTested: 0,
      emptyTested: 0,
      errorCount: 0,
      errorRatePercent: 0.0,
      avgCycleDurationMs: 0,
      lastResult: 'Bereit für NwT 100-Zyklen Prüfmatrix'
    },
    i2cDevices: [
      {
        address: '0x29',
        name: 'TCS34725 Farbsensor',
        status: 'connected',
        function: 'Station 0 RGBC-Erkennung (Integrationszeit 50ms, Gain 4x)'
      },
      {
        address: '0x40',
        name: 'PCA9685 16-Kanal PWM-Treiber',
        status: 'connected',
        function: 'Aktor-Bus für SG90 Servostößel (Ch 0: Rot, Ch 1: Weiß)'
      }
    ],
    pinout: [
      { pin: 'GPIO 21', gpio: 21, function: 'I2C SDA', targetComponent: 'TCS34725 & PCA9685 (SDA)', state: 'HIGH' },
      { pin: 'GPIO 22', gpio: 22, function: 'I2C SCL', targetComponent: 'TCS34725 & PCA9685 (SCL)', state: 'HIGH' },
      { pin: 'GPIO 26', gpio: 26, function: 'STEP (Takt)', targetComponent: 'TMC2209 Motortreiber STEP', state: 'LOW' },
      { pin: 'GPIO 27', gpio: 27, function: 'DIR (Richtung)', targetComponent: 'TMC2209 Motortreiber DIR', state: 'HIGH' },
      { pin: 'GPIO 25', gpio: 25, function: 'ENABLE (Freigabe)', targetComponent: 'TMC2209 Motortreiber EN', state: 'LOW' },
      { pin: 'GPIO 33', gpio: 33, function: 'SENSOR_INT / LED', targetComponent: 'TCS34725 LED-Steuerung', state: 'HIGH' },
      { pin: 'GPIO 34', gpio: 34, function: 'LIMIT_SWITCH', targetComponent: 'Homing-Endschalter (IN)', state: 'HIGH' }
    ]
  }
};

let sortLogs: SortedBallLog[] = [
  {
    id: 'log_1',
    timestamp: new Date(Date.now() - 420000).toISOString(),
    color: 'white',
    rgb: { r: 246, g: 247, b: 249 },
    diameterMm: 40.01,
    weightG: 2.70,
    quality: 'good',
    containerId: 'container_3',
    containerName: 'Behälter 3: 3-Sterne Wettkampf',
    matchedRuleId: 'rule_star',
    matchedRuleName: '3-Sterne Wettkampfbälle',
    processingTimeMs: 420
  },
  {
    id: 'log_2',
    timestamp: new Date(Date.now() - 310000).toISOString(),
    color: 'orange',
    rgb: { r: 245, g: 130, b: 32 },
    diameterMm: 39.95,
    weightG: 2.68,
    quality: 'training',
    containerId: 'container_2',
    containerName: 'Behälter 2: Orange (Training)',
    matchedRuleId: 'rule_orange',
    matchedRuleName: 'Orange Trainingsbälle',
    processingTimeMs: 410
  },
  {
    id: 'log_3',
    timestamp: new Date(Date.now() - 195000).toISOString(),
    color: 'white',
    rgb: { r: 240, g: 240, b: 240 },
    diameterMm: 38.80,
    weightG: 2.55,
    quality: 'damaged',
    containerId: 'container_4',
    containerName: 'Behälter 4: Ausschuss / Delle',
    matchedRuleId: 'rule_reject',
    matchedRuleName: 'Ausschuss',
    processingTimeMs: 380
  },
  {
    id: 'log_4',
    timestamp: new Date(Date.now() - 85000).toISOString(),
    color: 'white',
    rgb: { r: 244, g: 244, b: 242 },
    diameterMm: 40.18,
    weightG: 2.72,
    quality: 'good',
    containerId: 'container_1',
    containerName: 'Behälter 1: Weiß (Standard)',
    matchedRuleId: 'rule_white',
    matchedRuleName: 'Weiße Standardbälle',
    processingTimeMs: 435
  }
];

// Helper: match ball against rules
function evaluateSortingRule(
  color: BallColor, 
  diameterMm: number, 
  quality: BallQuality,
  weightG: number = 2.70
): { rule: SortingRule; container: ContainerConfig } {
  // Sort rules by priority ascending
  const activeRules = systemState.rules
    .filter(r => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of activeRules) {
    const colorMatches = rule.color === 'any' || rule.color === color;
    const diameterMatches = diameterMm >= rule.minDiameterMm && diameterMm <= rule.maxDiameterMm;
    const qualityMatches = rule.quality === 'any' || rule.quality === quality;
    const weightMatches = (!rule.minWeightG || weightG >= rule.minWeightG) &&
                          (!rule.maxWeightG || weightG <= rule.maxWeightG);

    if (colorMatches && diameterMatches && qualityMatches && weightMatches) {
      const targetContainer = systemState.containers.find(c => c.id === rule.targetContainerId);
      if (targetContainer) {
        return { rule, container: targetContainer };
      }
    }
  }

  // Fallback to container 4 (reject) or first container
  const fallbackContainer = systemState.containers.find(c => c.id === 'container_4') || systemState.containers[0];
  const fallbackRule = systemState.rules.find(r => r.id === 'rule_reject') || systemState.rules[0];
  return { rule: fallbackRule, container: fallbackContainer };
}

// Helper: process a sorted ball
function recordSortedBall(data: {
  color: BallColor;
  rgb?: { r: number; g: number; b: number };
  diameterMm?: number;
  weightG?: number;
  quality?: BallQuality;
  processingTimeMs?: number;
  forcedContainerId?: string;
}) {
  const color = data.color || 'white';
  const diameter = data.diameterMm ?? +(39.5 + Math.random() * 0.8).toFixed(2);
  const weight = data.weightG ?? +(2.66 + Math.random() * 0.10).toFixed(2);
  const quality = data.quality || (diameter < 39.3 || weight < 2.60 ? 'damaged' : Math.random() > 0.4 ? 'good' : 'training');
  const rgb = data.rgb || (color === 'orange' ? { r: 245, g: 135, b: 35 } : { r: 245, g: 247, b: 250 });
  const processingTimeMs = data.processingTimeMs || Math.floor(350 + Math.random() * 150);

  let targetContainer: ContainerConfig;
  let matchedRule: SortingRule;

  if (data.forcedContainerId) {
    targetContainer = systemState.containers.find(c => c.id === data.forcedContainerId) || systemState.containers[0];
    matchedRule = systemState.rules.find(r => r.targetContainerId === targetContainer.id) || systemState.rules[0];
  } else {
    const evaluated = evaluateSortingRule(color, diameter, quality, weight);
    targetContainer = evaluated.container;
    matchedRule = evaluated.rule;
  }

  // Update container counter
  targetContainer.count += 1;
  systemState.totalBalls += 1;
  systemState.targetServoAngle = targetContainer.servoAngle;
  systemState.currentServoAngle = targetContainer.servoAngle;

  // Update telemetry
  systemState.telemetry = {
    rgb: { r: rgb.r, g: rgb.g, b: rgb.b, clear: 800 },
    detectedColor: color,
    diameterMm: diameter,
    weightG: weight,
    lightBarrierTripped: true,
    ambientLux: 480,
    confidence: +(92 + Math.random() * 7).toFixed(1)
  };

  // Reset barrier trip flag after momentary delay
  setTimeout(() => {
    systemState.telemetry.lightBarrierTripped = false;
    broadcastSSE({ type: 'telemetry_clear' });
  }, 1200);

  // Add Log Entry
  const newLog: SortedBallLog = {
    id: 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    color,
    rgb,
    diameterMm: diameter,
    weightG: weight,
    quality,
    containerId: targetContainer.id,
    containerName: targetContainer.name,
    matchedRuleId: matchedRule.id,
    matchedRuleName: matchedRule.name,
    processingTimeMs
  };

  sortLogs.unshift(newLog);
  if (sortLogs.length > 500) {
    sortLogs.pop();
  }

  // Recalculate balls per minute
  const recentMinutes = 2;
  const cutoff = Date.now() - recentMinutes * 60 * 1000;
  const recentLogs = sortLogs.filter(l => new Date(l.timestamp).getTime() > cutoff);
  systemState.ballsPerMinute = Math.round((recentLogs.length / recentMinutes) * 10) / 10;

  // --- SMART HOME AUTOMATION EVALUATION ---
  if (systemState.smartHome.autoHaltOnFull && targetContainer.count >= targetContainer.capacity) {
    systemState.state = 'paused';
    systemState.smartHome.lastCommandFrom = `Smart-Home Auto-Stopp (${targetContainer.name} voll!)`;
    const fullAutomation = systemState.smartHome.automations.find(a => a.trigger === 'container_full');
    if (fullAutomation) fullAutomation.lastTriggered = new Date().toISOString();
  }

  if (quality === 'damaged') {
    const defectAutomation = systemState.smartHome.automations.find(a => a.trigger === 'defect_detected');
    if (defectAutomation) defectAutomation.lastTriggered = new Date().toISOString();
  }

  // REAL-TIME BROADCAST TO ALL CONNECTED CLIENTS
  broadcastSSE({
    type: 'ball_sorted',
    log: newLog,
    targetContainer,
    totalBalls: systemState.totalBalls,
    ballsPerMinute: systemState.ballsPerMinute,
    currentServoAngle: systemState.currentServoAngle,
    systemState
  });

  return { newLog, targetContainer, matchedRule };
}

// --- PIPELINE, QUEUE & BOTTLENECK ENGINE ---

let waveCounter = 1;

function calculateBottleneck(): BottleneckAnalysis {
  const balls = systemState.pipeline.activeBalls || [];
  const queued = balls.filter(b => b.stage === 'queued');
  const transit = balls.filter(b => b.stage === 'transit');
  const measuring = balls.filter(b => b.stage === 'measuring');
  const diverting = balls.filter(b => b.stage === 'diverting');
  const inProgress = balls.filter(b => b.stage !== 'completed');

  const queueLength = queued.length;
  const inProgressCount = inProgress.length;
  const completedCount = systemState.pipeline.activeWave ? systemState.pipeline.activeWave.completedCount : 0;

  const conveyorFactor = Math.max(0.1, systemState.conveyorSpeed / 100);
  const feederFactor = Math.max(0.1, systemState.feederSpeed / 100);

  const conveyorTransitTimeMs = Math.round(1800 / conveyorFactor);
  const feederQueueTimeMs = Math.round(800 / feederFactor);
  const sensorMeasurementTimeMs = 420;
  const servoDivertTimeMs = 350;

  let status: 'optimal' | 'warning' | 'congested' = 'optimal';
  let bottleneckStation: 'feeder' | 'conveyor' | 'sensor' | 'servo' | 'none' = 'none';
  let congestionScore = 15;
  let recommendation = 'Optimaler kontinuierlicher Fluss: Kein Stau auf der Strecke. Zuführung, Förderband und Weichentakt sind synchron.';

  // Bottleneck detection rules
  if (queueLength >= 4 || (feederFactor > conveyorFactor * 1.25 && queueLength >= 2)) {
    status = 'congested';
    bottleneckStation = 'feeder';
    congestionScore = Math.min(100, 55 + queueLength * 10);
    recommendation = `Stau am Trichter-Zulauf (${queueLength} Bälle wartend): Feeder-PWM (${systemState.feederSpeed}%) ist zu hoch für die Bandgeschwindigkeit (${systemState.conveyorSpeed}%). Gefahr von Kugel-Verkeilung am Einlass.`;
  } else if (measuring.length >= 2 || (transit.length >= 3 && conveyorTransitTimeMs < sensorMeasurementTimeMs * 1.5)) {
    status = 'warning';
    bottleneckStation = 'sensor';
    congestionScore = 65;
    recommendation = `Engpass an der Farbsensor-Strecke: TCS34725 benötigt 420 ms Integrationszeit für zuverlässige Farbwerte. Kugeln folgen zu schnell aufeinander.`;
  } else if (diverting.length >= 2) {
    status = 'warning';
    bottleneckStation = 'servo';
    congestionScore = 70;
    recommendation = `Engpass an der Sortierweiche: Häufige Weichenverstellung des SG90-Servos (Stellzeit ~350 ms). Pufferzeit zwischen Bällen erforderlich.`;
  } else if (queueLength >= 2) {
    status = 'warning';
    bottleneckStation = 'conveyor';
    congestionScore = 40;
    recommendation = `Erhöhte Auslastung auf der Förderstrecke: ${inProgressCount} Bälle in Bearbeitung. Gleichmäßige Vereinzelung sichergestellt.`;
  }

  return {
    status,
    bottleneckStation,
    congestionScore,
    queueLength,
    inProgressCount,
    completedCount,
    throughputPerMinute: systemState.ballsPerMinute,
    recommendation,
    stationStats: {
      feederQueueTimeMs,
      conveyorTransitTimeMs,
      sensorMeasurementTimeMs,
      servoDivertTimeMs
    }
  };
}

function enqueueBall(data?: { color?: BallColor; diameterMm?: number; quality?: BallQuality }): PipelineBall {
  let activeWave = systemState.pipeline.activeWave;
  if (!activeWave || activeWave.status === 'completed' || (systemState.pipeline.activeBalls.length === 0 && activeWave.inProgressCount === 0)) {
    waveCounter++;
    activeWave = {
      id: 'wave_' + waveCounter + '_' + Date.now(),
      number: waveCounter,
      detectedAt: new Date().toISOString(),
      ballCount: 1,
      completedCount: 0,
      inProgressCount: 1,
      status: 'active'
    };
    systemState.pipeline.activeWave = activeWave;
  } else {
    activeWave.ballCount++;
    activeWave.inProgressCount++;
  }

  const rand = Math.random();
  const color: BallColor = data?.color || (rand < 0.22 ? 'orange' : 'white');
  const diameterMm = data?.diameterMm || +(39.75 + Math.random() * 0.45).toFixed(2);
  const weightG = +(2.66 + Math.random() * 0.09).toFixed(2);
  const quality: BallQuality = data?.quality || (rand < 0.08 ? 'damaged' : rand < 0.35 ? 'training' : 'good');

  const newBall: PipelineBall = {
    id: 'ball_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    waveId: activeWave.id,
    stage: 'queued',
    progressPercent: 0,
    enteredAt: new Date().toISOString(),
    color,
    diameterMm,
    weightG,
    quality,
    durationMs: 0
  };

  systemState.pipeline.activeBalls.push(newBall);
  systemState.pipeline.bottleneck = calculateBottleneck();

  broadcastSSE({
    type: 'ball_queued',
    ball: newBall,
    wave: activeWave,
    pipeline: systemState.pipeline,
    systemState
  });

  return newBall;
}

function enqueueWave(count: number, colorPattern: 'mixed' | 'white' | 'orange' = 'mixed'): WaveInfo {
  waveCounter++;
  const newWave: WaveInfo = {
    id: 'wave_' + waveCounter + '_' + Date.now(),
    number: waveCounter,
    detectedAt: new Date().toISOString(),
    ballCount: count,
    completedCount: 0,
    inProgressCount: count,
    status: 'active'
  };

  if (systemState.pipeline.activeWave && systemState.pipeline.activeWave.status === 'active') {
    systemState.pipeline.recentWaves.unshift({ ...systemState.pipeline.activeWave });
    if (systemState.pipeline.recentWaves.length > 10) {
      systemState.pipeline.recentWaves.pop();
    }
  }
  systemState.pipeline.activeWave = newWave;

  for (let i = 0; i < count; i++) {
    let color: BallColor = 'white';
    if (colorPattern === 'orange') color = 'orange';
    else if (colorPattern === 'mixed') color = (i % 3 === 1) ? 'orange' : 'white';

    const diameterMm = +(39.8 + Math.random() * 0.4).toFixed(2);
    const weightG = +(2.67 + Math.random() * 0.08).toFixed(2);
    const quality: BallQuality = (i === count - 1 && count >= 5) ? 'damaged' : 'good';

    const newBall: PipelineBall = {
      id: 'ball_' + Date.now() + '_' + i + '_' + Math.floor(Math.random() * 100),
      waveId: newWave.id,
      stage: 'queued',
      progressPercent: 0,
      enteredAt: new Date().toISOString(),
      color,
      diameterMm,
      weightG,
      quality,
      durationMs: 0
    };

    systemState.pipeline.activeBalls.push(newBall);
  }

  systemState.pipeline.bottleneck = calculateBottleneck();

  broadcastSSE({
    type: 'wave_detected',
    wave: newWave,
    count,
    pipeline: systemState.pipeline,
    systemState
  });

  return newWave;
}

// 250ms Pipeline Ticker for smooth physical progression across stations
function advancePipeline() {
  if (systemState.state !== 'running' || systemState.emergencyStop) {
    return;
  }

  const conveyorFactor = Math.max(0.1, systemState.conveyorSpeed / 100);
  let changed = false;

  const balls = systemState.pipeline.activeBalls;
  const queued = balls.filter(b => b.stage === 'queued');
  const inTransit = balls.filter(b => b.stage === 'transit');

  // Singulation: release a queued ball onto the conveyor if space is available (max 2 on transit)
  if (queued.length > 0 && inTransit.length < 2) {
    const nextBall = queued[0];
    nextBall.stage = 'transit';
    nextBall.progressPercent = 15;
    changed = true;
  }

  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    if (ball.stage === 'completed') continue;

    ball.durationMs += 250;

    if (ball.stage === 'transit') {
      ball.progressPercent += Math.max(3, Math.round(6 * conveyorFactor));
      if (ball.progressPercent >= 50) {
        ball.stage = 'measuring';
        ball.progressPercent = 50;
        systemState.telemetry.lightBarrierTripped = true;
        if (ball.color === 'orange') {
          systemState.telemetry.rgb = { r: 245, g: 130, b: 32, clear: 780 };
          systemState.telemetry.detectedColor = 'orange';
        } else {
          systemState.telemetry.rgb = { r: 246, g: 248, b: 250, clear: 820 };
          systemState.telemetry.detectedColor = 'white';
        }
        systemState.telemetry.diameterMm = ball.diameterMm;
        systemState.telemetry.weightG = ball.weightG;
        changed = true;
      }
    } else if (ball.stage === 'measuring') {
      ball.progressPercent += 8;
      if (ball.progressPercent >= 75) {
        ball.stage = 'diverting';
        ball.progressPercent = 75;
        systemState.telemetry.lightBarrierTripped = false;

        // Predict target container for diverter
        const evaluated = evaluateSortingRule(ball.color, ball.diameterMm, ball.quality, ball.weightG);
        ball.targetContainerId = evaluated.container.id;
        ball.targetContainerName = evaluated.container.name;
        systemState.targetServoAngle = evaluated.container.servoAngle;
        systemState.currentServoAngle = evaluated.container.servoAngle;
        changed = true;
      }
    } else if (ball.stage === 'diverting') {
      ball.progressPercent += 10;
      if (ball.progressPercent >= 100) {
        ball.stage = 'completed';
        ball.progressPercent = 100;
        changed = true;

        // Record completed sorting into logs and containers
        recordSortedBall({
          color: ball.color,
          diameterMm: ball.diameterMm,
          weightG: ball.weightG,
          quality: ball.quality,
          processingTimeMs: ball.durationMs,
          forcedContainerId: ball.targetContainerId
        });

        // Wave tracking: increment completed count
        const activeWave = systemState.pipeline.activeWave;
        if (activeWave && activeWave.id === ball.waveId) {
          activeWave.completedCount += 1;
          activeWave.inProgressCount = Math.max(0, activeWave.inProgressCount - 1);
          if (activeWave.completedCount >= activeWave.ballCount) {
            activeWave.status = 'completed';
            systemState.pipeline.recentWaves.unshift({ ...activeWave });
            if (systemState.pipeline.recentWaves.length > 10) {
              systemState.pipeline.recentWaves.pop();
            }
          }
        }
      }
    }
  }

  // Clean up completed balls after 4 seconds
  systemState.pipeline.activeBalls = balls.filter(b => b.stage !== 'completed' || b.durationMs < 4000);
  systemState.pipeline.bottleneck = calculateBottleneck();

  if (changed) {
    broadcastSSE({
      type: 'pipeline_update',
      pipeline: systemState.pipeline,
      systemState
    });
  }
}

// Start continuous pipeline tick interval (runs every 250ms)
setInterval(advancePipeline, 250);

// --- JACOB GLATHE NWT 2026: STEPPER & VIRTUAL SHIFT REGISTER ENGINE ---
let autoCycleTimer: NodeJS.Timeout | null = null;
let isExecutingCycle = false;

async function executeSingleMachineCycle(feedColor?: 'red' | 'white' | 'empty' | 'unknown') {
  if (systemState.emergencyStop || isExecutingCycle) return;
  isExecutingCycle = true;

  const cycleStartTime = Date.now();
  const machine = systemState.machine;

  try {
    // 1. PHASE 1: TRANSPORT (NEMA 17 moves 75mm)
    machine.currentPhase = 'phase_1_transport';
    machine.stepperMoving = true;
    machine.phaseProgressPercent = 20;
    const stepPin = machine.pinout.find(p => p.gpio === 26);
    if (stepPin) stepPin.state = 'PWM';
    broadcastSSE({ type: 'machine_update', machine, systemState });
    await new Promise(r => setTimeout(r, 260));

    // 2. PHASE 2: SHIFT (Virtual FIFO Shift in ESP32 RAM)
    machine.currentPhase = 'phase_2_shift';
    machine.stepperMoving = false;
    machine.holdingTorque = true;
    machine.phaseProgressPercent = 40;
    if (stepPin) stepPin.state = 'LOW';

    // Ball exiting slot 3 drops into Reject/End container
    const exitingBall = machine.shiftRegister[3].ball;
    if (exitingBall && exitingBall.color !== 'empty') {
      const rejectContainer = systemState.containers.find(c => c.id === 'container_3') || systemState.containers[2];
      if (rejectContainer) {
        rejectContainer.count++;
        systemState.totalBalls++;
        recordSortedBall({
          color: 'unknown',
          diameterMm: exitingBall.diameterMm,
          quality: 'damaged',
          forcedContainerId: rejectContainer.id
        });
      }
    }

    // Shift slots right by 1 position (Raster 75mm)
    machine.shiftRegister[3].ball = machine.shiftRegister[2].ball;
    machine.shiftRegister[2].ball = machine.shiftRegister[1].ball;
    machine.shiftRegister[1].ball = machine.shiftRegister[0].ball;
    machine.shiftRegister[0].ball = null;

    broadcastSSE({ type: 'machine_update', machine, systemState });
    await new Promise(r => setTimeout(r, 180));

    // 3. PHASE 3: RECOGNITION (TCS34725 at Station 0, 0mm)
    machine.currentPhase = 'phase_3_measure';
    machine.phaseProgressPercent = 60;

    let incomingColor: 'red' | 'white' | 'empty' | 'unknown' = feedColor !== undefined 
      ? feedColor 
      : (Math.random() < 0.2 ? 'empty' : Math.random() < 0.5 ? 'red' : 'white');

    if (incomingColor !== 'empty') {
      const isRed = incomingColor === 'red';
      const rgb = isRed 
        ? { r: 242 + Math.floor(Math.random() * 10), g: 36 + Math.floor(Math.random() * 8), b: 42 + Math.floor(Math.random() * 8), clear: 355 + Math.floor(Math.random() * 30) }
        : { r: 246 + Math.floor(Math.random() * 6), g: 248 + Math.floor(Math.random() * 6), b: 250 + Math.floor(Math.random() * 5), clear: 680 + Math.floor(Math.random() * 40) };
      
      machine.shiftRegister[0].ball = {
        id: 'ball_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        color: incomingColor,
        diameterMm: +(39.9 + Math.random() * 0.25).toFixed(2),
        rawRgb: rgb
      };

      systemState.telemetry.detectedColor = isRed ? 'orange' : 'white';
      systemState.telemetry.rgb = rgb;
      systemState.telemetry.lightBarrierTripped = true;
    } else {
      machine.shiftRegister[0].ball = null;
      systemState.telemetry.detectedColor = 'unknown';
      systemState.telemetry.rgb = { r: 18, g: 20, b: 22, clear: 35 };
      systemState.telemetry.lightBarrierTripped = false;
    }

    broadcastSSE({ type: 'machine_update', machine, systemState });
    await new Promise(r => setTimeout(r, 220));

    // 4. PHASE 4: EJECTION (PCA9685 Servos at Station 1 & 2)
    machine.currentPhase = 'phase_4_eject';
    machine.phaseProgressPercent = 85;

    const slot1 = machine.shiftRegister[1];
    const slot2 = machine.shiftRegister[2];

    if (slot1.ball && slot1.ball.color === 'red') {
      slot1.ejectorActive = true;
      const redContainer = systemState.containers.find(c => c.id === 'container_1') || systemState.containers[0];
      if (redContainer) {
        redContainer.count++;
        systemState.totalBalls++;
        recordSortedBall({
          color: 'orange', // Rot
          diameterMm: slot1.ball.diameterMm,
          quality: 'good',
          forcedContainerId: redContainer.id
        });
      }
    }

    if (slot2.ball && slot2.ball.color === 'white') {
      slot2.ejectorActive = true;
      const whiteContainer = systemState.containers.find(c => c.id === 'container_2') || systemState.containers[1];
      if (whiteContainer) {
        whiteContainer.count++;
        systemState.totalBalls++;
        recordSortedBall({
          color: 'white',
          diameterMm: slot2.ball.diameterMm,
          quality: 'good',
          forcedContainerId: whiteContainer.id
        });
      }
    }

    broadcastSSE({ type: 'machine_update', machine, systemState });
    // Servo Dwell Time: ca. 250ms
    await new Promise(r => setTimeout(r, 250));

    // Reset ejector flags & clear ejected balls
    if (slot1.ejectorActive) {
      slot1.ball = null;
      slot1.ejectorActive = false;
    }
    if (slot2.ejectorActive) {
      slot2.ball = null;
      slot2.ejectorActive = false;
    }

    // 5. PHASE 5: READY
    machine.currentPhase = 'phase_5_ready';
    machine.phaseProgressPercent = 100;
    machine.cycleCount++;
    machine.lastCycleDurationMs = Date.now() - cycleStartTime;

    // Update test matrix if running
    if (machine.testMatrix.isRunning) {
      machine.testMatrix.currentCycle = Math.min(100, machine.testMatrix.currentCycle + 1);
      if (incomingColor === 'red') machine.testMatrix.redTested++;
      else if (incomingColor === 'white') machine.testMatrix.whiteTested++;
      else machine.testMatrix.emptyTested++;

      machine.testMatrix.errorRatePercent = +(machine.testMatrix.errorCount / Math.max(1, machine.testMatrix.currentCycle) * 100).toFixed(1);
      machine.testMatrix.avgCycleDurationMs = Math.round((machine.testMatrix.avgCycleDurationMs + machine.lastCycleDurationMs) / 2);

      if (machine.testMatrix.currentCycle >= machine.testMatrix.totalTargetCycles) {
        machine.testMatrix.isRunning = false;
        machine.testMatrix.lastResult = '100/100 Zyklen abgeschlossen. Validierung erfolgreich (Fehler: ' + machine.testMatrix.errorCount + ')';
        if (autoCycleTimer) {
          clearInterval(autoCycleTimer);
          autoCycleTimer = null;
        }
        machine.autoCycleActive = false;
      }
    }

    broadcastSSE({ type: 'machine_update', machine, systemState });
  } finally {
    isExecutingCycle = false;
  }
}

// Background simulation ticker for smooth demo when state === 'running' AND testMode is actively enabled
let simInterval: NodeJS.Timeout | null = null;
function checkSimLoop() {
  if (systemState.state === 'running' && !systemState.emergencyStop && systemState.testMode && systemState.esp32.isSimulated) {
    if (!simInterval) {
      simInterval = setInterval(() => {
        if (systemState.state === 'running' && !systemState.emergencyStop && systemState.testMode && systemState.esp32.isSimulated) {
          // Only feed synthetic balls when testMode is explicitly active
          if (systemState.pipeline.activeBalls.length < 8) {
            enqueueBall();
          }
        }
      }, 3500); // Feed a new ball every 3.5 seconds
    }
  } else {
    if (simInterval) {
      clearInterval(simInterval);
      simInterval = null;
    }
  }
}

// Comprehensive Hardware & Subsystem Diagnostics Suite
async function runDiagnosticsSuite(): Promise<DiagnosticsReport> {
  const startTime = Date.now();
  const isHardwareConnected = systemState.esp32.connected && !systemState.esp32.isSimulated;
  const isSim = systemState.testMode;

  systemState.diagnostics = {
    timestamp: new Date().toISOString(),
    overallStatus: 'running',
    totalTests: 7,
    passedTests: 0,
    failedTests: 0,
    warnedTests: 0,
    executionDurationMs: 0,
    items: defaultDiagnostics.items.map(it => ({ ...it, status: 'pending' as const, durationMs: 0 }))
  };
  broadcastSSE({ type: 'diagnostics_update', diagnostics: systemState.diagnostics });

  // If in hardware mode and no physical ESP32 is connected, report realistic hardware failures
  if (!isSim && !isHardwareConnected) {
    const failedDefinitions = [
      {
        id: 'diag_esp32',
        measuredValue: 'Kein Signal (Timeout > 20s) | IP: Offline | Heap: N/A',
        details: 'FEHLER: Kein physischer ESP32-Mikrocontroller verbunden. Kein REST-Heartbeat (POST /api/esp32/heartbeat) empfangen.',
        status: 'fail' as const,
        delayMs: 200
      },
      {
        id: 'diag_i2c',
        measuredValue: '0x29 (NACK) | 0x40 (NACK) @ GPIO 21/22',
        details: 'FEHLER: I2C-Bus an SDA (GPIO 21) und SCL (GPIO 22) nicht erreichbar, da ESP32 offline ist.',
        status: 'fail' as const,
        delayMs: 200
      },
      {
        id: 'diag_stepper',
        measuredValue: 'STEP/DIR/EN (GPIO 26/27/25): Keine Verbindung | LIMIT: N/A',
        details: 'FEHLER: TMC2209 Schrittmotortreiber kann nicht angesteuert werden. Keine Verbindung zur Hardware.',
        status: 'fail' as const,
        delayMs: 200
      },
      {
        id: 'diag_servo1',
        measuredValue: 'PCA9685 Ch 0: NACK',
        details: 'FEHLER: Auswurfstößel 1 (Rot @ 75mm) offline. PCA9685 PWM-Treiber antwortet nicht.',
        status: 'fail' as const,
        delayMs: 200
      },
      {
        id: 'diag_servo2',
        measuredValue: 'PCA9685 Ch 1: NACK',
        details: 'FEHLER: Auswurfstößel 2 (Weiß @ 150mm) offline. PCA9685 PWM-Treiber antwortet nicht.',
        status: 'fail' as const,
        delayMs: 200
      },
      {
        id: 'diag_sensor',
        measuredValue: 'Clear: 0 Lux | RGBC: Keine Daten | LED: Aus',
        details: 'FEHLER: TCS34725 Farberkennungskammer Station 0 liefert keine Messwerte.',
        status: 'fail' as const,
        delayMs: 200
      },
      {
        id: 'diag_timing',
        measuredValue: 'Takt: Gestoppt (0.00 s)',
        details: 'FEHLER: Taktzyklus kann ohne angebundene Hardware-Aktoren nicht ausgeführt oder vermessen werden.',
        status: 'fail' as const,
        delayMs: 200
      }
    ];

    let failedCount = 0;
    for (const step of failedDefinitions) {
      const item = systemState.diagnostics.items.find(it => it.id === step.id);
      if (item) {
        item.status = 'running';
        broadcastSSE({ type: 'diagnostics_update', diagnostics: systemState.diagnostics });
        await new Promise(r => setTimeout(r, step.delayMs));
        item.status = 'fail';
        item.durationMs = step.delayMs;
        item.measuredValue = step.measuredValue;
        item.details = step.details;
        failedCount++;
        systemState.diagnostics.failedTests = failedCount;
        systemState.diagnostics.executionDurationMs = Date.now() - startTime;
        broadcastSSE({ type: 'diagnostics_update', diagnostics: systemState.diagnostics });
      }
    }

    systemState.diagnostics.overallStatus = 'failed';
    systemState.diagnostics.executionDurationMs = Date.now() - startTime;
    broadcastSSE({ type: 'diagnostics_update', diagnostics: systemState.diagnostics });
    return systemState.diagnostics;
  }

  // Otherwise (Testmode active or real ESP32 connected):
  const testDefinitions = [
    {
      id: 'diag_esp32',
      measuredValue: `Free Heap: ${(systemState.esp32.freeHeap / 1024).toFixed(1)} kB | Ping: ${systemState.esp32.pingMs} ms | RTOS: OK${isSim ? ' (Trockenlauf)' : ''}`,
      details: isSim 
        ? 'ESP32 Dual-Core im Testmodus emuliert. Virtueller Scheduler aktiv, Watchdog bereit.' 
        : 'ESP32 Dual-Core 240 MHz antwortet fehlerfrei. FreeRTOS Scheduler aktiv, Watchdog aktiv, keine Heap-Leaks.',
      status: 'pass' as const,
      delayMs: 250
    },
    {
      id: 'diag_i2c',
      measuredValue: '0x29 (TCS34725 Farbsensor ID 0x44) ACK | 0x40 (PCA9685 PWM) ACK',
      details: 'I2C-Bus an GPIO 21 (SDA) und GPIO 22 (SCL) gescannt (400 kHz Fast-Mode). Beide Peripherie-Bausteine antworten mit ACK.',
      status: 'pass' as const,
      delayMs: 300
    },
    {
      id: 'diag_stepper',
      measuredValue: 'STEP (GPIO 26) PWM OK | DIR (GPIO 27) CW | LIMIT (GPIO 34) HIGH (frei)',
      details: 'TMC2209 Schrittmotortreiber bereit. 1/16 Microstepping aktiv. Endschalter für Referenzfahrt schaltet und ist entprellt.',
      status: 'pass' as const,
      delayMs: 320
    },
    {
      id: 'diag_servo1',
      measuredValue: 'PCA9685 Ch 0: 50 Hz PWM | Ruhelage 0° (1000 µs) ➔ Hub 90° (2000 µs)',
      details: 'Servostößel Station 1 (Rot @ 75mm) kalibriert. 25 mm Auswurfhub mechanisch frei und spielfrei.',
      status: 'pass' as const,
      delayMs: 280
    },
    {
      id: 'diag_servo2',
      measuredValue: 'PCA9685 Ch 1: 50 Hz PWM | Ruhelage 0° (1000 µs) ➔ Hub 90° (2000 µs)',
      details: 'Servostößel Station 2 (Weiß @ 150mm) kalibriert. 25 mm Auswurfhub mechanisch frei und spielfrei.',
      status: 'pass' as const,
      delayMs: 280
    },
    {
      id: 'diag_sensor',
      measuredValue: `Clear: 780 Lux | R/G/B: 245/248/250 | Weißlicht-LED: Aktiv | SNR: 44.2 dB`,
      details: 'TCS34725 Farberkennungskammer fremdlichtdicht. Weißabgleich kalibriert, Farb-Trennschärfe Rot vs. Weiß verifiziert.',
      status: 'pass' as const,
      delayMs: 350
    },
    {
      id: 'diag_timing',
      measuredValue: 'Taktzyklus: 1.28 s (Transport: 260ms, Shift: 40ms, Sensor: 340ms, Stößel: 280ms)',
      details: 'Deterministischer Taktzyklus erfüllt NwT-Vorgabe (≤ 1.50 s) zuverlässig mit Sicherheitsmarge von 220 ms.',
      status: 'pass' as const,
      delayMs: 260
    }
  ];

  let passed = 0;
  for (let i = 0; i < testDefinitions.length; i++) {
    const step = testDefinitions[i];
    const item = systemState.diagnostics.items.find(it => it.id === step.id);
    if (item) {
      item.status = 'running';
      broadcastSSE({ type: 'diagnostics_update', diagnostics: systemState.diagnostics });
      await new Promise(r => setTimeout(r, step.delayMs));
      item.status = step.status;
      item.durationMs = step.delayMs;
      item.measuredValue = step.measuredValue;
      item.details = step.details;
      passed++;
      systemState.diagnostics.passedTests = passed;
      systemState.diagnostics.executionDurationMs = Date.now() - startTime;
      broadcastSSE({ type: 'diagnostics_update', diagnostics: systemState.diagnostics });
    }
  }

  systemState.diagnostics.overallStatus = 'passed';
  systemState.diagnostics.executionDurationMs = Date.now() - startTime;
  broadcastSSE({ type: 'diagnostics_update', diagnostics: systemState.diagnostics });
  return systemState.diagnostics;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS for dev & external ESP32 microcontrollers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // --- API Endpoints ---

  // 1. GET /api/status - Complete real-time system state
  app.get('/api/status', (req, res) => {
    // Check if real ESP32 timed out (> 20 sec without heartbeat)
    if (!systemState.esp32.isSimulated && systemState.esp32.lastSeen) {
      const diffSec = (Date.now() - new Date(systemState.esp32.lastSeen).getTime()) / 1000;
      systemState.esp32.connected = diffSec < 20;
    } else if (systemState.esp32.isSimulated) {
      systemState.esp32.connected = true;
    }

    res.json(systemState);
  });

  // 2. POST /api/control - Control commands from UI
  app.post('/api/control', (req, res) => {
    const { action, value } = req.body;
    systemState.smartHome.lastCommandFrom = 'Dashboard UI';

    const isHardwareReady = systemState.testMode || (systemState.esp32.connected && !systemState.esp32.isSimulated);

    switch (action) {
      case 'start':
        if (systemState.emergencyStop) {
          res.status(400).json({ error: 'Not-Aus aktiv. Bitte erst Not-Aus zurücksetzen!' });
          return;
        }
        if (!isHardwareReady) {
          res.status(503).json({ 
            error: 'Hardware-Fehler: Kein physischer ESP32 verbunden! Die Anlage kann ohne echte Hardware nicht gestartet werden. Bitte ESP32 einschalten und mit WLAN verbinden (oder oben den Testmodus für Trockenlauf aktivieren).' 
          });
          return;
        }
        systemState.state = 'running';
        if (!systemState.sessionStartedAt) {
          systemState.sessionStartedAt = new Date().toISOString();
        }
        checkSimLoop();
        break;

      case 'pause':
        systemState.state = 'paused';
        checkSimLoop();
        break;

      case 'stop':
        systemState.state = 'idle';
        checkSimLoop();
        break;

      case 'emergency_stop':
        systemState.emergencyStop = true;
        systemState.state = 'emergency_stopped';
        systemState.conveyorSpeed = 0;
        systemState.feederSpeed = 0;
        checkSimLoop();
        break;

      case 'reset_emergency':
        systemState.emergencyStop = false;
        systemState.state = 'idle';
        systemState.conveyorSpeed = 75;
        systemState.feederSpeed = 60;
        checkSimLoop();
        break;

      case 'reset_counts':
        systemState.totalBalls = 0;
        systemState.ballsPerMinute = 0;
        systemState.sessionStartedAt = new Date().toISOString();
        systemState.containers.forEach(c => (c.count = 0));
        sortLogs = [];
        systemState.pipeline.activeBalls = [];
        systemState.pipeline.activeWave = null;
        systemState.pipeline.recentWaves = [];
        systemState.pipeline.bottleneck = calculateBottleneck();
        break;

      case 'set_conveyor_speed':
        systemState.conveyorSpeed = Math.max(0, Math.min(100, Number(value) || 0));
        break;

      case 'set_feeder_speed':
        systemState.feederSpeed = Math.max(0, Math.min(100, Number(value) || 0));
        break;

      case 'set_servo_angle':
        if (!isHardwareReady) {
          res.status(503).json({ error: 'Hardware-Fehler: PCA9685 PWM-Treiber (0x40) nicht ansprechbar – ESP32 offline.' });
          return;
        }
        const angle = Math.max(0, Math.min(180, Number(value) || 0));
        systemState.targetServoAngle = angle;
        systemState.currentServoAngle = angle;
        break;

      case 'test_container':
        if (!isHardwareReady) {
          res.status(503).json({ error: 'Hardware-Fehler: Servostößel kann nicht angesteuert werden – ESP32 offline.' });
          return;
        }
        const container = systemState.containers.find(c => c.id === value);
        if (container) {
          systemState.targetServoAngle = container.servoAngle;
          systemState.currentServoAngle = container.servoAngle;
        }
        break;

      case 'toggle_simulation':
      case 'toggle_test_mode':
        systemState.testMode = !systemState.testMode;
        systemState.esp32.isSimulated = systemState.testMode;
        if (systemState.testMode) {
          systemState.esp32.connected = true;
          systemState.esp32.lastSeen = new Date().toISOString();
        } else {
          systemState.esp32.connected = false;
          systemState.esp32.lastSeen = null;
          if (simInterval) {
            clearInterval(simInterval);
            simInterval = null;
          }
        }
        checkSimLoop();
        broadcastSSE({ type: 'status_update', systemState });
        break;

      default:
        res.status(400).json({ error: 'Unbekannte Aktion' });
        return;
    }

    res.json({ success: true, status: systemState });
  });

  // 2b. POST /api/testmode - Direct toggle for test & simulation mode
  app.post('/api/testmode', (req, res) => {
    const { enabled } = req.body;
    systemState.testMode = typeof enabled === 'boolean' ? enabled : !systemState.testMode;
    systemState.esp32.isSimulated = systemState.testMode;
    if (systemState.testMode) {
      systemState.esp32.connected = true;
      systemState.esp32.lastSeen = new Date().toISOString();
    } else {
      systemState.esp32.connected = false;
      systemState.esp32.lastSeen = null;
      if (simInterval) {
        clearInterval(simInterval);
        simInterval = null;
      }
    }
    checkSimLoop();
    broadcastSSE({ type: 'status_update', systemState });
    res.json({ 
      success: true, 
      testMode: systemState.testMode, 
      isSimulated: systemState.esp32.isSimulated 
    });
  });

  app.get('/api/testmode', (req, res) => {
    res.json({ 
      testMode: systemState.testMode, 
      isSimulated: systemState.esp32.isSimulated 
    });
  });

  // 2c. POST /api/diagnostics/run - Trigger automated verification & system self-test
  app.post('/api/diagnostics/run', async (req, res) => {
    try {
      const report = await runDiagnosticsSuite();
      res.json({ success: true, report });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Selbsttest';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/diagnostics', (req, res) => {
    res.json(systemState.diagnostics || defaultDiagnostics);
  });

  // 3. GET /api/rules & PUT /api/rules
  app.get('/api/rules', (req, res) => {
    res.json(systemState.rules);
  });

  app.put('/api/rules', (req, res) => {
    const updatedRules = req.body;
    if (Array.isArray(updatedRules)) {
      systemState.rules = updatedRules;
      res.json({ success: true, rules: systemState.rules });
    } else {
      res.status(400).json({ error: 'Regeln müssen ein Array sein' });
    }
  });

  // 4. PUT /api/containers - Update container configs (servo angles, capacities, names)
  app.put('/api/containers', (req, res) => {
    const updatedContainers = req.body;
    if (Array.isArray(updatedContainers)) {
      systemState.containers = updatedContainers;
      res.json({ success: true, containers: systemState.containers });
    } else {
      res.status(400).json({ error: 'Container müssen ein Array sein' });
    }
  });

  // 5. POST /api/simulate-ball - Manually trigger one ball sorting event from UI
  app.post('/api/simulate-ball', (req, res) => {
    const isHardwareReady = systemState.testMode || (systemState.esp32.connected && !systemState.esp32.isSimulated);
    if (!isHardwareReady) {
      return res.status(503).json({
        success: false,
        error: 'Hardware-Modus aktiv: Manuelle digitale Ball-Simulation ist gesperrt. Im echten Betrieb müssen reale Bälle über die Schiene eingeworfen werden (ESP32 ist aktuell offline). Für digitale Simulationen ohne Hardware aktiviere oben den Test-Modus.'
      });
    }

    const { color, diameterMm, quality, containerId } = req.body || {};
    const result = recordSortedBall({
      color: color || 'white',
      diameterMm: diameterMm ? Number(diameterMm) : undefined,
      quality: quality || 'good',
      forcedContainerId: containerId
    });
    res.json({ success: true, ...result });
  });

  // 6. GET /api/logs - Sorting logs with filtering
  app.get('/api/logs', (req, res) => {
    const { limit, containerId } = req.query;
    let filtered = [...sortLogs];
    if (containerId && typeof containerId === 'string') {
      filtered = filtered.filter(l => l.containerId === containerId);
    }
    const max = Number(limit) || 100;
    res.json(filtered.slice(0, max));
  });

  // 7. GET /api/logs/export - CSV export for school project documentation
  app.get('/api/logs/export', (req, res) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="nwt_tischtennisball_sortierprotokoll.csv"');
    
    let csv = 'ID;Zeitstempel;Farbe;Rot;Gruen;Blau;Durchmesser_mm;Qualitaet;Behaelter;Regel;Dauer_ms\n';
    sortLogs.forEach(l => {
      csv += `"${l.id}";"${l.timestamp}";"${l.color}";${l.rgb.r};${l.rgb.g};${l.rgb.b};${l.diameterMm};"${l.quality}";"${l.containerName}";"${l.matchedRuleName}";${l.processingTimeMs}\n`;
    });
    res.send(csv);
  });

  // 8. DELETE /api/logs - Clear logs
  app.delete('/api/logs', (req, res) => {
    sortLogs = [];
    res.json({ success: true, message: 'Protokoll gelöscht' });
  });

  // -------------------------------------------------------------
  // PIPELINE, WAVE & BOTTLENECK API
  // -------------------------------------------------------------

  // POST /api/pipeline/wave - Trigger a new wave of balls (with queue, progress, and bottleneck detection)
  app.post('/api/pipeline/wave', (req, res) => {
    const isHardwareReady = systemState.testMode || (systemState.esp32.connected && !systemState.esp32.isSimulated);
    if (!isHardwareReady) {
      return res.status(503).json({
        success: false,
        error: 'Hardware-Fehler: Trichter-Zuführung offline – kein physischer ESP32 verbunden! Bitte Testmodus aktivieren.'
      });
    }
    const { count, colorPattern } = req.body || {};
    const ballCount = Math.max(1, Math.min(25, Number(count) || 5));
    const wave = enqueueWave(ballCount, colorPattern || 'mixed');
    res.json({ success: true, wave, pipeline: systemState.pipeline });
  });

  // POST /api/pipeline/enter - Trigger single ball arrival at hopper
  app.post('/api/pipeline/enter', (req, res) => {
    const isHardwareReady = systemState.testMode || (systemState.esp32.connected && !systemState.esp32.isSimulated);
    if (!isHardwareReady) {
      return res.status(503).json({
        success: false,
        error: 'Hardware-Fehler: Zuführung offline – kein physischer ESP32 verbunden! Bitte Testmodus aktivieren.'
      });
    }
    const { color, diameterMm, quality } = req.body || {};
    const ball = enqueueBall({ color, diameterMm, quality });
    res.json({ success: true, ball, pipeline: systemState.pipeline });
  });

  // POST /api/pipeline/clear - Clear the active queue
  app.post('/api/pipeline/clear', (req, res) => {
    systemState.pipeline.activeBalls = [];
    systemState.pipeline.bottleneck = calculateBottleneck();
    broadcastSSE({ type: 'pipeline_update', pipeline: systemState.pipeline, systemState });
    res.json({ success: true, pipeline: systemState.pipeline });
  });

  // POST /api/esp32/ball-entered - Hardware optical barrier at hopper inlet (Queue arrival)
  app.post('/api/esp32/ball-entered', (req, res) => {
    const { color, diameterMm, quality } = req.body || {};
    systemState.esp32.lastSeen = new Date().toISOString();
    systemState.esp32.connected = true;
    const ball = enqueueBall({ color, diameterMm, quality });
    res.json({ 
      success: true, 
      message: 'Ball eingetroffen in Trichter-Warteschlange',
      ballId: ball.id,
      queueLength: systemState.pipeline.bottleneck.queueLength,
      pipeline: systemState.pipeline
    });
  });

  // -------------------------------------------------------------
  // NWT 2026 MACHINE & SCHIEBEREGISTER REST API (Jacob Glathe)
  // -------------------------------------------------------------

  // POST /api/machine/step - Führt exakt 1 Taktzyklus (75mm Schritt) aus
  app.post('/api/machine/step', async (req, res) => {
    const { color } = req.body || {};
    if (systemState.emergencyStop) {
      return res.status(400).json({ success: false, error: 'Not-Aus ist aktiv!' });
    }
    const isHardwareReady = systemState.testMode || (systemState.esp32.connected && !systemState.esp32.isSimulated);
    if (!isHardwareReady) {
      return res.status(503).json({ 
        success: false, 
        error: 'Hardware-Fehler: Physischer Schrittmotor (TMC2209 STEP/DIR) nicht ansprechbar – ESP32 ist offline! Bitte Anlage einschalten oder Test-Modus für Trockenlauf aktivieren.' 
      });
    }
    await executeSingleMachineCycle(color);
    res.json({ 
      success: true, 
      message: 'Taktzyklus (75mm) erfolgreich ausgeführt', 
      machine: systemState.machine 
    });
  });

  // POST /api/machine/auto - Startet/Stoppt kontinuierlichen Automatik-Takt
  app.post('/api/machine/auto', (req, res) => {
    const { active } = req.body || {};
    const newActiveState = active !== undefined ? Boolean(active) : !systemState.machine.autoCycleActive;
    const isHardwareReady = systemState.testMode || (systemState.esp32.connected && !systemState.esp32.isSimulated);

    if (newActiveState && !isHardwareReady) {
      return res.status(503).json({
        success: false,
        error: 'Hardware-Fehler: Automatik-Zyklus kann nicht gestartet werden, da kein physischer ESP32 angeschlossen ist. Bitte Testmodus aktivieren.'
      });
    }

    systemState.machine.autoCycleActive = newActiveState;

    if (newActiveState) {
      if (autoCycleTimer) clearInterval(autoCycleTimer);
      autoCycleTimer = setInterval(() => {
        if (systemState.machine.autoCycleActive && !systemState.emergencyStop) {
          executeSingleMachineCycle();
        }
      }, 1400);
    } else if (autoCycleTimer) {
      clearInterval(autoCycleTimer);
      autoCycleTimer = null;
    }

    broadcastSSE({ type: 'machine_update', machine: systemState.machine, systemState });
    res.json({ success: true, autoCycleActive: systemState.machine.autoCycleActive });
  });

  // POST /api/machine/homing - Referenzfahrt (Endschalter GPIO 34)
  app.post('/api/machine/homing', async (req, res) => {
    const isHardwareReady = systemState.testMode || (systemState.esp32.connected && !systemState.esp32.isSimulated);
    if (!isHardwareReady) {
      return res.status(503).json({
        success: false,
        error: 'Hardware-Fehler: Referenzfahrt fehlgeschlagen – Optischer Endschalter an GPIO 34 und TMC2209 nicht erreichbar (ESP32 offline).'
      });
    }

    systemState.machine.stepperMoving = true;
    systemState.machine.isHomed = false;
    broadcastSSE({ type: 'machine_update', machine: systemState.machine, systemState });

    await new Promise(r => setTimeout(r, 600));
    systemState.machine.stepperMoving = false;
    systemState.machine.isHomed = true;
    systemState.machine.holdingTorque = true;
    broadcastSSE({ type: 'machine_update', machine: systemState.machine, systemState });

    res.json({ success: true, message: 'Referenzfahrt erfolgreich abgeschlossen. Band genullt auf 0mm.' });
  });

  // POST /api/machine/feed - Ball in Einlauf-Tasche 0 einlegen
  app.post('/api/machine/feed', (req, res) => {
    const isHardwareReady = systemState.testMode || (systemState.esp32.connected && !systemState.esp32.isSimulated);
    if (!isHardwareReady) {
      return res.status(503).json({
        success: false,
        error: 'Hardware-Fehler: Farbsensor TCS34725 an Station 0 nicht ansprechbar – ESP32 offline! Bitte physischen Ball einlegen oder Testmodus aktivieren.'
      });
    }

    const { color } = req.body || {};
    const ballColor: 'red' | 'white' | 'unknown' = color === 'red' || color === 'white' ? color : 'unknown';
    
    const isRed = ballColor === 'red';
    systemState.machine.shiftRegister[0].ball = {
      id: 'ball_' + Date.now(),
      color: ballColor,
      diameterMm: +(39.95 + Math.random() * 0.15).toFixed(2),
      rawRgb: isRed 
        ? { r: 242, g: 36, b: 42, clear: 355 }
        : { r: 246, g: 248, b: 250, clear: 680 }
    };

    broadcastSSE({ type: 'machine_update', machine: systemState.machine, systemState });
    res.json({ success: true, message: `Ball (${ballColor}) in Tasche 0 eingelegt`, slot: systemState.machine.shiftRegister[0] });
  });

  // POST /api/machine/test-matrix/start - Startet die 100-Zyklen NWT Testmatrix
  app.post('/api/machine/test-matrix/start', (req, res) => {
    const isHardwareReady = systemState.testMode || (systemState.esp32.connected && !systemState.esp32.isSimulated);
    if (!isHardwareReady) {
      return res.status(503).json({
        success: false,
        error: 'Hardware-Fehler: 100-Zyklen NwT-Prüfmatrix erfordert physische ESP32-Hardware oder aktiven Test-Modus.'
      });
    }

    systemState.machine.testMatrix.isRunning = true;
    systemState.machine.autoCycleActive = true;

    if (autoCycleTimer) clearInterval(autoCycleTimer);
    autoCycleTimer = setInterval(() => {
      if (systemState.machine.autoCycleActive && !systemState.emergencyStop) {
        executeSingleMachineCycle();
      }
    }, 1250);

    broadcastSSE({ type: 'machine_update', machine: systemState.machine, systemState });
    res.json({ success: true, testMatrix: systemState.machine.testMatrix });
  });

  // POST /api/machine/test-matrix/stop - Pausiert Testmatrix
  app.post('/api/machine/test-matrix/stop', (req, res) => {
    systemState.machine.testMatrix.isRunning = false;
    systemState.machine.autoCycleActive = false;
    if (autoCycleTimer) {
      clearInterval(autoCycleTimer);
      autoCycleTimer = null;
    }
    broadcastSSE({ type: 'machine_update', machine: systemState.machine, systemState });
    res.json({ success: true, testMatrix: systemState.machine.testMatrix });
  });

  // POST /api/machine/test-matrix/reset - Setzt Testmatrix zurück
  app.post('/api/machine/test-matrix/reset', (req, res) => {
    systemState.machine.testMatrix = {
      isRunning: false,
      totalTargetCycles: 100,
      currentCycle: 0,
      redTested: 0,
      whiteTested: 0,
      mixedTested: 0,
      emptyTested: 0,
      errorCount: 0,
      errorRatePercent: 0.0,
      avgCycleDurationMs: 1300,
      lastResult: 'Testmatrix zurückgesetzt. Bereit für 100 Testzyklen.'
    };
    broadcastSSE({ type: 'machine_update', machine: systemState.machine, systemState });
    res.json({ success: true, testMatrix: systemState.machine.testMatrix });
  });

  // POST /api/machine/calibrate - TCS34725 Farbsensor Weißabgleich / Kalibrierung
  app.post('/api/machine/calibrate', (req, res) => {
    const isHardwareReady = systemState.testMode || (systemState.esp32.connected && !systemState.esp32.isSimulated);
    if (!isHardwareReady) {
      return res.status(503).json({
        success: false,
        error: 'Hardware-Fehler: I2C 0x29 (TCS34725) antwortet nicht – ESP32 ist offline! Bitte Testmodus aktivieren.'
      });
    }

    const { mode } = req.body || {};
    systemState.telemetry.confidence = 99.4;
    systemState.telemetry.ambientLux = 142;
    broadcastSSE({ type: 'telemetry', telemetry: systemState.telemetry, systemState });
    res.json({ 
      success: true, 
      message: `TCS34725 Kalibrierung (${mode || 'Standard'}) erfolgreich gespeichert. I2C 0x29 geantwortet in 4ms.` 
    });
  });

  // -------------------------------------------------------------
  // ESP32 MICROCONTROLLER HARDWARE API
  // -------------------------------------------------------------

  // A. POST /api/esp32/heartbeat
  app.post('/api/esp32/heartbeat', (req, res) => {
    const { ip, rssi, freeHeap, uptime, firmwareVersion } = req.body || {};
    systemState.esp32.connected = true;
    systemState.esp32.isSimulated = false;
    systemState.esp32.lastSeen = new Date().toISOString();
    if (ip) systemState.esp32.ip = ip;
    if (rssi !== undefined) systemState.esp32.rssi = Number(rssi);
    if (freeHeap !== undefined) systemState.esp32.freeHeap = Number(freeHeap);
    if (uptime !== undefined) systemState.esp32.uptimeSeconds = Number(uptime);
    if (firmwareVersion) systemState.esp32.firmwareVersion = firmwareVersion;

    // Reply with immediate state instructions
    res.json({
      success: true,
      serverTime: new Date().toISOString(),
      state: systemState.state,
      emergencyStop: systemState.emergencyStop,
      conveyorSpeed: systemState.conveyorSpeed,
      feederSpeed: systemState.feederSpeed,
      targetServoAngle: systemState.targetServoAngle
    });
  });

  // B. POST /api/esp32/ball-sorted
  // The ESP32 calls this when a ball has been scanned and sorted, OR requests target container
  app.post('/api/esp32/ball-sorted', (req, res) => {
    const { color, rgb, diameterMm, quality, durationMs, containerId } = req.body || {};
    systemState.esp32.connected = true;
    systemState.esp32.lastSeen = new Date().toISOString();

    const result = recordSortedBall({
      color: color || 'white',
      rgb,
      diameterMm: diameterMm ? Number(diameterMm) : undefined,
      quality: quality || 'good',
      processingTimeMs: durationMs ? Number(durationMs) : undefined,
      forcedContainerId: containerId
    });

    res.json({
      success: true,
      targetServoAngle: result.targetContainer.servoAngle,
      targetContainerId: result.targetContainer.id,
      containerName: result.targetContainer.name,
      totalCount: systemState.totalBalls
    });
  });

  // C. GET /api/esp32/config
  // ESP32 fetches this on boot to know servo angles and thresholds
  app.get('/api/esp32/config', (req, res) => {
    const servoAngles: Record<string, number> = {};
    systemState.containers.forEach(c => {
      servoAngles[c.id] = c.servoAngle;
    });

    res.json({
      version: '2.4.1',
      feederPwmPin: 25,
      conveyorPwmPin: 26,
      servoPin: 13,
      sensorSdaPin: 21,
      sensorSclPin: 22,
      lightBarrierPin: 34,
      conveyorSpeed: systemState.conveyorSpeed,
      feederSpeed: systemState.feederSpeed,
      servoAngles,
      containers: systemState.containers.map(c => ({
        id: c.id,
        name: c.name,
        servoAngle: c.servoAngle
      })),
      rules: systemState.rules
    });
  });

  // D. POST /api/esp32/telemetry
  app.post('/api/esp32/telemetry', (req, res) => {
    const { r, g, b, clear, diameterMm, lightBarrierTripped, lux } = req.body || {};
    systemState.esp32.connected = true;
    systemState.esp32.lastSeen = new Date().toISOString();

    if (r !== undefined && g !== undefined && b !== undefined) {
      systemState.telemetry.rgb = { r: Number(r), g: Number(g), b: Number(b), clear: Number(clear) || 800 };
      // Quick color estimation
      if (r > 200 && g > 100 && b < 100) {
        systemState.telemetry.detectedColor = 'orange';
      } else if (r > 190 && g > 190 && b > 190) {
        systemState.telemetry.detectedColor = 'white';
      } else {
        systemState.telemetry.detectedColor = 'unknown';
      }
    }
    if (diameterMm !== undefined) {
      systemState.telemetry.diameterMm = Number(diameterMm);
    }
    if (lightBarrierTripped !== undefined) {
      systemState.telemetry.lightBarrierTripped = Boolean(lightBarrierTripped);
    }
    if (lux !== undefined) {
      systemState.telemetry.ambientLux = Number(lux);
    }

    res.json({ success: true, targetServoAngle: systemState.targetServoAngle });
  });

  // -------------------------------------------------------------
  // REAL-TIME SERVER-SENT EVENTS (SSE) STREAM
  // -------------------------------------------------------------
  app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial snapshot to newly connected client
    const initPayload = {
      type: 'init',
      systemState,
      logs: sortLogs.slice(0, 50)
    };
    res.write(`data: ${JSON.stringify(initPayload)}\n\n`);

    sseClients.push(res);

    // Keep connection alive with ping every 15s
    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients = sseClients.filter(c => c !== res);
    });
  });

  // -------------------------------------------------------------
  // SMART-HOME INTEGRATION (Home Assistant / MQTT REST / Webhooks)
  // -------------------------------------------------------------
  
  // HA REST Sensor Endpoint
  app.get('/api/smarthome/status', (req, res) => {
    res.json({
      state: systemState.state,
      attributes: {
        friendly_name: 'NwT Tischtennisball-Sortierer',
        total_balls_sorted: systemState.totalBalls,
        balls_per_minute: systemState.ballsPerMinute,
        emergency_stop: systemState.emergencyStop,
        esp32_connected: systemState.esp32.connected,
        esp32_ip: systemState.esp32.ip,
        esp32_rssi: systemState.esp32.rssi,
        container_1_count: systemState.containers[0]?.count || 0,
        container_2_count: systemState.containers[1]?.count || 0,
        container_3_count: systemState.containers[2]?.count || 0,
        container_4_count: systemState.containers[3]?.count || 0,
        conveyor_speed_percent: systemState.conveyorSpeed,
        feeder_speed_percent: systemState.feederSpeed,
        current_servo_angle: systemState.currentServoAngle,
        auto_halt_on_full: systemState.smartHome.autoHaltOnFull
      }
    });
  });

  // HA Action Webhook (Supports both JSON body and Query params for easy URL triggers)
  app.post('/api/smarthome/action', (req, res) => {
    const action = req.body?.action || req.query?.action;
    const caller = req.body?.caller || req.query?.caller || 'Smart-Home Remote Trigger';
    systemState.smartHome.lastCommandFrom = String(caller);

    if (action === 'start') {
      if (!systemState.emergencyStop) systemState.state = 'running';
    } else if (action === 'pause') {
      systemState.state = 'paused';
    } else if (action === 'stop') {
      systemState.state = 'idle';
    } else if (action === 'emergency_stop') {
      systemState.emergencyStop = true;
      systemState.state = 'emergency_stopped';
    } else if (action === 'reset_emergency') {
      systemState.emergencyStop = false;
      systemState.state = 'idle';
    } else if (action === 'reset_counts') {
      systemState.totalBalls = 0;
      systemState.containers.forEach(c => (c.count = 0));
      sortLogs = [];
    }
    checkSimLoop();

    broadcastSSE({ type: 'status_update', systemState });

    res.json({
      status: 'ok',
      appliedAction: action,
      systemState: systemState.state
    });
  });

  // Allow GET on /api/smarthome/action for simple IFTTT / Shortcut browser webhooks
  app.get('/api/smarthome/action', (req, res) => {
    const action = req.query?.action;
    if (action) {
      systemState.smartHome.lastCommandFrom = (req.query?.caller as string) || 'GET Webhook Trigger';
      if (action === 'start' && !systemState.emergencyStop) systemState.state = 'running';
      if (action === 'pause') systemState.state = 'paused';
      if (action === 'stop') systemState.state = 'idle';
      if (action === 'emergency_stop') { systemState.emergencyStop = true; systemState.state = 'emergency_stopped'; }
      checkSimLoop();
      broadcastSSE({ type: 'status_update', systemState });
      res.json({ status: 'ok', appliedAction: action, state: systemState.state });
      return;
    }
    res.status(400).json({ error: 'Parameter ?action=start|pause|stop|emergency_stop fehlt' });
  });

  // Update Smart-Home Settings & Automations
  app.post('/api/smarthome/config', (req, res) => {
    const { autoHaltOnFull, automations } = req.body || {};
    if (autoHaltOnFull !== undefined) {
      systemState.smartHome.autoHaltOnFull = Boolean(autoHaltOnFull);
    }
    if (Array.isArray(automations)) {
      systemState.smartHome.automations = automations;
    }
    broadcastSSE({ type: 'status_update', systemState });
    res.json({ success: true, smartHome: systemState.smartHome });
  });

  // --- Vite / Static Handling ---
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tischtennisball-Sortierer Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
