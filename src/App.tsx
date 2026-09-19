import React, { useState } from 'react';
import { useEsp32WebSocket } from './hooks/useEsp32WebSocket.ts';
import { ScadaHeader } from './components/scada/ScadaHeader.tsx';
import { ConveyorRibbon } from './components/scada/ConveyorRibbon.tsx';
import { TelemetryKpiPanel } from './components/scada/TelemetryKpiPanel.tsx';
import { ControlDeck } from './components/scada/ControlDeck.tsx';
import { SystemTerminal } from './components/scada/SystemTerminal.tsx';
import { ConnectionSettingsModal } from './components/scada/ConnectionSettingsModal.tsx';
import { Esp32FirmwareReferenceModal } from './components/scada/Esp32FirmwareReferenceModal.tsx';

export default function App() {
  const {
    connectionState,
    pingMs,
    telemetry,
    logs,
    minCycleTime,
    maxCycleTime,
    config,
    updateConfig,
    connect,
    disconnect,
    sendCommand,
    clearLogs,
  } = useEsp32WebSocket();

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isFirmwareOpen, setIsFirmwareOpen] = useState<boolean>(false);

  const handleTriggerEjectorFromRibbon = (station: number) => {
    sendCommand({
      command: 'TRIGGER_EJECTOR',
      station,
    });
  };

  return (
    <div id="scada_app_root" className="min-h-screen bg-[#050507] text-[#E1E4EA] font-sans flex flex-col selection:bg-[#00FF88]/20 selection:text-[#00FF88]">
      {/* 1. HEADER & STATUS-LEISTE */}
      <ScadaHeader
        connectionState={connectionState}
        pingMs={pingMs}
        telemetry={telemetry}
        config={config}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenFirmware={() => setIsFirmwareOpen(true)}
        onReconnect={connect}
      />

      {/* MAIN SCADA DASHBOARD CONTAINER */}
      <main id="scada_main_content" className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* 2. INTERAKTIVE LIVE-FÖRDERBAND-VISUALISIERUNG */}
        <section id="scada_section_conveyor">
          <ConveyorRibbon
            telemetry={telemetry}
            onTriggerEjector={handleTriggerEjectorFromRibbon}
          />
        </section>

        {/* 3. SCADA-TELEMETRIE & KPI-PANEL */}
        <section id="scada_section_telemetry">
          <TelemetryKpiPanel
            telemetry={telemetry}
            minCycleTime={minCycleTime}
            maxCycleTime={maxCycleTime}
          />
        </section>

        {/* 4. CONTROL-DECK (BEDIENFELD) */}
        <section id="scada_section_control">
          <ControlDeck
            status={telemetry.status}
            currentStepDelayMs={telemetry.current_cycle_time_ms}
            onSendCommand={sendCommand}
            disabled={connectionState === 'CONNECTING'}
          />
        </section>

        {/* 5. LIVE-SYSTEM-TERMINAL (EVENT-LOG) */}
        <section id="scada_section_terminal">
          <SystemTerminal
            logs={logs}
            onClearLogs={clearLogs}
          />
        </section>

      </main>

      {/* FOOTER / SYSTEM METRICS BAR */}
      <footer id="scada_footer" className="border-t border-[#1A1D24] bg-[#0A0B0E] py-2 px-4 text-xs font-mono text-[#626875] flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-4">
          <span>ESP32 MECHATRONIK SYSTEM v2.4.0</span>
          <span>•</span>
          <span>SCHIEBEREGISTER 75mm RASTER</span>
          <span>•</span>
          <span>TCS34725 &amp; PCA9685 SERVO</span>
        </div>
        <div className="flex items-center gap-3">
          <span>WS: {config.protocol}://{config.host}:{config.port}{config.path}</span>
          <span>•</span>
          <span className={connectionState === 'ONLINE' ? 'text-[#00FF88]' : 'text-[#FF3B30]'}>
            {connectionState}
          </span>
        </div>
      </footer>

      {/* SETTINGS MODAL */}
      <ConnectionSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={updateConfig}
        onReconnect={connect}
        onDisconnect={disconnect}
      />

      {/* C++ FIRMWARE CODE REFERENCE MODAL */}
      <Esp32FirmwareReferenceModal
        isOpen={isFirmwareOpen}
        onClose={() => setIsFirmwareOpen(false)}
      />
    </div>
  );
}
