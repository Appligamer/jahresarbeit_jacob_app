import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Clock, 
  Gauge, 
  Sliders, 
  Cpu, 
  Code,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import type { ConnectionState, TelemetryPayload, ConnectionConfig } from '../../types/scada.ts';

interface ScadaHeaderProps {
  connectionState: ConnectionState;
  pingMs: number | null;
  telemetry: TelemetryPayload;
  config: ConnectionConfig;
  onOpenSettings: () => void;
  onOpenFirmware: () => void;
  onReconnect: () => void;
}

function formatUptime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const ScadaHeader: React.FC<ScadaHeaderProps> = ({
  connectionState,
  pingMs,
  telemetry,
  config,
  onOpenSettings,
  onOpenFirmware,
  onReconnect,
}) => {
  const isOnline = connectionState === 'ONLINE';
  const isConnecting = connectionState === 'CONNECTING';

  return (
    <header className="border-b border-[#1A1D24] bg-[#0A0B0E] px-4 py-3 sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Branding & Machine ID */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#111318] border border-[#1A1D24] flex items-center justify-center text-[#00FF88] shadow-inner shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wider text-[#E1E4EA] uppercase font-mono">
                SORT-SCADA // ESP32 DUAL-CORE
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#111318] text-[#626875] border border-[#1A1D24] font-mono">
                v2.4-IND
              </span>
            </div>
            <p className="text-[11px] text-[#626875] font-mono tracking-tight">
              TISCHTENNISBALL-FARBSORTIERANLAGE • 75mm RASTER-FÖRDERER
            </p>
          </div>
        </div>

        {/* Center: Realtime Telemetry Stats (Uptime, Throughput, Status) */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1">
          {/* Machine Run Status */}
          <div className="px-3 py-1.5 rounded bg-[#0D0E12] border border-[#1A1D24] flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono text-[#626875]">STATUS:</span>
            <span
              className={`text-xs font-mono font-bold tracking-wide px-1.5 py-0.5 rounded ${
                telemetry.status === 'RUNNING'
                  ? 'bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30'
                  : telemetry.status === 'PAUSED'
                  ? 'bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/30'
                  : telemetry.status === 'ERROR'
                  ? 'bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/30'
                  : 'bg-[#111318] text-[#626875] border border-[#1A1D24]'
              }`}
            >
              {telemetry.status}
            </span>
          </div>

          {/* Uptime */}
          <div className="px-3 py-1.5 rounded bg-[#0D0E12] border border-[#1A1D24] flex items-center gap-2 font-mono">
            <Clock className="w-3.5 h-3.5 text-[#626875]" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-[#626875] leading-none">UPTIME</span>
              <span className="text-xs text-[#E1E4EA] font-semibold tabular-nums mt-0.5">
                {formatUptime(telemetry.uptime_sec)}
              </span>
            </div>
          </div>

          {/* Throughput */}
          <div className="px-3 py-1.5 rounded bg-[#0D0E12] border border-[#1A1D24] flex items-center gap-2 font-mono">
            <Gauge className="w-3.5 h-3.5 text-[#00FF88]" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-[#626875] leading-none">DURCHSATZ</span>
              <span className="text-xs text-[#00FF88] font-bold tabular-nums mt-0.5">
                {telemetry.stats.throughput_bpm.toFixed(1)} <span className="text-[9px] font-normal text-[#626875]">BPM</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Connection Badge, Latency & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Connection Status Badge */}
          <div 
            onClick={onOpenSettings}
            title="Klicken für Verbindungseinstellungen"
            className="px-3 py-1.5 rounded bg-[#0D0E12] border border-[#1A1D24] hover:border-[#2A2F3B] transition-colors cursor-pointer flex items-center gap-2.5 font-mono"
          >
            <div className="relative flex items-center justify-center">
              {isOnline ? (
                <>
                  <span className="absolute w-2.5 h-2.5 rounded-full bg-[#00FF88] opacity-75 animate-ping" />
                  <span className="relative w-2 h-2 rounded-full bg-[#00FF88]" />
                </>
              ) : isConnecting ? (
                <>
                  <span className="absolute w-2.5 h-2.5 rounded-full bg-[#FF9500] opacity-75 animate-ping" />
                  <span className="relative w-2 h-2 rounded-full bg-[#FF9500]" />
                </>
              ) : (
                <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
              )}
            </div>

            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#E1E4EA] tracking-wide">
                  {isOnline ? 'ONLINE' : isConnecting ? 'CONNECTING' : 'OFFLINE'}
                </span>
                {isOnline && pingMs !== null && (
                  <span className="text-[10px] text-[#00FF88] font-semibold tabular-nums">
                    {pingMs}ms
                  </span>
                )}
              </div>
              <span className="text-[9px] text-[#626875] mt-1 truncate max-w-[120px]">
                {config.host}:{config.port}
              </span>
            </div>
          </div>

          {/* Quick Reconnect Button if Offline */}
          {!isOnline && (
            <button
              onClick={onReconnect}
              title="Verbindung sofort erneut herstellen"
              className="p-2 rounded bg-[#111318] border border-[#1A1D24] text-[#E1E4EA] hover:text-[#00FF88] hover:border-[#00FF88]/40 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isConnecting ? 'animate-spin text-[#FF9500]' : ''}`} />
            </button>
          )}

          {/* Firmware Reference / C++ Code Button */}
          <button
            onClick={onOpenFirmware}
            title="ESP32 C++ Quellcode anzeigen"
            className="p-2 rounded bg-[#111318] border border-[#1A1D24] text-[#626875] hover:text-[#E1E4EA] hover:border-[#2A2F3B] transition-colors cursor-pointer"
          >
            <Code className="w-4 h-4" />
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={onOpenSettings}
            title="WebSocket Verbindung konfigurieren"
            className="p-2 rounded bg-[#111318] border border-[#1A1D24] text-[#626875] hover:text-[#E1E4EA] hover:border-[#2A2F3B] transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
