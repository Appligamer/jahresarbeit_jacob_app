import React from 'react';
import { 
  Eye, 
  ArrowRight, 
  Sliders, 
  Disc, 
  AlertTriangle,
  MoveRight
} from 'lucide-react';
import type { Esp32TelemetryResponse, SlotBall } from '../../types/scada.ts';

interface ConveyorShiftRegisterProps {
  telemetry: Esp32TelemetryResponse;
}

interface StationInfo {
  index: number;
  label: string;
  stationName: string;
  sensorOrActuator: string;
  hardware: string;
  distanceMm: string;
}

const STATIONS: StationInfo[] = [
  {
    index: 0,
    label: 'POS 0',
    stationName: 'FARBSENSOR-STATION',
    sensorOrActuator: 'Optische Farberkennung',
    hardware: 'TCS34725 RGB-C I2C',
    distanceMm: '0 mm (Eintaktung)',
  },
  {
    index: 1,
    label: 'POS 1',
    stationName: 'AUSWURFSTATION ROT',
    sensorOrActuator: 'Servo-Ausschleusung Rot',
    hardware: 'SG90 PWM Servo 1',
    distanceMm: '+75 mm (Raster 1)',
  },
  {
    index: 2,
    label: 'POS 2',
    stationName: 'AUSWURFSTATION WEISS',
    sensorOrActuator: 'Servo-Ausschleusung Weiss',
    hardware: 'SG90 PWM Servo 2',
    distanceMm: '+150 mm (Raster 2)',
  },
];

