import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Trash2, 
  Filter, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ListFilter
} from 'lucide-react';
import type { SortedBallLog, ContainerConfig } from '../types.ts';

interface SortLogsTableProps {
  logs: SortedBallLog[];
  containers: ContainerConfig[];
  onClearLogs: () => Promise<void>;
}

export const SortLogsTable: React.FC<SortLogsTableProps> = ({ 
  logs, 
  containers, 
  onClearLogs 
}) => {
  const [selectedContainer, setSelectedContainer] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter(log => {
    const matchesContainer = selectedContainer === 'all' || log.containerId === selectedContainer;
    const matchesSearch = searchQuery === '' || 
      log.matchedRuleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.containerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.color.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesContainer && matchesSearch;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
      {/* Table Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Echtzeit-Sortierprotokoll & Messdaten</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chronologisches Messdaten-Protokoll der Sensorik (Farberkennung, Durchmesser & Zielbehälter).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* CSV Export Button for NwT Paper */}
          <a
            href="/api/logs/export"
            download="nwt_tischtennisball_sortierprotokoll.csv"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            title="Daten als CSV herunterladen (für Tabellenkalkulation / Diagramme im NwT-Bericht)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV Exportieren</span>
          </a>

          {/* Clear Logs */}
          <button
            onClick={() => {
              if (confirm('Möchtest du das gesamte Messprotokoll leeren?')) {
                onClearLogs();
              }
            }}
            disabled={logs.length === 0}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Leeren</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ListFilter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedContainer}
            onChange={(e) => setSelectedContainer(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:border-blue-500"
          >
            <option value="all">Alle Behälter ({logs.length})</option>
            {containers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Suche nach Regel, Farbe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 text-slate-700"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200/80 rounded-xl overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
            <tr>
              <th className="py-2.5 px-3">Uhrzeit</th>
              <th className="py-2.5 px-3">Erkannte Farbe</th>
              <th className="py-2.5 px-3">Durchmesser</th>
              <th className="py-2.5 px-3">Qualität</th>
              <th className="py-2.5 px-3">Zielbehälter</th>
              <th className="py-2.5 px-3">Angewandte Regel</th>
              <th className="py-2.5 px-3 text-right">Laufzeit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                  Keine Messungen protokolliert. Starte die Anlage oder klicke oben auf &bdquo;Ball testen&ldquo;.
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => {
                const date = new Date(log.timestamp);
                const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {timeStr}
                    </td>

                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block shrink-0 shadow-2xs"
                          style={{ backgroundColor: `rgb(${log.rgb.r}, ${log.rgb.g}, ${log.rgb.b})` }}
                        />
                        <span className="font-semibold capitalize">
                          {log.color === 'white' ? 'Weiß' : log.color === 'orange' ? 'Orange' : 'Unbekannt'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          ({log.rgb.r},{log.rgb.g},{log.rgb.b})
                        </span>
                      </div>
                    </td>

                    <td className="py-2 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {log.diameterMm} mm
                    </td>

                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 w-fit ${
                        log.quality === 'good'
                          ? 'bg-emerald-50 text-emerald-700'
                          : log.quality === 'training'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {log.quality === 'good' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> 3-Sterne
                          </>
                        ) : log.quality === 'training' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Training
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" /> Ausschuss
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-2 px-3 font-medium text-slate-900 whitespace-nowrap">
                      {log.containerName}
                    </td>

                    <td className="py-2 px-3 text-slate-600 truncate max-w-xs">
                      {log.matchedRuleName}
                    </td>

                    <td className="py-2 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                      {log.processingTimeMs} ms
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
