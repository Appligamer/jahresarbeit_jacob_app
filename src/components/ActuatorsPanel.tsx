import React from 'react';
import { 
  Cpu, 
  Gauge, 
  Eye, 
  Disc3, 
  RotateCw, 
  Radio, 
  Activity, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import type { SorterSystemStatus } from '../types.ts';

interface ActuatorsPanelProps {
  status: SorterSystemStatus;
  onControl: (action: string, value?: unknown) => Promise<void>;
}

export const ActuatorsPanel: React.FC<ActuatorsPanelProps> = ({ status, onControl }) => {
  const { telemetry, conveyorSpeed, feederSpeed, currentServoAngle, emergencyStop } = status;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Actuator Controls: Conveyor & Feeder Motors */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <RotateCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Motoren & Zuführung</h3>
              <p className="text-[11px] text-slate-500">ESP32 PWM Ausgang Pins 25 & 26</p>
            </div>
          </div>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
            status.state === 'running' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
              : 'bg-slate-100 text-slate-600'
          }`}>
            {status.state === 'running' ? 'Aktiv' : 'Bereit'}
          </span>
        </div>

        {/* Förderband Speed Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-slate-700">
            <span>Förderband Geschwindigkeit</span>
            <span className="font-mono font-bold text-blue-600">{conveyorSpeed}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={conveyorSpeed}
            disabled={emergencyStop}
            onChange={(e) => onControl('set_conveyor_speed', Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0% (Aus)</span>
            <span>50% (Normal)</span>
            <span>100% (Max)</span>
          </div>
        </div>

        {/* Zuführer / Feeder (Schnecke/Vibrator) Slider */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex justify-between text-xs font-medium text-slate-700">
            <span>Trichter-Zuführung (Feeder PWM)</span>
            <span className="font-mono font-bold text-indigo-600">{feederSpeed}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={feederSpeed}
            disabled={emergencyStop}
            onChange={(e) => onControl('set_feeder_speed', Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Stop</span>
            <span>Vereinzelung</span>
            <span>Schnell</span>
          </div>
        </div>
      </div>

      {/* 2. Servo-Weichen Aktor (0° - 180°) Visual Dial */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Disc3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Servo-Weiche (Rutsche)</h3>
              <p className="text-[11px] text-slate-500">SG90 / MG996R PWM Pin 13</p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
            {currentServoAngle}°
          </span>
        </div>

        {/* Visual Arc / Compass indicator */}
        <div className="flex flex-col items-center justify-center py-1">
          <div className="relative w-44 h-24 flex items-end justify-center overflow-hidden">
            {/* Semicircle track */}
            <div className="absolute w-40 h-40 rounded-full border-4 border-slate-200 border-dashed top-0" />
            
            {/* Center Pivot */}
            <div className="w-4 h-4 rounded-full bg-slate-800 z-10 shadow-sm" />
            
            {/* Servo Pointer Needle */}
            <div
              className="absolute bottom-2 w-1.5 h-16 bg-gradient-to-t from-indigo-800 to-indigo-500 rounded-full origin-bottom transition-transform duration-300 shadow-md"
              style={{
                transform: `rotate(${currentServoAngle - 90}deg)`
              }}
            />
          </div>

          <div className="w-full flex justify-between text-[11px] text-slate-500 font-mono mt-1 px-4">
            <span>0° (B1)</span>
            <span>90° (Mitte)</span>
            <span>180° (B4)</span>
          </div>
        </div>

        {/* Manual Servo Angle Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Manuelle Winkel-Justierung</span>
            <span className="font-mono text-xs font-semibold">{currentServoAngle}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="180"
            step="1"
            value={currentServoAngle}
            disabled={emergencyStop}
            onChange={(e) => onControl('set_servo_angle', Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer disabled:opacity-50"
          />
        </div>
      </div>

      {/* 3. Live Sensor Telemetry (TCS34725 + Lichtschranke) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sensoren & Messwerte</h3>
              <p className="text-[11px] text-slate-500">TCS34725 Farbsensor & Lichtschranke</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${telemetry.lightBarrierTripped ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
            <span className="text-[11px] font-mono text-slate-500">
              {telemetry.lightBarrierTripped ? 'Ball im Sensor' : 'Sensor frei'}
            </span>
          </div>
        </div>

        {/* Color Sensor Readout */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Erkannte Ballfarbe</span>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs" 
                style={{ backgroundColor: `rgb(${telemetry.rgb.r}, ${telemetry.rgb.g}, ${telemetry.rgb.b})` }}
              />
              <span className="font-bold capitalize text-slate-800">
                {telemetry.detectedColor === 'white' ? 'Weiß' : telemetry.detectedColor === 'orange' ? 'Orange' : 'Unbekannt'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">({telemetry.confidence}%)</span>
            </div>
          </div>

          {/* RGB breakdown bars */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60 text-center">
              <span className="text-[10px] text-rose-600 font-bold block">R (Rot)</span>
              <span className="text-xs font-mono font-extrabold text-slate-800">{telemetry.rgb.r}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60 text-center">
              <span className="text-[10px] text-emerald-600 font-bold block">G (Grün)</span>
              <span className="text-xs font-mono font-extrabold text-slate-800">{telemetry.rgb.g}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60 text-center">
              <span className="text-[10px] text-blue-600 font-bold block">B (Blau)</span>
              <span className="text-xs font-mono font-extrabold text-slate-800">{telemetry.rgb.b}</span>
            </div>
          </div>
        </div>

        {/* Diameter & Light barrier readout */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Gemessener Durchmesser</span>
            <span className="text-base font-extrabold text-slate-900 font-mono">
              {telemetry.diameterMm} mm
            </span>
          </div>

          <div className="text-right">
            <span className="text-slate-500 block text-[11px]">ITTF-Toleranz (40.0 mm)</span>
            <span className={`inline-flex items-center gap-1 font-semibold text-xs ${
              telemetry.diameterMm >= 39.85 && telemetry.diameterMm <= 40.15
                ? 'text-emerald-600'
                : 'text-amber-600'
            }`}>
              {telemetry.diameterMm >= 39.85 && telemetry.diameterMm <= 40.15 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>3-Sterne Maß</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Standard / Training</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
