import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  Trash2, 
  Copy, 
  Check, 
  Download, 
  AlertTriangle, 
  WifiOff, 
  ArrowDownCircle,
  Filter
} from 'lucide-react';
import type { ScadaLogItem, ClientConnectionStatus } from '../../types/scada.ts';

interface EventLogConsoleProps {
  logs: ScadaLogItem[];
  connectionStatus: ClientConnectionStatus;
  targetBaseUrl: string;
  onClearLogs: () => void;
  onRetryConnection: () => void;
}

export const EventLogConsole: React.FC<EventLogConsoleProps> = ({
  logs,
  connectionStatus,
  targetBaseUrl,
  onClearLogs,
  onRetryConnection,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | ScadaLogItem['type']>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((l) => {
    if (filterType === 'ALL') return true;
    return l.type === filterType;
  });

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.type}] ${l.message}${l.latencyMs ? ` (${l.latencyMs}ms)` : ''}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.type}] ${l.message}${l.latencyMs ? ` (${l.latencyMs}ms)` : ''}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scada_esp32_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <section id="scada_terminal_section" className="scada-panel w-full flex flex-col font-mono text-xs">
      
      {/* Offline Alert Banner */}
      {connectionStatus === 'OFFLINE' && (
        <div className="bg-[#ef4444]/20 border-b border-[#ef4444] px-4 py-2.5 flex items-center justify-between text-[#ef4444] font-semibold text-xs">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 animate-pulse" />
            <span>VERBINDUNG ZU ESP32 UNTERBROCHEN ({targetBaseUrl}) — ZYKLISCHE ABFRAGE LÄUFT WEITER</span>
          </div>
          <button
            type="button"
            onClick={onRetryConnection}
            className="px-2.5 py-1 bg-[#ef4444] text-white border border-red-300 uppercase text-[11px] font-bold cursor-pointer"
          >
            JETZT ERNEUT VERSUCHEN
          </button>
        </div>
      )}

      {/* Auth Error Banner */}
      {connectionStatus === 'AUTH_ERROR' && (
        <div className="bg-[#ef4444]/25 border-b border-[#ef4444] px-4 py-2.5 flex items-center justify-between text-white font-semibold text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
            <span>AUTHENTIFIZIERUNG FEHLGESCHLAGEN: HTTP 401 — Bitte API-Key in den Verbindungseinstellungen prüfen!</span>
          </div>
        </div>
      )}

      {/* Terminal Toolbar */}
      <div className="p-3 bg-[#090d16] border-b border-[#1e293b] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-[#10b981]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            SCADA-SYSTEMPROTOKOLL &amp; AUDIT-LOG
          </h3>
          <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 border border-slate-800">
            {filteredLogs.length} / {logs.length} Einträge
          </span>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Filter Pills */}
          <div className="flex items-center bg-[#050811] border border-[#1e293b] p-0.5">
            {(['ALL', 'CMD', 'ERROR', 'WARN', 'SYS'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-colors ${
                  filterType === t
                    ? t === 'ERROR'
                      ? 'bg-[#ef4444] text-white'
                      : t === 'WARN'
                      ? 'bg-[#f59e0b] text-black'
                      : t === 'CMD'
                      ? 'bg-[#10b981] text-black'
                      : 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Auto-Scroll Toggle */}
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 border text-xs cursor-pointer ${
              autoScroll
                ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                : 'bg-[#0b1120] border-[#1e293b] text-slate-500'
            }`}
            title={autoScroll ? 'Autoscroll aktiv' : 'Autoscroll pausiert'}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 bg-[#0b1120] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 cursor-pointer"
            title="Log in Zwischenablage kopieren"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExport}
            className="p-1.5 bg-[#0b1120] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 cursor-pointer"
            title="Als .log Datei herunterladen"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clear Logs */}
          <button
            type="button"
            onClick={onClearLogs}
            className="p-1.5 bg-[#0b1120] hover:bg-[#ef4444]/20 border border-[#1e293b] hover:border-[#ef4444] text-slate-400 hover:text-[#ef4444] cursor-pointer"
            title="Log leeren"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

        </div>
      </div>

      {/* Terminal Output Body */}
      <div className="p-3 bg-[#050811] min-h-[160px] max-h-[260px] overflow-y-auto space-y-1 select-text">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 text-xs py-8 text-center">
            Keine Protokoll-Einträge im gewählten Filter vorhanden.
          </div>
        ) : (
          filteredLogs.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2.5 text-[11px] leading-relaxed hover:bg-white/[0.02] px-2 py-0.5 border-b border-white/[0.02]"
            >
              <span className="text-slate-500 shrink-0 select-none">
                [{item.timestamp}]
              </span>

              {/* Tag */}
              <span
                className={`px-1.5 py-0.2 text-[9px] font-bold uppercase shrink-0 border ${
                  item.type === 'ERROR'
                    ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/40'
                    : item.type === 'WARN'
                    ? 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/40'
                    : item.type === 'CMD'
                    ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {item.type}
              </span>

              {/* Message */}
              <span
                className={`flex-1 break-all ${
                  item.type === 'ERROR'
                    ? 'text-red-300'
                    : item.type === 'WARN'
                    ? 'text-amber-200'
                    : item.type === 'CMD'
                    ? 'text-emerald-200 font-semibold'
                    : 'text-slate-300'
                }`}
              >
                {item.message}
              </span>

              {/* Latency Pill if present */}
              {item.latencyMs !== undefined && (
                <span className="text-[10px] text-slate-500 shrink-0">
                  {item.latencyMs}ms
                </span>
              )}
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </section>
  );
};
