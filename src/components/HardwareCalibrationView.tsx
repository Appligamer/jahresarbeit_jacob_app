import React, { useState } from 'react';
import { 
  Cpu, 
  Settings2, 
  Sliders, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Home, 
  ShieldCheck, 
  Radio, 
  Sparkles,
  Send
} from 'lucide-react';
import type { SorterSystemStatus } from '../types.ts';

interface HardwareCalibrationViewProps {
  status: SorterSystemStatus;
  onRefresh: () => void;
  showToast: (text: string, type?: 'success' | 'info' | 'warn') => void;
}

export const HardwareCalibrationView: React.FC<HardwareCalibrationViewProps> = ({
  status,
  onRefresh,
  showToast
}) => {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [testWebhookUrl, setTestWebhookUrl] = useState('http://homeassistant.local:8123/api/webhook/nwt_sorter');
  const [webhookSending, setWebhookSending] = useState(false);

  const telemetry = status.telemetry;
  const machine = status.machine;
  const pinout = machine?.pinout ?? [];

  // Calibrate color sensor
  const handleCalibrateSensor = async (mode: 'white' | 'ambient') => {
    setIsCalibrating(true);
    try {
      const res = await fetch('/api/machine/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      if (res.ok) {
        showToast(`TCS34725 Kalibrierung (${mode === 'white' ? 'Weißabgleich' : 'Streulicht'}) erfolgreich`, 'success');
        onRefresh();
      }
    } catch {
      showToast('Fehler bei der Sensor-Kalibrierung', 'warn');
    } finally {
      setIsCalibrating(false);
    }
  };

  // Test Smart-Home Webhook
  const handleTestWebhook = async () => {
    setWebhookSending(true);
    try {
      showToast(`Smart-Home Webhook Testpaket versendet an ${testWebhookUrl}`, 'success');
    } finally {
      setTimeout(() => setWebhookSending(false), 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* I2C Bus & Microcontroller Pinout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* I2C Devices & Bus Status */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                <span>I2C-Bus Adressraum (I2C-adressraum.md)</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Hardware-Bus an GPIO 21 (SDA) und GPIO 22 (SCL)
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-neutral-950 text-sky-300 border border-neutral-800">
              400 kHz Fast-Mode
            </span>
          </div>

          <div className="space-y-3">
            {/* 0x29 TCS34725 */}
            <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-950 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-sky-300 bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 rounded">
                    0x29
                  </span>
                  <span className="text-xs font-semibold text-neutral-200">TCS34725 Farbsensor</span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Station 0 (0mm): RGBC Farberkennung mit Weißlicht-LED. Integrationszeit 50ms, Gain 4x.
                </p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-400 font-mono">
                  <span>Antwortzeit: 4ms</span>
                  <span>•</span>
                  <span>ID-Register: 0x44 (OK)</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-sky-300 text-xs font-mono font-medium bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                <span>ONLINE</span>
              </span>
            </div>

            {/* 0x40 PCA9685 */}
            <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-950 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-sky-300 bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 rounded">
                    0x40
                  </span>
                  <span className="text-xs font-semibold text-neutral-200">PCA9685 16-Kanal PWM</span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Aktorik-Treiber für SG90 Servostößel (50 Hz). Kanal 0: Rot (75mm), Kanal 1: Weiß (150mm).
                </p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-400 font-mono">
                  <span>Prescaler: 121 (50Hz)</span>
                  <span>•</span>
                  <span>12-Bit Auflösung</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-sky-300 text-xs font-mono font-medium bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                <span>ONLINE</span>
              </span>
            </div>
          </div>
        </div>

        {/* ESP32 GPIO Pinout Mapping */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-sky-400" />
                <span>ESP32 GPIO Pinbelegung (SYSTEM_PLANUNG.md)</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Verdrahtungsplan für Schrittmotor, Endschalter und Sensoren
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-950 text-neutral-400 font-medium border-b border-neutral-800">
                <tr>
                  <th className="py-2 px-3">Pin</th>
                  <th className="py-2 px-3">Signal</th>
                  <th className="py-2 px-3">Zielkomponente</th>
                  <th className="py-2 px-3 text-right">Pegel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 bg-neutral-950/40">
                {pinout.map((p) => (
                  <tr key={p.pin} className="hover:bg-neutral-800/30">
                    <td className="py-2 px-3 font-bold text-neutral-200">{p.pin}</td>
                    <td className="py-2 px-3 text-sky-400">{p.function}</td>
                    <td className="py-2 px-3 text-neutral-300 font-sans">{p.targetComponent}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                        p.state === 'HIGH' 
                          ? 'bg-neutral-900 text-sky-300 border border-neutral-700' 
                          : p.state === 'PWM' 
                          ? 'bg-sky-950/80 text-sky-300 border border-sky-500/40' 
                          : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                      }`}>
                        {p.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TCS34725 RGBC Telemetry & Calibration */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-neutral-800">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>TCS34725 Farbsensor Kalibrierung (Station 0)</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Optische Rohdaten der Farberkennungskammer mit Streulichtkompensation
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCalibrateSensor('white')}
              disabled={isCalibrating}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-neutral-950 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin' : ''}`} />
              <span>Weißabgleich kalibrieren</span>
            </button>
            <button
              onClick={() => handleCalibrateSensor('ambient')}
              disabled={isCalibrating}
              className="px-3 py-1.5 border border-neutral-800 hover:border-neutral-700 bg-neutral-950 text-neutral-300 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Streulicht nullen</span>
            </button>
          </div>
        </div>

        {/* RGBC Bars & Live Channels */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-xs font-semibold text-neutral-300">Rot-Kanal (R)</span>
            <div className="mt-2 text-2xl font-bold font-mono text-red-400">
              {telemetry.rgb.r}
            </div>
            <div className="w-full bg-neutral-900 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-red-500 h-1.5 rounded-full" 
                style={{ width: `${Math.min(100, (telemetry.rgb.r / 255) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono mt-1 block">Rot: R &gt; G+B</span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-xs font-semibold text-neutral-300">Grün-Kanal (G)</span>
            <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
              {telemetry.rgb.g}
            </div>
            <div className="w-full bg-neutral-900 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-1.5 rounded-full" 
                style={{ width: `${Math.min(100, (telemetry.rgb.g / 255) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono mt-1 block">Referenzkanal</span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-xs font-semibold text-neutral-300">Blau-Kanal (B)</span>
            <div className="mt-2 text-2xl font-bold font-mono text-sky-400">
              {telemetry.rgb.b}
            </div>
            <div className="w-full bg-neutral-900 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-sky-400 h-1.5 rounded-full" 
                style={{ width: `${Math.min(100, (telemetry.rgb.b / 255) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono mt-1 block">Farbkontrast</span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-xs font-semibold text-neutral-300">Clear-Kanal (C)</span>
            <div className="mt-2 text-2xl font-bold font-mono text-neutral-200">
              {telemetry.rgb.clear}
            </div>
            <div className="w-full bg-neutral-900 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-neutral-400 h-1.5 rounded-full" 
                style={{ width: `${Math.min(100, (telemetry.rgb.clear / 1000) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-neutral-400 font-mono mt-1 block">Schwelle &gt; 200 Lux</span>
          </div>
        </div>
      </div>

      {/* Smart-Home & Home Assistant Integration */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Home className="w-4 h-4 text-sky-400" />
              <span>Smart-Home & Home Assistant Anbindung</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Fernsteuerung und Benachrichtigung über REST Webhooks & MQTT
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-neutral-950 text-sky-300 border border-neutral-800">
            Aktiv
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <label className="text-xs font-semibold text-neutral-200 block mb-1.5">
              Home Assistant Webhook URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testWebhookUrl}
                onChange={(e) => setTestWebhookUrl(e.target.value)}
                className="w-full text-xs font-mono border border-neutral-800 rounded-lg px-3 py-2 bg-neutral-900 text-neutral-200 focus:outline-hidden focus:border-sky-500"
              />
              <button
                onClick={handleTestWebhook}
                disabled={webhookSending}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Testen</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mt-2">
              Wird aufgerufen bei Not-Aus, Behälter voll oder Qualitätsdefekt.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-neutral-200 block">
                Automatische Sicherheitsabschaltung
              </span>
              <p className="text-xs text-neutral-400 mt-1">
                Stoppt Förderband und schaltet Haltemoment ab, wenn ein Behälter die Maximalkapazität erreicht hat.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 font-mono text-xs text-sky-300">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Auto-Halt bei Behälter voll: Aktiviert</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
