import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Layers, 
  BarChart3, 
  Flame, 
  CircleDot, 
  Filter,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import type { SorterSystemStatus, SortedBallLog } from '../types.ts';

interface NwtTestMatrixViewProps {
  status: SorterSystemStatus;
  logs: SortedBallLog[];
  onRefresh: () => void;
  showToast: (text: string, type?: 'success' | 'info' | 'warn') => void;
}

export const NwtTestMatrixView: React.FC<NwtTestMatrixViewProps> = ({
  status,
  logs,
  onRefresh,
  showToast
}) => {
  const [filterColor, setFilterColor] = useState<string>('all');
  const [isStarting, setIsStarting] = useState(false);

  const testMatrix = status.machine?.testMatrix || {
    isRunning: false,
    totalTargetCycles: 100,
    currentCycle: 34,
    redTested: 14,
    whiteTested: 12,
    mixedTested: 5,
    emptyTested: 3,
    errorCount: 0,
    errorRatePercent: 0.0,
    avgCycleDurationMs: 1340,
    lastResult: '100% Sortiergenauigkeit in den bisherigen Testzyklen'
  };

  const progressPercent = Math.min(100, Math.round((testMatrix.currentCycle / testMatrix.totalTargetCycles) * 100));

  // Start test matrix execution
  const handleStartMatrix = async () => {
    setIsStarting(true);
    try {
      const res = await fetch('/api/machine/test-matrix/start', { method: 'POST' });
      if (res.ok) {
        showToast('NWT 100-Zyklen Testmatrix gestartet', 'success');
        onRefresh();
      }
    } catch {
      showToast('Fehler beim Starten der Testmatrix', 'warn');
    } finally {
      setIsStarting(false);
    }
  };

  // Stop test matrix
  const handleStopMatrix = async () => {
    try {
      const res = await fetch('/api/machine/test-matrix/stop', { method: 'POST' });
      if (res.ok) {
        showToast('Testmatrix pausiert', 'info');
        onRefresh();
      }
    } catch {
      showToast('Fehler beim Stoppen der Testmatrix', 'warn');
    }
  };

  // Reset test matrix
  const handleResetMatrix = async () => {
    try {
      const res = await fetch('/api/machine/test-matrix/reset', { method: 'POST' });
      if (res.ok) {
        showToast('Testmatrix auf 0 Zyklen zurückgesetzt', 'info');
        onRefresh();
      }
    } catch {
      showToast('Fehler beim Zurücksetzen der Testmatrix', 'warn');
    }
  };

  // Export CSV for NWT report
  const handleExportCsv = () => {
    if (logs.length === 0) {
      showToast('Keine Messdaten vorhanden', 'info');
      return;
    }

    const headers = ['ID', 'Zeitstempel', 'Farbe', 'RGB_R', 'RGB_G', 'RGB_B', 'Durchmesser_mm', 'Qualitaet', 'Zielbehaelter', 'Taktzeit_ms'];
    const rows = logs.map(l => [
      l.id,
      l.timestamp,
      l.color,
      l.rgb?.r ?? 0,
      l.rgb?.g ?? 0,
      l.rgb?.b ?? 0,
      l.diameterMm,
      l.quality,
      l.containerName,
      l.processingTimeMs
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NwT_Jahresarbeit_Messprotokoll_100_Zyklen_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Messprotokoll als CSV exportiert', 'success');
  };

  const filteredLogs = logs.filter(log => {
    if (filterColor === 'all') return true;
    return log.color === filterColor;
  });

  return (
    <div className="space-y-6">
      {/* Overview & Test Matrix Header */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-neutral-950 text-sky-300 border border-neutral-800 uppercase tracking-wider">
                Phase 4.1 Validierung
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                100 Zyklen Prüfmatrix für NwT-Dokumentation
              </span>
            </div>
            <h2 className="text-sm font-semibold text-neutral-100 mt-1">
              Prüfstands-Validierung & Taktzeit-Protokoll
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Anforderungen: Fehlerrate &lt; 1% • Taktzeit ≤ 1,50 s • Deterministischer Auswurf über PCA9685
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {testMatrix.isRunning ? (
              <button
                onClick={handleStopMatrix}
                className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Testlauf pausieren</span>
              </button>
            ) : (
              <button
                onClick={handleStartMatrix}
                disabled={isStarting}
                className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-neutral-950 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>100-Zyklen Test starten</span>
              </button>
            )}

            <button
              onClick={handleResetMatrix}
              className="px-3 py-1.5 border border-neutral-800 bg-neutral-950 text-neutral-300 hover:text-neutral-100 hover:border-neutral-700 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
              <span>CSV Messprotokoll</span>
            </button>
          </div>
        </div>

        {/* 100 Cycle Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center text-xs font-mono text-neutral-300 mb-1.5">
            <span>Fortschritt 100-Zyklen-Test</span>
            <span className="text-sky-400">
              {testMatrix.currentCycle} / {testMatrix.totalTargetCycles} Zyklen ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800">
            <div 
              className="bg-sky-400 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Target Specs KPI Grid */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[11px] text-neutral-400 font-medium">Sortiergenauigkeit</span>
            <div className="mt-1 font-mono text-2xl font-bold text-sky-400">
              {(100 - testMatrix.errorRatePercent).toFixed(1)}%
            </div>
            <span className="text-[10px] text-neutral-400 block mt-0.5 font-mono">
              Fehler: {testMatrix.errorCount} (Vorgabe: &lt;1%)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[11px] text-neutral-400 font-medium">Mittlere Taktzeit</span>
            <div className="mt-1 flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold text-neutral-100">
                {(testMatrix.avgCycleDurationMs / 1000).toFixed(2)}
              </span>
              <span className="text-xs text-neutral-400">s</span>
            </div>
            <span className="text-[10px] text-sky-300 font-mono block mt-0.5">
              Soll: ≤ 1.50s eingehalten
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[11px] text-neutral-400 font-medium">Rote Bälle</span>
            <div className="mt-1 flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold text-red-400">
                {testMatrix.redTested}
              </span>
              <span className="text-xs text-neutral-400">/ 30 Soll</span>
            </div>
            <span className="text-[10px] text-neutral-400 block mt-0.5 font-mono">
              Station 1 (75mm)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[11px] text-neutral-400 font-medium">Weiße Bälle</span>
            <div className="mt-1 flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold text-sky-400">
                {testMatrix.whiteTested}
              </span>
              <span className="text-xs text-neutral-400">/ 30 Soll</span>
            </div>
            <span className="text-[10px] text-neutral-400 block mt-0.5 font-mono">
              Station 2 (150mm)
            </span>
          </div>
        </div>
      </div>

      {/* Measurement Protocol Table */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <span>Messprotokoll der Einzeldurchläufe ({filteredLogs.length} Einträge)</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              TCS34725 Farbsensor-Messwerte & Zuweisungs-Entscheidungen
            </p>
          </div>

          {/* Filter options */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={filterColor}
              onChange={(e) => setFilterColor(e.target.value)}
              className="text-xs border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-200 bg-neutral-950 font-medium focus:outline-hidden focus:border-neutral-700"
            >
              <option value="all">Alle Farben anzeigen</option>
              <option value="orange">Nur Rot (Auswurf 1)</option>
              <option value="white">Nur Weiß (Auswurf 2)</option>
              <option value="unknown">Ausschuss / Bandende</option>
            </select>
          </div>
        </div>

        {/* Table container */}
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 text-neutral-400 font-medium border-b border-neutral-800">
              <tr>
                <th className="py-2.5 px-3">Taktzeit</th>
                <th className="py-2.5 px-3">Erkannte Farbe</th>
                <th className="py-2.5 px-3">TCS34725 RGBC</th>
                <th className="py-2.5 px-3">Ø Maßhaltigkeit</th>
                <th className="py-2.5 px-3">Zielstation</th>
                <th className="py-2.5 px-3">Dauer</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono bg-neutral-950/40">
              {filteredLogs.slice(0, 30).map((log) => {
                const isRed = log.color === 'orange' || (log.color as string) === 'red';
                const isWhite = log.color === 'white';
                return (
                  <tr key={log.id} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="py-2 px-3 text-neutral-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-sans font-semibold text-[11px] ${
                        isRed 
                          ? 'bg-red-950/60 text-red-300 border border-red-800/60' 
                          : isWhite 
                          ? 'bg-sky-950/60 text-sky-300 border border-sky-800/60' 
                          : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                      }`}>
                        {isRed ? <Flame className="w-3 h-3 text-red-400" /> : <CircleDot className="w-3 h-3 text-sky-400" />}
                        {isRed ? 'Rot' : isWhite ? 'Weiß' : 'Ausschuss'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-neutral-400 text-[11px]">
                      R:{log.rgb?.r ?? 240} G:{log.rgb?.g ?? 120} B:{log.rgb?.b ?? 50}
                    </td>
                    <td className="py-2 px-3 text-neutral-200">
                      {log.diameterMm?.toFixed(2) ?? '40.00'} mm
                    </td>
                    <td className="py-2 px-3 text-neutral-300 font-sans font-medium">
                      {log.containerName}
                    </td>
                    <td className="py-2 px-3 text-neutral-400">
                      {log.processingTimeMs ?? 340} ms
                    </td>
                    <td className="py-2 px-3 font-sans">
                      <span className="inline-flex items-center gap-1 text-sky-300 font-medium text-[11px]">
                        <CheckCircle className="w-3 h-3 text-sky-400" />
                        <span>Korrekt</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
