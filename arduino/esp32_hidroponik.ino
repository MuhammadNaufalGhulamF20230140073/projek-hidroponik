/*
 ==============================================================================
 PROJEK HIDROPONIK IOT: ESP32 + SENSOR TDS + RELAY POMPA + VERCEL API
 ==============================================================================
 Keterangan Pin Hardware:
 - Pin Sensor TDS   : GPIO 34 (ADC 12-Bit, Atenuasi 11dB)
 - Pin Relay Pompa  : GPIO 23 (Aktif LOW: LOW = ON, HIGH = OFF)
 
 Library yang dibutuhkan di Arduino IDE:
 1. WiFi.h            (Bawaan Board ESP32)
 2. HTTPClient.h      (Bawaan Board ESP32)
 3. WiFiClientSecure.h(Bawaan Board ESP32 untuk HTTPS Vercel)
 4. ArduinoJson.h     (Install via Tools -> Manage Libraries -> "ArduinoJson")
 ==============================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ============================================================================
// 1. PENGATURAN WIFI & URL API VERCEL (SESUAIKAN DENGAN KEBUTUHAN ANDA)
// ============================================================================
const char* WIFI_SSID     = "NAMA_WIFI_ANDA";     // Ganti dengan nama WiFi / Hotspot HP
const char* WIFI_PASSWORD = "PASSWORD_WIFI_ANDA"; // Ganti dengan password WiFi Anda

// Ganti URL di bawah ini dengan domain Vercel Anda + /api/sensor
// Contoh: "https://projek-hidroponik-xxxx.vercel.app/api/sensor"
const char* VERCEL_API_URL = "https://projek-hidroponik-xxxx.vercel.app/api/sensor";

// ============================================================================
// 2. DEFINISI PIN HARDWARE ESP32
// ============================================================================
#define TDS_PIN   34
#define RELAY_PIN 23

// ============================================================================
// 3. PENGATURAN KALIBRASI (SESUAI KODE ACUAN ASLI ANDA)
// ============================================================================
float calibrationFactor = 0.9344;
float temperature       = 25.0;

float calibrationSlope  = 0.9200;
float calibrationOffset = 68.50;

// ============================================================================
// 4. PENGATURAN FILTER EMA & SAMPLE ADC
// ============================================================================
const int JUMLAH_SAMPLE = 10;
const float EMA_ALPHA   = 0.20;

float ppmFiltered = 0;
bool filterReady  = false;

// ============================================================================
// 5. PENGATURAN TIMER & INTERVAL PENGIRIMAN
// ============================================================================
unsigned long waktuPompa = 0;
const unsigned long INTERVAL_POMPA = 5000; // Siklus 5 detik saat mode AUTO

unsigned long waktuKirim = 0;
const unsigned long INTERVAL_KIRIM = 5000; // Kirim data ke Vercel setiap 5 detik

bool pompaAktif = false;
String modeOperasi = "auto"; // "auto" (sesuai timer) atau "manual" (remote web)

// ============================================================================
// FUNGSI KONTROL RELAY POMPA (RELAY AKTIF LOW)
// ============================================================================
void kontrolPompa(bool status) {
  pompaAktif = status;
  if (status) {
    digitalWrite(RELAY_PIN, LOW); // Relay ON saat logika LOW
    Serial.println("[POMPA] Status: AKTIF (ON)");
  } else {
    digitalWrite(RELAY_PIN, HIGH); // Relay OFF saat logika HIGH
    Serial.println("[POMPA] Status: MATI (OFF)");
  }
}

// ============================================================================
// FUNGSI MENGHITUNG NILAI PPM DARI TEGANGAN SENSOR
// ============================================================================
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

// ============================================================================
// FUNGSI MENGIRIM TELEMETRI KE VERCEL SERVERLESS (HTTPS)
// ============================================================================
void kirimDataKeVercel(int adcRaw, float teganganRaw, float ppmRaw, float ppmStabil, bool statusPompa) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Koneksi terputus. Menghubungkan ulang...");
    WiFi.reconnect();
    return;
  }

  // Gunakan WiFiClientSecure agar koneksi HTTPS Vercel aman dan lancar
  WiFiClientSecure client;
  client.setInsecure(); // Mengabaikan verifikasi SSL certificate lokal agar tidak error

  HTTPClient http;
  if (!http.begin(client, VERCEL_API_URL)) {
    Serial.println("[HTTP] Gagal menginisialisasi koneksi HTTPS");
    return;
  }

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

  Serial.println("[HTTP] Mengirim data telemetri ke Vercel...");
  int httpCode = http.POST(jsonPayload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Sukses (Kode %d): %s\n", httpCode, response.c_str());

    // Membaca perintah kontrol aktuator yang dikirim balik oleh Web Vercel
    StaticJsonDocument<512> docRes;
    DeserializationError error = deserializeJson(docRes, response);

    if (!error && docRes["success"] == true) {
      const char* serverMode = docRes["control"]["mode"] | "auto";
      bool serverPumpState   = docRes["control"]["state"] | false;

      modeOperasi = String(serverMode);

      // Jika user memilih mode MANUAL di Web, pompa mengikuti instruksi tombol Web
      if (modeOperasi == "manual") {
        if (pompaAktif != serverPumpState) {
          Serial.printf("[KONTROL] Menerima override dari Web: Pompa -> %s\n", serverPumpState ? "ON" : "OFF");
          kontrolPompa(serverPumpState);
        }
      }
    }
  } else {
    Serial.printf("[HTTP] Gagal kirim, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// ============================================================================
// SETUP PROGRAM
// ============================================================================
void setup() {
  Serial.begin(115200);

  // 1. Konfigurasi resolusi ADC ESP32 (12-Bit = 0 - 4095)
  analogReadResolution(12);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);

  // 2. Konfigurasi Relay Pompa
  pinMode(RELAY_PIN, OUTPUT);
  kontrolPompa(false); // Awal program pompa dalam keadaan mati

  Serial.println();
  Serial.println("=========================================");
  Serial.println("   SISTEM MONITORING HIDROPONIK ESP32    ");
  Serial.println("=========================================");
  Serial.println("Sensor TDS Pin : GPIO 34");
  Serial.println("Relay Pompa Pin: GPIO 23 (Aktif LOW)");
  Serial.println("Komunikasi     : HTTPS -> Vercel Serverless");
  Serial.println("-----------------------------------------");

  // 3. Menghubungkan ke WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WIFI] Menghubungkan ke ");
  Serial.print(WIFI_SSID);

  int percobaan = 0;
  while (WiFi.status() != WL_CONNECTED && percobaan < 25) {
    delay(500);
    Serial.print(".");
    percobaan++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Berhasil Terhubung!");
    Serial.print("[WIFI] IP Address ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WIFI] Gagal terhubung (ESP32 berjalan mandiri secara offline).");
  }
}

// ============================================================================
// LOOP UTAMA
// ============================================================================
void loop() {
  // 1. Pembacaan ADC instan
  int adcRaw = analogRead(TDS_PIN);
  float teganganRaw = adcRaw * (3.3 / 4095.0);

  // 2. Perhitungan PPM instan (RAW)
  float ppmRaw = hitungPPM(teganganRaw);

  // 3. Mengambil 10 sampel ADC untuk averaging (rata-rata)
  long totalADC = 0;
  for (int i = 0; i < JUMLAH_SAMPLE; i++) {
    totalADC += analogRead(TDS_PIN);
    delay(50);
  }
  float adcAverage = totalADC / (float)JUMLAH_SAMPLE;

  // 4. Perhitungan tegangan rata-rata
  float teganganAverage = adcAverage * (3.3 / 4095.0);

  // 5. Perhitungan PPM rata-rata
  float ppmAverage = hitungPPM(teganganAverage);

  // 6. Filter EMA (Exponential Moving Average) agar nilai stabil
  if (!filterReady) {
    ppmFiltered = ppmAverage;
    filterReady = true;
  } else {
    ppmFiltered = (EMA_ALPHA * ppmAverage) + ((1.0 - EMA_ALPHA) * ppmFiltered);
  }

  // 7. Kontrol Otomatis Pompa (Hanya berjalan jika mode = AUTO)
  unsigned long sekarang = millis();
  if (modeOperasi == "auto") {
    if (sekarang - waktuPompa >= INTERVAL_POMPA) {
      waktuPompa = sekarang;
      pompaAktif = !pompaAktif;
      kontrolPompa(pompaAktif);
    }
  }

  // 8. Tampilkan data ke Serial Monitor
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
  Serial.println(modeOperasi);

  // 9. Kirim data telemetri ke API Vercel setiap 5 detik
  if (sekarang - waktuKirim >= INTERVAL_KIRIM) {
    waktuKirim = sekarang;
    kirimDataKeVercel(adcRaw, teganganAverage, ppmRaw, ppmFiltered, pompaAktif);
  }

  delay(500);
}
