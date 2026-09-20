import React, { useState } from 'react';
import { 
  Activity, 
  Settings, 
  Wifi, 
  WifiOff, 
  ShieldAlert, 
  RotateCw, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Zap,
  Server
} from 'lucide-react';
import type { 
  Esp32TelemetryResponse, 
  ClientConnectionStatus, 
  Esp32Config 
} from '../../types/scada.ts';

interface HeaderBarProps {
  telemetry: Esp32TelemetryResponse;
  connectionStatus: ClientConnectionStatus;
  latencyMs: number | null;
  config: Esp32Config;
  onUpdateConfig: (newCfg: Partial<Esp32Config>) => void;
  onTriggerPing: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  telemetry,
  connectionStatus,
  latencyMs,
  config,
  onUpdateConfig,
  onTriggerPing,
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>(config.baseUrl);
  const [inputKey, setInputKey] = useState<string>(config.apiKey);
  const [inputInterval, setInputInterval] = useState<number>(config.pollingIntervalMs);
  const [inputProxy, setInputProxy] = useState<boolean>(config.useProxyFallback);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      baseUrl: inputUrl.trim(),
      apiKey: inputKey.trim(),
      pollingIntervalMs: Math.max(250, Math.min(5000, Number(inputInterval) || 400)),
      useProxyFallback: inputProxy,
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  // Status Badge formatting
  const renderStatusBadge = () => {
    if (connectionStatus === 'OFFLINE') {
      return (
        <div id="status_badge_offline" className="flex items-center gap-2 px-3 py-1 bg-[#ef4444]/15 border border-[#ef4444] text-[#ef4444] text-xs font-semibold uppercase tracking-wider">
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>OFFLINE (KEINE VERBINDUNG)</span>
        </div>
      );
    }

    if (connectionStatus === 'AUTH_ERROR') {
      return (
        <div id="status_badge_auth" className="flex items-center gap-2 px-3 py-1 bg-[#ef4444]/20 border border-[#ef4444] text-[#ef4444] text-xs font-semibold uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>AUTH-FEHLER (401 UNGÜLTIGER KEY)</span>
        </div>
      );
    }

    if (telemetry.running || telemetry.status === 'AUTOMATIK') {
      return (
        <div id="status_badge_auto" className="flex items-center gap-2 px-3 py-1 bg-[#10b981]/15 border border-[#10b981] text-[#10b981] text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
          <span>ONLINE - AUTOMATIK</span>
        </div>
      );
    }

    if (telemetry.status === 'GESTOPPT') {
      return (
        <div id="status_badge_stopped" className="flex items-center gap-2 px-3 py-1 bg-[#ef4444]/15 border border-[#ef4444] text-[#ef4444] text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 bg-[#ef4444]" />
          <span>ONLINE - GESTOPPT</span>
        </div>
      );
    }

    return (
      <div id="status_badge_standby" className="flex items-center gap-2 px-3 py-1 bg-[#f59e0b]/15 border border-[#f59e0b] text-[#f59e0b] text-xs font-semibold uppercase tracking-wider">
        <span className="w-2 h-2 bg-[#f59e0b]" />
        <span>STANDBY (BEREIT)</span>
      </div>
    );
  };

