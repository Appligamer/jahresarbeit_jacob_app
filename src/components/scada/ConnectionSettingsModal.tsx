import React, { useState } from 'react';
import { 
  X, 
  Wifi, 
  Server, 
  Check, 
  Radio, 
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import type { ConnectionConfig } from '../../types/scada.ts';

interface ConnectionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConnectionConfig;
  onSaveConfig: (newConfig: Partial<ConnectionConfig>) => void;
  onReconnect: () => void;
}

export const ConnectionSettingsModal: React.FC<ConnectionSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onReconnect,
}) => {
  const [host, setHost] = useState(config.host);
  const [port, setPort] = useState(String(config.port));
  const [path, setPath] = useState(config.path);
  const [protocol, setProtocol] = useState<'ws' | 'wss'>(config.protocol);
  const [autoReconnect, setAutoReconnect] = useState(config.autoReconnect);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      host: host.trim(),
      port: Number(port) || 80,
      path: path.trim().startsWith('/') ? path.trim() : `/${path.trim()}`,
      protocol,
      autoReconnect,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onReconnect();
      onClose();
    }, 400);
  };

  const applyPreset = (pHost: string, pPort: number, pPath: string, pProtocol: 'ws' | 'wss') => {
    setHost(pHost);
    setPort(String(pPort));
    setPath(pPath);
    setProtocol(pProtocol);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0D0E12] border border-[#1A1D24] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl font-mono">
        {/* Modal Header */}
        <div className="bg-[#0A0B0E] px-5 py-4 border-b border-[#1A1D24] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Wifi className="w-4 h-4 text-[#00FF88]" />
            <h3 className="text-sm font-bold text-[#E1E4EA] tracking-wider uppercase">
              ESP32 VERBINDUNGS-PARAMETER
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#626875] hover:text-[#E1E4EA] hover:bg-[#111318] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleApply} className="p-5 space-y-5">
          {/* Presets */}
          <div>
            <label className="block text-[10px] text-[#626875] uppercase mb-2 font-semibold">
              SCHNELL-VORGABEN (PRESETS):
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => applyPreset('192.168.4.1', 81, '/', 'ws')}
                className="p-2 text-left rounded bg-[#111318] border border-[#1A1D24] hover:border-[#00FF88]/40 hover:text-[#00FF88] transition-colors cursor-pointer"
              >
                <div className="font-bold text-[#E1E4EA]">ESP32 Access Point</div>
                <div className="text-[10px] text-[#626875]">192.168.4.1:81 /</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1', typeof window !== 'undefined' && window.location.port ? Number(window.location.port) : 3000, '/ws', typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws')}
                className="p-2 text-left rounded bg-[#111318] border border-[#1A1D24] hover:border-[#00FF88]/40 hover:text-[#00FF88] transition-colors cursor-pointer"
              >
                <div className="font-bold text-[#E1E4EA]">Lokaler Web-Gateway</div>
                <div className="text-[10px] text-[#626875]">Server Host:Port /ws</div>
              </button>
            </div>
          </div>

          {/* Host / IP Input */}
          <div>
            <label className="block text-xs text-[#E1E4EA] mb-1 font-medium">
              ESP32 IP-Adresse oder Hostname:
            </label>
            <input
              type="text"
              required
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="z.B. 192.168.178.50 oder esp32.local"
              className="w-full bg-[#111318] border border-[#1A1D24] focus:border-[#00FF88] rounded p-2.5 text-xs text-[#E1E4EA] font-mono focus:outline-none"
            />
          </div>

          {/* Port and Path */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#E1E4EA] mb-1 font-medium">
                WebSocket Port:
              </label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="81"
                className="w-full bg-[#111318] border border-[#1A1D24] focus:border-[#00FF88] rounded p-2.5 text-xs text-[#E1E4EA] font-mono focus:outline-none"
              />
              <span className="text-[10px] text-[#626875] mt-0.5 block">Standard: 81 oder 80</span>
            </div>

            <div>
              <label className="block text-xs text-[#E1E4EA] mb-1 font-medium">
                WebSocket Pfad:
              </label>
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/ws"
                className="w-full bg-[#111318] border border-[#1A1D24] focus:border-[#00FF88] rounded p-2.5 text-xs text-[#E1E4EA] font-mono focus:outline-none"
              />
              <span className="text-[10px] text-[#626875] mt-0.5 block">z.B. / oder /ws</span>
            </div>
          </div>

          {/* Protocol & Auto-Reconnect */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs text-[#E1E4EA] mb-1 font-medium">
                Protokoll:
              </label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as 'ws' | 'wss')}
                className="w-full bg-[#111318] border border-[#1A1D24] focus:border-[#00FF88] rounded p-2 text-xs text-[#E1E4EA] font-mono focus:outline-none"
              >
                <option value="ws">ws:// (Unverschlüsselt, Standard LAN)</option>
                <option value="wss">wss:// (TLS Verschlüsselt)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="autoReconnect"
                checked={autoReconnect}
                onChange={(e) => setAutoReconnect(e.target.checked)}
                className="rounded bg-[#111318] border-[#1A1D24] text-[#00FF88] focus:ring-0 cursor-pointer accent-[#00FF88]"
              />
              <label htmlFor="autoReconnect" className="text-xs text-[#E1E4EA] cursor-pointer">
                Auto-Reconnect bei Abbruch
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-[#1A1D24] pt-4 flex items-center justify-between">
            <div className="text-[11px] text-[#626875]">
              Vollständige Latenzen &lt; 20 ms
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded bg-[#111318] border border-[#1A1D24] text-[#626875] hover:text-[#E1E4EA] text-xs font-semibold cursor-pointer"
              >
                Abbrechen
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded bg-[#00FF88] text-[#050507] font-bold text-xs uppercase flex items-center gap-1.5 hover:bg-[#00FF88]/90 transition-colors cursor-pointer shadow-md"
              >
                {savedSuccess ? <Check className="w-4 h-4" /> : null}
                <span>Speichern & Verbinden</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
