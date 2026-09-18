import React, { useState } from 'react';
import { X, Copy, Check, Download, Code, Cpu, FileCode } from 'lucide-react';

interface Esp32FirmwareReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ESP32_FIRMWARE_CPP = `/*
 * ==============================================================================
 * ESP32 TISCHTENNISBALL-FARBSORTIERANLAGE // PRODUCTION WEBSOCKET FIRMWARE
 * ==============================================================================
 * Protokoll: WebSockets JSON Telemetrie (<20ms Latenz)
 * Hardware: ESP32 NodeMCU, TCS34725 I2C Farbsensor, NEMA 17 Stepper, 2x SG90 Servos
 * Schieberegister:
 *   Index 0: Farbmessung
 *   Index 1: Auswurf Rot (Servo 1)
 *   Index 2: Auswurf Weiß (Servo 2)
 *   Index 3+: Durchlauf / Ausschuss
 * ==============================================================================
 */

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_TCS34725.h>
#include <ESP32Servo.h>

// --- WLAN ZUGANGSDATEN ---
const char* WIFI_SSID     = "DEIN_WIFI_NAME";
const char* WIFI_PASSWORD = "DEIN_WIFI_PASSWORT";

// --- WEBSOCKET SERVER AUF PORT 81 ---
WebSocketsServer webSocket = WebSocketsServer(81);

// --- PINBELEGUNGEN ---
#define STEP_PIN    26
#define DIR_PIN     27
#define ENABLE_PIN  25
#define SERVO1_PIN  18  // Station 1: Rot
#define SERVO2_PIN  19  // Station 2: Weiß
#define SDA_PIN     21
#define SCL_PIN     22

// --- HARDWARE INSTANZEN ---
Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);
Servo servo1;
Servo servo2;

// --- MASCHINEN ZUSTAND & SCHIEBEREGISTER ---
enum SystemState { STOPPED, RUNNING, PAUSED, ERROR_STATE };
SystemState systemStatus = STOPPED;

// 0=LEER, 1=ROT, 2=WEISS, 99=FEHLER
int conveyor_array[5] = {0, 0, 0, 0, 0};

unsigned long stepDelayMs = 1200;
unsigned long lastStepTime = 0;
unsigned long lastTelemetryTime = 0;
unsigned long startTime = 0;

// Statistiken
unsigned long totalProcessed = 0;
unsigned long countRed = 0;
unsigned long countWhite = 0;
unsigned long countError = 0;

// Sensor Raw Zwischenspeicher
uint16_t rawR = 0, rawG = 0, rawB = 0, rawC = 0;
String detectedColorStr = "LEER";

// --- FUNKTIONEN PROTOTYPEN ---
void broadcastTelemetry();
void sendLog(const char* level, const char* msg);
void stepMotor75mm();
void triggerServo(int station);
void measureColor();
void shiftConveyor();

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\\n[SCADA] Initialisiere Sortieranlage...");

  // Pins initialisieren
  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(ENABLE_PIN, OUTPUT);
  digitalWrite(ENABLE_PIN, LOW); // Aktiv

  // Servos
  servo1.attach(SERVO1_PIN);
  servo2.attach(SERVO2_PIN);
  servo1.write(0);
  servo2.write(0);

  // I2C & Farbsensor
  Wire.begin(SDA_PIN, SCL_PIN);
  if (tcs.begin()) {
    Serial.println("[SCADA] TCS34725 Farbsensor OK.");
  } else {
    Serial.println("[SCADA ERROR] TCS34725 nicht gefunden!");
    systemStatus = ERROR_STATE;
  }

  // WiFi verbinden
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\n[SCADA] WiFi Verbunden! IP: " + WiFi.localIP().toString());

  // WebSocket Server starten
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);

  startTime = millis();
}

void loop() {
  webSocket.loop();
  unsigned long now = millis();

  // Automatikzyklus wenn RUNNING
  if (systemStatus == RUNNING) {
    if (now - lastStepTime >= stepDelayMs) {
      lastStepTime = now;
      
      // 1. Auswurf an Stationen vor Schieben prüfen
      if (conveyor_array[1] == 1) {
        triggerServo(1);
        countRed++;
        conveyor_array[1] = 0;
        sendLog("INFO", "Auswurf Station 1 getriggert (Rot)");
      }
      if (conveyor_array[2] == 2) {
        triggerServo(2);
        countWhite++;
        conveyor_array[2] = 0;
        sendLog("INFO", "Auswurf Station 2 getriggert (Weiß)");
      }

      // 2. Farbsensor an Station 0 messen
      measureColor();

      // 3. Schieberegister um 1 nach rechts verschieben
      shiftConveyor();

      // 4. Schrittmotor um 75mm takten
      stepMotor75mm();
    }
  }

  // Telemetrie mit hoher Frequenz an verbundene Clients streamen
  if (now - lastTelemetryTime >= 100) {
    lastTelemetryTime = now;
    broadcastTelemetry();
  }
}

void measureColor() {
  tcs.getRawData(&rawR, &rawG, &rawB, &rawC);
  
  if (rawC < 150) {
    detectedColorStr = "LEER";
    conveyor_array[0] = 0;
  } else if (rawR > rawB * 1.5 && rawR > rawG * 1.2) {
    detectedColorStr = "ROT";
    conveyor_array[0] = 1;
    totalProcessed++;
  } else if (rawR > 180 && rawG > 180 && rawB > 180) {
    detectedColorStr = "WEISS";
    conveyor_array[0] = 2;
    totalProcessed++;
  } else {
    detectedColorStr = "UNBEKANNT";
    conveyor_array[0] = 99;
    countError++;
    totalProcessed++;
    sendLog("WARN", "Unbekannte Ballfarbe erkannt - Aussortierung");
  }
}

void shiftConveyor() {
  for (int i = 4; i > 0; i--) {
    conveyor_array[i] = conveyor_array[i - 1];
  }
}

void stepMotor75mm() {
  digitalWrite(DIR_PIN, HIGH);
  // 75mm entspricht ca. 400 Mikroschritten (je nach Riemenrad z.B. GT2 20T)
  for (int s = 0; s < 400; s++) {
    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(400);
    digitalWrite(STEP_PIN, LOW);
    delayMicroseconds(400);
  }
}

void triggerServo(int station) {
  if (station == 1) {
    servo1.write(60); // Auswurfhub
    delay(180);
    servo1.write(0);  // Rückhub
  } else if (station == 2) {
    servo2.write(60);
    delay(180);
    servo2.write(0);
  }
}

void broadcastTelemetry() {
  StaticJsonDocument<512> doc;
  doc["event"] = "TELEMETRY";
  JsonObject p = doc.createNestedObject("payload");

  switch (systemStatus) {
    case RUNNING: p["status"] = "RUNNING"; break;
    case PAUSED:  p["status"] = "PAUSED"; break;
    case ERROR_STATE: p["status"] = "ERROR"; break;
    default:      p["status"] = "STOPPED"; break;
  }

  p["uptime_sec"] = (millis() - startTime) / 1000;
  p["current_cycle_time_ms"] = stepDelayMs;

  JsonArray arr = p.createNestedArray("conveyor_array");
  for (int i = 0; i < 5; i++) arr.add(conveyor_array[i]);

  JsonObject raw = p.createNestedObject("sensor_raw");
  raw["r"] = rawR;
  raw["g"] = rawG;
  raw["b"] = rawB;
  raw["clear"] = rawC;

  p["sensor_detected"] = detectedColorStr;

  JsonObject stats = p.createNestedObject("stats");
  stats["total_processed"] = totalProcessed;
  stats["count_red"] = countRed;
  stats["count_white"] = countWhite;
  stats["count_error"] = countError;
  
  float bpm = (stepDelayMs > 0) ? (60000.0 / stepDelayMs) : 0;
  stats["throughput_bpm"] = (systemStatus == RUNNING) ? bpm : 0;

  String output;
  serializeJson(doc, output);
  webSocket.broadcastTXT(output);
}

void sendLog(const char* level, const char* msg) {
  StaticJsonDocument<256> doc;
  doc["event"] = "LOG";
  JsonObject p = doc.createNestedObject("payload");
  
  char timeBuf[16];
  unsigned long sec = millis() / 1000;
  sprintf(timeBuf, "%02lu:%02lu:%02lu.%03lu", (sec / 3600) % 24, (sec / 60) % 60, sec % 60, millis() % 1000);
  
  p["timestamp"] = timeBuf;
  p["level"] = level;
  p["message"] = msg;

  String output;
  serializeJson(doc, output);
  webSocket.broadcastTXT(output);
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_TEXT) {
    StaticJsonDocument<256> doc;
    deserializeJson(doc, payload);
    const char* cmd = doc["command"];

    if (strcmp(cmd, "START") == 0) {
      systemStatus = RUNNING;
      sendLog("INFO", "Automatik-Betrieb gestartet.");
    } else if (strcmp(cmd, "STOP") == 0) {
      systemStatus = STOPPED;
      sendLog("WARN", "Not-Halt / Stopp ausgelöst.");
    } else if (strcmp(cmd, "PAUSE") == 0) {
      systemStatus = PAUSED;
      sendLog("INFO", "Maschine pausiert.");
    } else if (strcmp(cmd, "RESET_STATS") == 0) {
      totalProcessed = countRed = countWhite = countError = 0;
      sendLog("INFO", "Zähler und Statistiken zurückgesetzt.");
    } else if (strcmp(cmd, "MANUAL_STEP") == 0) {
      shiftConveyor();
      stepMotor75mm();
      sendLog("INFO", "Manueller Takt ausgeführt (+75mm).");
    } else if (strcmp(cmd, "TRIGGER_EJECTOR") == 0) {
      int st = doc["station"] | 1;
      triggerServo(st);
      sendLog("INFO", String("Manueller Auswurf Station " + String(st) + " getriggert.").c_str());
    } else if (strcmp(cmd, "SET_STEP_DELAY") == 0) {
      stepDelayMs = doc["delay_ms"] | 1200;
      sendLog("INFO", String("Taktzeit geändert auf " + String(stepDelayMs) + "ms").c_str());
    } else if (strcmp(cmd, "PING") == 0) {
      webSocket.sendTXT(num, "{\\"event\\":\\"PONG\\"}");
    }
  }
}
`;

