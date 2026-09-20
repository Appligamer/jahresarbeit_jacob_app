import React from 'react';
import { useEsp32Api } from './hooks/useEsp32Api.ts';
import { ConnectionManager } from './components/scada/ConnectionManager.tsx';
import { ConveyorShiftRegister } from './components/scada/ConveyorShiftRegister.tsx';
import { TelemetryKpis } from './components/scada/TelemetryKpis.tsx';
import { ControlDeck } from './components/scada/ControlDeck.tsx';
import { EventLogConsole } from './components/scada/EventLogConsole.tsx';
import { Activity, ShieldCheck, FileCode } from 'lucide-react';

export default function App() {
  const {
    telemetry,
    connectionStatus,
    latencyMs,
    lastHeartbeat,
    config,
    mixedContentWarning,
    updateConfig,
    executeCommand,
    configureWifi,
    logs,
    clearLogs,
    triggerReconnectNow,
  } = useEsp32Api();

  return (
    <div id="scada_app_root" className="min-h-screen bg-[#06080d] text-[#e2e8f0] font-mono flex flex-col antialiased">
      <header id="scada_top_header" className="scada-header-bar sticky top-0 z-40 w-full px-4 py-3 bg-[#090d16] border-b border-[#1e293b]">
        <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1e293b] border border-[#334155] flex items-center justify-center text-[#10b981]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-wider uppercase font-mono">
                  NWT-2026 SORTIERLEITSTAND — ESP32 SCADA
                </h1>
                <span className="text-[10px] px-1.5 py-0.2 bg-[#1e293b] text-slate-300 font-mono border border-slate-700">
                  PRODUKTIVSYSTEM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Entwickler: Jacob Glathe | Mechatronik-Jahresarbeit 2026 | Takt: 75mm FIFO
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />
              <span>Schnittstelle: Single-Endpoint <strong className="text-white">/api</strong></span>
            </div>
            <a
              href="/standalone.html"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 bg-[#1e293b] hover:bg-[#334155] border border-slate-700 text-slate-200 text-xs transition-colors cursor-pointer"
              title="Reine Standalone Single-File Version oeffnen"
            >
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>STANDALONE HTML EXPORT</span>
            </a>
          </div>
        </div>
      </header>

      <main id="scada_main_viewport" className="flex-1 max-w-[1680px] w-full mx-auto px-3 sm:px-5 py-5 flex flex-col gap-5">
        <ConnectionManager
          connectionStatus={connectionStatus}
          latencyMs={latencyMs}
          lastHeartbeat={lastHeartbeat}
          config={config}
          mixedContentWarning={mixedContentWarning}
          onUpdateConfig={updateConfig}
          onReconnect={triggerReconnectNow}
          onConfigureWifi={configureWifi}
        />

        <ConveyorShiftRegister telemetry={telemetry} />

        <TelemetryKpis
          telemetry={telemetry}
          connectionStatus={connectionStatus}
        />

        <ControlDeck
          telemetry={telemetry}
          connectionStatus={connectionStatus}
          onExecute={executeCommand}
        />

        <EventLogConsole
          logs={logs}
          connectionStatus={connectionStatus}
          targetBaseUrl={config.baseUrl}
          onClearLogs={clearLogs}
          onRetryConnection={triggerReconnectNow}
        />
      </main>

      <footer id="scada_footer_bar" className="border-t border-[#1e293b] bg-[#090d16] py-2.5 px-4 text-xs font-mono text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-white uppercase">NWT-2026 JAHRESARBEIT</span>
          <span>•</span>
          <span>JACOB GLATHE</span>
          <span>•</span>
          <span>TISCHTENNISBALL FARBSORTIERANLAGE</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>LETZTE AKTUALISIERUNG: <strong className="text-slate-200">{lastHeartbeat ? lastHeartbeat.toLocaleTimeString('de-DE') : '--:--:--'}</strong></span>
          <span>•</span>
          <span className="text-[#10b981]">SYSTEM BEREIT</span>
        </div>
      </footer>
    </div>
  );
}