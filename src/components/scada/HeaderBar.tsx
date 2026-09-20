import React, { useState } from 'react';
import { 
  Activity, 
  Settings, 
  RotateCw, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Zap,
  Server,
  Key
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
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      baseUrl: inputUrl.trim(),
      apiKey: inputKey.trim(),
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const renderStatusBadge = () => {
    if (connectionStatus === 'FEHLER') {
      return (
        <div id="status_badge_error" className="flex items-center gap-2 px-3 py-1 bg-[#ef4444]/15 border border-[#ef4444] text-[#ef4444] text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <span>FEHLER / GETRENNT</span>
        </div>
      );
    }

    if (connectionStatus === 'VERBINDE...') {
      return (
        <div id="status_badge_connecting" className="flex items-center gap-2 px-3 py-1 bg-[#f59e0b]/15 border border-[#f59e0b] text-[#f59e0b] text-xs font-semibold uppercase tracking-wider">
          <RotateCw className="w-3 h-3 animate-spin" />
          <span>VERBINDE...</span>
        </div>
      );
    }

    if (connectionStatus === 'ONLINE') {
      return (
        <div id="status_badge_online" className="flex items-center gap-2 px-3 py-1 bg-[#10b981]/15 border border-[#10b981] text-[#10b981] text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
          <span>ONLINE ({telemetry.status})</span>
        </div>
      );
    }

    return (
      <div id="status_badge_standby" className="flex items-center gap-2 px-3 py-1 bg-slate-800 border border-slate-600 text-slate-400 text-xs font-semibold uppercase tracking-wider">
        <span>GETRENNT</span>
      </div>
    );
  };

  return (
    <header id="scada_header" className="scada-header-bar sticky top-0 z-40 w-full text-slate-200">
      <div className="max-w-[1680px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
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

        <div className="flex items-center gap-3">
          {renderStatusBadge()}
          {latencyMs !== null && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#0b1120] border border-[#1e293b] text-xs font-mono text-slate-400">
              <Zap className="w-3 h-3 text-[#10b981]" />
              <span>{latencyMs} ms</span>
            </div>
          )}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#0b1120] border border-[#1e293b] text-xs font-mono text-slate-400">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Takt: <strong className="text-white">{telemetry.cycle_ms}ms</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <button
            type="button"
            onClick={onTriggerPing}
            title="Telemetrie jetzt abfragen (GET_STATUS)"
            className="scada-btn px-2.5 py-1 bg-[#0f172a] hover:bg-[#1e293b] border border-[#334155] text-slate-300 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">POLL</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="scada-btn px-3 py-1 border text-xs flex items-center gap-2 cursor-pointer bg-[#0f172a] hover:bg-[#1e293b] border-[#334155] text-slate-300"
          >
            <Settings className="w-3.5 h-3.5 text-slate-300" />
            <span>VERBINDUNG</span>
            {isConfigOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {isConfigOpen && (
        <div id="scada_config_drawer" className="bg-[#0b1120] border-t border-[#1e293b] px-4 py-4">
          <div className="max-w-[1680px] mx-auto">
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end font-mono">
              <div className="md:col-span-6">
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                  ESP32 Basis-URL
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-slate-500">
                    <Server className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="http://192.168.4.1"
                    className="w-full bg-[#050811] border border-[#1e293b] text-slate-200 text-xs pl-8 pr-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="md:col-span-4">
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                  API-Key
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-slate-500">
                    <Key className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="NWT-2026-SORT-X79"
                    className="w-full bg-[#050811] border border-[#1e293b] text-slate-200 text-xs pl-8 pr-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-[#10b981] hover:bg-[#059669] text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {savedFeedback ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{savedFeedback ? 'GESPEICHERT' : 'SPEICHERN'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
