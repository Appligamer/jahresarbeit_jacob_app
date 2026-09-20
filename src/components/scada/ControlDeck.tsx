import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  StepForward, 
  Sliders, 
  RotateCcw, 
  Target, 
  Check, 
  AlertOctagon,
  Settings2
} from 'lucide-react';
import type { Esp32TelemetryResponse, ClientConnectionStatus } from '../../types/scada.ts';

interface ControlDeckProps {
  telemetry: Esp32TelemetryResponse;
  connectionStatus: ClientConnectionStatus;
  onExecute: (cmd: string, params?: Record<string, string | number>) => Promise<boolean>;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  telemetry,
  connectionStatus,
  onExecute,
}) => {
  const [cycleTimeInput, setCycleTimeInput] = useState<number>(telemetry.cycle_ms || 1500);
  const [activeButton, setActiveButton] = useState<string | null>(null);

  const isOnline = connectionStatus === 'ONLINE';
  const isRunning = telemetry.running;

  const handleCommand = async (btnId: string, cmd: string, params?: Record<string, string | number>) => {
    setActiveButton(btnId);
    await onExecute(cmd, params);
    setTimeout(() => setActiveButton(null), 300);
  };

  const handleSetCycleTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cycleTimeInput < 500 || cycleTimeInput > 5000) return;
    handleCommand('btn_set_cycle', 'SET_CYCLE_TIME', { value: cycleTimeInput });
  };

  return (
    <section id="scada_control_deck" className="scada-panel p-4 sm:p-5 w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1e293b]">
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-white tracking-wider uppercase font-mono flex items-center gap-2">
            <span>BEDIENTASTEN & AKTOR-STEUERUNG</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Verifizierte Hardware-Schnittstellen: NEMA 17 Schrittmotor + SG90 Servos
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-500 uppercase">Status:</span>
          <span className={`px-2.5 py-0.5 font-bold uppercase tracking-wider ${
            isRunning ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]' : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}>
            {telemetry.status}
          </span>
        </div>
      </div>

      {/* Haupt-Bedienelemente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4 font-mono">
        {/* START-Button */}
        <button
          type="button"
          id="btn_cmd_start"
          disabled={!isOnline || isRunning}
          onClick={() => handleCommand('btn_start', 'START')}
          className={`scada-btn p-4 border flex flex-col justify-between transition-all cursor-pointer ${
            isRunning
              ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
              : 'bg-[#10b981]/15 hover:bg-[#10b981]/25 border-[#10b981] text-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.2)]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase">cmd=START</span>
            <Play className={`w-4 h-4 ${isRunning ? 'text-slate-600' : 'text-[#10b981]'}`} />
          </div>
          <div className="my-2 text-left">
            <div className="text-sm font-bold text-white tracking-wider">ANLAGE START</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Automatik-Betrieb takten</div>
          </div>
          <div className="text-[9px] text-slate-500 text-left">
            {isRunning ? 'Laeuft bereits' : 'Aktiviert Taktsteuerung'}
          </div>
        </button>

        {/* NOT-HALT / STOPP Button */}
        <button
          type="button"
          id="btn_cmd_stop"
          onClick={() => handleCommand('btn_stop', 'STOP')}
          className="scada-btn p-4 border border-[#ef4444] bg-[#ef4444]/20 hover:bg-[#ef4444]/35 text-[#ef4444] flex flex-col justify-between transition-all shadow-[0_0_15px_rgba(239,68,68,0.25)] cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-bold text-[#ef4444] uppercase">cmd=STOP</span>
            <AlertOctagon className="w-5 h-5 text-[#ef4444]" />
          </div>
          <div className="my-2 text-left">
            <div className="text-sm font-bold text-white tracking-wider">NOT-HALT / STOPP</div>
            <div className="text-[10px] text-slate-300 mt-0.5">Sofortiger Bandstopp</div>
          </div>
          <div className="text-[9px] text-[#ef4444]/80 text-left">
            Setzt running=false & schaltet Treiber ab
          </div>
        </button>

        {/* EINZELTAKT (75mm) Button */}
        <button
          type="button"
          id="btn_cmd_step"
          disabled={!isOnline || isRunning}
          onClick={() => handleCommand('btn_step', 'STEP')}
          className={`scada-btn p-4 border flex flex-col justify-between transition-all cursor-pointer ${
            isRunning || !isOnline
              ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
              : 'bg-[#0f172a] hover:bg-[#1e293b] border-[#38bdf8] text-[#38bdf8]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase">cmd=STEP</span>
            <StepForward className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div className="my-2 text-left">
            <div className="text-sm font-bold text-white tracking-wider">EINZELTAKT (75mm)</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Vorschub um genau einen Slot</div>
          </div>
          <div className="text-[9px] text-slate-500 text-left">
            {isRunning ? 'Im Automatikmodus gesperrt' : 'Faehrt genau 75 mm'}
          </div>
        </button>

        {/* AUSWURF ROT TEST Button */}
        <button
          type="button"
          id="btn_cmd_trigger_red"
          disabled={!isOnline}
          onClick={() => handleCommand('btn_red', 'TRIGGER_EJECTOR', { target: 'RED' })}
          className={`scada-btn p-4 border border-[#ef4444]/50 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] flex flex-col justify-between transition-all cursor-pointer ${
            !isOnline ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase">cmd=TRIGGER_EJECTOR&target=RED</span>
            <Target className="w-4 h-4 text-[#ef4444]" />
          </div>
          <div className="my-2 text-left">
            <div className="text-sm font-bold text-white tracking-wider">AUSWURF ROT TEST</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Station 1: Servo Rot ansteuern</div>
          </div>
          <div className="text-[9px] text-slate-500 text-left">
            SG90 Servo 1 Impuls ausloesen
          </div>
        </button>

        {/* AUSWURF WEISS TEST Button */}
        <button
          type="button"
          id="btn_cmd_trigger_white"
          disabled={!isOnline}
          onClick={() => handleCommand('btn_white', 'TRIGGER_EJECTOR', { target: 'WHITE' })}
          className={`scada-btn p-4 border border-slate-400 bg-white/5 hover:bg-white/10 text-slate-200 flex flex-col justify-between transition-all cursor-pointer ${
            !isOnline ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase">cmd=TRIGGER_EJECTOR&target=WHITE</span>
            <Target className="w-4 h-4 text-slate-300" />
          </div>
          <div className="my-2 text-left">
            <div className="text-sm font-bold text-white tracking-wider">AUSWURF WEISS TEST</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Station 2: Servo Weiss ansteuern</div>
          </div>
          <div className="text-[9px] text-slate-500 text-left">
            SG90 Servo 2 Impuls ausloesen
          </div>
        </button>

        {/* ZAEHLER ZURUECKSETZEN Button */}
        <button
          type="button"
          id="btn_cmd_reset_stats"
          disabled={!isOnline}
          onClick={() => handleCommand('btn_reset', 'RESET_STATS')}
          className={`scada-btn p-4 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 flex flex-col justify-between transition-all cursor-pointer ${
            !isOnline ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase">cmd=RESET_STATS</span>
            <RotateCcw className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2 text-left">
            <div className="text-sm font-bold text-white tracking-wider">ZAEHLER ZURUECKSETZEN</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Statistik-Zaehler auf 0 setzen</div>
          </div>
          <div className="text-[9px] text-slate-500 text-left">
            Loescht Gesamt / Rot / Weiss / Unbekannt
          </div>
        </button>
      </div>

      {/* TAKTZEIT SETZEN (500 bis 5000 ms) */}
      <div className="mt-4 pt-4 border-t border-[#1e293b] font-mono">
        <form onSubmit={handleSetCycleTime} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-white uppercase mb-0.5 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#10b981]" />
              <span>TAKTZEIT (CYCLE TIME): {cycleTimeInput} ms</span>
            </label>
            <p className="text-[10px] text-slate-400">
              Einstellbereich: 500 ms (schnell) bis 5000 ms (langsam)
            </p>
          </div>

          <div className="sm:col-span-5 flex items-center gap-3">
            <span className="text-[10px] text-slate-500">500</span>
            <input
              type="range"
              id="slider_cycle_time"
              min="500"
              max="5000"
              step="50"
              value={cycleTimeInput}
              onChange={(e) => setCycleTimeInput(parseInt(e.target.value, 10))}
              className="w-full accent-[#10b981] cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">5000</span>
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <input
              type="number"
              id="input_cycle_time_num"
              min="500"
              max="5000"
              step="50"
              value={cycleTimeInput}
              onChange={(e) => setCycleTimeInput(parseInt(e.target.value, 10) || 500)}
              className="w-20 bg-[#070b14] border border-[#1e293b] text-white px-2 py-2 text-xs font-mono outline-none"
            />
            <button
              type="submit"
              id="btn_cmd_set_cycle_time"
              disabled={!isOnline}
              className={`scada-btn flex-1 py-2 bg-[#10b981] hover:bg-[#059669] text-black font-bold text-xs flex items-center justify-center gap-1 cursor-pointer ${
                !isOnline ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>SETZEN</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
