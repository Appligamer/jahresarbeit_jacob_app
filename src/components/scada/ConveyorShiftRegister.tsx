import React from 'react';
import { 
  ArrowRight, 
  Disc, 
  AlertTriangle, 
  MoveRight,
  Cpu,
  Layers
} from 'lucide-react';
import type { Esp32TelemetryResponse, SlotBall, StationConfig } from '../../types/scada.ts';

interface ConveyorShiftRegisterProps {
  telemetry: Esp32TelemetryResponse;
}

// Modulare Konfigurationstabelle fuer die Stationen der Farbsortieranlage
// Kann ohne Redesign des Dashboards beliebig erweitert werden
const DEFAULT_STATIONS: StationConfig[] = [
  {
    index: 0,
    name: 'Station 0: Farbsensor TCS34725',
    description: 'Optische Farberkennung RGB-C',
    hardware: 'TCS34725 Farbsensor I2C',
    distanceMm: 0,
  },
  {
    index: 1,
    name: 'Station 1: Auswurf Rot',
    description: 'Servo-Ausschleusung Rot',
    hardware: 'SG90 PWM Servo 1 (Station 1)',
    distanceMm: 75,
  },
  {
    index: 2,
    name: 'Station 2: Auswurf Weiss',
    description: 'Servo-Ausschleusung Weiss',
    hardware: 'SG90 PWM Servo 2 (Station 2)',
    distanceMm: 150,
  },
];