export const ConveyorShiftRegister: React.FC<ConveyorShiftRegisterProps> = ({ telemetry }) => {
  const slots: [SlotBall, SlotBall, SlotBall] = telemetry.slots || [0, 0, 0];

  const renderSlotVisual = (state: SlotBall) => {
    switch (state) {
      case 1:
        // Zustand 1: Rot glimmende Umrandung, roter Ball-Indikator, Text "ROT"
        return (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#ef4444] border-2 border-red-300 shadow-[0_0_24px_rgba(239,68,68,0.7)] flex items-center justify-center transition-all">
                <Disc className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-white text-[#ef4444] border border-red-200">
                #1
              </span>
            </div>
            <div className="text-center font-mono">
              <span className="px-2.5 py-1 bg-[#ef4444]/20 border border-[#ef4444] text-[#ef4444] text-xs font-bold tracking-widest uppercase">
                ROT
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Kugel verifiziert</p>
            </div>
          </div>
        );

      case 2:
        // Zustand 2: Weiß strahlende Umrandung, weißer Ball-Indikator, Text "WEISS"
        return (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#f8fafc] border-2 border-white shadow-[0_0_26px_rgba(248,250,252,0.85)] flex items-center justify-center transition-all">
                <Disc className="w-8 h-8 text-slate-800 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-slate-900 text-white border border-slate-700">
                #2
              </span>
            </div>
            <div className="text-center font-mono">
              <span className="px-2.5 py-1 bg-white/20 border border-[#f8fafc] text-[#f8fafc] text-xs font-bold tracking-widest uppercase">
                WEISS
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Kugel verifiziert</p>
            </div>
          </div>
        );

      case 99:
        // Zustand 99: Gelb blinkende Umrandung, Text "AUSSICHT / UNBEKANNT"
        return (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#f59e0b] border-2 border-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.7)] flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-8 h-8 text-black" />
              </div>
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-black text-[#f59e0b] border border-amber-500">
                #99
              </span>
            </div>
            <div className="text-center font-mono">
              <span className="px-2.5 py-1 bg-[#f59e0b]/20 border border-[#f59e0b] text-[#f59e0b] text-xs font-bold tracking-widest uppercase">
                AUSSICHT / UNBEKANNT
              </span>
              <p className="text-[11px] text-[#f59e0b] mt-1">Ausschuss</p>
            </div>
          </div>
        );

      case 0:
      default:
        // Zustand 0: Dunkelgrauer Rahmen, Beschriftung "LEER"
        return (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-700 bg-slate-900/60 flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700" />
            </div>
            <div className="text-center font-mono">
              <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-500 text-xs font-medium tracking-wider uppercase">
                LEER
              </span>
              <p className="text-[11px] text-slate-600 mt-1">Kein Prüfling</p>
            </div>
          </div>
        );
    }
  };

  const getContainerBorderClass = (state: SlotBall) => {
    switch (state) {
      case 1:
        return 'border-[#ef4444] shadow-[inset_0_0_18px_rgba(239,68,68,0.2)] bg-[#1e131d]/90';
      case 2:
        return 'border-[#f8fafc] shadow-[inset_0_0_18px_rgba(248,250,252,0.15)] bg-[#171c26]/90';
      case 99:
        return 'scada-pulse-amber bg-[#1e1a14]/90';
      case 0:
      default:
        return 'border-[#1e293b] bg-[#0b1120]';
    }
  };

  return (
    <section id="scada_conveyor_section" className="scada-panel p-4 sm:p-5 w-full">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-wider uppercase font-mono">
              VIRTUELLES SCHIEBEREGISTER (75 mm RASTER-BAND)
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
              3 STEPS SYNCHRONISIERT
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Echtzeit-Zustand des Schrittmotor-Förderbands [Pos 0, Pos 1, Pos 2]
          </p>
        </div>

        {/* Conveyor Motion Status */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0b1120] border border-[#1e293b] text-slate-300">
            <span className="text-slate-500 uppercase">Förderrichtung:</span>
            <span className="text-[#10b981] font-bold flex items-center gap-1">
              POS 0 <MoveRight className="w-3.5 h-3.5" /> POS 2
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#0b1120] border border-[#1e293b] text-slate-300">
            <span className="text-slate-500 uppercase">Schrittweite:</span>
            <strong className="text-white">75 mm</strong>
          </div>
        </div>
      </div>

      {/* 3-Teilige Kette */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 tech-grid p-2 sm:p-3 bg-[#070b14]/50 border border-[#1e293b]">
        {STATIONS.map((st, idx) => {
          const ballState = slots[idx];
          return (
            <div
              key={st.index}
              id={`conveyor_slot_${st.index}`}
              className={`p-4 border transition-all relative flex flex-col justify-between min-h-[260px] ${getContainerBorderClass(ballState)}`}
            >
              {/* Station Header */}
              <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-1.5 py-0.5 bg-slate-800 text-white font-mono border border-slate-700">
                      {st.label}
                    </span>
                    <span className="text-[11px] font-bold text-slate-200 font-mono tracking-wide">
                      {st.stationName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">
                    {st.sensorOrActuator}
                  </p>
                </div>

                <span className="text-[10px] font-mono text-slate-400 bg-black/40 px-1.5 py-0.5 border border-slate-800">
                  {st.distanceMm}
                </span>
              </div>

              {/* Slot Ball Display */}
              <div className="py-6 flex items-center justify-center">
                {renderSlotVisual(ballState)}
              </div>

              {/* Station Footer / Hardware Descriptor */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="truncate">{st.hardware}</span>
                <span className="text-slate-500 uppercase">
                  RAW SLOT: <strong className="text-slate-300">{ballState}</strong>
                </span>
              </div>

              {/* Connecting arrow indicator between slots */}
              {idx < 2 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-[#0f172a] border border-[#1e293b] rounded-full items-center justify-center text-slate-400 shadow-md">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ribbon Telemetry Footnote */}
      <div className="mt-3 pt-2.5 border-t border-[#1e293b] flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
        <div className="flex items-center gap-3">
          <span className="text-slate-500">SCHIEBEREGISTER-ARRAY:</span>
          <code className="text-white bg-black/60 px-2 py-0.5 border border-slate-800">
            slots: [{slots.join(', ')}]
          </code>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span>0 = LEER</span>
          <span>•</span>
          <span className="text-[#ef4444] font-semibold">1 = ROT</span>
          <span>•</span>
          <span className="text-white font-semibold">2 = WEISS</span>
          <span>•</span>
          <span className="text-[#f59e0b] font-semibold">99 = UNBEKANNT</span>
        </div>
      </div>
    </section>
  );
};
