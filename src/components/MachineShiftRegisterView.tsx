import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  StepForward, 
  RotateCcw, 
  Flame, 
  CircleDot, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  Activity, 
  Compass, 
  Radio, 
  Layers,
  ArrowRight,
  Zap,
  Gauge
} from 'lucide-react';
import type { SorterSystemStatus, ShiftSlot, CyclePhase } from '../types.ts';

interface MachineShiftRegisterViewProps {
  status: SorterSystemStatus;
  onRefresh: () => void;
  showToast: (text: string, type?: 'success' | 'info' | 'warn') => void;
}

export const MachineShiftRegisterView: React.FC<MachineShiftRegisterViewProps> = ({
  status,
  onRefresh,
  showToast
}) => {
  const [isStepping, setIsStepping] = useState(false);
  const [isHoming, setIsHoming] = useState(false);
  const [selectedFeedColor, setSelectedFeedColor] = useState<'red' | 'white' | 'empty' | 'unknown'>('red');

  const machine = status.machine;
  const isEmergency = status.emergencyStop;
  const autoActive = machine?.autoCycleActive ?? false;
  const currentPhase: CyclePhase = machine?.currentPhase ?? 'phase_5_ready';

  const phases = [
    { id: 'phase_1_transport', name: '1. Transport', desc: '75mm Vorschub (NEMA 17, TMC2209)' },
    { id: 'phase_2_shift', name: '2. Shift', desc: 'FIFO Array im ESP32 RAM verschieben' },
    { id: 'phase_3_measure', name: '3. Farbmessung', desc: 'TCS34725 RGBC an Station 0' },
    { id: 'phase_4_eject', name: '4. Auswurf', desc: 'PCA9685 Servostößel (Ch 0 / 1)' },
    { id: 'phase_5_ready', name: '5. Bereit', desc: 'Warten auf nächsten Takt (≤1.5s)' }
  ];

  // 1. Trigger single 75mm machine cycle
  const handleSingleStep = async (colorOverride?: 'red' | 'white' | 'empty' | 'unknown') => {
    if (isEmergency) {
      showToast('Not-Aus ist aktiv! Zuerst entriegeln.', 'warn');
      return;
    }
    setIsStepping(true);
    try {
      const res = await fetch('/api/machine/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: colorOverride ?? selectedFeedColor })
      });
      if (res.ok) {
        showToast('Taktzyklus (75mm) ausgeführt', 'success');
        onRefresh();
      }
    } catch {
      showToast('Fehler bei der Takt-Ausführung', 'warn');
    } finally {
      setIsStepping(false);
    }
  };

  // 2. Toggle continuous automatic cycling
  const handleToggleAuto = async () => {
    if (isEmergency) {
      showToast('Not-Aus ist aktiv! Zuerst entriegeln.', 'warn');
      return;
    }
    try {
      const res = await fetch('/api/machine/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !autoActive })
      });
      if (res.ok) {
        showToast(!autoActive ? 'Automatik-Takt gestartet (1.4s/Takt)' : 'Automatik-Takt gestoppt', 'info');
        onRefresh();
      }
    } catch {
      showToast('Fehler beim Ändern des Automatik-Takts', 'warn');
    }
  };

  // 3. Trigger homing
  const handleHoming = async () => {
    if (isEmergency) {
      showToast('Not-Aus ist aktiv! Zuerst entriegeln.', 'warn');
      return;
    }
    setIsHoming(true);
    try {
      const res = await fetch('/api/machine/homing', { method: 'POST' });
      if (res.ok) {
        showToast('Referenzfahrt (Homing) erfolgreich an GPIO 34 abgeschlossen', 'success');
        onRefresh();
      }
    } catch {
      showToast('Fehler bei Referenzfahrt', 'warn');
    } finally {
      setIsHoming(false);
    }
  };

  // 4. Feed test ball into pocket 0
  const handleFeedBall = async (color: 'red' | 'white' | 'empty' | 'unknown') => {
    setSelectedFeedColor(color);
    await handleSingleStep(color);
  };

  const shiftRegister: ShiftSlot[] = machine?.shiftRegister ?? [
    { index: 0, name: 'Station 0: Farbsensor', distanceMm: 0, hardwareType: 'sensor', ball: null, ejectorActive: false },
    { index: 1, name: 'Station 1: Auswurf Rot', distanceMm: 75, hardwareType: 'ejector_red', pca9685Channel: 0, ball: null, ejectorActive: false },
    { index: 2, name: 'Station 2: Auswurf Weiß', distanceMm: 150, hardwareType: 'ejector_white', pca9685Channel: 1, ball: null, ejectorActive: false },
    { index: 3, name: 'Station 3: Bandende', distanceMm: 225, hardwareType: 'end_reject', ball: null, ejectorActive: false }
  ];

  return (
    <div className="space-y-6">
      {/* Top Metrics Row - Dark Technical Look */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
            <span>Takt-Zähler</span>
            <Activity className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono">
            <span className="text-2xl font-bold text-neutral-100 tracking-tight">
              {machine?.cycleCount ?? 0}
            </span>
            <span className="text-xs text-neutral-400 font-medium">Zyklen</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3 h-3 text-sky-400" />
            <span>NwT Ziel: 100 Zyklen</span>
          </div>
        </div>

        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
            <span>Rastermaß (Sstep)</span>
            <Compass className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono">
            <span className="text-2xl font-bold text-neutral-100 tracking-tight">
              75
            </span>
            <span className="text-xs text-neutral-400 font-medium">mm / Takt</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 font-mono">
            NEMA 17 + TMC2209
          </div>
        </div>

        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
            <span>Taktzeit (Ist/Soll)</span>
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono">
            <span className="text-2xl font-bold text-neutral-100 tracking-tight">
              {((machine?.lastCycleDurationMs ?? 1280) / 1000).toFixed(2)}
            </span>
            <span className="text-xs text-neutral-400 font-medium">s / Takt</span>
          </div>
          <div className="mt-1 text-[11px] text-sky-300 font-mono">
            ≤ 1.50s Vorgabe konform
          </div>
        </div>

        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
            <span>I2C Aktoren-Bus</span>
            <Cpu className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono">
            <span className="text-xl font-bold text-neutral-100 tracking-tight">
              PCA9685
            </span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 font-mono">
            0x40 (Ch 0: Rot, Ch 1: Weiß)
          </div>
        </div>

        <div className="col-span-2 sm:col-span-3 lg:col-span-1 bg-neutral-900 rounded-xl border border-neutral-800 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
            <span>Schrittmotor Status</span>
            <Zap className={`w-3.5 h-3.5 ${machine?.stepperMoving ? 'text-amber-400 animate-spin' : 'text-sky-400'}`} />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-base font-bold font-mono tracking-tight ${machine?.stepperMoving ? 'text-amber-400' : 'text-neutral-100'}`}>
              {machine?.stepperMoving ? 'Fährt 75mm...' : 'Haltemoment aktiv'}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 font-mono">
            {machine?.isHomed ? 'Homing OK (GPIO 34)' : 'Bereit / Entprellt'}
          </div>
        </div>
      </div>

      {/* 5-Phase Sequence Monitor */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100 flex items-center gap-2 tracking-tight">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>5-Phasen-Taktzyklus (Phasen.md)</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Deterministischer Steuerungsablauf im ESP32 pro 75mm Schritt
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-neutral-950 text-sky-300 border border-neutral-800">
              Phase: {currentPhase.replace('phase_', '').replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Phase progress chips */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          {phases.map((phase) => {
            const isActive = currentPhase === phase.id;
            return (
              <div 
                key={phase.id}
                className={`p-3 rounded-lg border transition-all ${
                  isActive 
                    ? 'bg-neutral-950 border-sky-500/50 ring-1 ring-sky-500/30' 
                    : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold font-mono ${isActive ? 'text-sky-300' : 'text-neutral-300'}`}>
                    {phase.name}
                  </span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  )}
                </div>
                <p className={`text-[11px] mt-1 ${isActive ? 'text-neutral-300' : 'text-neutral-400'}`}>
                  {phase.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* THE VIRTUAL SHIFT REGISTER (Visual Conveyor Belt) */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-sky-950/60 text-sky-300 border border-sky-500/30 uppercase tracking-wider">
                Virtuelles Schieberegister
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                FIFO-Array im ESP32 RAM (Stationen 0 bis 3)
              </span>
            </div>
            <h3 className="text-sm font-semibold text-neutral-100 mt-1">
              Getaktetes Förderband mit Kettengliedern & Auswurfstößeln
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Transportrichtung:</span>
            <div className="flex items-center gap-1 font-mono text-xs text-sky-300 bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">
              <span>0mm (Sensor)</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
              <span>225mm (Bandende)</span>
            </div>
          </div>
        </div>

        {/* 4 Shift Register Pockets (Raster 75mm) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          {shiftRegister.map((slot) => {
            const hasBall = !!slot.ball && slot.ball.color !== 'empty';
            const isRed = slot.ball?.color === 'red';
            const isWhite = slot.ball?.color === 'white';
            const isUnknown = slot.ball?.color === 'unknown';

            return (
              <div 
                key={slot.index}
                className={`relative rounded-xl border p-4 transition-all ${
                  slot.ejectorActive 
                    ? 'bg-rose-950/40 border-rose-500/80 shadow-md' 
                    : hasBall 
                    ? 'bg-neutral-950 border-neutral-700' 
                    : 'bg-neutral-950/50 border-neutral-800/80 border-dashed'
                }`}
              >
                {/* Pocket Header */}
                <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="font-semibold text-sky-400">Tasche {slot.index}</span>
                    <span className="text-neutral-400">({slot.distanceMm}mm)</span>
                  </div>
                  {slot.hardwareType === 'sensor' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-neutral-900 text-neutral-300 border border-neutral-800">
                      TCS34725
                    </span>
                  )}
                  {slot.hardwareType === 'ejector_red' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-red-950/60 text-red-300 border border-red-800/60">
                      PCA9685 Ch0
                    </span>
                  )}
                  {slot.hardwareType === 'ejector_white' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-sky-950/60 text-sky-300 border border-sky-800/60">
                      PCA9685 Ch1
                    </span>
                  )}
                  {slot.hardwareType === 'end_reject' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-neutral-900 text-neutral-400 border border-neutral-800">
                      Ausschuss
                    </span>
                  )}
                </div>

                {/* Pocket Visual Area */}
                <div className="h-28 flex flex-col items-center justify-center relative">
                  {hasBall ? (
                    <div className="flex flex-col items-center">
                      <div 
                        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md ${
                          isRed 
                            ? 'bg-red-600 border-2 border-red-400 text-white' 
                            : isWhite 
                            ? 'bg-neutral-100 border-2 border-white text-neutral-900' 
                            : 'bg-neutral-600 border-2 border-neutral-400 text-white'
                        }`}
                      >
                        {isRed && <Flame className="w-6 h-6" />}
                        {isWhite && <CircleDot className="w-6 h-6" />}
                        {isUnknown && <AlertTriangle className="w-6 h-6" />}
                      </div>

                      <div className="mt-2 text-center">
                        <span className="text-xs font-mono font-semibold text-neutral-100">
                          {isRed ? 'ROT' : isWhite ? 'WEISS' : 'UNBEKANNT'}
                        </span>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          Ø {slot.ball?.diameterMm ?? 40.0} mm
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-neutral-400">
                      <div className="w-12 h-12 rounded-full border border-dashed border-neutral-800 mx-auto flex items-center justify-center text-neutral-400 text-xs font-mono">
                        LEER
                      </div>
                      <span className="text-[11px] mt-1.5 block">Kein Ball im Slot</span>
                    </div>
                  )}

                  {/* Ejector Servo Active Flash */}
                  {slot.ejectorActive && (
                    <div className="absolute inset-0 bg-rose-950/80 rounded-lg flex items-center justify-center border border-rose-500 animate-pulse">
                      <div className="bg-rose-600 text-white font-mono font-bold text-xs px-2.5 py-1 rounded shadow flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        <span>STÖSSEL AKTIV!</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Station Description Footer */}
                <div className="mt-3 pt-2.5 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
                  <span className="truncate">
                    {slot.index === 0 && 'Farbmessung (0mm)'}
                    {slot.index === 1 && 'Zielbehälter Rot (75mm)'}
                    {slot.index === 2 && 'Zielbehälter Weiß (150mm)'}
                    {slot.index === 3 && 'Bandende / Fall (225mm)'}
                  </span>
                  {slot.pca9685Channel !== undefined && (
                    <span className="font-mono text-neutral-400 text-[10px]">
                      Ch{slot.pca9685Channel}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Machine Controls & Quick Operations */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              <span>Maschinensteuerung & Takt-Befehle</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Ansteuerung des NEMA 17 Schrittmotors (TMC2209) und des PCA9685 Servotreibers
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleHoming}
              disabled={isHoming || isEmergency}
              className="px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-300 hover:text-neutral-100 hover:border-neutral-700 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isHoming ? 'animate-spin text-sky-400' : ''}`} />
              <span>Homing (GPIO 34)</span>
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Main Action 1: Single Step 75mm */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-neutral-100 block">Einzeltakt (75 mm)</span>
              <p className="text-xs text-neutral-400 mt-1">
                Führt 1 vollständigen Taktzyklus aus: NEMA 17 fährt 75mm vor, FIFO shiftet, Sensor misst, Stößel stoßen aus.
              </p>
            </div>
            <button
              onClick={() => handleSingleStep()}
              disabled={isStepping || autoActive || isEmergency}
              className="mt-3.5 w-full py-2 bg-sky-500 hover:bg-sky-400 text-neutral-950 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <StepForward className={`w-3.5 h-3.5 ${isStepping ? 'animate-bounce' : ''}`} />
              <span>{isStepping ? 'Takt läuft...' : '1 Takt ausführen (75mm)'}</span>
            </button>
          </div>

          {/* Main Action 2: Automatic Continuous Cycling */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-100 block">Automatik-Takt (1.4s)</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  autoActive 
                    ? 'bg-sky-950 text-sky-300 border border-sky-500/30' 
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                }`}>
                  {autoActive ? 'LÄUFT' : 'PAUSIERT'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Kontinuierlicher deterministischer Sortiertakt gemäß Vorgabe (Taktzeit ≤ 1.5s).
              </p>
            </div>
            <button
              onClick={handleToggleAuto}
              disabled={isEmergency}
              className={`mt-3.5 w-full py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                autoActive 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30' 
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700'
              }`}
            >
              {autoActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{autoActive ? 'Automatik stoppen' : 'Automatik starten'}</span>
            </button>
          </div>

          {/* Main Action 3: Quick Feed ball */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-neutral-100 block">Zuführung / Ball einwerfen</span>
              <p className="text-xs text-neutral-400 mt-1">
                Testball in Tasche 0 (Farbsensor) einlegen:
              </p>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <button
                onClick={() => handleFeedBall('red')}
                disabled={isEmergency}
                className="py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-red-400 border border-neutral-800 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Rot einlegen</span>
              </button>
              <button
                onClick={() => handleFeedBall('white')}
                disabled={isEmergency}
                className="py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <CircleDot className="w-3.5 h-3.5 text-sky-400" />
                <span>Weiß einlegen</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Auffangbehälter (Rot, Weiß, Ausschuss) */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Radio className="w-4 h-4 text-sky-400" />
              <span>Auffangbehälter & Auswurfstationen</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Zielbehälter für sortierte Bälle nach Farbe & Formgenauigkeit
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            Gesamt: <strong className="text-neutral-100">{status.totalBalls}</strong> Bälle
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Behälter 1: Rot */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-800/60 text-red-400 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-200">Behälter 1: Rot</h4>
                  <span className="text-[10px] text-neutral-400 font-mono">Station 1 (75mm) • PCA9685 Ch 0</span>
                </div>
              </div>
              <span className="text-2xl font-bold font-mono text-red-400">
                {status.containers[0]?.count ?? 0}
              </span>
            </div>
            <div className="mt-3">
              <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-red-500 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, ((status.containers[0]?.count ?? 0) / (status.containers[0]?.capacity || 50)) * 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-neutral-400 font-mono">
                <span>Füllstand: {status.containers[0]?.count ?? 0} / {status.containers[0]?.capacity || 50}</span>
                <span>SG90 Stößel</span>
              </div>
            </div>
          </div>

          {/* Behälter 2: Weiß */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-950/60 border border-sky-800/60 text-sky-400 flex items-center justify-center">
                  <CircleDot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-200">Behälter 2: Weiß</h4>
                  <span className="text-[10px] text-neutral-400 font-mono">Station 2 (150mm) • PCA9685 Ch 1</span>
                </div>
              </div>
              <span className="text-2xl font-bold font-mono text-sky-400">
                {status.containers[1]?.count ?? 0}
              </span>
            </div>
            <div className="mt-3">
              <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-sky-400 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, ((status.containers[1]?.count ?? 0) / (status.containers[1]?.capacity || 50)) * 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-neutral-400 font-mono">
                <span>Füllstand: {status.containers[1]?.count ?? 0} / {status.containers[1]?.capacity || 50}</span>
                <span>SG90 Stößel</span>
              </div>
            </div>
          </div>

          {/* Behälter 3: Ausschuss / Unbekannt */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-200">Ausschuss & Bandende</h4>
                  <span className="text-[10px] text-neutral-400 font-mono">Bandende (225mm) • Freier Fall</span>
                </div>
              </div>
              <span className="text-2xl font-bold font-mono text-neutral-300">
                {status.containers[2]?.count ?? 0}
              </span>
            </div>
            <div className="mt-3">
              <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-neutral-600 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, ((status.containers[2]?.count ?? 0) / (status.containers[2]?.capacity || 40)) * 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-neutral-400 font-mono">
                <span>Füllstand: {status.containers[2]?.count ?? 0} / {status.containers[2]?.capacity || 40}</span>
                <span>Defekt / Leertakt</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
