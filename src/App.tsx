import React from 'react';
import { useEsp32Api } from './hooks/useEsp32Api.ts';
import { HeaderBar } from './components/scada/HeaderBar.tsx';
import { ConveyorShiftRegister } from './components/scada/ConveyorShiftRegister.tsx';
import { TelemetryKpis } from './components/scada/TelemetryKpis.tsx';
import { ControlDeck } from './components/scada/ControlDeck.tsx';
import { EventLogConsole } from './components/scada/EventLogConsole.tsx';

export default function App() {
  const {
    telemetry,
    connectionStatus,
    latencyMs,
    lastHeartbeat,
    config,
    updateConfig,
    executeCommand,
    logs,
    clearLogs,
    triggerPollingNow,
  } = useEsp32Api();

  return (
    <div id="scada_app_root" className="min-h-screen bg-[#06080d] text-[#e2e8f0] font-mono flex flex-col antialiased">
      {/* 1. HEADER & VERBINDUNGS-LEISTE */}
      <HeaderBar
        telemetry={telemetry}
        connectionStatus={connectionStatus}
        latencyMs={latencyMs}
        config={config}
        onUpdateConfig={updateConfig}
        onTriggerPing={triggerPollingNow}
      />

      {/* HAUPT-LEITSTAND CONTAINER */}
      <main id="scada_main_viewport" className="flex-1 max-w-[1680px] w-full mx-auto px-3 sm:px-5 py-5 flex flex-col gap-5">
        
        {/* 2. VIRTUELLES SCHIEBEREGISTER (75 mm BAND-VISUALISIERUNG) */}
        <ConveyorShiftRegister telemetry={telemetry} />

        {/* 3. ECHTZEIT-TELEMETRIE & KPI-KARTEN + SENSOR-LIVE-MONITOR */}
        <TelemetryKpis telemetry={telemetry} />

        {/* 4. STEUERUNGS-DECK (START / STOP / STEP / AKTOREN / TAKTZEIT) */}
        <ControlDeck
          telemetry={telemetry}
          onExecuteCommand={executeCommand}
          disabled={connectionStatus === 'OFFLINE' || connectionStatus === 'AUTH_ERROR'}
        />

        {/* 5. FEHLER- & NETZWERK-ÜBERWACHUNG (TERMINAL & EVENT-STREAM) */}
        <EventLogConsole
          logs={logs}
          connectionStatus={connectionStatus}
          targetBaseUrl={config.baseUrl}
          onClearLogs={clearLogs}
          onRetryConnection={triggerPollingNow}
        />

      </main>

      {/* FOOTER METRICS BAR */}
      <footer id="scada_footer_bar" className="border-t border-[#1e293b] bg-[#090d16] py-2.5 px-4 text-xs font-mono text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-white uppercase">NWT-2026 JAHRESARBEIT</span>
          <span>•</span>
          <span>ESP32 MECHATRONIK SCADA</span>
          <span>•</span>
          <span className="text-slate-500">SCHNITTSTELLE: /api</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>LETZTER HEARTBEAT: <strong className="text-slate-200">{lastHeartbeat ? lastHeartbeat.toLocaleTimeString('de-DE') : '--:--:--'}</strong></span>
          <span>•</span>
          <span className="text-[#10b981]">SYSTEM BEREIT</span>
        </div>
      </footer>
    </div>
  );
}
