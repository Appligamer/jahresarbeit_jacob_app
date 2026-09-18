export type SystemState = 'idle' | 'running' | 'paused' | 'calibrating' | 'emergency_stopped';

export type BallColor = 'white' | 'orange' | 'yellow' | 'unknown';
export type BallQuality = 'good' | 'training' | 'damaged' | 'unknown';

export interface ContainerConfig {
  id: string;
  name: string;
  colorHex: string;
  count: number;
  capacity: number;
  servoAngle: number; // in degrees, e.g. 30°, 75°, 120°, 165°
  description: string;
  iconName?: string;
}

export interface SortingRule {
  id: string;
  name: string;
  enabled: boolean;
  targetContainerId: string;
  color: BallColor | 'any';
  minRgb?: { r: number; g: number; b: number };
  maxRgb?: { r: number; g: number; b: number };
  minDiameterMm: number;
  maxDiameterMm: number;
  minWeightG?: number;
  maxWeightG?: number;
  quality: BallQuality | 'any';
  priority: number;
}

export interface SensorTelemetry {
  rgb: { r: number; g: number; b: number; clear: number };
  detectedColor: BallColor;
  diameterMm: number;
  weightG: number;
  lightBarrierTripped: boolean;
  ambientLux: number;
  confidence: number; // 0-100%
}

export interface Esp32Status {
  connected: boolean;
  ip: string;
  rssi: number; // dBm
  freeHeap: number;
  uptimeSeconds: number;
  lastSeen: string | null;
  firmwareVersion: string;
  pingMs: number;
  isSimulated: boolean;
}

export interface SortedBallLog {
  id: string;
  timestamp: string;
  color: BallColor;
  rgb: { r: number; g: number; b: number };
  diameterMm: number;
  weightG: number;
  quality: BallQuality;
  containerId: string;
  containerName: string;
  matchedRuleId: string;
  matchedRuleName: string;
  processingTimeMs: number;
}

export interface SmartHomeAutomationConfig {
  id: string;
  name: string;
  enabled: boolean;
  trigger: 'container_full' | 'defect_detected' | 'inactivity_timeout' | 'batch_completed';
  thresholdValue?: number;
  action: 'halt_sorting' | 'send_webhook' | 'alert_buzzer' | 'notify_app';
  targetContainerId?: string;
  webhookUrl?: string;
  lastTriggered?: string | null;
}

export type BallPipelineStage = 'queued' | 'transit' | 'measuring' | 'diverting' | 'completed';

// Jacob Glathe NWT 2026: Shift Register & Stepper Machine Types
export type CyclePhase = 
  | 'phase_1_transport' 
  | 'phase_2_shift' 
  | 'phase_3_measure' 
  | 'phase_4_eject' 
  | 'phase_5_ready';

export interface ShiftSlot {
  index: number;
  name: string;
  distanceMm: number; // 0mm, 75mm, 150mm, 225mm
  hardwareType: 'sensor' | 'ejector_red' | 'ejector_white' | 'end_reject';
  pca9685Channel?: number; // 0 for Red, 1 for White
  ball: {
    id: string;
    color: 'red' | 'white' | 'empty' | 'unknown';
    diameterMm: number;
    rawRgb?: { r: number; g: number; b: number; clear: number };
  } | null;
  ejectorActive: boolean;
}

export interface NwtTestMatrix {
  isRunning: boolean;
  totalTargetCycles: number; // 100
  currentCycle: number;
  redTested: number;   // Target: 30
  whiteTested: number; // Target: 30
  mixedTested: number; // Target: 20
  emptyTested: number; // Target: 20
  errorCount: number;
  errorRatePercent: number;
  avgCycleDurationMs: number;
  lastResult: string;
}

export interface MachineState {
  currentPhase: CyclePhase;
  phaseProgressPercent: number;
  cycleCount: number;
  lastCycleDurationMs: number;
  stepRasterMm: number; // 75mm
  isHomed: boolean;
  stepperMoving: boolean;
  holdingTorque: boolean;
  autoCycleActive: boolean;
  autoCycleIntervalMs: number;
  shiftRegister: ShiftSlot[];
  testMatrix: NwtTestMatrix;
  i2cDevices: {
    address: string;
    name: string;
    status: 'connected' | 'error';
    function: string;
  }[];
  pinout: {
    pin: string;
    gpio: number;
    function: string;
    targetComponent: string;
    state: 'HIGH' | 'LOW' | 'PWM';
  }[];
}

export interface PipelineBall {
  id: string;
  waveId: string;
  stage: BallPipelineStage;
  progressPercent: number; // 0 - 100
  enteredAt: string;
  color: BallColor;
  diameterMm: number;
  weightG: number;
  quality: BallQuality;
  targetContainerId?: string;
  targetContainerName?: string;
  durationMs: number;
}

export interface WaveInfo {
  id: string;
  number: number;
  detectedAt: string;
  ballCount: number;
  completedCount: number;
  inProgressCount: number;
  status: 'active' | 'completed';
}

export interface BottleneckAnalysis {
  status: 'optimal' | 'warning' | 'congested';
  bottleneckStation: 'feeder' | 'conveyor' | 'sensor' | 'servo' | 'none';
  congestionScore: number; // 0 - 100%
  queueLength: number;
  inProgressCount: number;
  completedCount: number;
  throughputPerMinute: number;
  recommendation: string;
  stationStats: {
    feederQueueTimeMs: number;
    conveyorTransitTimeMs: number;
    sensorMeasurementTimeMs: number;
    servoDivertTimeMs: number;
  };
}

export interface DiagnosticItem {
  id: string;
  name: string;
  subsystem: 'esp32' | 'i2c' | 'stepper' | 'servos' | 'sensor' | 'shift_register';
  status: 'pending' | 'running' | 'pass' | 'warn' | 'fail';
  durationMs: number;
  details: string;
  measuredValue?: string;
  expectedValue?: string;
}

export interface DiagnosticsReport {
  timestamp: string;
  overallStatus: 'idle' | 'running' | 'passed' | 'warning' | 'failed';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  warnedTests: number;
  executionDurationMs: number;
  items: DiagnosticItem[];
}

export interface SorterSystemStatus {
  state: SystemState;
  testMode: boolean; // Explicit test / simulation toggle (default false for production)
  emergencyStop: boolean;
  totalBalls: number;
  ballsPerMinute: number;
  sessionStartedAt: string | null;
  conveyorSpeed: number; // 0 - 100%
  feederSpeed: number;   // 0 - 100%
  currentServoAngle: number;
  targetServoAngle: number;
  containers: ContainerConfig[];
  rules: SortingRule[];
  telemetry: SensorTelemetry;
  esp32: Esp32Status;
  diagnostics?: DiagnosticsReport;
  pipeline: {
    activeWave: WaveInfo | null;
    recentWaves: WaveInfo[];
    activeBalls: PipelineBall[];
    bottleneck: BottleneckAnalysis;
  };
  smartHome: {
    mqttEnabled: boolean;
    homeAssistantWebhookActive: boolean;
    lastCommandFrom: string | null;
    autoHaltOnFull: boolean;
    automations: SmartHomeAutomationConfig[];
  };
  machine: MachineState;
}

export interface RealTimeBallEvent {
  type: 'ball_sorted';
  log: SortedBallLog;
  targetContainer: ContainerConfig;
  totalBalls: number;
  ballsPerMinute: number;
  currentServoAngle: number;
}

