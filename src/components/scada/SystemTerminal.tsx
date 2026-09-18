import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  Trash2, 
  Download, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  ArrowDownCircle, 
  Check, 
  Copy 
} from 'lucide-react';
import type { LogPayload, LogLevel } from '../../types/scada.ts';

interface SystemTerminalProps {
  logs: LogPayload[];
  onClearLogs: () => void;
}

export const SystemTerminal: React.FC<SystemTerminalProps> = ({ logs, onClearLogs }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [selectedLevel, setSelectedLevel] = useState<'ALL' | LogLevel>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (autoScroll && !isCollapsed && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, isCollapsed]);

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = selectedLevel === 'ALL' || log.level === selectedLevel;
    const matchesSearch = searchQuery === '' || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.timestamp.includes(searchQuery);
    return matchesLevel && matchesSearch;
  });

  const exportAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `esp32_scada_logs_${new Date().toISOString().slice(0, 19)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportAsCsv = () => {
    const header = 'timestamp,level,message\n';
    const rows = logs
      .map((l) => `"${l.timestamp}","${l.level}","${l.message.replace(/"/g, '""')}"`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `esp32_scada_logs_${new Date().toISOString().slice(0, 19)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const copyAllToClipboard = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0D0E12] border border-[#1A1D24] rounded-lg overflow-hidden flex flex-col font-mono text-xs">
      {/* Terminal Toolbar */}
      <div className="bg-[#0A0B0E] border-b border-[#1A1D24] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-[#00FF88]" />
          <span className="font-bold text-[#E1E4EA] tracking-wider text-[11px] uppercase">
            LIVE-SYSTEM-TERMINAL // ESP32 EVENT-STREAM
          </span>
          <span className="text-[10px] text-[#626875] bg-[#111318] px-2 py-0.5 rounded border border-[#1A1D24]">
            {filteredLogs.length} / {logs.length} EREIGNISSE
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Level Filter Buttons */}
          <div className="flex items-center rounded bg-[#111318] border border-[#1A1D24] p-0.5 text-[10px]">
            {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  selectedLevel === lvl
                    ? lvl === 'ERROR'
                      ? 'bg-[#FF3B30] text-white font-bold'
                      : lvl === 'WARN'
                      ? 'bg-[#FF9500] text-[#050507] font-bold'
                      : 'bg-[#00FF88] text-[#050507] font-bold'
                    : 'text-[#626875] hover:text-[#E1E4EA]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Filter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#111318] border border-[#1A1D24] rounded px-2 py-1 text-[10px] text-[#E1E4EA] placeholder-[#626875] focus:outline-none focus:border-[#00FF88]/50 w-24 sm:w-32"
          />

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Autoscroll aktiv' : 'Autoscroll pausiert'}
            className={`p-1.5 rounded border text-[10px] cursor-pointer transition-colors ${
              autoScroll
                ? 'bg-[#00FF88]/10 border-[#00FF88]/40 text-[#00FF88]'
                : 'bg-[#111318] border-[#1A1D24] text-[#626875]'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
          </button>

          {/* Copy Button */}
          <button
            onClick={copyAllToClipboard}
            title="Alle Logs in Zwischenablage kopieren"
            className="p-1.5 rounded bg-[#111318] border border-[#1A1D24] text-[#626875] hover:text-[#E1E4EA] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00FF88]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Export JSON / CSV */}
          <div className="flex items-center gap-1">
            <button
              onClick={exportAsCsv}
              title="Als CSV exportieren"
              className="px-2 py-1 rounded bg-[#111318] border border-[#1A1D24] text-[#626875] hover:text-[#E1E4EA] text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>CSV</span>
            </button>
            <button
              onClick={exportAsJson}
              title="Als JSON exportieren"
              className="px-2 py-1 rounded bg-[#111318] border border-[#1A1D24] text-[#626875] hover:text-[#E1E4EA] text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>JSON</span>
            </button>
          </div>

          {/* Clear Logs */}
          <button
            onClick={onClearLogs}
            title="Logs leeren"
            className="p-1.5 rounded bg-[#111318] border border-[#1A1D24] text-[#626875] hover:text-[#FF3B30] hover:border-[#FF3B30]/40 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded bg-[#111318] border border-[#1A1D24] text-[#626875] hover:text-[#E1E4EA] transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      {!isCollapsed && (
        <div className="p-3 bg-[#050507] min-h-[160px] max-h-[280px] overflow-y-auto space-y-1 select-text">
          {filteredLogs.length === 0 ? (
            <div className="text-[#626875] text-[11px] italic py-8 text-center">
              Keine Ereignisse im aktuellen Filter vorhanden. Bereit für eingehende ESP32 Telemetrie...
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div
                key={log.id || index}
                className="flex items-start gap-2 text-[11px] leading-relaxed hover:bg-[#0D0E12] px-1 py-0.5 rounded transition-colors"
              >
                <span className="text-[#626875] shrink-0 select-none">
                  [{log.timestamp}]
                </span>

                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 uppercase ${
                    log.level === 'ERROR'
                      ? 'bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/40'
                      : log.level === 'WARN'
                      ? 'bg-[#FF9500]/20 text-[#FF9500] border border-[#FF9500]/40'
                      : 'bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30'
                  }`}
                >
                  {log.level}
                </span>

                <span
                  className={`break-all ${
                    log.level === 'ERROR'
                      ? 'text-[#FF5E54]'
                      : log.level === 'WARN'
                      ? 'text-[#FFB340]'
                      : 'text-[#E1E4EA]'
                  }`}
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      )}
    </div>
  );
};
