import React from 'react';
import { 
  CheckCircle2, 
  Disc, 
  AlertCircle, 
  Layers, 
  Eye, 
  Percent, 
  Cpu 
} from 'lucide-react';
import type { Esp32TelemetryResponse } from '../../types/scada.ts';

interface TelemetryKpisProps {
  telemetry: Esp32TelemetryResponse;
}

export const TelemetryKpis: React.FC<TelemetryKpisProps> = ({ telemetry }) => {
  const { stats, sensor } = telemetry;

  // Calculate normalized percentages for color preview
  const maxChannel = Math.max(sensor.r, sensor.g, sensor.b, 1);
  const normR = Math.min(255, Math.round((sensor.r / maxChannel) * 240));
  const normG = Math.min(255, Math.round((sensor.g / maxChannel) * 240));
  const normB = Math.min(255, Math.round((sensor.b / maxChannel) * 240));

  // Determine preview swatch color
  let previewBgColor = '#0b1120';
  let previewBorderColor = '#334155';
  let detectedBadgeClass = 'bg-slate-800 text-slate-400 border-slate-700';

  if (sensor.detected === 'ROT') {
    previewBgColor = '#ef4444';
    previewBorderColor = '#ef4444';
    detectedBadgeClass = 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]';
  } else if (sensor.detected === 'WEISS') {
    previewBgColor = '#f8fafc';
    previewBorderColor = '#ffffff';
    detectedBadgeClass = 'bg-white/20 text-[#f8fafc] border-white';
  } else if (sensor.detected === 'UNBEKANNT') {
    previewBgColor = '#f59e0b';
    previewBorderColor = '#f59e0b';
    detectedBadgeClass = 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]';
  } else if (sensor.detected === 'SENSOR_FEHLT') {
    previewBgColor = '#450a0a';
    previewBorderColor = '#ef4444';
    detectedBadgeClass = 'bg-[#ef4444] text-white border-red-400';
  }

  // Quality Rate calculation
  const goodTotal = stats.red + stats.white;
  const qualityRate = stats.total > 0 
    ? ((goodTotal / stats.total) * 100).toFixed(1) 
    : '100.0';

  return (
    <div id="scada_telemetry_section" className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
      
      {/* 4 ZÄHLER-KARTEN (MONOSPACE GROSSSCHRIFT) */}
      <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* KPI 1: GESAMT */}
        <div id="kpi_card_total" className="scada-panel p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 border-b border-[#1e293b] pb-2">
            <span className="text-[11px] font-bold uppercase font-mono tracking-wider">
              GESAMT
            </span>
            <Layers className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
              {stats.total}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between pt-1 border-t border-white/5">
            <span>Gutquote</span>
            <span className="text-[#10b981] font-semibold">{qualityRate}%</span>
          </div>
        </div>

        {/* KPI 2: ROT */}
        <div id="kpi_card_red" className="scada-panel p-4 flex flex-col justify-between border-l-2 border-l-[#ef4444]">
          <div className="flex items-center justify-between text-[#ef4444] border-b border-[#1e293b] pb-2">
            <span className="text-[11px] font-bold uppercase font-mono tracking-wider">
              ROT (ST. 1)
            </span>
            <Disc className="w-3.5 h-3.5 text-[#ef4444]" />
          </div>
          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-[#ef4444]">
              {stats.red}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between pt-1 border-t border-white/5">
            <span>Anteil</span>
            <span className="text-slate-300">
              {stats.total > 0 ? `${Math.round((stats.red / stats.total) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* KPI 3: WEISS */}
        <div id="kpi_card_white" className="scada-panel p-4 flex flex-col justify-between border-l-2 border-l-[#f8fafc]">
          <div className="flex items-center justify-between text-[#f8fafc] border-b border-[#1e293b] pb-2">
            <span className="text-[11px] font-bold uppercase font-mono tracking-wider">
              WEISS (ST. 2)
            </span>
            <Disc className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
              {stats.white}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between pt-1 border-t border-white/5">
            <span>Anteil</span>
            <span className="text-slate-300">
              {stats.total > 0 ? `${Math.round((stats.white / stats.total) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* KPI 4: FEHLER / AUSSCHUSS */}
        <div id="kpi_card_unknown" className="scada-panel p-4 flex flex-col justify-between border-l-2 border-l-[#f59e0b]">
          <div className="flex items-center justify-between text-[#f59e0b] border-b border-[#1e293b] pb-2">
            <span className="text-[11px] font-bold uppercase font-mono tracking-wider">
              FEHLER
            </span>
            <AlertCircle className="w-3.5 h-3.5 text-[#f59e0b]" />
          </div>
          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-[#f59e0b]">
              {stats.unknown}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between pt-1 border-t border-white/5">
            <span>Ausschuss</span>
            <span className="text-[#f59e0b]">
              {stats.total > 0 ? `${Math.round((stats.unknown / stats.total) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

      </div>

      {/* SENSOR-LIVE-MONITOR (TCS34725 RGB-C) */}
      <div id="sensor_live_monitor" className="lg:col-span-5 scada-panel p-4 flex flex-col justify-between">
        
        {/* Monitor Title */}
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#10b981]" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              SENSOR-LIVE-MONITOR (TCS34725)
            </h3>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#1e293b] text-slate-300 border border-slate-700">
            16-BIT ROHWERTE
          </span>
        </div>

        {/* Color Preview & Classification */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 my-3 items-center">
          
          {/* Swatch Preview Box */}
          <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 bg-[#0b1120] border border-[#1e293b]">
            <div
              className="w-14 h-14 border shadow-inner transition-colors duration-150 flex items-center justify-center"
              style={{
                backgroundColor: previewBgColor,
                borderColor: previewBorderColor,
              }}
            >
              {sensor.detected === 'ROT' && <span className="text-white text-[10px] font-bold font-mono">RED</span>}
              {sensor.detected === 'WEISS' && <span className="text-black text-[10px] font-bold font-mono">WHT</span>}
              {sensor.detected === 'UNBEKANNT' && <span className="text-black text-[10px] font-bold font-mono">?</span>}
              {sensor.detected === 'LEER' && <span className="text-slate-600 text-[10px] font-mono">OFF</span>}
            </div>
            <span className="text-[9px] font-mono text-slate-500 mt-2">Optisches Farbfeld</span>
          </div>

          {/* Classification & Clear Sensor Output */}
          <div className="sm:col-span-8 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Erkannte Farbe:</span>
              <span className={`px-2 py-0.5 border font-bold text-xs ${detectedBadgeClass}`}>
                {sensor.detected}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Clear (Helligkeit C):</span>
              <span className="text-white font-bold">{sensor.c}</span>
            </div>

            {/* Error state alert if hardware issue */}
            {telemetry.error && telemetry.error !== 'Kein Fehler' && (
              <div className="text-[11px] text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/40 px-2 py-1 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span className="truncate">{telemetry.error}</span>
              </div>
            )}
          </div>

        </div>

        {/* 16-Bit Raw RGB Channel Bars */}
        <div className="space-y-1.5 pt-2 border-t border-[#1e293b] font-mono text-[11px]">
          
          {/* Channel R */}
          <div className="flex items-center gap-2">
            <span className="w-4 font-bold text-[#ef4444]">R:</span>
            <div className="flex-1 bg-slate-900 border border-slate-800 h-2.5 overflow-hidden">
              <div
                className="bg-[#ef4444] h-full transition-all duration-150"
                style={{ width: `${Math.min(100, (sensor.r / (sensor.c || 4000)) * 100)}%` }}
              />
            </div>
            <span className="w-12 text-right text-slate-300 font-semibold">{sensor.r}</span>
          </div>

          {/* Channel G */}
          <div className="flex items-center gap-2">
            <span className="w-4 font-bold text-[#10b981]">G:</span>
            <div className="flex-1 bg-slate-900 border border-slate-800 h-2.5 overflow-hidden">
              <div
                className="bg-[#10b981] h-full transition-all duration-150"
                style={{ width: `${Math.min(100, (sensor.g / (sensor.c || 4000)) * 100)}%` }}
              />
            </div>
            <span className="w-12 text-right text-slate-300 font-semibold">{sensor.g}</span>
          </div>

          {/* Channel B */}
          <div className="flex items-center gap-2">
            <span className="w-4 font-bold text-blue-400">B:</span>
            <div className="flex-1 bg-slate-900 border border-slate-800 h-2.5 overflow-hidden">
              <div
                className="bg-blue-400 h-full transition-all duration-150"
                style={{ width: `${Math.min(100, (sensor.b / (sensor.c || 4000)) * 100)}%` }}
              />
            </div>
            <span className="w-12 text-right text-slate-300 font-semibold">{sensor.b}</span>
          </div>

        </div>

      </div>

    </div>
  );
};
