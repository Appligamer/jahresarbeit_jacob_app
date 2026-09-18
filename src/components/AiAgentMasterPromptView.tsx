import React, { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Cpu, 
  Layers, 
  ShieldAlert, 
  FileText, 
  Sparkles, 
  Code2, 
  Workflow, 
  Server, 
  Radio, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
import type { SorterSystemStatus } from '../types.ts';

interface AiAgentMasterPromptViewProps {
  status: SorterSystemStatus | null;
  onToggleTestMode: (enabled: boolean) => void;
}

export const AiAgentMasterPromptView: React.FC<AiAgentMasterPromptViewProps> = ({ 
  status,
  onToggleTestMode 
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activePromptTab, setActivePromptTab] = useState<'all' | 'architecture' | 'firmware' | 'api' | 'launch'>('all');

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2500);
  };

  const FULL_MASTER_PROMPT = `# MASTER SYSTEM PROMPT & ARCHITEKTUR-SPEZIFIKATION
## NwT-Jahresarbeit 2026: Vollautomatischer Tischtennisball-Sortierapparat
**Entwickler / Urheber:** Jacob Glathe
**System-Status:** Startbereit für GitHub-Release & Physische Inbetriebnahme
**Zielgruppe dieses Prompts:** Autonome KI-Codierungs- & Engineering-Agenten

---

### 1. PROJEKTÜBERSICHT & ZWECK
Dieses System ist ein industrietauglicher mechatronischer Tischtennisball-Sortierapparat mit optischer Farberkennung und deterministischem 5-Phasen-Schieberegister.
Die Anlage transportiert genormte Tischtennisbälle (Ø 40,0 mm, Gewicht 2,7 g) über ein 450 mm langes Taktband im exakten 75 mm Raster.
Ein TCS34725 Farbsensor erfasst jeden Ball an Station 0 (0 mm). Die Farb- und Qualitätsdaten werden in ein hardware-synchronisiertes Schieberegister (FIFO) eingetragen.
An den Stationen 1 (75 mm) und 2 (150 mm) werfen SG90 Servostößel (über einen PCA9685 12-Bit PWM-Treiber) rote bzw. weiße Bälle berührungslos in Auffangbehälter aus.
Ausschuss- oder ungeprüfte Bälle fallen am Bandende (Station 3, 225-450 mm) in die Auffangwanne.

---

### 2. ELEKTRONIK & HARDWARE-STECKBRIEF (PINOUT & BUSSE)
- **Mikrocontroller:** ESP32 NodeMCU (240 MHz Dual-Core Tensilica LX6, 520 kB SRAM, 4 MB Flash)
- **I2C-Bus (400 kHz Fast-Mode):**
  * SDA: GPIO 21 (mit externem 4.7 kΩ Pull-Up)
  * SCL: GPIO 22 (mit externem 4.7 kΩ Pull-Up)
- **I2C Peripherie-Adressen:**
  * \`0x29\`: Adafruit TCS34725 RGBC Farbsensor mit IR-Sperrfilter und integrierter neutralweißer Messkammer-LED
  * \`0x40\`: Adafruit PCA9685 16-Kanal 12-Bit PWM Servo-Treiber (50 Hz Grundfrequenz)
- **Schrittmotor-Antrieb:**
  * Motor: NEMA 17 Bipolar (1.8° Schrittwinkel, 200 Schritte/Umdrehung)
  * Treiber: Trinamic TMC2209 SilentStepStick im 1/16 Microstepping-Modus
  * STEP-Pin: GPIO 26
  * DIR-Pin: GPIO 27 (HIGH = Vorwärts / Transportrichtung)
  * ENABLE-Pin: GPIO 25 (Active-LOW, im Betrieb auf LOW gezogen)
- **Sensorik & Endschalter:**
  * Optischer Referenz-Endschalter (Homing): GPIO 34 (Hardware-Interrupt mit internem Pull-Up)
  * Messkammer-LED Schalttransistor: GPIO 33
- **Spannungsversorgung:**
  * 12V DC Netzteil (3A): Speist TMC2209 VMOT und NEMA 17 Motor
  * 5V DC Step-Down-Regler (UBEC 3A): Speist PCA9685 V+ (Servostrom) und ESP32 VIN
  * Gemeinsame Masse (Common GND) zwingend zwischen 12V, 5V und ESP32 GND verbunden!

---

### 3. MECHANISCHE KINEMATIK & 75mm RASTER
- **Bandlänge gesamt:** 450 mm
- **Rastermaß pro Zyklus:** Exakt 75,0 mm Wegstrecke
- **Stationen:**
  * **Station 0 (0 mm - Tasche 0):** Einlauf-Trichter, Ball-Zuführung & TCS34725 Farbmesskammer
  * **Station 1 (75 mm - Tasche 1):** Auswurfstößel 1 für ROTE Bälle (PCA9685 Kanal 0, SG90 Servo mit 25 mm Querhub)
  * **Station 2 (150 mm - Tasche 2):** Auswurfstößel 2 für WEISSE Bälle (PCA9685 Kanal 1, SG90 Servo mit 25 mm Querhub)
  * **Station 3 (225 mm - 450 mm - Tasche 3):** Bandabwurf / Ausschussbehälter (für defekte, verformte oder ungeprüfte Bälle)

---

### 4. DER DETERMINISTISCHE 5-PHASEN TAKTZYKLUS
Ein vollständiger Taktzyklus dauert exakt 1,28 s (Soll-Vorgabe laut NwT-Pflichtenheft: ≤ 1,50 s):
1. **Phase 1: Transport (260 ms):** NEMA 17 taktet das Band um exakt 75 mm vorwärts (TMC2209 STEP-Pulsrampe).
2. **Phase 2: Schieberegister-Shift (40 ms):** Das virtuelle Shift-Register schiebt alle Daten weiter:
   - Tasche 2 ➔ Tasche 3 (Abwurf)
   - Tasche 1 ➔ Tasche 2
   - Tasche 0 ➔ Tasche 1
   - Tasche 0 wird geleert für Neumessung
3. **Phase 3: Messung & Erkennung (220 ms):** TCS34725 misst R-, G-, B- und Clear-Werte. Erkennungsalgorithmus klassifiziert den Ball (Rot / Weiß / Ausschuss / Leer).
4. **Phase 4: Selektiver Auswurf (250 ms):** 
   - Befindet sich in Tasche 1 ein roter Ball: SG90 auf PCA9685 Kanal 0 fährt von 0° auf 90° und zurück (Hub 25 mm).
   - Befindet sich in Tasche 2 ein weißer Ball: SG90 auf PCA9685 Kanal 1 fährt von 0° auf 90° und zurück.
5. **Phase 5: Ruhelage & Vorbereitung (510 ms):** Alle Aktoren in Nullstellung, Freigabe für nächsten Takt.

---

### 5. HARDWARE-ENFORCEMENT (LAUNCH-READY MODUS VS. TESTMODUS)
**WICHTIG für alle Agenten:**
- **Standard-Modus (testMode = false):**
  * Die Anlage verhält sich wie ein echtes Industrie-System.
  * Wenn kein physischer ESP32 mit der REST-API verbunden ist (kein Heartbeat via POST /api/esp32/heartbeat), werden Aktionen wie "Takt ausführen", "Automatik starten", "Ball einlegen", "Testmatrix starten" und "Referenzfahrt" **strikt verweigert (HTTP 503 Service Unavailable)**.
  * Das System faked oder simuliert im Produktionsmodus niemals fälschlicherweise Hardware-Aktionen.
  * In der Systemprüfung (Diagnostics) fallen alle 7 Hardware-Checks mit exakten Fehlerberichten durch (ESP32 Timeout, I2C NACK auf 0x29 & 0x40, TMC2209 offline).
- **Test-Modus (testMode = true):**
  * Kann oben im Header über den Schalter "Test-Modus" oder via API (\`POST /api/testmode { "enabled": true }\`) aktiviert werden.
  * Schaltet die vollständige Software-Simulation ein, sodass die gesamte Anlage ohne Hardware auf dem Bildschirm trocken vorgeführt werden kann.

---

### 6. REST-API SPEZIFIKATION
Die Web-Applikation läuft auf Port 3000 und stellt folgende Endpunkte bereit:
- \`GET /api/status\`: Liefert vollständigen \`systemState\` (Maschinenstatus, Schieberegister, ESP32 Telemetrie, Behälter, Regeln).
- \`POST /api/control\`: Führt Steuerbefehle aus (\`start\`, \`pause\`, \`stop\`, \`emergency_stop\`, \`reset_emergency\`, \`reset_counts\`, \`toggle_test_mode\`).
- \`POST /api/testmode\`: Schaltet Testmodus explizit um (\`{ "enabled": boolean }\`).
- \`POST /api/machine/step\`: Führt 1 Einzeltakt (75 mm) aus.
- \`POST /api/machine/auto\`: Schaltet Automatik-Taktbetrieb ein/aus.
- \`POST /api/machine/homing\`: Startet Referenzfahrt auf optischen Endschalter (GPIO 34).
- \`POST /api/machine/feed\`: Legt Ball in Tasche 0 ein.
- \`POST /api/machine/test-matrix/start\`: Startet die 100-Zyklen NwT-Validierungsmatrix.
- \`POST /api/machine/calibrate\`: Weißabgleich für TCS34725 Farbsensor.
- \`GET /api/diagnostics\`: Führt 7 Hardware-Diagnosetests durch.
- \`GET /api/stream\`: Server-Sent Events (SSE) für latenzfreie Echtzeit-Aktualisierung des Dashboards.

#### ESP32 Hardware-Schnittstelle:
- \`POST /api/esp32/heartbeat\`: ESP32 sendet alle 2 Sekunden IP, RSSI, Free Heap, Uptime.
- \`POST /api/esp32/ball-entered\`: Meldet Ballankunft an der Einlauf-Lichtschranke.
- \`POST /api/esp32/ball-sorted\`: Meldet quittierte Auswürfe.
- \`POST /api/esp32/telemetry\`: Sendet rohe TCS34725 RGBC-Werte.

---

### 7. ESP32 ARDUINO C++ FIRMWARE-STRUKTUR
\`\`\`cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_TCS34725.h>
#include <Adafruit_PWMServoDriver.h>

#define PIN_STEP 26
#define PIN_DIR 27
#define PIN_ENABLE 25
#define PIN_LIMIT 34
#define PIN_LED 33

const char* ssid = "DEIN_WLAN";
const char* password = "DEIN_PASSWORT";
const char* serverUrl = "http://192.168.178.50:3000";

Adafruit_TCS34725 tcs(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver(0x40);

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22, 400000); // 400 kHz Fast-Mode
  
  pinMode(PIN_STEP, OUTPUT);
  pinMode(PIN_DIR, OUTPUT);
  pinMode(PIN_ENABLE, OUTPUT);
  digitalWrite(PIN_ENABLE, LOW); // TMC2209 aktivieren
  pinMode(PIN_LIMIT, INPUT_PULLUP);
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  
  tcs.begin();
  pwm.begin();
  pwm.setPWMFreq(50); // 50 Hz für SG90 Servos
}

void advanceOneStep75mm() {
  digitalWrite(PIN_DIR, HIGH);
  for (int i = 0; i < 800; i++) { // 1/16 Microstepping Ramp
    digitalWrite(PIN_STEP, HIGH);
    delayMicroseconds(320);
    digitalWrite(PIN_STEP, LOW);
    delayMicroseconds(320);
  }
}
\`\`\`

---

### 8. ANWEISUNGEN FÜR WEITERARBEITENDE KI-AGENTEN
1. **Kein KI-Slop:** Behalte das dunkle, präzise Industrie-Design (grau, schwarz, weiße Typografie mit hellblauen Akzenten) bei. Keine bunten Farbverläufe, kein Spielzeug-Design.
2. **Hardware-Ehrlichkeit:** Wenn der Testmodus ausgeschaltet ist und kein physischer ESP32 sendet, darf die App niemals so tun, als ob echte Motoren drehen. Fehler 503 ist das korrekte Verhalten.
3. **GitHub-Bereitschaft:** Das Repository muss direkt geklont, mit \`npm install\` gebaut und mit \`npm run build\` fehlerfrei kompiliert werden können.
4. **Dokumentation:** Alle Schwellenwerte, Pin-Belegungen und Taktzeiten im Code müssen strikt mit dieser Spezifikation synchron bleiben.
`;

  return (
    <div id="ai_master_prompt_container" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sky-400">
                <Terminal className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-100 tracking-tight">
                KI-Agenten Master-Prompt & Technische Gesamtdokumentation
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-3xl">
              Dieser Reiter enthält die vollständige, lückenlose technische Spezifikation des Tischtennisball-Sortierapparats (NwT 2026, Jacob Glathe).
              Kopiere diesen Prompt mit einem Klick, um ihn in jeden KI-Agenten oder Copilot einzufügen – er enthält Pinouts, I2C-Adressen, 5-Phasen-Taktlogik, REST-API und Hardware-Schutzregeln.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="copy_all_master_prompt_btn"
              onClick={() => copyToClipboard(FULL_MASTER_PROMPT, 'all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                copiedSection === 'all'
                  ? 'bg-sky-500 text-neutral-950 ring-2 ring-sky-400/50'
                  : 'bg-sky-400 hover:bg-sky-300 text-neutral-950 font-bold'
              }`}
            >
              {copiedSection === 'all' ? (
                <>
                  <Check className="w-4 h-4 text-neutral-950" />
                  <span>Vollständiger Prompt kopiert!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-neutral-950" />
                  <span>Gesamten Prompt kopieren</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="mt-5 pt-4 border-t border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 block text-[11px]">Hardware-Modus:</span>
            <span className="font-semibold text-neutral-200 flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${status?.testMode ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              {status?.testMode ? 'Test-Modus aktiv' : 'Launch-Ready (Strikt)'}
            </span>
          </div>

          <div className="bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 block text-[11px]">ESP32 Verbindung:</span>
            <span className="font-semibold text-neutral-200 flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${status?.esp32.connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {status?.esp32.connected ? 'Verbunden' : 'Offline (Fehler bei Start)'}
            </span>
          </div>

          <div className="bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 block text-[11px]">Taktzyklus Sollwert:</span>
            <span className="font-semibold text-sky-400 font-mono mt-0.5 block">
              1,28 s (NwT ≤ 1,50 s)
            </span>
          </div>

          <div className="bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 block text-[11px]">GitHub Release Status:</span>
            <span className="font-semibold text-neutral-200 flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
              Startklar & Clean
            </span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Pills */}
      <div className="flex items-center gap-1.5 border-b border-neutral-800 pb-2 flex-wrap">
        <button
          onClick={() => setActivePromptTab('all')}
          className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
            activePromptTab === 'all'
              ? 'bg-neutral-800 text-neutral-100 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Alle Informationen (Kompakt)
        </button>
        <button
          onClick={() => setActivePromptTab('architecture')}
          className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
            activePromptTab === 'architecture'
              ? 'bg-neutral-800 text-neutral-100 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Pinout & Hardware
        </button>
        <button
          onClick={() => setActivePromptTab('firmware')}
          className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
            activePromptTab === 'firmware'
              ? 'bg-neutral-800 text-neutral-100 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          ESP32 Firmware
        </button>
        <button
          onClick={() => setActivePromptTab('api')}
          className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
            activePromptTab === 'api'
              ? 'bg-neutral-800 text-neutral-100 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          REST-API Endpunkte
        </button>
        <button
          onClick={() => setActivePromptTab('launch')}
          className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
            activePromptTab === 'launch'
              ? 'bg-neutral-800 text-neutral-100 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Hardware-Schutz & Testmodus
        </button>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-4">
        {/* Section 1: Mechanical & Electronic Specs */}
        {(activePromptTab === 'all' || activePromptTab === 'architecture') && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-neutral-200">
                  1. Mechanik, Pinbelegung & I2C-Peripherie
                </h3>
              </div>
              <button
                onClick={() => copyToClipboard(
`### HARDWARE-STECKBRIEF (PINOUT & BUSSE)
- ESP32 Dual-Core (240 MHz, 520 kB SRAM)
- I2C (400 kHz): SDA=GPIO 21, SCL=GPIO 22
- 0x29: TCS34725 RGBC Farbsensor (Station 0 @ 0mm)
- 0x40: PCA9685 16-Ch 12-Bit PWM (SG90 Servos)
- NEMA 17 Stepper + TMC2209: STEP=GPIO 26, DIR=GPIO 27, EN=GPIO 25
- Endschalter Homing: GPIO 34 (Pull-Up)
- Messkammer-LED: GPIO 33
- Bandlänge: 450 mm | Raster: 75 mm
- Station 0: Einlauf & Sensor (0mm)
- Station 1: Auswurf Rot (75mm - PCA9685 Ch 0)
- Station 2: Auswurf Weiß (150mm - PCA9685 Ch 1)
- Station 3: Abwurf / Ausschuss (225-450mm)`,
                  'pinout'
                )}
                className="text-xs text-neutral-400 hover:text-sky-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedSection === 'pinout' ? <Check className="w-3.5 h-3.5 text-sky-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Abschnitt kopieren</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-neutral-300">
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 font-mono space-y-1.5">
                <div className="text-sky-400 font-semibold mb-1">I2C & GPIO Pinbelegung:</div>
                <div><span className="text-neutral-500">I2C SDA:</span> GPIO 21 (mit 4.7k Pull-Up)</div>
                <div><span className="text-neutral-500">I2C SCL:</span> GPIO 22 (mit 4.7k Pull-Up)</div>
                <div><span className="text-neutral-500">I2C 0x29:</span> Adafruit TCS34725 RGBC Sensor</div>
                <div><span className="text-neutral-500">I2C 0x40:</span> PCA9685 12-Bit PWM Servotreiber</div>
                <div><span className="text-neutral-500">STEP-Pin:</span> GPIO 26 (TMC2209 Schrittimpuls)</div>
                <div><span className="text-neutral-500">DIR-Pin:</span> GPIO 27 (HIGH = Vorwärts)</div>
                <div><span className="text-neutral-500">ENABLE:</span> GPIO 25 (Active-LOW)</div>
                <div><span className="text-neutral-500">HOMING:</span> GPIO 34 (Optischer Endschalter)</div>
              </div>

              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 font-mono space-y-1.5">
                <div className="text-sky-400 font-semibold mb-1">Geometrie & Stationen:</div>
                <div><span className="text-neutral-500">Bandlänge:</span> 450 mm Gesamtlänge</div>
                <div><span className="text-neutral-500">Schrittraster:</span> 75,0 mm Weg pro Takt</div>
                <div><span className="text-neutral-500">Station 0 (0mm):</span> Einlauf-Trichter & Farbsensor</div>
                <div><span className="text-neutral-500">Station 1 (75mm):</span> Auswurf ROTE Bälle (PCA9685 Ch 0)</div>
                <div><span className="text-neutral-500">Station 2 (150mm):</span> Auswurf WEISSE Bälle (PCA9685 Ch 1)</div>
                <div><span className="text-neutral-500">Station 3 (225mm):</span> Bandende / Ausschusswanne</div>
                <div><span className="text-neutral-500">Ball-Norm:</span> ITTF 40.0 mm (±0.05 mm), 2.7 g</div>
                <div><span className="text-neutral-500">Hub Stößel:</span> 25 mm Querhub spielfrei</div>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: 5-Phase Deterministic Sequence */}
        {(activePromptTab === 'all' || activePromptTab === 'architecture') && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-neutral-200">
                  2. Deterministischer 5-Phasen-Taktzyklus (1,28 s Gesamtzeit)
                </h3>
              </div>
              <button
                onClick={() => copyToClipboard(
`### 5-PHASEN TAKTZYKLUS (1,28 s):
1. Phase 1 (260 ms) - Transport: NEMA 17 dreht Band 75 mm vorwärts
2. Phase 2 (40 ms)  - Shift: Virtuelles Schieberegister schiebt Taschen [2]->[3], [1]->[2], [0]->[1]
3. Phase 3 (220 ms) - Messung: TCS34725 erfasst RGBC an Station 0 (0mm)
4. Phase 4 (250 ms) - Auswurf: SG90 Stößel wirft passenden Ball aus (Rot @ 75mm, Weiß @ 150mm)
5. Phase 5 (510 ms) - Ruhelage: Aktoren in Grundstellung, Zyklus abgeschlossen`,
                  'timing'
                )}
                className="text-xs text-neutral-400 hover:text-sky-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedSection === 'timing' ? <Check className="w-3.5 h-3.5 text-sky-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Timing kopieren</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                <span className="text-sky-400 font-semibold block text-[11px]">Phase 1 (260 ms)</span>
                <span className="font-bold text-neutral-200 mt-1 block">Band-Vorschub</span>
                <p className="text-neutral-400 text-[11px] mt-1">75 mm Schrittmotor-Fahrt mit TMC2209</p>
              </div>

              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                <span className="text-sky-400 font-semibold block text-[11px]">Phase 2 (40 ms)</span>
                <span className="font-bold text-neutral-200 mt-1 block">Shift-Register</span>
                <p className="text-neutral-400 text-[11px] mt-1">FIFO Array-Verschiebung im ESP32 RAM</p>
              </div>

              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                <span className="text-sky-400 font-semibold block text-[11px]">Phase 3 (220 ms)</span>
                <span className="font-bold text-neutral-200 mt-1 block">Farbmessung</span>
                <p className="text-neutral-400 text-[11px] mt-1">TCS34725 RGBC Messung @ Station 0</p>
              </div>

              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                <span className="text-sky-400 font-semibold block text-[11px]">Phase 4 (250 ms)</span>
                <span className="font-bold text-neutral-200 mt-1 block">Servo-Auswurf</span>
                <p className="text-neutral-400 text-[11px] mt-1">SG90 Stößel 25 mm Querhub</p>
              </div>

              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                <span className="text-sky-400 font-semibold block text-[11px]">Phase 5 (510 ms)</span>
                <span className="font-bold text-neutral-200 mt-1 block">Ruhelage</span>
                <p className="text-neutral-400 text-[11px] mt-1">System bereit für nächsten Zyklus</p>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Hardware-Enforcement Rules */}
        {(activePromptTab === 'all' || activePromptTab === 'launch') && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-neutral-200">
                  3. Hardware-Enforcement & Startbereitschaft (Keine Scheinsimulation)
                </h3>
              </div>
              <button
                onClick={() => copyToClipboard(
`### HARDWARE-SCHUTZ & MODI:
- Standard (testMode = false): Echte Hardware erforderlich. Wenn kein physischer ESP32 Heartbeat sendet, antwortet die API mit HTTP 503 Hardware-Fehler. Keine Scheinsimulation.
- Test-Modus (testMode = true): Trockenlauf-Simulation für Vorführungen und Entwicklung ohne Hardware. Umschaltbar via POST /api/testmode { "enabled": true/false }.`,
                  'enforcement'
                )}
                className="text-xs text-neutral-400 hover:text-sky-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedSection === 'enforcement' ? <Check className="w-3.5 h-3.5 text-sky-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Regeln kopieren</span>
              </button>
            </div>

            <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800 text-xs text-neutral-300 space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <p>
                  <strong className="text-neutral-100">Produktionsbetrieb (testMode = false):</strong> Jeder Aufruf von <code className="bg-neutral-900 px-1 py-0.5 rounded text-sky-300">/api/machine/step</code>, <code className="bg-neutral-900 px-1 py-0.5 rounded text-sky-300">/api/machine/auto</code>, <code className="bg-neutral-900 px-1 py-0.5 rounded text-sky-300">/api/simulate-ball</code> oder <code className="bg-neutral-900 px-1 py-0.5 rounded text-sky-300">/api/control start</code> gibt ohne echten ESP32-Heartbeat einen HTTP 503 Fehler zurück.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <p>
                  <strong className="text-neutral-100">Testmodus (testMode = true):</strong> Erlaubt den virtuellen Trockenlauf und die Simulation von Bällen, Zyklen und Diagnose. Perfekt für UI-Tests, Lehrzwecke und Vorführungen.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => onToggleTestMode(!status?.testMode)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-semibold cursor-pointer transition-colors"
                >
                  {status?.testMode ? 'Test-Modus jetzt DEAKTIVIEREN (Strikt)' : 'Test-Modus jetzt AKTIVIEREN (Trockenlauf)'}
                </button>
                <span className="text-neutral-500 text-[11px]">
                  Aktuell: <strong className={status?.testMode ? 'text-amber-400' : 'text-emerald-400'}>{status?.testMode ? 'Trockenlauf aktiv' : 'Strikter Hardware-Modus'}</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: REST API Reference */}
        {(activePromptTab === 'all' || activePromptTab === 'api') && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-neutral-200">
                  4. REST-API Schnittstellen-Dokumentation
                </h3>
              </div>
              <button
                onClick={() => copyToClipboard(
`### REST-API ENDPUNKTE:
GET  /api/status               -> Liefert Gesamtzustand
POST /api/control              -> { action: "start"|"stop"|"emergency_stop"|"reset_emergency"|"reset_counts" }
POST /api/testmode             -> { enabled: true|false }
POST /api/machine/step         -> Führt 1 Takt (75mm) aus
POST /api/machine/auto         -> Startet/stoppt kontinuierlichen Takt
POST /api/machine/homing       -> Referenzfahrt auf GPIO 34
POST /api/machine/feed         -> Ball in Tasche 0 einlegen
POST /api/machine/test-matrix/start -> Startet 100-Zyklen NwT Test
POST /api/machine/calibrate    -> TCS34725 Weißabgleich
GET  /api/diagnostics          -> Führt 7 Hardware-Prüfungen durch
POST /api/esp32/heartbeat      -> { ip, rssi, freeHeap, uptime, firmwareVersion }
GET  /api/stream               -> Server-Sent Events (SSE)`,
                  'api'
                )}
                className="text-xs text-neutral-400 hover:text-sky-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedSection === 'api' ? <Check className="w-3.5 h-3.5 text-sky-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>API kopieren</span>
              </button>
            </div>

            <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800 font-mono text-xs text-neutral-300 space-y-1.5 overflow-x-auto">
              <div className="text-sky-400 mb-1">// Kern-Endpunkte für Leitstand & ESP32:</div>
              <div><span className="text-emerald-400">GET</span>  /api/status <span className="text-neutral-500">// Zustand, Taschen, Zähler</span></div>
              <div><span className="text-sky-400">POST</span> /api/control <span className="text-neutral-500">// action: "start" | "stop" | "emergency_stop"</span></div>
              <div><span className="text-sky-400">POST</span> /api/testmode <span className="text-neutral-500">// &#123; enabled: true | false &#125;</span></div>
              <div><span className="text-sky-400">POST</span> /api/machine/step <span className="text-neutral-500">// 1 Takt (75 mm)</span></div>
              <div><span className="text-sky-400">POST</span> /api/machine/auto <span className="text-neutral-500">// Dauerbetrieb umschalten</span></div>
              <div><span className="text-sky-400">POST</span> /api/machine/homing <span className="text-neutral-500">// Endschalter-Nullung</span></div>
              <div><span className="text-sky-400">POST</span> /api/esp32/heartbeat <span className="text-neutral-500">// ESP32 Lebenszeichen</span></div>
              <div><span className="text-emerald-400">GET</span>  /api/stream <span className="text-neutral-500">// Live SSE Event Stream</span></div>
            </div>
          </div>
        )}

        {/* Section 5: ESP32 Firmware Template */}
        {(activePromptTab === 'all' || activePromptTab === 'firmware') && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-neutral-200">
                  5. ESP32 Arduino C++ Firmware (FreeRTOS)
                </h3>
              </div>
              <button
                onClick={() => copyToClipboard(
`// ESP32 NodeMCU Firmware für NwT Sortierapparat 2026 (Jacob Glathe)
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_TCS34725.h>
#include <Adafruit_PWMServoDriver.h>

#define PIN_STEP 26
#define PIN_DIR 27
#define PIN_ENABLE 25
#define PIN_LIMIT 34
#define PIN_LED 33

const char* ssid = "DEIN_WLAN";
const char* password = "DEIN_PASSWORT";
const char* serverUrl = "http://192.168.178.50:3000";

Adafruit_TCS34725 tcs(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver(0x40);

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22, 400000);
  pinMode(PIN_STEP, OUTPUT);
  pinMode(PIN_DIR, OUTPUT);
  pinMode(PIN_ENABLE, OUTPUT);
  digitalWrite(PIN_ENABLE, LOW);
  pinMode(PIN_LIMIT, INPUT_PULLUP);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  tcs.begin();
  pwm.begin();
  pwm.setPWMFreq(50);
}

void advanceOneStep75mm() {
  digitalWrite(PIN_DIR, HIGH);
  for (int i = 0; i < 800; i++) {
    digitalWrite(PIN_STEP, HIGH);
    delayMicroseconds(320);
    digitalWrite(PIN_STEP, LOW);
    delayMicroseconds(320);
  }
}`,
                  'firmware'
                )}
                className="text-xs text-neutral-400 hover:text-sky-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedSection === 'firmware' ? <Check className="w-3.5 h-3.5 text-sky-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Firmware kopieren</span>
              </button>
            </div>

            <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800 font-mono text-xs text-neutral-300 space-y-1 overflow-x-auto">
              <div className="text-neutral-500">// Header & I2C Initialisierung</div>
              <div><span className="text-purple-400">#include</span> &lt;Wire.h&gt;</div>
              <div><span className="text-purple-400">#include</span> &lt;Adafruit_TCS34725.h&gt; <span className="text-neutral-500">// 0x29</span></div>
              <div><span className="text-purple-400">#include</span> &lt;Adafruit_PWMServoDriver.h&gt; <span className="text-neutral-500">// 0x40</span></div>
              <div className="text-neutral-500 pt-1">// Hardware Pins</div>
              <div><span className="text-purple-400">#define</span> PIN_STEP 26</div>
              <div><span className="text-purple-400">#define</span> PIN_DIR 27</div>
              <div><span className="text-purple-400">#define</span> PIN_ENABLE 25</div>
              <div><span className="text-purple-400">#define</span> PIN_LIMIT 34</div>
            </div>
          </div>
        )}
      </div>

      {/* Raw Prompt View Modal / Box for One-Click Full Copy */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-neutral-200">
              Vollständiger Prompt-Text zur direkten Weitergabe an KI-Agenten
            </h3>
          </div>
          <button
            onClick={() => copyToClipboard(FULL_MASTER_PROMPT, 'raw')}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedSection === 'raw' ? <Check className="w-3.5 h-3.5 text-sky-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Text kopieren</span>
          </button>
        </div>

        <textarea
          readOnly
          value={FULL_MASTER_PROMPT}
          rows={12}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 font-mono text-[11px] leading-relaxed text-neutral-300 focus:outline-none focus:border-neutral-700 resize-y"
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
        <div className="text-[11px] text-neutral-500">
          Tipp: Klicke in das Textfeld, drücke Strg+A (Cmd+A) und Strg+C (Cmd+C) oder nutze oben den Button „Gesamten Prompt kopieren“.
        </div>
      </div>
    </div>
  );
};
