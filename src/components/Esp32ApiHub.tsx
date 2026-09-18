import React, { useState } from 'react';
import { 
  Code, 
  Terminal, 
  Send, 
  Copy, 
  Check, 
  Server, 
  Home, 
  Wifi, 
  Cpu, 
  ExternalLink,
  BookOpen
} from 'lucide-react';
import type { SorterSystemStatus } from '../types.ts';

interface Esp32ApiHubProps {
  status: SorterSystemStatus;
  onRefresh: () => void;
}

export const Esp32ApiHub: React.FC<Esp32ApiHubProps> = ({ status, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'api_docs' | 'arduino_code' | 'smarthome' | 'api_tester'>('api_docs');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // API Tester state
  const [testEndpoint, setTestEndpoint] = useState<string>('/api/esp32/ball-sorted');
  const [testPayload, setTestPayload] = useState<string>(
    JSON.stringify({
      color: 'white',
      rgb: { r: 246, g: 247, b: 249 },
      diameterMm: 40.05,
      quality: 'good',
      durationMs: 380
    }, null, 2)
  );
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunApiTest = async () => {
    setTestLoading(true);
    setTestResponse(null);
    try {
      const res = await fetch(testEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: testPayload
      });
      const data = await res.json();
      setTestResponse(JSON.stringify({ status: res.status, ok: res.ok, data }, null, 2));
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verbindungsfehler';
      setTestResponse(JSON.stringify({ error: msg }, null, 2));
    } finally {
      setTestLoading(false);
    }
  };

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const arduinoCode = `/*
 * NwT Jahresarbeit: Tischtennisball-Sortierapparat mit ESP32
 * HTTP Client Anbindung an das Web-Dashboard
 *
 * Benötigte Bibliotheken:
 * - ArduinoJson (v6 oder v7)
 * - ESP32Servo / PCA9685 I2C
 * - Adafruit_TCS34725 (Farbsensor)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_TCS34725.h>

// --- WLAN Konfiguration ---
const char* ssid     = "DEIN_WLAN_NAME";
const char* password = "DEIN_WLAN_PASSWORT";

// Dashboard Server URL
const String serverUrl = "${currentHost}";

// Hardware Pinouts
#define STEPPER_STEP_PIN 26
#define STEPPER_DIR_PIN  27
#define STEPPER_EN_PIN   25
#define LIMIT_SWITCH_PIN 34
#define SENSOR_LED_PIN   14

Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);

unsigned long lastHeartbeat = 0;
const unsigned long heartbeatInterval = 5000;

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22, 400000); // SDA 21, SCL 22 @ 400kHz Fast-Mode

  pinMode(STEPPER_STEP_PIN, OUTPUT);
  pinMode(STEPPER_DIR_PIN, OUTPUT);
  pinMode(STEPPER_EN_PIN, OUTPUT);
  pinMode(LIMIT_SWITCH_PIN, INPUT_PULLUP);
  pinMode(SENSOR_LED_PIN, OUTPUT);
  digitalWrite(SENSOR_LED_PIN, HIGH);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.println("\\nWiFi verbunden. IP: " + WiFi.localIP().toString());
}

void loop() {
  if (millis() - lastHeartbeat > heartbeatInterval) {
    lastHeartbeat = millis();
    sendHeartbeat();
  }
}

void sendHeartbeat() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl + "/api/esp32/heartbeat");
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["ip"] = WiFi.localIP().toString();
    doc["rssi"] = WiFi.RSSI();
    doc["freeHeap"] = ESP.getFreeHeap();
    doc["uptime"] = millis() / 1000;
    doc["firmwareVersion"] = "v2.5.0-NwT";

    String requestBody;
    serializeJson(doc, requestBody);
    http.POST(requestBody);
    http.end();
  }
}`;

  const homeAssistantYaml = `# Home Assistant configuration.yaml
# Einbindung des NwT Tischtennisball-Sortierapparats

sensor:
  - platform: rest
    name: "Tischtennisball Sortierer Status"
    resource: "${currentHost}/api/smarthome/status"
    scan_interval: 5
    value_template: "{{ value_json.state }}"
    json_attributes_path: "$.attributes"
    json_attributes:
      - total_balls_sorted
      - balls_per_minute
      - container_1_count
      - container_2_count
      - container_3_count
      - emergency_stop
      - esp32_connected

rest_command:
  tischtennis_start:
    url: "${currentHost}/api/smarthome/action"
    method: POST
    headers:
      content-type: "application/json"
    payload: '{"action": "start", "caller": "Home Assistant"}'

  tischtennis_stop:
    url: "${currentHost}/api/smarthome/action"
    method: POST
    headers:
      content-type: "application/json"
    payload: '{"action": "stop", "caller": "Home Assistant"}'

  tischtennis_not_aus:
    url: "${currentHost}/api/smarthome/action"
    method: POST
    headers:
      content-type: "application/json"
    payload: '{"action": "emergency_stop", "caller": "Home Assistant"}'`;

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 shadow-xs p-5 space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-neutral-950 text-sky-400 border border-neutral-800">
              <Server className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-neutral-100">ESP32 Hardware-API & Smart-Home Schnittstelle</h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            REST-API für Mikrocontroller, Home Assistant Webhooks und IoT-Automatisierung.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg text-xs border border-neutral-800">
          <button
            onClick={() => setActiveTab('api_docs')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              activeTab === 'api_docs' ? 'bg-neutral-800 text-neutral-100 font-medium' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            API Endpunkte
          </button>
          <button
            onClick={() => setActiveTab('api_tester')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              activeTab === 'api_tester' ? 'bg-neutral-800 text-neutral-100 font-medium' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Live-Tester
          </button>
          <button
            onClick={() => setActiveTab('arduino_code')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              activeTab === 'arduino_code' ? 'bg-neutral-800 text-neutral-100 font-medium' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            ESP32 Code (.ino)
          </button>
          <button
            onClick={() => setActiveTab('smarthome')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              activeTab === 'smarthome' ? 'bg-neutral-800 text-neutral-100 font-medium' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Smart-Home (YAML)
          </button>
        </div>
      </div>

      {/* Tab 1: API Documentation */}
      {activeTab === 'api_docs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Endpoint 1 */}
            <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-950 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono font-semibold bg-sky-950/60 text-sky-300 border border-sky-500/30 text-[10px]">
                  POST
                </span>
                <span className="font-mono text-[11px] text-neutral-300 font-semibold">/api/esp32/ball-sorted</span>
              </div>
              <p className="text-neutral-400">
                Wird vom ESP32 aufgerufen, sobald eine Kugel vermessen wurde. Weist Zielbehälter und Servowinkel zu.
              </p>
              <div className="bg-neutral-900 text-neutral-300 p-2.5 rounded font-mono text-[11px] overflow-x-auto border border-neutral-800">
                <span className="text-neutral-500">// Request Payload (ESP32 -&gt; Server)</span><br />
                {`{ "color": "white", "diameterMm": 40.02, "rgb": {"r":245,"g":248,"b":250} }`}
              </div>
            </div>

            {/* Endpoint 2 */}
            <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-950 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono font-semibold bg-neutral-900 text-neutral-300 border border-neutral-700 text-[10px]">
                  GET
                </span>
                <span className="font-mono text-[11px] text-neutral-300 font-semibold">/api/esp32/config</span>
              </div>
              <p className="text-neutral-400">
                Wird beim Booten des ESP32 abgerufen. Liefert Weichenpositionen und Kalibrierungsfaktoren.
              </p>
              <div className="bg-neutral-900 text-neutral-300 p-2.5 rounded font-mono text-[11px] overflow-x-auto border border-neutral-800">
                <span className="text-neutral-500">// Response (Server -&gt; ESP32)</span><br />
                {`{ "servoAngles": {"container_1": 30, "container_2": 75}, "conveyorSpeed": 75 }`}
              </div>
            </div>

            {/* Endpoint 3 */}
            <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-950 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono font-semibold bg-sky-950/60 text-sky-300 border border-sky-500/30 text-[10px]">
                  POST
                </span>
                <span className="font-mono text-[11px] text-neutral-300 font-semibold">/api/esp32/heartbeat</span>
              </div>
              <p className="text-neutral-400">
                Regelmäßiger Keepalive-Ping des ESP32 mit WLAN RSSI Signalstärke, freiem RAM (Heap) und Uptime.
              </p>
              <div className="bg-neutral-900 text-neutral-300 p-2.5 rounded font-mono text-[11px] overflow-x-auto border border-neutral-800">
                <span className="text-neutral-500">// Telemetrie Ping</span><br />
                {`{ "ip": "192.168.178.64", "rssi": -64, "freeHeap": 182400, "uptime": 1420 }`}
              </div>
            </div>

            {/* Endpoint 4 */}
            <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-950 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono font-semibold bg-neutral-900 text-sky-300 border border-neutral-700 text-[10px]">
                  REST
                </span>
                <span className="font-mono text-[11px] text-neutral-300 font-semibold">/api/smarthome/status</span>
              </div>
              <p className="text-neutral-400">
                Smart-Home Sensor-Schnittstelle für Home Assistant, OpenHAB oder ioBroker. Liefert Zählerstände.
              </p>
              <div className="bg-neutral-900 text-neutral-300 p-2.5 rounded font-mono text-[11px] overflow-x-auto border border-neutral-800">
                <span className="text-neutral-500">// Home Assistant REST Sensor</span><br />
                {`{ "state": "running", "attributes": { "total_balls_sorted": 65 } }`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Live API Tester */}
      {activeTab === 'api_tester' && (
        <div className="space-y-3 text-xs">
          <p className="text-neutral-400">
            Hier kannst du testen, wie der physische ESP32 oder eine Smart-Home-Automatisierung Daten per HTTP an die API sendet:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-neutral-200 font-semibold">Ziel-Endpunkt</label>
              <select
                value={testEndpoint}
                onChange={e => setTestEndpoint(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-200 font-mono text-xs focus:outline-hidden focus:border-neutral-700"
              >
                <option value="/api/esp32/ball-sorted">POST /api/esp32/ball-sorted (Ball erfassen)</option>
                <option value="/api/esp32/heartbeat">POST /api/esp32/heartbeat (ESP32 Ping)</option>
                <option value="/api/smarthome/action">POST /api/smarthome/action (Smart-Home Befehl)</option>
              </select>

              <label className="block text-neutral-200 font-semibold mt-2">JSON Request Body</label>
              <textarea
                rows={7}
                value={testPayload}
                onChange={e => setTestPayload(e.target.value)}
                className="w-full p-2.5 rounded-lg font-mono text-[11px] bg-neutral-950 text-sky-300 border border-neutral-800 focus:outline-hidden focus:border-neutral-700"
              />

              <button
                onClick={handleRunApiTest}
                disabled={testLoading}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-neutral-950 font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testLoading ? 'Sende...' : 'API Request absenden'}</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-neutral-200 font-semibold">HTTP Antwort der API</label>
              <pre className="h-[210px] p-2.5 rounded-lg font-mono text-[11px] bg-neutral-950 text-neutral-300 border border-neutral-800 overflow-y-auto">
                {testResponse || '// Klicke auf "API Request absenden", um die Server-Antwort zu sehen'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: ESP32 Arduino C++ Code */}
      {activeTab === 'arduino_code' && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <p className="text-neutral-400">
              Vollständiger Arduino-Sketch für den ESP32 mit Live-URL konfiguriert:
            </p>
            <button
              onClick={() => copyToClipboard(arduinoCode, 'arduino')}
              className="px-3 py-1 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              {copiedKey === 'arduino' ? <Check className="w-3.5 h-3.5 text-sky-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'arduino' ? 'Kopiert!' : 'Code kopieren'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-neutral-950 text-neutral-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[420px] overflow-y-auto border border-neutral-800">
            {arduinoCode}
          </pre>
        </div>
      )}

      {/* Tab 4: Smart-Home YAML */}
      {activeTab === 'smarthome' && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <p className="text-neutral-400">
              Home Assistant / YAML Konfiguration für Sensoren und Steuerungs-Befehle:
            </p>
            <button
              onClick={() => copyToClipboard(homeAssistantYaml, 'yaml')}
              className="px-3 py-1 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              {copiedKey === 'yaml' ? <Check className="w-3.5 h-3.5 text-sky-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'yaml' ? 'Kopiert!' : 'YAML kopieren'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-neutral-950 text-neutral-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[380px] overflow-y-auto border border-neutral-800">
            {homeAssistantYaml}
          </pre>
        </div>
      )}
    </div>
  );
};
