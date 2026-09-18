import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  Pause, 
  RotateCcw, 
  Footprints, 
  Target, 
  Sliders, 
  ShieldAlert, 
  Check, 
  ChevronRight,
  Zap
} from 'lucide-react';
import type { OutgoingCommand, SystemRunStatus } from '../../types/scada.ts';

interface ControlDeckProps {
  status: SystemRunStatus;
  currentStepDelayMs: number;
  onSendCommand: (cmd: OutgoingCommand) => boolean;
  disabled?: boolean;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  status,
  currentStepDelayMs,
  onSendCommand,
  disabled = false,
}) => {
  const [sliderDelay, setSliderDelay] = useState<number>(currentStepDelayMs || 1200);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const triggerCmd = (cmd: OutgoingCommand, label: string) => {
    const ok = onSendCommand(cmd);
    if (ok) {
      setLastAction(label);
      setTimeout(() => setLastAction(null), 2000);
    }
  };

  const handleSliderChange = (newVal: number) => {
    setSliderDelay(newVal);
    onSendCommand({ command: 'SET_STEP_DELAY', delay_ms: newVal });
  };

  return (
    <div className="bg-[#0D0E12] border border-[#1A1D24] rounded-lg p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1A1D24] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00FF88]" />
          <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-[#E1E4EA]">
            CONTROL-DECK // PRIMÄRE MASCHINENSTEUERUNG
          </h2>
        </div>

        {lastAction && (
          <div className="text-[11px] font-mono text-[#00FF88] flex items-center gap-1.5 animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>BEFEHL ÜBERTRAGEN: {lastAction}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Main Machine State Control Buttons (Start / Stop Emergency / Pause / Reset) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div className="text-[10px] font-mono uppercase text-[#626875] tracking-wider">
            1. BETRIEBSMODUS & NOT-HALT
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* START BUTTON */}
            <button
              onClick={() => triggerCmd({ command: 'START' }, 'START')}
              disabled={disabled || status === 'RUNNING'}
              className={`p-3.5 rounded-lg font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                status === 'RUNNING'
                  ? 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/50 ring-2 ring-[#00FF88]/20 opacity-90'
                  : 'bg-[#111318] hover:bg-[#00FF88]/10 text-[#E1E4EA] hover:text-[#00FF88] border border-[#1A1D24] hover:border-[#00FF88]/40'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>AUTOMATIK START</span>
            </button>

            {/* PAUSE BUTTON */}
            <button
              onClick={() => triggerCmd({ command: 'PAUSE' }, 'PAUSE')}
              disabled={disabled || status === 'STOPPED'}
              className={`p-3.5 rounded-lg font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                status === 'PAUSED'
                  ? 'bg-[#FF9500]/20 text-[#FF9500] border border-[#FF9500]/50 ring-2 ring-[#FF9500]/20'
                  : 'bg-[#111318] hover:bg-[#FF9500]/10 text-[#E1E4EA] hover:text-[#FF9500] border border-[#1A1D24] hover:border-[#FF9500]/40'
              }`}
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>PAUSE</span>
            </button>
          </div>

          {/* EMERGENCY STOP (NOT-HALT) BUTTON */}
          <button
            onClick={() => triggerCmd({ command: 'STOP' }, 'NOT-HALT / STOP')}
            disabled={disabled}
            className="w-full p-4 rounded-lg bg-[#2A0B0D] hover:bg-[#3D0F13] active:scale-[0.99] border-2 border-[#FF3B30] text-[#FF3B30] font-mono font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,59,48,0.25)] hover:shadow-[0_0_30px_rgba(255,59,48,0.4)]"
          >
            <Square className="w-5 h-5 fill-current" />
            <span>NOT-HALT / SOFORT-STOPP</span>
          </button>

          {/* Reset Stats button */}
          <button
            onClick={() => triggerCmd({ command: 'RESET_STATS' }, 'ZÄHLER RESET')}
            disabled={disabled}
            className="w-full py-2 rounded bg-[#111318] hover:bg-[#1A1D24] border border-[#1A1D24] text-[#626875] hover:text-[#E1E4EA] font-mono text-[11px] uppercase transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>TELEMETRIE & ZÄHLER ZURÜCKSETZEN</span>
          </button>
        </div>

        {/* Center: Calibration & Single Step / Ejector Diagnostics */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-3 border-t lg:border-t-0 lg:border-l lg:border-r border-[#1A1D24] pt-3 lg:pt-0 lg:px-4">
          <div className="text-[10px] font-mono uppercase text-[#626875] tracking-wider">
            2. EINZELSCHRITT & AKTOR-TESTS
          </div>

          {/* Manual Step Button */}
          <button
            onClick={() => triggerCmd({ command: 'MANUAL_STEP' }, 'MANUAL STEP (+75mm)')}
            disabled={disabled}
            className="w-full p-3 rounded-lg bg-[#111318] hover:bg-[#1A1D24] active:bg-[#222731] border border-[#1A1D24] hover:border-[#00FF88]/40 text-[#E1E4EA] hover:text-[#00FF88] font-mono text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Footprints className="w-4 h-4 text-[#00FF88]" />
              <span>EINZELTAKT VORSCHUB</span>
            </div>
            <span className="text-[10px] text-[#626875] bg-[#0D0E12] px-2 py-0.5 rounded border border-[#1A1D24]">
              +75 mm
            </span>
          </button>

          {/* Test Ejector Station 1 (Rot) */}
          <button
            onClick={() => triggerCmd({ command: 'TRIGGER_EJECTOR', station: 1 }, 'AUSWURF SERVO 1 (ROT)')}
            disabled={disabled}
            className="w-full p-2.5 rounded-lg bg-[#111318] hover:bg-[#FF3B30]/10 border border-[#1A1D24] hover:border-[#FF3B30]/50 text-[#E1E4EA] hover:text-[#FF3B30] font-mono text-xs font-semibold uppercase transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#FF3B30]" />
              <span>TEST STÖSSEL 1 (ROT)</span>
            </div>
            <span className="text-[10px] text-[#FF3B30] font-mono">
              Hub 25mm @ 75mm
            </span>
          </button>

          {/* Test Ejector Station 2 (Weiß) */}
          <button
            onClick={() => triggerCmd({ command: 'TRIGGER_EJECTOR', station: 2 }, 'AUSWURF SERVO 2 (WEISS)')}
            disabled={disabled}
            className="w-full p-2.5 rounded-lg bg-[#111318] hover:bg-[#F0F2F5]/10 border border-[#1A1D24] hover:border-[#F0F2F5]/50 text-[#E1E4EA] hover:text-[#F0F2F5] font-mono text-xs font-semibold uppercase transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#F0F2F5]" />
              <span>TEST STÖSSEL 2 (WEISS)</span>
            </div>
            <span className="text-[10px] text-[#F0F2F5] font-mono">
              Hub 25mm @ 150mm
            </span>
          </button>

          <div className="text-[10px] font-mono text-[#626875] pt-1">
            * Einzelschritte und Stößeltests erfolgen hardware-synchron.
          </div>
        </div>

        {/* Right: Conveyor Speed / Step Delay Slider */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-3 pt-3 lg:pt-0">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[#626875] tracking-wider">
            <span>3. GESCHWINDIGKEIT</span>
            <span className="text-[#00FF88] font-bold tabular-nums">
              {sliderDelay} ms
            </span>
          </div>

          <div className="bg-[#090A0D] border border-[#1A1D24] rounded-lg p-3 space-y-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#626875]">Taktverzögerung:</span>
              <span className="font-bold text-[#E1E4EA] tabular-nums">
                {(sliderDelay / 1000).toFixed(2)} s
              </span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={800}
              max={3000}
              step={50}
              value={sliderDelay}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              disabled={disabled}
              className="w-full h-1.5 bg-[#1A1D24] rounded-lg appearance-none cursor-pointer accent-[#00FF88]"
            />

            <div className="flex justify-between text-[10px] font-mono text-[#626875]">
              <span>800ms (Max Speed)</span>
              <span>3000ms (Slow)</span>
            </div>

            {/* Preset Buttons */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[1000, 1200, 1500].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleSliderChange(preset)}
                  disabled={disabled}
                  className={`py-1 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                    sliderDelay === preset
                      ? 'bg-[#00FF88] text-[#050507]'
                      : 'bg-[#111318] text-[#626875] hover:text-[#E1E4EA] border border-[#1A1D24]'
                  }`}
                >
                  {preset}ms
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] font-mono text-[#626875]">
            Überträgt Befehl: <code className="text-[#E1E4EA]">SET_STEP_DELAY</code>
          </div>
        </div>
      </div>
    </div>
  );
};