  return (
    <header id="scada_header" className="scada-header-bar sticky top-0 z-40 w-full text-slate-200">
      {/* Primary Bar */}
      <div className="max-w-[1680px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Branding & Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-8 h-8 bg-[#1e293b] border border-[#334155] text-[#10b981]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-wider uppercase font-mono">
                NWT-2026 SORTIERLEITSTAND
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 bg-[#1e293b] text-slate-400 font-mono border border-slate-700">
                ESP32 SCADA
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span>75mm Schieberegister</span>
              <span>•</span>
              <span>TCS34725</span>
              <span>•</span>
              <span>2x Servo-Auswurf</span>
            </div>
          </div>
        </div>

        {/* Center: Live Status Indicator */}
        <div className="flex items-center gap-3">
          {renderStatusBadge()}

          {/* Latency Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#0b1120] border border-[#1e293b] text-xs font-mono text-slate-400">
            <Zap className="w-3 h-3 text-[#10b981]" />
            <span>{latencyMs !== null ? `${latencyMs} ms` : '-- ms'}</span>
          </div>

          {/* Cycle Time Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#0b1120] border border-[#1e293b] text-xs font-mono text-slate-400">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Takt: <strong className="text-white">{telemetry.cycle_ms}ms</strong></span>
          </div>
        </div>

        {/* Right: Actions & Config Toggle */}
        <div className="flex items-center gap-2 font-mono">
          <button
            type="button"
            id="btn_header_ping"
            onClick={onTriggerPing}
            title="Telemetrie sofort abfragen (GET_STATUS)"
            className="scada-btn px-2.5 py-1 bg-[#0f172a] hover:bg-[#1e293b] border border-[#334155] text-slate-300 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">POLL</span>
          </button>

          <button
            type="button"
            id="btn_header_toggle_config"
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className={`scada-btn px-3 py-1 border text-xs flex items-center gap-2 cursor-pointer transition-colors ${
              isConfigOpen 
                ? 'bg-[#1e293b] border-[#10b981] text-white' 
                : 'bg-[#0f172a] hover:bg-[#1e293b] border-[#334155] text-slate-300'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-slate-300" />
            <span>VERBINDUNG</span>
            {isConfigOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Collapsible Connection Settings Drawer */}
      {isConfigOpen && (
        <div id="scada_config_panel" className="bg-[#0b1120] border-t border-[#1e293b] px-4 py-4 transition-all">
          <div className="max-w-[1680px] mx-auto">
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end font-mono">
              
              {/* Target Base URL */}
              <div className="md:col-span-5">
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                  ESP32 Basis-URL (z. B. LAN-IP oder Cloudflare Tunnel)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-slate-500">
                    <Server className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    id="input_esp32_url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="http://192.168.178.50 oder https://..."
                    className="w-full bg-[#050811] border border-[#1e293b] focus:border-[#10b981] text-slate-200 text-xs pl-8 pr-3 py-2 outline-none"
                  />
                </div>
              </div>

              {/* API Key */}
              <div className="md:col-span-3">
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                  Sicherheits-Schlüssel (?key=... / X-API-Key)
                </label>
                <input
                  type="text"
                  id="input_esp32_key"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="NWT2026"
                  className="w-full bg-[#050811] border border-[#1e293b] focus:border-[#10b981] text-slate-200 text-xs px-3 py-2 outline-none font-mono"
                />
              </div>

              {/* Polling Interval */}
              <div className="md:col-span-2">
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                  Polling (ms)
                </label>
                <input
                  type="number"
                  id="input_esp32_interval"
                  value={inputInterval}
                  min={250}
                  max={5000}
                  step={50}
                  onChange={(e) => setInputInterval(Number(e.target.value))}
                  className="w-full bg-[#050811] border border-[#1e293b] focus:border-[#10b981] text-slate-200 text-xs px-3 py-2 outline-none"
                />
              </div>

              {/* Save & Preset Buttons */}
              <div className="md:col-span-2 flex items-center gap-2">
                <button
                  type="submit"
                  id="btn_save_config"
                  className="scada-btn flex-1 py-2 bg-[#10b981] hover:bg-[#059669] text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {savedFeedback ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{savedFeedback ? 'GESPEICHERT' : 'SPEICHERN'}</span>
                </button>
              </div>

              {/* Quick Presets & Proxy Toggle */}
              <div className="col-span-full pt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 border-t border-[#1e293b]/50">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500 uppercase">Schnell-Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        setInputUrl(window.location.origin);
                      }
                    }}
                    className="px-2 py-0.5 bg-[#1e293b] hover:bg-[#334155] text-slate-300 border border-slate-700 cursor-pointer"
                  >
                    Aktueller Web-Server
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputUrl('http://192.168.178.50')}
                    className="px-2 py-0.5 bg-[#1e293b] hover:bg-[#334155] text-slate-300 border border-slate-700 cursor-pointer"
                  >
                    Feste LAN-IP (192.168.178.50)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputUrl('http://192.168.4.1')}
                    className="px-2 py-0.5 bg-[#1e293b] hover:bg-[#334155] text-slate-300 border border-slate-700 cursor-pointer"
                  >
                    ESP32 AP-Mode (192.168.4.1)
                  </button>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={inputProxy}
                    onChange={(e) => setInputProxy(e.target.checked)}
                    className="accent-[#10b981] rounded-none cursor-pointer"
                  />
                  <span>CORS / Mixed-Content Web-Gateway Proxy nutzen</span>
                </label>
              </div>

            </form>
          </div>
        </div>
      )}
    </header>
  );
};
