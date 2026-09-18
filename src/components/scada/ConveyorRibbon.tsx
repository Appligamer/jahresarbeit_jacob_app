import React from 'react';
import { 
  Scan, 
  ArrowRight, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  AlertOctagon,
  Target
} from 'lucide-react';
import type { SlotState, TelemetryPayload } from '../../types/scada.ts';

interface ConveyorRibbonProps {
  telemetry: TelemetryPayload;
  onTriggerEjector?: (station: number) => void;
}

export const ConveyorRibbon: React.FC<ConveyorRibbonProps> = ({ 
  telemetry, 
  onTriggerEjector 
}) => {
  const slots = telemetry.conveyor_array || [0, 0, 0, 0, 0];
  const isSensorActive = Boolean(telemetry.sensor_active || telemetry.sensor_detected !== 'LEER');
  const activeEjectorStation = telemetry.ejector_active?.active ? telemetry.ejector_active.station : null;

  const getSlotMeta = (index: number) => {
    switch (index) {
      case 0:
        return {
          title: 'STATION 0',
          role: 'FARBSENSOR (TCS34725)',
          pos: '0 mm',
          isSensor: true,
          isEjector: false,
          stationId: 0,
        };
      case 1:
        return {
          title: 'STATION 1',
          role: 'AUSWURF ROT (SERVO 1)',
          pos: '75 mm',
          isSensor: false,
          isEjector: true,
          stationId: 1,
        };
      case 2:
        return {
          title: 'STATION 2',
          role: 'AUSWURF WEISS (SERVO 2)',
          pos: '150 mm',
          isSensor: false,
          isEjector: true,
          stationId: 2,
        };
      case 3:
        return {
          title: 'STATION 3',
          role: 'DURCHLAUF / QUALITÄT',
          pos: '225 mm',
          isSensor: false,
          isEjector: false,
          stationId: 3,
        };
      default:
        return {
          title: `STATION ${index}`,
          role: 'AUSSCHUSS / BEHÄLTER',
          pos: `${index * 75} mm`,
          isSensor: false,
          isEjector: false,
          stationId: index,
        };
    }
  };

  const renderBallVisual = (state: SlotState, index: number) => {
    if (state === 0) {
      return (
        <div className="w-14 h-14 rounded-full border border-dashed border-[#1A1D24] flex items-center justify-center text-[#2A2F3B] font-mono text-[10px] select-none">
          LEER
        </div>
      );
    }

    if (state === 1) {
      return (
        <div className="relative group">
          <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#FF5E54] to-[#C81E15] border-2 border-[#FF3B30] shadow-[0_0_15px_rgba(255,59,48,0.35)] flex items-center justify-center text-white font-mono font-bold text-xs">
            <span className="drop-shadow-md">ROT</span>
          </div>
          {/* Dimension Tag */}
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-[#FF3B30] tracking-wider font-semibold whitespace-nowrap">
            Ø 40mm
          </span>
        </div>
      );
    }

    if (state === 2) {
      return (
        <div className="relative group">
          <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#FFFFFF] to-[#D4D8E0] border-2 border-[#F0F2F5] shadow-[0_0_15px_rgba(240,242,245,0.3)] flex items-center justify-center text-[#0D0E12] font-mono font-bold text-xs">
            <span className="drop-shadow">WEISS</span>
          </div>
          {/* Dimension Tag */}
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-[#F0F2F5] tracking-wider font-semibold whitespace-nowrap">
            Ø 40mm
          </span>
        </div>
      );
    }

    // State 99: Fehler / Unbekannt
    return (
      <div className="relative group">
        <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#401214] to-[#1F0A0B] border-2 border-[#FF3B30] border-dashed shadow-[0_0_12px_rgba(255,59,48,0.25)] flex items-center justify-center text-[#FF3B30] font-mono font-bold text-[10px] text-center leading-tight">
          FEHLER
        </div>
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-[#FF3B30] tracking-wider font-semibold whitespace-nowrap">
          Ausschuss
        </span>
      </div>
    );
  };

  return (
    <div className="bg-[#0D0E12] border border-[#1A1D24] rounded-lg p-4 sm:p-5">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1A1D24] pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-[#00FF88]" />
          <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-[#E1E4EA]">
            LIVE-FÖRDERBAND & SCHIEBEREGISTER [75 mm RASTER]
          </h2>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono text-[#626875]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF3B30]" /> 1 = ROT
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F0F2F5]" /> 2 = WEISS
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border border-[#626875]" /> 0 = LEER
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF3B30] border border-dashed border-[#FF3B30]" /> 99 = DEFEKT
          </span>
        </div>
      </div>

      {/* Ribbon Track */}
      <div className="relative overflow-x-auto pb-4">
        {/* Conveyor Rail Line */}
        <div className="absolute top-[102px] left-0 right-0 h-3 bg-[#111318] border-y border-[#1A1D24] -z-0">
          <div className="w-full h-full bg-[repeating-linear-gradient(90deg,#1A1D24,#1A1D24_2px,transparent_2px,transparent_15px)] opacity-50" />
        </div>

        {/* Stations Horizontal Ribbon */}
        <div className="flex items-stretch justify-start gap-3 sm:gap-4 min-w-[700px] relative z-10 pt-2 pb-6">
          {slots.map((state, index) => {
            const meta = getSlotMeta(index);
            const isStationFiring = activeEjectorStation === meta.stationId;
            const isCurrentSensorReading = index === 0 && isSensorActive;

            return (
              <div
                key={index}
                className={`flex-1 min-w-[150px] max-w-[220px] rounded-lg border p-3 flex flex-col items-center transition-all ${
                  isStationFiring
                    ? 'bg-[#181112] border-[#FF3B30] shadow-[0_0_20px_rgba(255,59,48,0.2)]'
                    : isCurrentSensorReading
                    ? 'bg-[#12161E] border-[#00FF88] shadow-[0_0_20px_rgba(0,255,136,0.15)]'
                    : 'bg-[#090A0D] border-[#1A1D24]'
                }`}
              >
                {/* Station Badge & Distance */}
                <div className="w-full flex items-center justify-between font-mono text-[10px] mb-2 text-[#626875]">
                  <span className="font-bold text-[#E1E4EA]">{meta.title}</span>
                  <span className="text-[#00FF88] bg-[#111318] px-1.5 py-0.5 rounded border border-[#1A1D24]">
                    {meta.pos}
                  </span>
                </div>

                {/* Subtitle / Role */}
                <div className="text-[10px] font-mono text-center text-[#626875] mb-4 h-6 flex items-center justify-center font-medium">
                  {meta.role}
                </div>

                {/* Ball Pocket Visual */}
                <div className="relative my-2 w-20 h-20 rounded-xl bg-[#0D0E12] border border-[#1A1D24] flex items-center justify-center shadow-inner">
                  {renderBallVisual(state, index)}

                  {/* Laser Scan line on Station 0 */}
                  {isCurrentSensorReading && (
                    <div className="absolute inset-x-2 h-0.5 bg-[#00FF88] shadow-[0_0_8px_#00FF88] animate-pulse" />
                  )}

                  {/* Ejector Stößel firing indicator */}
                  {isStationFiring && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[#FF3B30] text-white font-mono text-[9px] font-bold tracking-wider animate-bounce">
                      AUSWURF!
                    </div>
                  )}
                </div>

                {/* Slot Status Footer & Action */}
                <div className="mt-4 w-full pt-2 border-t border-[#1A1D24] flex items-center justify-between font-mono text-[10px]">
                  <span className="text-[#626875]">SLOT #{index}:</span>
                  <span
                    className={`font-bold ${
                      state === 1
                        ? 'text-[#FF3B30]'
                        : state === 2
                        ? 'text-[#F0F2F5]'
                        : state === 99
                        ? 'text-[#FF9500]'
                        : 'text-[#626875]'
                    }`}
                  >
                    {state === 0
                      ? 'LEER'
                      : state === 1
                      ? 'ROT'
                      : state === 2
                      ? 'WEISS'
                      : 'FEHLER'}
                  </span>
                </div>

                {/* Station Trigger Button for Ejector Testing */}
                {meta.isEjector && onTriggerEjector && (
                  <button
                    onClick={() => onTriggerEjector(meta.stationId)}
                    className="mt-2.5 w-full py-1 rounded bg-[#111318] border border-[#1A1D24] hover:border-[#FF3B30]/40 text-[#626875] hover:text-[#FF3B30] font-mono text-[10px] uppercase font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Target className="w-3 h-3" />
                    <span>TEST HUB #{meta.stationId}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Belt Direction Indicator */}
        <div className="flex items-center justify-end gap-2 text-[10px] font-mono text-[#626875] pr-2">
          <span>FÖRDERBAND-LAUFRICHTUNG</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#00FF88]" />
        </div>
      </div>
    </div>
  );
};
