import React from 'react';
import { 
  Activity, 
  Cpu, 
  PieChart, 
  BarChart3, 
  Eye, 
  AlertCircle,
  Clock,
  Zap,
  CheckCircle2,
  Layers
} from 'lucide-react';
import type { Esp32TelemetryResponse, ClientConnectionStatus } from '../../types/scada.ts';

interface TelemetryKpisProps {
  telemetry: Esp32TelemetryResponse;
  connectionStatus: ClientConnectionStatus;
}

export const TelemetryKpis: React.FC<TelemetryKpisProps> = ({
  telemetry,
  connectionStatus,
}) => {
  const { stats, sensor, running, cycle_ms, error } = telemetry;

  // Sensor-Klassifizierung
  const detectedLabel = sensor.detected || 'LEER';

  // Sensor-Farbbalken Berechnung (Normalisierung bezogen auf C oder Maximalwert)
  const maxChannel = Math.max(sensor.r, sensor.g, sensor.b, 1);
  const rPct = Math.min(100, Math.round((sensor.r / maxChannel) * 100));
  const gPct = Math.min(100, Math.round((sensor.g / maxChannel) * 100));
  const bPct = Math.min(100, Math.round((sensor.b / maxChannel) * 100));

  // Prozentualer Anteil der Sortierung
  const total = stats.total || 0;
  const redPct = total > 0 ? Math.round((stats.red / total) * 100) : 0;
  const whitePct = total > 0 ? Math.round((stats.white / total) * 100) : 0;
  const unknownPct = total > 0 ? Math.round((stats.unknown / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
      {/* 1. ZAEHLER & SORTIERSTATISTIK */}
      <section id="scada_sort_stats" className="scada-panel p-4 sm:p-5 lg:col-span-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#10b981]" />
              <h2 className="text-xs sm:text-sm font-bold text-white uppercase font-mono tracking-wider">
                SORTIERZAEHLER & DURCHSATZ
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              GESAMT: <strong className="text-white text-sm">{stats.total}</strong> BAELLER
            </span>
          </div>

          {/* 4 Metrik-Karten */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5 font-mono">
            {/* Gesamt */}
            <div className="p-3 bg-[#070b14] border border-[#1e293b]">
              <span className="text-[10px] text-slate-400 uppercase block">Gesamt</span>
              <span className="text-xl font-bold text-white mt-1 block">{stats.total}</span>
              <span className="text-[9px] text-slate-500">100% sortiert</span>
            </div>

            {/* Rot */}
            <div className="p-3 bg-[#170a0d] border border-[#ef4444]/40">
              <span className="text-[10px] text-[#ef4444] uppercase block">Rot</span>
              <span className="text-xl font-bold text-[#ef4444] mt-1 block">{stats.red}</span>
              <span className="text-[9px] text-slate-400">{redPct}% Anteil</span>
            </div>

            {/* Weiss */}
            <div className="p-3 bg-[#111622] border border-slate-400/40">
              <span className="text-[10px] text-slate-200 uppercase block">Weiss</span>
              <span className="text-xl font-bold text-white mt-1 block">{stats.white}</span>
              <span className="text-[9px] text-slate-400">{whitePct}% Anteil</span>
            </div>

            {/* Unbekannt / Ausschuss */}
            <div className="p-3 bg-[#1a140a] border border-amber-500/40">
              <span className="text-[10px] text-amber-400 uppercase block">Ausschuss</span>
              <span className="text-xl font-bold text-amber-400 mt-1 block">{stats.unknown}</span>
              <span className="text-[9px] text-slate-400">{unknownPct}% Fehler</span>
            </div>
          </div>

          {/* Verteilungsbalken */}
          <div className="mt-4 font-mono">
            <div className="text-[10px] text-slate-400 uppercase mb-1.5 flex justify-between">
              <span>Sortierquote Verteilung</span>
              <span>R: {redPct}% | W: {whitePct}% | U: {unknownPct}%</span>
            </div>
            <div className="h-2.5 bg-slate-900 border border-[#1e293b] flex overflow-hidden">
              <div 
                style={{ width: `${redPct}%` }} 
                className="bg-[#ef4444] transition-all duration-300"
                title={`Rot: ${stats.red}`}
              />
              <div 
                style={{ width: `${whitePct}%` }} 
                className="bg-white transition-all duration-300"
                title={`Weiss: ${stats.white}`}
              />
              <div 
                style={{ width: `${unknownPct}%` }} 
                className="bg-amber-500 transition-all duration-300"
                title={`Ausschuss: ${stats.unknown}`}
              />
            </div>
          </div>
        </div>

        {/* Schrittmotor-Treiber Statusanzeige */}
        <div className="mt-4 pt-3 border-t border-[#1e293b] flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-[#10b981]" />
            <span className="text-slate-400 uppercase">Schrittmotor-Treiber:</span>
            <span className={`px-2 py-0.5 font-bold uppercase ${
              running ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]' : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {running ? 'AKTIV (BESTROMT / TAKTEND)' : 'STANDBY (STROMLOS / RUHE)'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Takt-Intervall:</span>
            <strong className="text-white">{cycle_ms} ms</strong>
          </div>
        </div>
      </section>

      {/* 2. SENSOR-DIAGNOSE (TCS34725) */}
      <section id="scada_sensor_diagnostics" className="scada-panel p-4 sm:p-5 lg:col-span-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#38bdf8]" />
              <h2 className="text-xs sm:text-sm font-bold text-white uppercase font-mono tracking-wider">
                SENSOR-DIAGNOSE (TCS34725 RGB-C)
              </h2>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400 uppercase">ERKANNT:</span>
              <span className={`px-2.5 py-0.5 font-bold uppercase tracking-wider ${
                detectedLabel === 'ROT'
                  ? 'bg-[#ef4444]/25 text-[#ef4444] border border-[#ef4444]'
                  : detectedLabel === 'WEISS'
                  ? 'bg-white/20 text-white border border-white'
                  : detectedLabel === 'UNBEKANNT'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {detectedLabel}
              </span>
            </div>
          </div>

          {/* Sensor Rohwerte Balken */}
          <div className="space-y-2.5 mt-3.5 font-mono">
            {/* Clear (C) */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span className="text-slate-400">Clear (Helligkeit C):</span>
                <span className="text-white font-bold">{sensor.c}</span>
              </div>
              <div className="h-2 bg-slate-900 border border-[#1e293b]">
                <div 
                  className="h-full bg-slate-300 transition-all duration-200"
                  style={{ width: `${Math.min(100, Math.round((sensor.c / 5000) * 100))}%` }}
                />
              </div>
            </div>

            {/* Rot (R) */}
            <div>
              <div className="flex justify-between text-[11px] text-[#ef4444] mb-1">
                <span>Kanal Rot (R):</span>
                <span className="font-bold">{sensor.r} ({rPct}%)</span>
              </div>
              <div className="h-2 bg-slate-900 border border-[#1e293b]">
                <div 
                  className="h-full bg-[#ef4444] transition-all duration-200"
                  style={{ width: `${rPct}%` }}
                />
              </div>
            </div>

            {/* Gruen (G) */}
            <div>
              <div className="flex justify-between text-[11px] text-[#10b981] mb-1">
                <span>Kanal Gruen (G):</span>
                <span className="font-bold">{sensor.g} ({gPct}%)</span>
              </div>
              <div className="h-2 bg-slate-900 border border-[#1e293b]">
                <div 
                  className="h-full bg-[#10b981] transition-all duration-200"
                  style={{ width: `${gPct}%` }}
                />
              </div>
            </div>

            {/* Blau (B) */}
            <div>
              <div className="flex justify-between text-[11px] text-[#38bdf8] mb-1">
                <span>Kanal Blau (B):</span>
                <span className="font-bold">{sensor.b} ({bPct}%)</span>
              </div>
              <div className="h-2 bg-slate-900 border border-[#1e293b]">
                <div 
                  className="h-full bg-[#38bdf8] transition-all duration-200"
                  style={{ width: `${bPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Systemfehler / Fehleranzeige */}
        <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between gap-2 font-mono text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className={`w-3.5 h-3.5 ${error && error !== 'Kein Fehler' ? 'text-[#ef4444]' : 'text-slate-500'}`} />
            <span className="text-slate-400 uppercase">Fehlerstatus:</span>
            <span className={error && error !== 'Kein Fehler' ? 'text-[#ef4444] font-bold' : 'text-slate-400'}>
              {error || 'Kein Fehler'}
            </span>
          </div>

          <div className="text-[10px] text-slate-500">
            I2C: 0x29 / 16-Bit ADC
          </div>
        </div>
      </section>
    </div>
  );
};
