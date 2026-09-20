import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  FastForward, 
  RotateCcw, 
  Disc, 
  Clock, 
  Zap, 
  ShieldAlert,
  Check
} from 'lucide-react';
import type { Esp32TelemetryResponse } from '../../types/scada.ts';

interface ControlDeckProps {
  telemetry: Esp32TelemetryResponse;
  onExecuteCommand: (cmd: string, params?: Record<string, string | number>) => Promise<boolean>;
  disabled?: boolean;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  telemetry,
  onExecuteCommand,
  disabled = false,
}) => {
  const [cycleTimeInput, setCycleTimeInput] = useState<number>(telemetry.cycle_ms || 1500);
  const [cycleFeedback, setCycleFeedback] = useState<boolean>(false);
  const [resetConfirm, setResetConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (telemetry.cycle_ms && telemetry.cycle_ms > 0) {
      setCycleTimeInput(telemetry.cycle_ms);
    }
  }, [telemetry.cycle_ms]);

  const handleStart = () => {
    onExecuteCommand('START');
  };

  const handleStop = () => {
    onExecuteCommand('STOP');
  };

  const handleStep = () => {
    onExecuteCommand('STEP');
  };

  const handleTriggerRed = () => {
    onExecuteCommand('TRIGGER_EJECTOR', { target: 'RED' });
  };

  const handleTriggerWhite = () => {
    onExecuteCommand('TRIGGER_EJECTOR', { target: 'WHITE' });
  };

  const handleResetStats = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 3000);
      return;
    }
    onExecuteCommand('RESET_STATS');
    setResetConfirm(false);
  };

  const handleSetCycleTime = (val?: number) => {
    const targetVal = val !== undefined ? val : Number(cycleTimeInput);
    if (!isNaN(targetVal) && targetVal >= 500 && targetVal <= 10000) {
      onExecuteCommand('SET_CYCLE_TIME', { value: targetVal });
      setCycleTimeInput(targetVal);
      setCycleFeedback(true);
      setTimeout(() => setCycleFeedback(false), 1500);
    }
  };

  const isRunning = telemetry.running || telemetry.status === 'AUTOMATIK';
  const calculatedBpm = cycleTimeInput > 0 ? (60000 / cycleTimeInput).toFixed(1) : '0';

  return (
    <section id="scada_control_deck" className="scada-panel p-4 sm:p-5 w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-[#1e293b] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#10b981]" />
          <h2 className="text-xs sm:text-sm font-bold text-white uppercase font-mono tracking-wider">
            STEUERUNGS-DECK (ANLAGEN-BEDIENUNG)
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-[#0b1120] px-2 py-0.5 border border-[#1e293b]">
          DIREKT-BEFEHLE AN ESP32 /api
        </span>
      </div>

      {/* 3-Column Control Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 font-mono">
        
        {/* COLUMN 1: HAUPTSTEUERUNG (START / NOT-HALT / STEP) */}
        <div className="md:col-span-5 flex flex-col justify-between p-4 bg-[#0b1120] border border-[#1e293b]">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3 border-b border-white/5 pb-1.5">
              1. Hauptantrieb &amp; Automatik
            </span>

            <div className="grid grid-cols-2 gap-3">
              {/* START BUTTON */}
              <button
                type="button"
                id="btn_cmd_start"
                onClick={handleStart}
                disabled={disabled || isRunning}
                className={`scada-btn py-4 px-3 flex flex-col items-center justify-center gap-2 border text-xs font-bold transition-all cursor-pointer ${
                  isRunning
                    ? 'bg-[#10b981]/15 border-[#10b981] text-[#10b981] cursor-not-allowed opacity-80'
                    : 'bg-[#10b981] hover:bg-[#059669] text-black border-[#10b981] shadow-lg active:translate-y-0.5'
                }`}
              >
                <Play className={`w-5 h-5 ${isRunning ? 'animate-pulse' : ''}`} />
                <span>START</span>
                <span className="text-[10px] font-normal opacity-80">
                  {isRunning ? 'AKTIV' : 'Automatik'}
                </span>
              </button>

              {/* STOP BUTTON (NOT-HALT) */}
              <button
                type="button"
                id="btn_cmd_stop"
                onClick={handleStop}
                disabled={disabled}
                className="scada-btn py-4 px-3 flex flex-col items-center justify-center gap-2 bg-[#ef4444] hover:bg-[#dc2626] text-white border-2 border-red-400 text-xs font-black shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all cursor-pointer active:translate-y-0.5"
                title="Hält die Anlage sofort an und schaltet Schrittmotor stromlos"
              >
                <Square className="w-5 h-5 fill-current" />
                <span>STOPP</span>
                <span className="text-[10px] font-normal opacity-90">NOT-AUS</span>
              </button>
            </div>
          </div>

          {/* EINZELSCHRITT (STEP) */}
          <div className="mt-3 pt-3 border-t border-white/5">
            <button
              type="button"
              id="btn_cmd_step"
              onClick={handleStep}
              disabled={disabled || isRunning}
              className={`scada-btn w-full py-2.5 px-3 flex items-center justify-center gap-2 border text-xs font-bold transition-all ${
                isRunning
                  ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-[#0f172a] hover:bg-[#1e293b] text-slate-200 border-[#334155] cursor-pointer'
              }`}
              title="Führt exakt einen Einzeltakt (75 mm Bandvorschub) aus"
            >
              <FastForward className="w-4 h-4 text-[#10b981]" />
              <span>EINZELSCHRITT (STEP +75 mm)</span>
            </button>
            <p className="text-[10px] text-slate-500 mt-1 text-center">
              Nur im Stillstand aktiv (Vorschub um 1 Station)
            </p>
          </div>
        </div>

        {/* COLUMN 2: MANUELLE AKTOREN & ZÄHLER-RESET */}
        <div className="md:col-span-3 flex flex-col justify-between p-4 bg-[#0b1120] border border-[#1e293b]">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3 border-b border-white/5 pb-1.5">
              2. Aktoren-Funktionstest
            </span>

            <div className="space-y-2.5">
              {/* Auswurf Rot */}
              <button
                type="button"
                id="btn_trigger_red"
                onClick={handleTriggerRed}
                disabled={disabled}
                className="scada-btn w-full py-2.5 px-3 bg-[#0f172a] hover:bg-[#ef4444]/20 border border-[#ef4444]/60 text-slate-200 hover:text-[#ef4444] text-xs flex items-center justify-between cursor-pointer transition-colors"
                title="Löst Servo 1 manuell aus (target=RED)"
              >
                <div className="flex items-center gap-2">
                  <Disc className="w-3.5 h-3.5 text-[#ef4444]" />
                  <span>AUSWURF ROT</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">SERVO 1</span>
              </button>

              {/* Auswurf Weiss */}
              <button
                type="button"
                id="btn_trigger_white"
                onClick={handleTriggerWhite}
                disabled={disabled}
                className="scada-btn w-full py-2.5 px-3 bg-[#0f172a] hover:bg-white/20 border border-white/60 text-slate-200 hover:text-white text-xs flex items-center justify-between cursor-pointer transition-colors"
                title="Löst Servo 2 manuell aus (target=WHITE)"
              >
                <div className="flex items-center gap-2">
                  <Disc className="w-3.5 h-3.5 text-white" />
                  <span>AUSWURF WEISS</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">SERVO 2</span>
              </button>
            </div>
          </div>

          {/* Reset Stats Button */}
          <div className="mt-3 pt-3 border-t border-white/5">
            <button
              type="button"
              id="btn_cmd_reset_stats"
              onClick={handleResetStats}
              disabled={disabled}
              className={`scada-btn w-full py-2 px-3 border text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                resetConfirm
                  ? 'bg-[#ef4444] text-white border-red-400 font-bold'
                  : 'bg-[#0f172a] hover:bg-[#1e293b] text-slate-400 hover:text-white border-[#334155]'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{resetConfirm ? 'WIRKLICH NULLEN?' : 'ZÄHLER RESETTEN'}</span>
            </button>
          </div>
        </div>

        {/* COLUMN 3: TAKTZEIT-EINSTELLUNG (SET_CYCLE_TIME) */}
        <div className="md:col-span-4 flex flex-col justify-between p-4 bg-[#0b1120] border border-[#1e293b]">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                3. Taktzeit (SET_CYCLE_TIME)
              </span>
              <span className="text-xs font-bold text-white font-mono">
                {cycleTimeInput} ms
              </span>
            </div>

            {/* Slider */}
            <div className="space-y-1 my-2">
              <input
                type="range"
                id="slider_cycle_time"
                min={500}
                max={5000}
                step={50}
                value={cycleTimeInput}
                onChange={(e) => setCycleTimeInput(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-900 accent-[#10b981] rounded-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>500 ms (Schnell)</span>
                <span>5000 ms (Langsam)</span>
              </div>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[800, 1200, 1500, 2000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSetCycleTime(val)}
                  className={`py-1 text-[10px] border cursor-pointer ${
                    cycleTimeInput === val
                      ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981] font-bold'
                      : 'bg-[#0f172a] hover:bg-[#1e293b] border-[#334155] text-slate-400'
                  }`}
                >
                  {val}ms
                </button>
              ))}
            </div>
          </div>

          {/* Apply Button & BPM Output */}
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
            <button
              type="button"
              id="btn_apply_cycle_time"
              onClick={() => handleSetCycleTime()}
              disabled={disabled}
              className="scada-btn flex-1 py-2 bg-[#10b981] hover:bg-[#059669] text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {cycleFeedback ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{cycleFeedback ? 'GESETZT' : 'ÜBERNEHMEN'}</span>
            </button>
            <div className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono text-center">
              <span>~{calculatedBpm} BPM</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