export const ConveyorShiftRegister: React.FC<ConveyorShiftRegisterProps> = ({ telemetry }) => {
  // Dynamische Slot-Laenge aus den empfangenen Telemetriedaten
  const slots: SlotBall[] = Array.isArray(telemetry.slots) && telemetry.slots.length > 0 
    ? telemetry.slots 
    : [0, 0, 0];

  // Erhalte Stationen dynamisch
  const getStationConfig = (index: number): StationConfig => {
    if (index < DEFAULT_STATIONS.length) {
      return DEFAULT_STATIONS[index];
    }
    return {
      index,
      name: `Station ${index}: Folge-Aktor`,
      description: 'Zusaetzliche Auswurf- / Pruefstation',
      hardware: `Servo / Sensor Modul ${index}`,
      distanceMm: index * 75,
    };
  };

  // Rendering des Kugel-Zustands gemaess Spezifikation:
  // 0: Grau/Dunkel (LEER)
  // 1: Reines Signalrot (ROT)
  // 2: Weiss mit Kontur (WEISS)
  // 99: Warn-Gelb/Magenta gestreift (FEHLER/UNBEKANNT)
  const renderSlotBall = (ballState: SlotBall) => {
    switch (ballState) {
      case 1:
        // Reines Signalrot
        return (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative flex items-center justify-center">
              <div 
                className="w-16 h-16 rounded-full border-2 border-[#ff4444] shadow-[0_0_20px_rgba(255,0,0,0.6)] flex items-center justify-center transition-all"
                style={{ backgroundColor: '#ff0000' }}
              >
                <Disc className="w-8 h-8 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-bold bg-white text-black font-mono">
                ROT
              </span>
            </div>
            <div className="text-center font-mono">
              <span className="px-2 py-0.5 bg-[#ef4444]/25 border border-[#ef4444] text-[#ef4444] text-xs font-bold uppercase tracking-wider">
                1: ROT
              </span>
              <p className="text-[10px] text-slate-400 mt-1">Pruefling Rot erkannt</p>
            </div>
          </div>
        );

      case 2:
        // Weiss mit Kontur
        return (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative flex items-center justify-center">
              <div 
                className="w-16 h-16 rounded-full bg-white border-2 border-slate-300 shadow-[0_0_22px_rgba(255,255,255,0.7)] flex items-center justify-center transition-all"
              >
                <Disc className="w-8 h-8 text-slate-700" />
              </div>
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-bold bg-black text-white font-mono border border-slate-600">
                WEISS
              </span>
            </div>
            <div className="text-center font-mono">
              <span className="px-2 py-0.5 bg-white/20 border border-white text-white text-xs font-bold uppercase tracking-wider">
                2: WEISS
              </span>
              <p className="text-[10px] text-slate-300 mt-1">Pruefling Weiss erkannt</p>
            </div>
          </div>
        );

      case 99:
        // Warn-Gelb/Magenta gestreift (FEHLER/UNBEKANNT)
        return (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative flex items-center justify-center">
              <div 
                className="w-16 h-16 rounded-full border-2 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)] flex items-center justify-center animate-pulse"
                style={{
                  background: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 8px, #d946ef 8px, #d946ef 16px)',
                }}
              >
                <AlertTriangle className="w-8 h-8 text-black" />
              </div>
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-bold bg-black text-[#f59e0b] font-mono border border-amber-500">
                99
              </span>
            </div>
            <div className="text-center font-mono">
              <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500 text-amber-300 text-xs font-bold uppercase tracking-wider">
                99: FEHLER / UNBEKANNT
              </span>
              <p className="text-[10px] text-amber-400 mt-1">Ausschuss / Nicht klassifiziert</p>
            </div>
          </div>
        );

      case 0:
      default:
        // Grau/Dunkel (LEER)
        return (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-700 bg-slate-900/60 flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-slate-800" />
            </div>
            <div className="text-center font-mono">
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                0: LEER
              </span>
              <p className="text-[10px] text-slate-600 mt-1">Kein Pruefling im Slot</p>
            </div>
          </div>
        );
    }
  };

  const getContainerClass = (ballState: SlotBall) => {
    switch (ballState) {
      case 1:
        return 'border-[#ef4444] bg-[#1a0f12] shadow-[inset_0_0_15px_rgba(239,68,68,0.2)]';
      case 2:
        return 'border-white bg-[#141822] shadow-[inset_0_0_15px_rgba(255,255,255,0.15)]';
      case 99:
        return 'border-amber-400 bg-[#1c160f] scada-pulse-amber';
      case 0:
      default:
        return 'border-[#1e293b] bg-[#070b14]';
    }
  };

  return (
    <section id="scada_conveyor_register" className="scada-panel p-4 sm:p-5 w-full">
      {/* Kopfbereich */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-wider uppercase font-mono">
              DYNAMISCHES SCHIEBEREGISTER (FIFO-BANDTRACKING)
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
              {slots.length} STATIONEN DYNAMISCH
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Schrittmotor-getaktetes Schieberegister (75.0 mm Pitch je Einzeltakt)
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0b1120] border border-[#1e293b] text-slate-300">
            <span className="text-slate-500 uppercase">Foerderrichtung:</span>
            <span className="text-[#10b981] font-bold flex items-center gap-1">
              Station 0 <MoveRight className="w-3.5 h-3.5" /> Station {slots.length - 1}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#0b1120] border border-[#1e293b] text-slate-300">
            <span className="text-slate-500 uppercase">Taktung:</span>
            <strong className="text-white">75.0 mm</strong>
          </div>
        </div>
      </div>

      {/* Dynamisches Grid anhand der Anzahl der Slots */}
      <div 
        className="grid gap-4 mt-4 tech-grid p-3 bg-[#050811] border border-[#1e293b]"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))`,
        }}
      >
        {slots.map((slotState, idx) => {
          const station = getStationConfig(idx);
          return (
            <div
              key={idx}
              id={`conveyor_station_slot_${idx}`}
              className={`p-4 border transition-all relative flex flex-col justify-between min-h-[260px] ${getContainerClass(slotState)}`}
            >
              {/* Station Header */}
              <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 bg-slate-800 text-white font-mono border border-slate-700">
                      POS {idx}
                    </span>
                    <span className="text-xs font-bold text-slate-200 font-mono">
                      {station.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">
                    {station.description}
                  </p>
                </div>

                <span className="text-[10px] font-mono text-slate-400 bg-black/60 px-1.5 py-0.5 border border-slate-800 shrink-0">
                  +{station.distanceMm} mm
                </span>
              </div>

              {/* Kugelzustands-Anzeige */}
              <div className="py-6 flex items-center justify-center">
                {renderSlotBall(slotState)}
              </div>

              {/* Station Footer */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="truncate">{station.hardware}</span>
                <span className="text-slate-400 uppercase font-mono">
                  SLOT-WERT: <strong className="text-white">{slotState}</strong>
                </span>
              </div>

              {/* Pfeil zur naechsten Station */}
              {idx < slots.length - 1 && (
                <div className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-[#0f172a] border border-[#334155] rounded-full items-center justify-center text-slate-300 shadow-md">
                  <ArrowRight className="w-4 h-4 text-[#10b981]" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Slot-Array Debug-Leiste */}
      <div className="mt-3 pt-2.5 border-t border-[#1e293b] flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">SCHIEBEREGISTER-DATEN:</span>
          <code className="text-white bg-black/80 px-2 py-0.5 border border-slate-800">
            slots: [{slots.join(', ')}]
          </code>
        </div>
        <div className="flex items-center gap-3 text-[10px] flex-wrap">
          <span>0 = LEER (Grau)</span>
          <span>•</span>
          <span className="text-[#ef4444] font-bold">1 = ROT (Signalrot)</span>
          <span>•</span>
          <span className="text-white font-bold">2 = WEISS (Kontur)</span>
          <span>•</span>
          <span className="text-amber-400 font-bold">99 = FEHLER/UNBEKANNT (Gestreift)</span>
        </div>
      </div>
    </section>
  );
};
