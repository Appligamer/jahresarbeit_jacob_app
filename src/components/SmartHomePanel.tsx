import React, { useState } from 'react';
import { 
  Home, 
  Power, 
  Zap, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  Sliders, 
  ShieldAlert, 
  Clock, 
  Radio,
  Bell,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import type { SorterSystemStatus, SmartHomeAutomationConfig } from '../types.ts';

interface SmartHomePanelProps {
  status: SorterSystemStatus;
  onControl: (action: string, value?: unknown) => Promise<void>;
  onUpdateSmartHomeConfig: (autoHaltOnFull: boolean, automations: SmartHomeAutomationConfig[]) => Promise<void>;
}

export const SmartHomePanel: React.FC<SmartHomePanelProps> = ({
  status,
  onControl,
  onUpdateSmartHomeConfig
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<'ha' | 'webhooks' | 'apple' | 'mqtt'>('ha');

  const { smartHome, state, emergencyStop } = status;
  const isRunning = state === 'running';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleAutoHalt = async () => {
    await onUpdateSmartHomeConfig(!smartHome.autoHaltOnFull, smartHome.automations);
  };

  const handleToggleAutomation = async (id: string) => {
    const updated = smartHome.automations.map(a => 
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    await onUpdateSmartHomeConfig(smartHome.autoHaltOnFull, updated);
  };

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const startWebhookUrl = `${currentHost}/api/smarthome/action?action=start&caller=SmartHomeRemote`;
  const stopWebhookUrl = `${currentHost}/api/smarthome/action?action=pause&caller=SmartHomeRemote`;
  const eStopWebhookUrl = `${currentHost}/api/smarthome/action?action=emergency_stop&caller=SmartHomeRemote`;

  const homebridgeConfig = `{
  "accessory": "HTTP-SWITCH",
  "name": "Tischtennisball Sortierer",
  "switchHandling": "yes",
  "on_url": "${startWebhookUrl}",
  "off_url": "${stopWebhookUrl}",
  "status_url": "${currentHost}/api/smarthome/status",
  "status_on": "running"
}`;

  const mqttPayload = `// MQTT Discovery & State Topic (ESP32 / Broker)
Topic: homeassistant/sensor/nwt_ballsorter/state
Payload: {
  "state": "${state}",
  "total_balls": ${status.totalBalls},
  "balls_per_minute": ${status.ballsPerMinute},
  "emergency_stop": ${emergencyStop},
  "container_1": ${status.containers[0]?.count || 0},
  "container_2": ${status.containers[1]?.count || 0},
  "container_3": ${status.containers[2]?.count || 0},
  "container_4": ${status.containers[3]?.count || 0}
}`;

  return (
    <div className="space-y-6">
      {/* 1. Remote Master Control Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                Smart-Home Remote Control
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Letzter Befehl von: {smartHome.lastCommandFrom || 'Dashboard'}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Anlage aus der Ferne starten & anhalten
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Steuere den Tischtennisball-Sortierapparat über Home Assistant, Apple HomeKit oder mobile Webhook-Shortcuts direkt an.
            </p>
          </div>

          {/* Master Start / Halt Remote Buttons */}
          <div className="flex items-center gap-3">
            {isRunning ? (
              <button
                onClick={() => onControl('pause')}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                <Power className="w-5 h-5 text-slate-950" />
                <span>Sortierung pausieren</span>
              </button>
            ) : (
              <button
                onClick={() => onControl('start')}
                disabled={emergencyStop}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-95 disabled:opacity-40"
              >
                <Power className="w-5 h-5 text-slate-950" />
                <span>Sortierung starten</span>
              </button>
            )}

            <button
              onClick={() => onControl('emergency_stop')}
              className="px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm flex items-center gap-2 shadow-md transition-all active:scale-95"
              title="Sofortiger Not-Halt aus der Ferne"
            >
              <ShieldAlert className="w-5 h-5" />
              <span>Not-Aus</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Smart Home Automations & Safety Limits */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Smarte Schutz- & Automatisierungsregeln</h3>
              <p className="text-[11px] text-slate-500">Automatische Aktionen bei Füllständen oder Störungen</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Rule 1: Auto-Halt when container full */}
          <div className={`p-4 rounded-xl border transition-all ${
            smartHome.autoHaltOnFull 
              ? 'bg-blue-50/50 border-blue-200' 
              : 'bg-slate-50/60 border-slate-200 opacity-70'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Auto-Stopp bei Behälter-Voll</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hält Zuführung & Förderband an, wenn ein Behälter seine Kapazität erreicht.
                </p>
              </div>
              <input
                type="checkbox"
                checked={smartHome.autoHaltOnFull}
                onChange={handleToggleAutoHalt}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer mt-0.5"
              />
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700">
              <CheckCircle2 className="w-3 h-3" />
              {smartHome.autoHaltOnFull ? 'Aktiv (Schutz vor Überlauf)' : 'Deaktiviert'}
            </span>
          </div>

          {/* Rule 2: Defect Webhook */}
          {smartHome.automations.filter(a => a.id === 'defect_alert').map(a => (
            <div key={a.id} className={`p-4 rounded-xl border transition-all ${
              a.enabled ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50/60 border-slate-200 opacity-70'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Benachrichtigung bei Delle/Ausschuss</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sendet Push-Alarm an Home Assistant bei beschädigtem Ball.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={a.enabled}
                  onChange={() => handleToggleAutomation(a.id)}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer mt-0.5"
                />
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                <Bell className="w-3 h-3" />
                {a.lastTriggered ? `Zuletzt: ${new Date(a.lastTriggered).toLocaleTimeString('de-DE')}` : 'Bereit'}
              </span>
            </div>
          ))}

          {/* Rule 3: Inactivity sleep */}
          {smartHome.automations.filter(a => a.id === 'inactivity_sleep').map(a => (
            <div key={a.id} className={`p-4 rounded-xl border transition-all ${
              a.enabled ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/60 border-slate-200 opacity-70'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Energiesparmodus</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Schaltet Motoren nach 3 Minuten ohne Ballerkennung automatisch ab.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={a.enabled}
                  onChange={() => handleToggleAutomation(a.id)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer mt-0.5"
                />
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                <Clock className="w-3 h-3" />
                {a.enabled ? 'Aktiv (Auto Standby)' : 'Deaktiviert'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Platform Configuration & Webhooks */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Smart-Home Plattformen einbinden</h3>
              <p className="text-[11px] text-slate-500">Konfigurationen für gängige Systeme</p>
            </div>
          </div>

          {/* Platform Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActivePlatform('ha')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activePlatform === 'ha' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Home Assistant
            </button>
            <button
              onClick={() => setActivePlatform('webhooks')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activePlatform === 'webhooks' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              HTTP Webhooks
            </button>
            <button
              onClick={() => setActivePlatform('apple')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activePlatform === 'apple' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Apple HomeKit
            </button>
            <button
              onClick={() => setActivePlatform('mqtt')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activePlatform === 'mqtt' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              MQTT Broker
            </button>
          </div>
        </div>

        {/* Home Assistant Tab */}
        {activePlatform === 'ha' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-600">
              Füge folgenden Block in deine <code>configuration.yaml</code> in Home Assistant ein, um Zählerstände live auszulesen und Steuerungsbefehle zu senden:
            </p>
            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[320px] overflow-y-auto border border-slate-800">
{`# Home Assistant: Tischtennisball Sortieranlage
sensor:
  - platform: rest
    name: "Tischtennisball Sortierer"
    resource: "${currentHost}/api/smarthome/status"
    scan_interval: 2
    value_template: "{{ value_json.state }}"
    json_attributes_path: "$.attributes"
    json_attributes:
      - total_balls_sorted
      - balls_per_minute
      - container_1_count
      - container_2_count
      - container_3_count
      - container_4_count
      - emergency_stop

rest_command:
  sortierer_start:
    url: "${currentHost}/api/smarthome/action"
    method: POST
    headers:
      content-type: "application/json"
    payload: '{"action": "start", "caller": "Home Assistant Automation"}'

  sortierer_stop:
    url: "${currentHost}/api/smarthome/action"
    method: POST
    headers:
      content-type: "application/json"
    payload: '{"action": "pause", "caller": "Home Assistant Automation"}'`}
              </pre>
              <button
                onClick={() => copyToClipboard(`sensor:\n  - platform: rest\n    name: "Tischtennisball Sortierer"\n    resource: "${currentHost}/api/smarthome/status"`, 'ha_yaml')}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700"
              >
                {copiedKey === 'ha_yaml' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'ha_yaml' ? 'Kopiert' : 'Kopieren'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Webhooks Tab */}
        {activePlatform === 'webhooks' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-600">
              Direkte Webhook-URLs, die du in iOS-Kurzbefehlen, Android Tasker, IFTTT oder per Browser-Lesezeichen aufrufen kannst:
            </p>

            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 block">Start-Befehl Webhook</span>
                  <span className="font-mono text-[11px] text-slate-500 break-all">{startWebhookUrl}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onControl('start')}
                    className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                  >
                    Testen
                  </button>
                  <button
                    onClick={() => copyToClipboard(startWebhookUrl, 'wh_start')}
                    className="p-1.5 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-600"
                  >
                    {copiedKey === 'wh_start' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 block">Pause / Halt-Befehl Webhook</span>
                  <span className="font-mono text-[11px] text-slate-500 break-all">{stopWebhookUrl}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onControl('pause')}
                    className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                  >
                    Testen
                  </button>
                  <button
                    onClick={() => copyToClipboard(stopWebhookUrl, 'wh_stop')}
                    className="p-1.5 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-600"
                  >
                    {copiedKey === 'wh_stop' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 block">Not-Aus Webhook</span>
                  <span className="font-mono text-[11px] text-slate-500 break-all">{eStopWebhookUrl}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onControl('emergency_stop')}
                    className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
                  >
                    Testen
                  </button>
                  <button
                    onClick={() => copyToClipboard(eStopWebhookUrl, 'wh_estop')}
                    className="p-1.5 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-600"
                  >
                    {copiedKey === 'wh_estop' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Apple HomeKit Tab */}
        {activePlatform === 'apple' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-600">
              Über <strong>Homebridge</strong> oder Scrypted kannst du die Anlage direkt als Schalter in Apple Home (Siri, iPhone, Apple Watch) einbinden:
            </p>
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[260px] overflow-y-auto border border-slate-800">
              {homebridgeConfig}
            </pre>
            <button
              onClick={() => copyToClipboard(homebridgeConfig, 'hb_config')}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1 font-medium transition-colors"
            >
              {copiedKey === 'hb_config' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'hb_config' ? 'Kopiert!' : 'Homebridge JSON kopieren'}</span>
            </button>
          </div>
        )}

        {/* MQTT Tab */}
        {activePlatform === 'mqtt' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-600">
              MQTT Topic Struktur für Anbindung an Mosquitto Broker:
            </p>
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[260px] overflow-y-auto border border-slate-800">
              {mqttPayload}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