export const Esp32FirmwareReferenceModal: React.FC<Esp32FirmwareReferenceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(ESP32_FIRMWARE_CPP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const blob = new Blob([ESP32_FIRMWARE_CPP], { type: 'text/x-c++src' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ESP32_TT_Sorter_Firmware.ino';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
      <div className="bg-[#0D0E12] border border-[#1A1D24] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-[#0A0B0E] px-5 py-3.5 border-b border-[#1A1D24] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-[#00FF88]" />
            <h3 className="text-sm font-bold text-[#E1E4EA] tracking-wider uppercase">
              ESP32 C++ FIRMWARE (ARDUINO / PLATFORMIO)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#626875] hover:text-[#E1E4EA] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info banner */}
        <div className="bg-[#111318] px-5 py-2.5 border-b border-[#1A1D24] text-[11px] text-[#626875] flex items-center justify-between">
          <span>Vollständige Firmware mit WebSockets, TCS34725 & Servos</span>
          <div className="flex items-center gap-2">
            <button
              onClick={copyCode}
              className="px-2.5 py-1 rounded bg-[#0D0E12] border border-[#1A1D24] hover:border-[#00FF88]/40 text-[#E1E4EA] text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#00FF88]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopiert!' : 'Kopieren'}</span>
            </button>
            <button
              onClick={downloadFile}
              className="px-2.5 py-1 rounded bg-[#00FF88] text-[#050507] font-bold text-xs flex items-center gap-1.5 hover:bg-[#00FF88]/90 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.ino herunterladen</span>
            </button>
          </div>
        </div>

        {/* Code Viewer */}
        <div className="flex-1 p-4 bg-[#050507] overflow-y-auto">
          <pre className="text-[11px] leading-relaxed text-[#E1E4EA] font-mono select-text whitespace-pre">
            {ESP32_FIRMWARE_CPP}
          </pre>
        </div>

        {/* Footer */}
        <div className="bg-[#0A0B0E] px-5 py-3 border-t border-[#1A1D24] flex items-center justify-between text-[11px] text-[#626875]">
          <span>Bibliotheken: Adafruit_TCS34725, WebSocketsServer, ArduinoJson, ESP32Servo</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#111318] text-[#E1E4EA] border border-[#1A1D24] hover:bg-[#1A1D24] cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
