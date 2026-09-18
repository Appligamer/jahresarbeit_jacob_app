import React from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  AlertOctagon, 
  Wifi, 
  WifiOff, 
  Cpu, 
  Sparkles, 
  RotateCcw,
  CheckCircle2,
  Terminal
} from 'lucide-react';
import type { SorterSystemStatus } from '../types.ts';

interface HeaderProps {
  status: SorterSystemStatus;
  onControl: (action: string, value?: unknown) => Promise<void>;
  onOpenSimModal: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  status, 
  onControl, 
  onOpenSimModal,
  loading 
}) => {
  const isEmergency = status.emergencyStop;
  const isRunning = status.state === 'running';
  const isPaused = status.state === 'paused';
  const isTestMode = Boolean(status.testMode ?? status.esp32.isSimulated);

  return (
    <header className="bg-neutral-950 border-b border-neutral-800 sticky top-0 z-30 shadow-xs">
      {/* Emergency banner if active */}
      {isEmergency && (
        <div className="bg-rose-700 text-white px-4 py-2 flex items-center justify-between text-xs font-semibold tracking-wide border-b border-rose-600">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-white animate-pulse" />
            <span>NOT-AUS AKTIVIERT: Schrittmotor-Takt und Servostößel sind hardwareseitig gesperrt!</span>
          </div>
          <button
            onClick={() => onControl('reset_emergency')}
            className="px-2.5 py-1 bg-white text-rose-900 hover:bg-neutral-100 rounded text-xs font-bold uppercase transition-colors cursor-pointer"
          >
            Not-Aus entriegeln
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
          {/* Title & Project Meta */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-sky-400 font-mono font-bold text-sm shrink-0">
              NwT
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-semibold text-neutral-100 tracking-tight">
                  Tischtennisball-Sortieranlage
                </h1>
                <span className="px-2 py-0.2 rounded text-[11px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-800">
                  Jacob Glathe 2026
                </span>
                <span className="px-2 py-0.2 rounded text-[11px] font-mono text-sky-300 bg-sky-950/60 border border-sky-500/30">
                  TCS34725 • ESP32
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Steuerungs- & Diagnose-Dashboard • 75mm Takt-Schieberegister • Smart-Home API
              </p>
            </div>
          </div>

          {/* Center / Right: Hardware Status & Controls */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* ESP32 Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-xs font-mono">
              {status.esp32.connected ? (
                <span className={`w-2 h-2 rounded-full ${isTestMode ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
              ) : (
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              )}
              <div className="flex flex-col leading-tight">
                <span className={`font-medium ${status.esp32.connected ? 'text-neutral-200' : 'text-rose-300'}`}>
                  {status.esp32.connected 
                    ? (isTestMode ? 'ESP32 (Simuliert)' : 'ESP32 (Hardware)') 
                    : 'ESP32 (Offline)'}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {status.esp32.connected 
                    ? `${status.esp32.ip} • ${status.esp32.pingMs}ms` 
                    : 'Kein Signal (Port 3000)'}
                </span>
              </div>
            </div>

            {/* Test Mode Toggle Switch - Clean & Accessible */}
            <div 
              onClick={() => onControl('toggle_test_mode')}
              title={isTestMode ? 'Klicken, um Testmodus auszuschalten (Produktionsmodus)' : 'Klicken, um Testmodus zu aktivieren'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors select-none ${
                isTestMode 
                  ? 'bg-sky-950/50 border-sky-500/40 text-sky-200' 
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
              }`}
            >
              {/* Toggle switch visual */}
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                isTestMode ? 'bg-sky-500 justify-end' : 'bg-neutral-800 justify-start'
              }`}>
                <div className={`w-3 h-3 rounded-full transition-transform ${
                  isTestMode ? 'bg-neutral-950' : 'bg-neutral-400'
                }`} />
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="font-semibold text-[11px]">
                  {isTestMode ? 'Testmodus: AKTIV' : 'Testmodus: AUS'}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {isTestMode ? 'Virtuelle Simulation' : 'Physische Anlage'}
                </span>
              </div>
            </div>

            {/* Manual Ball Inject Trigger (Available anytime for testing) */}
            <button
              onClick={onOpenSimModal}
              disabled={isEmergency}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Ball testen</span>
            </button>

            {/* Primary Machine Controls */}
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
              <button
                onClick={() => onControl('start')}
                disabled={isRunning || isEmergency || loading}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isRunning
                    ? 'bg-sky-500 text-neutral-950'
                    : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start</span>
              </button>

              <button
                onClick={() => onControl('pause')}
                disabled={!isRunning || isEmergency || loading}
                className={`px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isPaused
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>

              <button
                onClick={() => onControl('stop')}
                disabled={(status.state === 'idle' && !isEmergency) || loading}
                className="px-2.5 py-1.5 rounded text-xs font-semibold text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>

              <button
                onClick={() => onControl('emergency_stop')}
                className={`px-2.5 py-1.5 rounded text-xs font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isEmergency
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300'
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Not-Aus</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
