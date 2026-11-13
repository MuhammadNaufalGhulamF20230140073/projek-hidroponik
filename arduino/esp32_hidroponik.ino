/*
 ==============================================================================
 PROJEK HIDROPONIK IOT: ESP32 + TDS METER + RELAY + VERCEL API
 ==============================================================================
 Deskripsi:
 - Membaca sensor TDS (Analog Pin 34) dengan kompensasi suhu & kalibrasi.
 - Menerapkan filter EMA (Exponential Moving Average).
 - Mengontrol Relay Pompa (Pin 23 - Aktif LOW).
 - Mengirim data telemetri secara berkala ke API Vercel (/api/sensor).
 - Menerima instruksi kontrol (Mode Auto vs Manual) dari Web Dashboard Vercel.
 ==============================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // Pastikan install ArduinoJson v6/v7 via Library Manager

// =====================================
// KONFIGURASI WIFI & SERVER VERCEL
// =====================================
const char* WIFI_SSID     = "NAMA_WIFI_ANDA";
const char* WIFI_PASSWORD = "PASSWORD_WIFI_ANDA";

// Ganti dengan URL domain Vercel Anda setelah di-deploy
// Contoh: "https://projek-hidroponik.vercel.app/api/sensor"
const char* VERCEL_API_URL = "https://projek-hidroponik.vercel.app/api/sensor";

// =====================================
// KONFIGURASI PIN HARDWARE ESP32
// =====================================
#define TDS_PIN   34
#define RELAY_PIN 23

// =====================================
// PENGATURAN KALIBRASI (ACUAN USER)
// =====================================
float calibrationFactor = 0.9344;
float temperature       = 25.0;

float calibrationSlope  = 0.9200;
float calibrationOffset = 68.50;

// =====================================
// PENGATURAN FILTER
// =====================================
const int JUMLAH_SAMPLE = 10;
const float EMA_ALPHA   = 0.20;

float ppmFiltered = 0;
bool filterReady  = false;

// =====================================
// PENGATURAN POMPA & INTERVAL
// =====================================
unsigned long waktuPompa = 0;
const unsigned long INTERVAL_POMPA = 5000; // Siklus 5 detik saat mode AUTO

unsigned long waktuKirim = 0;
const unsigned long INTERVAL_KIRIM = 5000; // Kirim data ke Vercel tiap 5 detik

bool pompaAktif = false;
String modeKontrol = "auto"; // "auto" (sesuai timer) atau "manual" (override web)

// Relay aktif LOW
void kontrolPompa(bool status) {
  pompaAktif = status;
  if (status) {
    digitalWrite(RELAY_PIN, LOW); // Relay ON
    Serial.println("[POMPA] Status: ON (Relay LOW)");
  } else {
    digitalWrite(RELAY_PIN, HIGH); // Relay OFF
    Serial.println("[POMPA] Status: OFF (Relay HIGH)");
  }
}

// =====================================
// FUNGSI MENGHITUNG PPM
// =====================================
float hitungPPM(float tegangan) {
  float compensationCoefficient = 1.0 + 0.02 * (temperature - 25.0);
  float compensationVoltage     = tegangan / compensationCoefficient;

  float tdsRaw = (133.42 * compensationVoltage * compensationVoltage * compensationVoltage
                - 255.86 * compensationVoltage * compensationVoltage
                + 857.39 * compensationVoltage) * 0.5;

  float ppmAwal = tdsRaw * calibrationFactor;
  float ppm     = (calibrationSlope * ppmAwal) + calibrationOffset;

  return ppm;
}

// =====================================
// FUNGSI SINKRONISASI KE VERCEL API
// =====================================
void kirimDataKeVercel(int adcRaw, float teganganRaw, float ppmRaw, float ppmStabil, bool statusPompa) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Terputus. Menghubungkan ulang...");
    WiFi.reconnect();
    return;
  }

  HTTPClient http;
  http.begin(VERCEL_API_URL);
  http.addHeader("Content-Type", "application/json");

  // Format payload JSON untuk API Vercel
  StaticJsonDocument<256> docReq;
  docReq["adcRaw"]      = adcRaw;
  docReq["teganganRaw"] = teganganRaw;
  docReq["ppmRaw"]      = ppmRaw;
  docReq["ppmStabil"]   = ppmStabil;
  docReq["pompaAktif"]  = statusPompa;

  String jsonPayload;
  serializeJson(docReq, jsonPayload);

  Serial.println("[HTTP] Mengirim telemetri ke Vercel...");
  int httpCode = http.POST(jsonPayload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Kode: %d | Respon: %s\n", httpCode, response.c_str());

    // Parse respon balik dari Vercel untuk kontrol aktuasi pompa
    StaticJsonDocument<512> docRes;
    DeserializationError error = deserializeJson(docRes, response);

    if (!error && docRes["success"] == true) {
      const char* serverMode = docRes["control"]["mode"] | "auto";
      bool serverPumpState   = docRes["control"]["state"] | false;

      modeKontrol = String(serverMode);

      // Jika web dashboard mengatur ke mode MANUAL, ikuti instruksi tombol dari Web!
      if (modeKontrol == "manual") {
        if (pompaAktif != serverPumpState) {
          Serial.printf("[KONTROL] Menerima override manual dari Web: Pompa -> %s\n", serverPumpState ? "ON" : "OFF");
          kontrolPompa(serverPumpState);
        }
      }
    }
  } else {
    Serial.printf("[HTTP] Gagal kirim data, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// =====================================
// SETUP
// =====================================
void setup() {
  Serial.begin(115200);

  // Setup ADC ESP32
  analogReadResolution(12);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);

  // Setup Relay Pompa
  pinMode(RELAY_PIN, OUTPUT);
  kontrolPompa(false);

  Serial.println();
  Serial.println("=========================================");
  Serial.println("     SISTEM MONITORING HIDROPONIK ESP32  ");
  Serial.println("=========================================");
  Serial.println("Sensor TDS Pin : 34");
  Serial.println("Relay Pompa Pin: 23 (Aktif LOW)");
  Serial.println("Koneksi        : WiFi -> Vercel Serverless");
  Serial.println("-----------------------------------------");

  // Hubungkan ke WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WIFI] Menghubungkan ke ");
  Serial.print(WIFI_SSID);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Berhasil Terhubung!");
    Serial.print("[WIFI] IP ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WIFI] Gagal terhubung (Mode Offline Standalone diaktifkan).");
  }
}

// =====================================
// LOOP UTAMA
// =====================================
void loop() {
  // 1. Pembacaan ADC instan
  int adcRaw = analogRead(TDS_PIN);
  float teganganRaw = adcRaw * (3.3 / 4095.0);

  // 2. Perhitungan PPM RAW
  float ppmRaw = hitungPPM(teganganRaw);

  // 3. Mengambil 10 sampel ADC (Averaging)
  long totalADC = 0;
  for (int i = 0; i < JUMLAH_SAMPLE; i++) {
    totalADC += analogRead(TDS_PIN);
    delay(50);
  }
  float adcAverage = totalADC / (float)JUMLAH_SAMPLE;

  // 4. Tegangan rata-rata
  float teganganAverage = adcAverage * (3.3 / 4095.0);

  // 5. PPM rata-rata
  float ppmAverage = hitungPPM(teganganAverage);

  // 6. Filter EMA (Exponential Moving Average)
  if (!filterReady) {
    ppmFiltered = ppmAverage;
    filterReady = true;
  } else {
    ppmFiltered = (EMA_ALPHA * ppmAverage) + ((1.0 - EMA_ALPHA) * ppmFiltered);
  }

  // 7. Kontrol Siklus Pompa (Hanya berjalan jika Mode = AUTO)
  unsigned long sekarang = millis();

  if (modeKontrol == "auto") {
    if (sekarang - waktuPompa >= INTERVAL_POMPA) {
      waktuPompa = sekarang;
      pompaAktif = !pompaAktif;
      kontrolPompa(pompaAktif);
    }
  }

  // 8. Tampilkan status di Serial Monitor
  Serial.print("[SENSOR] ADC: ");
  Serial.print(adcRaw);
  Serial.print(" | Volt: ");
  Serial.print(teganganRaw, 3);
  Serial.print("V | PPM RAW: ");
  Serial.print(ppmRaw, 1);
  Serial.print(" | PPM STABIL: ");
  Serial.print(ppmFiltered, 1);
  Serial.print(" ppm | Pompa: ");
  Serial.print(pompaAktif ? "ON" : "OFF");
  Serial.print(" | Mode: ");
  Serial.println(modeKontrol);

  // 9. Kirim Telemetri ke Vercel Serverless API
  if (sekarang - waktuKirim >= INTERVAL_KIRIM) {
    waktuKirim = sekarang;
    kirimDataKeVercel(adcRaw, teganganAverage, ppmRaw, ppmFiltered, pompaAktif);
  }

  delay(500);
}

