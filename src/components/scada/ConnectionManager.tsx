import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Key, 
  RotateCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap, 
  Save,
  Radio,
  Wifi,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { ClientConnectionStatus, Esp32Config } from '../../types/scada.ts';

interface ConnectionManagerProps {
  connectionStatus: ClientConnectionStatus;
  latencyMs: number | null;
  lastHeartbeat: Date | null;
  config: Esp32Config;
  mixedContentWarning: string | null;
  onUpdateConfig: (newCfg: Partial<Esp32Config>) => void;
  onReconnect: () => void;
  onConfigureWifi: (ssid: string, pass: string) => Promise<boolean>;
}

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  connectionStatus,
  latencyMs,
  lastHeartbeat,
  config,
  mixedContentWarning,
  onUpdateConfig,
  onReconnect,
  onConfigureWifi,
}) => {
  const [hostInput, setHostInput] = useState<string>(config.baseUrl);
  const [keyInput, setKeyInput] = useState<string>(config.apiKey);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  // WLAN NVS-Flash Formular State
  const [isWifiPanelOpen, setIsWifiPanelOpen] = useState<boolean>(false);
  const [wifiSsid, setWifiSsid] = useState<string>('');
  const [wifiPass, setWifiPass] = useState<string>('');
  const [wifiSending, setWifiSending] = useState<boolean>(false);
  const [wifiFeedback, setWifiFeedback] = useState<string | null>(null);

  useEffect(() => {
    setHostInput(config.baseUrl);
  }, [config.baseUrl]);

  useEffect(() => {
    setKeyInput(config.apiKey);
  }, [config.apiKey]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      baseUrl: hostInput.trim(),
      apiKey: keyInput.trim(),
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const setPreset = (url: string) => {
    setHostInput(url);
    onUpdateConfig({ baseUrl: url });
  };

  const handleWifiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wifiSsid.trim()) return;
    setWifiSending(true);
    setWifiFeedback(null);
    const success = await onConfigureWifi(wifiSsid.trim(), wifiPass);
    setWifiSending(false);
    if (success) {
      setWifiFeedback('WLAN IM FLASH GESPEICHERT - CONTROLLER STARTET NEU');
      setTimeout(() => setWifiFeedback(null), 8000);
    } else {
      setWifiFeedback('UEBERTRAGUNG FEHLGESCHLAGEN');
      setTimeout(() => setWifiFeedback(null), 4000);
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'ONLINE':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-[#10b981]/15 border border-[#10b981] text-[#10b981] text-xs font-bold uppercase tracking-wider font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
            <span>STATUS: ONLINE</span>
          </div>
        );
      case 'VERBINDE...':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-[#f59e0b]/15 border border-[#f59e0b] text-[#f59e0b] text-xs font-bold uppercase tracking-wider font-mono">
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
            <span>STATUS: VERBINDE...</span>
          </div>
        );
      case 'FEHLER':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-[#ef4444]/15 border border-[#ef4444] text-[#ef4444] text-xs font-bold uppercase tracking-wider font-mono">
            <XCircle className="w-3.5 h-3.5" />
            <span>STATUS: FEHLER</span>
          </div>
        );
      case 'GETRENNT':
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 border border-slate-600 text-slate-400 text-xs font-bold uppercase tracking-wider font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span>STATUS: GETRENNT</span>
          </div>
        );
    }
  };

  return (
    <section id="scada_connection_manager" className="scada-panel p-4 sm:p-5 w-full">
      {/* Kopfbereich */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1e293b]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#1e293b] border border-[#334155] flex items-center justify-center text-[#10b981]">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-wider uppercase font-mono">
              VERBINDUNGSVERWALTUNG (CONTROLLER COMMUNICATION)
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Single-Endpoint REST Schnittstelle: /api (Tischtennisball-Farbsortieranlage)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge()}
          {latencyMs !== null && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#0b1120] border border-[#1e293b] text-xs font-mono text-slate-300">
              <Zap className="w-3 h-3 text-[#10b981]" />
              <span>{latencyMs} ms RTT</span>
            </div>
          )}
          {lastHeartbeat && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#0b1120] border border-[#1e293b] text-[11px] font-mono text-slate-400">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Letzter Beat: {lastHeartbeat.toLocaleTimeString('de-DE')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Formular fuer Host und Key */}
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4 items-end font-mono">
        <div className="md:col-span-6">
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span>ESP32 Host / Basis-URL</span>
          </label>
          <input
            type="text"
            id="input_esp32_host"
            value={hostInput}
            onChange={(e) => setHostInput(e.target.value)}
            placeholder="http://192.168.2.95 oder https://tunnel.meinedomain.de"
            className="w-full bg-[#070b14] border border-[#1e293b] focus:border-[#10b981] text-slate-100 text-xs px-3 py-2.5 outline-none tracking-wide font-mono"
            required
          />
        </div>

        <div className="md:col-span-4">
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-slate-400" />
            <span>API-Key (?key=... / X-API-Key)</span>
          </label>
          <input
            type="text"
            id="input_esp32_key"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="NWT-2026-SORT-X79"
            className="w-full bg-[#070b14] border border-[#1e293b] focus:border-[#10b981] text-slate-100 text-xs px-3 py-2.5 outline-none tracking-wide font-mono"
            required
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-2">
          <button
            type="submit"
            id="btn_save_connection"
            className="scada-btn flex-1 py-2.5 bg-[#10b981] hover:bg-[#059669] text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            title="Einstellungen sichern und Ziel-URL uebernehmen"
          >
            {savedFeedback ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedFeedback ? 'GESICHERT' : 'SPEICHERN'}</span>
          </button>

          <button
            type="button"
            id="btn_reconnect_now"
            onClick={onReconnect}
            className="scada-btn px-3 py-2.5 bg-[#0f172a] hover:bg-[#1e293b] border border-[#334155] text-slate-200 text-xs flex items-center justify-center cursor-pointer"
            title="Verbindung sofort abfragen"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Preset-Buttons gemaess Vorgabe */}
      <div className="mt-3 pt-2.5 border-t border-[#1e293b] flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 uppercase">Betriebsmodi:</span>
          
          <button
            type="button"
            id="preset_btn_wlan_home"
            onClick={() => setPreset('http://192.168.2.95')}
            className="px-2.5 py-1 bg-[#0b1120] hover:bg-[#1e293b] border border-[#10b981]/50 text-[#10b981] font-bold cursor-pointer transition-colors"
          >
            Heim-WLAN: http://192.168.2.95
          </button>

          <button
            type="button"
            id="preset_btn_ap_mode"
            onClick={() => setPreset('http://192.168.4.1')}
            className="px-2.5 py-1 bg-[#0b1120] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 cursor-pointer transition-colors"
          >
            AP-Modus: http://192.168.4.1
          </button>

          <button
            type="button"
            id="preset_btn_https_tunnel"
            onClick={() => setPreset('https://sortieranlage.local')}
            className="px-2.5 py-1 bg-[#0b1120] hover:bg-[#1e293b] border border-sky-600/50 text-sky-400 font-semibold cursor-pointer transition-colors"
            title="HTTPS-Tunnel Reverse Proxy fuer Cloud-Betrieb"
          >
            HTTPS-Tunnel (Heimserver)
          </button>
        </div>

        <button
          type="button"
          id="btn_toggle_wifi_panel"
          onClick={() => setIsWifiPanelOpen(!isWifiPanelOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0f172a] hover:bg-[#1e293b] border border-[#334155] text-slate-300 text-xs cursor-pointer font-mono"
        >
          <Wifi className="w-3.5 h-3.5 text-[#10b981]" />
          <span>WLAN-FLASH-KONFIGURATION</span>
          {isWifiPanelOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* WLAN-Flash-Konfigurationspanel */}
      {isWifiPanelOpen && (
        <div id="scada_wifi_flash_drawer" className="mt-3 p-4 bg-[#070b14] border border-[#334155] font-mono">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1e293b]">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-[#10b981]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                ESP32 WLAN-DATEN IM NVS-FLASH SPEICHERN (SET_WIFI)
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">
              Befehl: cmd=SET_WIFI&amp;ssid=...&amp;pass=...
            </span>
          </div>

          <form onSubmit={handleWifiSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 flex items-center gap-1">
                <Wifi className="w-3 h-3 text-slate-400" />
                <span>SSID (WLAN-Name)</span>
              </label>
              <input
                type="text"
                id="input_wifi_ssid"
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                placeholder="z. B. FRITZ!Box 7590"
                className="w-full bg-[#050811] border border-[#1e293b] focus:border-[#10b981] text-slate-100 text-xs px-3 py-2 outline-none font-mono"
                required
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>WPA2 / WPA3 Passwort</span>
              </label>
              <input
                type="password"
                id="input_wifi_pass"
                value={wifiPass}
                onChange={(e) => setWifiPass(e.target.value)}
                placeholder="WLAN-Schluessel"
                className="w-full bg-[#050811] border border-[#1e293b] focus:border-[#10b981] text-slate-100 text-xs px-3 py-2 outline-none font-mono"
              />
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                id="btn_submit_wifi_flash"
                disabled={wifiSending || !wifiSsid.trim()}
                className={`scada-btn w-full py-2 bg-[#10b981] hover:bg-[#059669] text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                  wifiSending ? 'opacity-50 cursor-wait' : ''
                }`}
              >
                {wifiSending ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{wifiSending ? 'UEBERTRAGE...' : 'WLAN IM FLASH SPEICHERN & REBOOT'}</span>
              </button>
            </div>
          </form>

          {wifiFeedback && (
            <div className="mt-2.5 p-2 bg-[#10b981]/15 border border-[#10b981] text-[#10b981] text-xs font-mono font-bold">
              {wifiFeedback}
            </div>
          )}

          <p className="mt-2 text-[10px] text-slate-400 leading-relaxed">
            Hinweis: Nach erfolgreicher Uebertragung speichert die ESP32-Firmware SSID und Passwort im internen NVS-Flash und fuehrt einen automatischen Neustart durch. Anschliessend bucht sich der Controller in das angegebene WLAN ein.
          </p>
        </div>
      )}

      {/* Permanentes Mixed-Content-Warnbanner */}
      {mixedContentWarning && (
        <div id="mixed_content_alert" className="mt-3 p-3 bg-[#ef4444]/15 border-l-4 border-[#ef4444] text-slate-200 text-xs font-mono">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#ef4444] uppercase tracking-wide">
                DIAGNOSEMELDUNG: BROWSER-BLOCKADE DURCH HTTPS (MIXED-CONTENT / PNA)
              </p>
              <p className="mt-1 text-slate-300 leading-relaxed">
                {mixedContentWarning}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
