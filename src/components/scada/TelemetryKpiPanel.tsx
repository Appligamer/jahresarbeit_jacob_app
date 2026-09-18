import React from 'react';
import { 
  BarChart3, 
  Clock, 
  Target, 
  AlertTriangle, 
  Flame, 
  CircleDot,
  Eye,
  Activity
} from 'lucide-react';
import type { TelemetryPayload } from '../../types/scada.ts';

interface TelemetryKpiPanelProps {
  telemetry: TelemetryPayload;
  minCycleTime: number | null;
  maxCycleTime: number | null;
}

export const TelemetryKpiPanel: React.FC<TelemetryKpiPanelProps> = ({
  telemetry,
  minCycleTime,
  maxCycleTime,
}) => {
  const { stats, current_cycle_time_ms, sensor_raw, sensor_detected } = telemetry;

  // Calculate RGB CSS Preview
  const maxRgb = Math.max(sensor_raw.r, sensor_raw.g, sensor_raw.b, 1);
  const normR = Math.min(255, Math.round((sensor_raw.r / (sensor_raw.clear || 1)) * 255) || sensor_raw.r);
  const normG = Math.min(255, Math.round((sensor_raw.g / (sensor_raw.clear || 1)) * 255) || sensor_raw.g);
  const normB = Math.min(255, Math.round((sensor_raw.b / (sensor_raw.clear || 1)) * 255) || sensor_raw.b);
  const colorSwatchStyle = {
    backgroundColor: sensor_detected === 'LEER' 
      ? '#111318' 
      : `rgb(${normR}, ${normG}, ${normB})`,
  };

  const redPercent = stats.total_processed > 0 
    ? ((stats.count_red / stats.total_processed) * 100).toFixed(1) 
    : '0.0';
  const whitePercent = stats.total_processed > 0 
    ? ((stats.count_white / stats.total_processed) * 100).toFixed(1) 
    : '0.0';
  const errorPercent = stats.total_processed > 0 
    ? ((stats.count_error / stats.total_processed) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* 4 KPI Counter Cards (Col span 7) */}
      <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Processed */}
        <div className="bg-[#0D0E12] border border-[#1A1D24] rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#626875] text-[10px] font-mono mb-2">
            <span>GESAMT</span>
            <CircleDot className="w-3.5 h-3.5 text-[#E1E4EA]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-[#E1E4EA] tracking-tight tabular-nums">
              {stats.total_processed}
            </div>
            <div className="text-[10px] font-mono text-[#626875] mt-1">
              Bälle durchlaufen
            </div>
          </div>
        </div>

        {/* Sorted Red */}
        <div className="bg-[#0D0E12] border border-[#1A1D24] rounded-lg p-3.5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-1 bg-[#FF3B30]" />
          <div className="flex items-center justify-between text-[#626875] text-[10px] font-mono mb-2">
            <span className="text-[#FF3B30] font-semibold">SORTIERT ROT</span>
            <span className="text-[10px] text-[#FF3B30] font-mono">{redPercent}%</span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-[#FF3B30] tracking-tight tabular-nums">
              {stats.count_red}
            </div>
            <div className="text-[10px] font-mono text-[#626875] mt-1">
              Station 1 (Servo 1)
            </div>
          </div>
        </div>

        {/* Sorted White */}
        <div className="bg-[#0D0E12] border border-[#1A1D24] rounded-lg p-3.5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-1 bg-[#F0F2F5]" />
          <div className="flex items-center justify-between text-[#626875] text-[10px] font-mono mb-2">
            <span className="text-[#F0F2F5] font-semibold">SORTIERT WEISS</span>
            <span className="text-[10px] text-[#F0F2F5] font-mono">{whitePercent}%</span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-[#F0F2F5] tracking-tight tabular-nums">
              {stats.count_white}
            </div>
            <div className="text-[10px] font-mono text-[#626875] mt-1">
              Station 2 (Servo 2)
            </div>
          </div>
        </div>

        {/* Errors / Rejected */}
        <div className="bg-[#0D0E12] border border-[#1A1D24] rounded-lg p-3.5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-1 bg-[#FF9500]" />
          <div className="flex items-center justify-between text-[#626875] text-[10px] font-mono mb-2">
            <span className="text-[#FF9500] font-semibold">AUSSCHUSS</span>
            <span className="text-[10px] text-[#FF9500] font-mono">{errorPercent}%</span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-[#FF9500] tracking-tight tabular-nums">
              {stats.count_error}
            </div>
            <div className="text-[10px] font-mono text-[#626875] mt-1">
              Unbekannt / Defekt
            </div>
          </div>
        </div>

        {/* Cycle Time Precision Card (Spanning 4 cols on sm) */}
        <div className="col-span-2 sm:col-span-4 bg-[#0D0E12] border border-[#1A1D24] rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-[#111318] text-[#00FF88] border border-[#1A1D24]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-[#626875]">
                TAKTZEIT-MESSUNG [NEMA 17 FÖRDERER]
              </div>
              <div className="text-lg font-mono font-bold text-[#E1E4EA] tabular-nums flex items-baseline gap-2">
                <span>{current_cycle_time_ms} ms</span>
                <span className="text-xs font-normal text-[#626875]">
                  ({(current_cycle_time_ms / 1000).toFixed(2)}s / Schritt)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono border-t sm:border-t-0 sm:border-l border-[#1A1D24] pt-2 sm:pt-0 sm:pl-4">
            <div>
              <span className="text-[10px] text-[#626875] block">MIN TAKT:</span>
              <span className="font-bold text-[#00FF88] tabular-nums">
                {minCycleTime !== null ? `${minCycleTime} ms` : '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#626875] block">MAX TAKT:</span>
              <span className="font-bold text-[#FF9500] tabular-nums">
                {maxCycleTime !== null ? `${maxCycleTime} ms` : '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#626875] block">ZIELWERTE:</span>
              <span className="font-semibold text-[#626875] tabular-nums">
                &le; 1500 ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Color Sensor TCS34725 Monitor (Col span 5) */}
      <div className="lg:col-span-5 bg-[#0D0E12] border border-[#1A1D24] rounded-lg p-4 flex flex-col justify-between">
        {/* Sensor Header */}
        <div className="flex items-center justify-between border-b border-[#1A1D24] pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#00FF88]" />
            <span className="text-xs font-mono font-bold uppercase text-[#E1E4EA]">
              FARBSENSOR TCS34725 [I2C 0x29]
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-[#626875]">ERKANNT:</span>
            <span
              className={`px-2 py-0.5 rounded font-bold uppercase ${
                sensor_detected === 'ROT'
                  ? 'bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/40'
                  : sensor_detected === 'WEISS'
                  ? 'bg-[#F0F2F5]/20 text-[#F0F2F5] border border-[#F0F2F5]/40'
                  : sensor_detected === 'UNBEKANNT'
                  ? 'bg-[#FF9500]/20 text-[#FF9500] border border-[#FF9500]/40'
                  : 'bg-[#111318] text-[#626875] border border-[#1A1D24]'
              }`}
            >
              {sensor_detected}
            </span>
          </div>
        </div>

        {/* RGB Raw Channel Bars */}
        <div className="space-y-2.5 font-mono text-xs mb-3">
          {/* Red Channel */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#FF3B30] font-semibold">ROT (R)</span>
              <span className="text-[#E1E4EA] tabular-nums font-bold">{sensor_raw.r}</span>
            </div>
            <div className="w-full h-2 rounded bg-[#111318] border border-[#1A1D24] overflow-hidden">
              <div
                className="h-full bg-[#FF3B30] transition-all duration-150"
                style={{ width: `${Math.min(100, (sensor_raw.r / 300) * 100)}%` }}
              />
            </div>
          </div>

          {/* Green Channel */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#00FF88] font-semibold">GRÜN (G)</span>
              <span className="text-[#E1E4EA] tabular-nums font-bold">{sensor_raw.g}</span>
            </div>
            <div className="w-full h-2 rounded bg-[#111318] border border-[#1A1D24] overflow-hidden">
              <div
                className="h-full bg-[#00FF88] transition-all duration-150"
                style={{ width: `${Math.min(100, (sensor_raw.g / 300) * 100)}%` }}
              />
            </div>
          </div>

          {/* Blue Channel */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#3B82F6] font-semibold">BLAU (B)</span>
              <span className="text-[#E1E4EA] tabular-nums font-bold">{sensor_raw.b}</span>
            </div>
            <div className="w-full h-2 rounded bg-[#111318] border border-[#1A1D24] overflow-hidden">
              <div
                className="h-full bg-[#3B82F6] transition-all duration-150"
                style={{ width: `${Math.min(100, (sensor_raw.b / 300) * 100)}%` }}
              />
            </div>
          </div>

          {/* Clear Channel */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#F0F2F5] font-semibold">CLEAR / LUX</span>
              <span className="text-[#E1E4EA] tabular-nums font-bold">{sensor_raw.clear}</span>
            </div>
            <div className="w-full h-2 rounded bg-[#111318] border border-[#1A1D24] overflow-hidden">
              <div
                className="h-full bg-[#F0F2F5] transition-all duration-150"
                style={{ width: `${Math.min(100, (sensor_raw.clear / 600) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Color Preview & Optical Status Footer */}
        <div className="pt-2 border-t border-[#1A1D24] flex items-center justify-between font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded border border-[#1A1D24] shadow-sm"
              style={colorSwatchStyle}
            />
            <span className="text-[#626875]">Optischer Farbmesswert</span>
          </div>

          <span className="text-[#626875]">
            400 kHz Fast-Mode
          </span>
        </div>
      </div>
    </div>
  );
};
