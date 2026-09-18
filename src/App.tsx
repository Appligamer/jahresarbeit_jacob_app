import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Layers, 
  Cpu, 
  FileSpreadsheet, 
  Server, 
  RotateCw, 
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Radio,
  ShieldCheck,
  Terminal
} from 'lucide-react';
import type { 
  SorterSystemStatus, 
  SortingRule, 
  ContainerConfig, 
  SortedBallLog, 
  BallColor, 
  BallQuality,
  SmartHomeAutomationConfig
} from './types.ts';
import { Header } from './components/Header.tsx';
import { MachineShiftRegisterView } from './components/MachineShiftRegisterView.tsx';
import { HardwareCalibrationView } from './components/HardwareCalibrationView.tsx';
import { NwtTestMatrixView } from './components/NwtTestMatrixView.tsx';
import { Esp32ApiHub } from './components/Esp32ApiHub.tsx';
import { SystemDiagnosticsView } from './components/SystemDiagnosticsView.tsx';
import { AiAgentMasterPromptView } from './components/AiAgentMasterPromptView.tsx';
import { SimulateBallModal } from './components/SimulateBallModal.tsx';
import { ContainerModal } from './components/ContainerModal.tsx';

export default function App() {
  const [status, setStatus] = useState<SorterSystemStatus | null>(null);
  const [logs, setLogs] = useState<SortedBallLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'machine' | 'hardware' | 'diagnostics' | 'testmatrix' | 'api' | 'prompt'>('machine');
  
  // Real-time animation states
  const [soundEnabled] = useState<boolean>(false);
  const [isSseConnected, setIsSseConnected] = useState<boolean>(false);
  const [liveBallAlert, setLiveBallAlert] = useState<{ name: string; colorHex: string } | null>(null);

  // Modals
  const [isSimModalOpen, setIsSimModalOpen] = useState<boolean>(false);
  const [editingContainer, setEditingContainer] = useState<ContainerConfig | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playDropSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      // AudioContext fallback
    }
  }, [soundEnabled]);

  const showToast = (text: string, type: 'success' | 'info' | 'warn' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Fetch system status from API
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error('Status konnte nicht geladen werden');
      const data: SorterSystemStatus = await res.json();
      setStatus(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verbindung zum Backend-Server unterbrochen';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs?limit=50');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch {
      // ignore
    }
  }, []);

  // 3. Real-Time SSE Stream with instant event handling
  useEffect(() => {
    fetchStatus();
    fetchLogs();

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/stream');

      eventSource.onopen = () => {
        setIsSseConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'init') {
            if (payload.systemState) setStatus(payload.systemState);
            if (payload.logs) setLogs(payload.logs);
            setLoading(false);
          } else if (payload.type === 'status_update') {
            if (payload.systemState) setStatus(payload.systemState);
          } else if (payload.type === 'ball_sorted') {
            if (payload.systemState) setStatus(payload.systemState);
            if (payload.log) {
              setLogs(prev => [payload.log, ...prev.slice(0, 49)]);
            }

            if (payload.targetContainer) {
              setLiveBallAlert({
                name: payload.targetContainer.name,
                colorHex: payload.targetContainer.colorHex
              });

              playDropSound();

              setTimeout(() => {
                setLiveBallAlert(null);
              }, 2500);
            }
          } else if (payload.type === 'pipeline_update' || payload.type === 'ball_queued' || payload.type === 'wave_detected') {
            if (payload.systemState) {
              setStatus(payload.systemState);
            } else if (payload.pipeline) {
              setStatus(prev => prev ? { ...prev, pipeline: payload.pipeline } : null);
            }
          } else if (payload.type === 'machine_update') {
            if (payload.systemState) {
              setStatus(payload.systemState);
            } else if (payload.machine) {
              setStatus(prev => prev ? { ...prev, machine: payload.machine } : null);
            }
          } else if (payload.type === 'diagnostics_update') {
            if (payload.diagnostics && status) {
              setStatus(prev => prev ? { ...prev, diagnostics: payload.diagnostics } : null);
            }
          }
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        setIsSseConnected(false);
      };
    } catch {
      setIsSseConnected(false);
    }

    // Polling interval as seamless backup
    const interval = setInterval(() => {
      fetchStatus();
      fetchLogs();
    }, 4000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [fetchStatus, fetchLogs, playDropSound]);

  // Action dispatcher to backend
  const handleControl = async (action: string, value?: unknown) => {
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, value })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Aktion fehlgeschlagen');
      }
      if (data.status) {
        setStatus(data.status);
      }
      
      if (action === 'start') showToast('Sortiervorgang gestartet', 'success');
      else if (action === 'pause') showToast('Anlage pausiert', 'info');
      else if (action === 'stop') showToast('Anlage gestoppt', 'info');
      else if (action === 'emergency_stop') showToast('NOT-AUS AKTIVIERT!', 'warn');
      else if (action === 'reset_emergency') showToast('Not-Aus zurückgesetzt', 'success');
      else if (action === 'reset_counts') showToast('Zähler auf 0 zurückgesetzt', 'info');
      else if (action === 'test_container') showToast(`Weiche angesteuert auf Behälter`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Senden des Befehls';
      showToast(msg, 'warn');
    }
  };

  // Update Rules via API
  const handleUpdateRules = async (newRules: SortingRule[]) => {
    try {
      const res = await fetch('/api/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRules)
      });
      if (!res.ok) throw new Error('Fehler beim Speichern der Regeln');
      showToast('Sortierregeln erfolgreich aktualisiert', 'success');
      await fetchStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Speichern';
      showToast(msg, 'warn');
    }
  };

  // Update Container config via API
  const handleSaveContainer = async (updated: ContainerConfig) => {
    if (!status) return;
    try {
      const updatedList = status.containers.map(c => c.id === updated.id ? updated : c);
      const res = await fetch('/api/containers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList)
      });
      if (!res.ok) throw new Error('Fehler beim Speichern des Behälters');
      showToast(`Behälter "${updated.name}" angepasst`, 'success');
      await fetchStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      showToast(msg, 'warn');
    }
  };

  // Simulate Ball
  const handleSimulateBall = async (ballData: { color: BallColor; diameterMm: number; quality: BallQuality }) => {
    try {
      const res = await fetch('/api/simulate-ball', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ballData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Simulation fehlgeschlagen');

      showToast(`Ball sortiert in: ${data.targetContainer?.name || 'Behälter'}`, 'success');
      await fetchStatus();
      await fetchLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      showToast(msg, 'warn');
    }
  };

  if (loading && !status) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-neutral-400">Verbinde mit Sortierapparat-API...</p>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-xl max-w-md w-full text-center space-y-3">
          <AlertCircle className="w-9 h-9 text-rose-400 mx-auto" />
          <h2 className="text-sm font-semibold text-neutral-100">Verbindungsfehler</h2>
          <p className="text-xs text-neutral-400">{error}</p>
          <button
            onClick={() => fetchStatus()}
            className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-neutral-950 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Floating Real-Time Ball Drop Alert Pill */}
      {liveBallAlert && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg shadow-xl border bg-neutral-900 text-neutral-100 border-neutral-700 text-xs font-mono font-semibold animate-in slide-in-from-top-2 duration-200">
          <span 
            className="w-2.5 h-2.5 rounded-full animate-ping" 
            style={{ backgroundColor: liveBallAlert.colorHex }} 
          />
          <span>+1 Ball: {liveBallAlert.name}</span>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-lg shadow-lg border text-xs font-medium animate-in slide-in-from-bottom-2 duration-200 bg-neutral-900 border-neutral-800 text-neutral-200">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          ) : toastMessage.type === 'warn' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-sky-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      {status && (
        <Header
          status={status}
          onControl={handleControl}
          onOpenSimModal={() => setIsSimModalOpen(true)}
          loading={loading}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-neutral-800 flex-wrap">
            <button
              onClick={() => setActiveTab('machine')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'machine'
                  ? 'bg-neutral-800 text-neutral-100 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Leitstand & Schieberegister</span>
              {isSseConnected && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" title="Live-Stream aktiv" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('hardware')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'hardware'
                  ? 'bg-neutral-800 text-neutral-100 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>Sensorik & I2C-Bus</span>
            </button>

            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'diagnostics'
                  ? 'bg-neutral-800 text-neutral-100 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Prüfung & Diagnose</span>
              {status?.diagnostics && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                  status.diagnostics.overallStatus === 'passed' 
                    ? 'bg-sky-950 text-sky-300 border border-sky-800' 
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {status.diagnostics.overallStatus === 'passed' ? 'PASSED' : 'CHECK'}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('testmatrix')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'testmatrix'
                  ? 'bg-neutral-800 text-neutral-100 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
              <span>NwT-Testmatrix</span>
              {status?.machine?.testMatrix && (
                <span className="text-[10px] bg-neutral-950 text-neutral-300 px-1.5 py-0.2 rounded border border-neutral-800 font-mono">
                  {status.machine.testMatrix.currentCycle}/100
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'api'
                  ? 'bg-neutral-800 text-neutral-100 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-sky-400" />
              <span>ESP32 REST-API</span>
            </button>

            <button
              id="tab_ki_prompt"
              onClick={() => setActiveTab('prompt')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'prompt'
                  ? 'bg-neutral-800 text-neutral-100 font-semibold ring-1 ring-sky-500/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              <span>KI-Prompt & System-Doku</span>
              <span className="text-[10px] bg-sky-950 text-sky-300 px-1.5 py-0.2 rounded border border-sky-800 font-mono font-semibold">
                AGENT
              </span>
            </button>
          </div>

          <div className="text-xs text-neutral-400 flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Radio className={`w-3.5 h-3.5 ${isSseConnected ? 'text-sky-400 animate-pulse' : 'text-neutral-500'}`} />
              <span className="hidden sm:inline">ESP32 Telemetrie:</span>
              <strong className={isSseConnected ? 'text-sky-400 font-mono' : 'text-neutral-400'}>
                {isSseConnected ? 'Live (SSE)' : 'Polling'}
              </strong>
            </span>
            <span className="text-neutral-700">|</span>
            <button
              onClick={() => {
                fetchStatus();
                fetchLogs();
                showToast('Daten synchronisiert', 'info');
              }}
              className="hover:text-neutral-200 flex items-center gap-1 transition-colors cursor-pointer"
              title="Manuell aktualisieren"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Tab Views */}
        {status && activeTab === 'machine' && (
          <MachineShiftRegisterView
            status={status}
            onRefresh={fetchStatus}
            showToast={showToast}
          />
        )}

        {status && activeTab === 'hardware' && (
          <HardwareCalibrationView
            status={status}
            onRefresh={fetchStatus}
            showToast={showToast}
          />
        )}

        {status && activeTab === 'diagnostics' && (
          <SystemDiagnosticsView
            status={status}
            onRefresh={fetchStatus}
            showToast={showToast}
          />
        )}

        {status && activeTab === 'testmatrix' && (
          <NwtTestMatrixView
            status={status}
            logs={logs}
            onRefresh={fetchStatus}
            showToast={showToast}
          />
        )}

        {status && activeTab === 'api' && (
          <Esp32ApiHub
            status={status}
            onRefresh={fetchStatus}
          />
        )}

        {status && activeTab === 'prompt' && (
          <AiAgentMasterPromptView
            status={status}
            onToggleTestMode={(enabled) => handleControl('toggle_test_mode')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-900/60 py-3 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-300">NwT Jahresarbeit 2026</span>
            <span>•</span>
            <span>Jacob Glathe • Tischtennisball-Sortieranlage</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] text-neutral-400">
              Test-Modus: {status?.testMode ? 'Aktiv (Simulation)' : 'Deaktiviert (Hardware-Ready)'} • ESP32 Ping: {status?.esp32.pingMs || 12} ms
            </span>
            <span className="text-sky-400 font-mono text-[11px]">PCA9685 @ 0x40 • TCS34725 @ 0x29</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SimulateBallModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        onSimulate={handleSimulateBall}
      />

      <ContainerModal
        container={editingContainer}
        isOpen={editingContainer !== null}
        onClose={() => setEditingContainer(null)}
        onSave={handleSaveContainer}
      />
    </div>
  );
}
