/*
 ==============================================================================
 PROJEK HIDROPONIK IOT: ESP32 + SENSOR TDS + RELAY POMPA + VERCEL API
 ==============================================================================
 Catatan Penting WiFi ESP32:
 - ESP32 HANYA mendukung frekuensi WiFi 2.4 GHz (TIDAK mendukung 5 GHz).
 - Jika menggunakan Hotspot HP, aktifkan opsi "Maximize Compatibility" / "2.4 GHz Band".
 - Pastikan huruf besar/kecil (Caps Lock) SSID dan Password tepat.
 ==============================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ============================================================================
// 1. PENGATURAN WIFI & URL API VERCEL (PERIKSA DENGAN TELITI)
// ============================================================================
const char* WIFI_SSID     = "NAMA_WIFI_ANDA";     // <-- Nama WiFi / Hotspot 2.4 GHz
const char* WIFI_PASSWORD = "PASSWORD_WIFI_ANDA"; // <-- Password WiFi Anda

// URL API Vercel resmi Anda:
const char* VERCEL_API_URL = "https://projek-hidroponik-capstone2.vercel.app/api/sensor";

// ============================================================================
// 2. DEFINISI PIN HARDWARE ESP32
// ============================================================================
#define TDS_PIN   34
#define RELAY_PIN 23

// ============================================================================
// 3. PENGATURAN KALIBRASI (SESUAI KODE ACUAN ASLI)
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
// 5. PENGATURAN TIMER
// ============================================================================
unsigned long waktuPompa = 0;
const unsigned long INTERVAL_POMPA = 5000; // Siklus 5 detik saat mode AUTO

unsigned long waktuKirim = 0;
const unsigned long INTERVAL_KIRIM = 5000; // Kirim data ke Vercel setiap 5 detik

bool pompaAktif = false;
String modeOperasi = "auto";

// ============================================================================
// FUNGSI RELAY POMPA (AKTIF LOW)
// ============================================================================
void kontrolPompa(bool status) {
  pompaAktif = status;
  if (status) {
    digitalWrite(RELAY_PIN, LOW); // Relay ON
    Serial.println("[POMPA] Status: AKTIF (ON)");
  } else {
    digitalWrite(RELAY_PIN, HIGH); // Relay OFF
    Serial.println("[POMPA] Status: MATI (OFF)");
  }
}

// ============================================================================
// FUNGSI MENGHITUNG PPM TDS
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
// FUNGSI SINKRONISASI KE VERCEL (HTTPS)
// ============================================================================
void kirimDataKeVercel(int adcRaw, float teganganRaw, float ppmRaw, float ppmStabil, bool statusPompa) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Status: Belum terhubung ke internet. Menunggu koneksi...");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Bypass SSL verification di mikrokontroler

  HTTPClient http;
  if (!http.begin(client, VERCEL_API_URL)) {
    Serial.println("[HTTP] Gagal inisialisasi HTTPS");
    return;
  }

  http.addHeader("Content-Type", "application/json");

  // Format JSON payload
  String jsonPayload = "{";
  jsonPayload += "\"adcRaw\":" + String(adcRaw) + ",";
  jsonPayload += "\"teganganRaw\":" + String(teganganRaw, 3) + ",";
  jsonPayload += "\"ppmRaw\":" + String(ppmRaw, 1) + ",";
  jsonPayload += "\"ppmStabil\":" + String(ppmStabil, 1) + ",";
  jsonPayload += "\"pompaAktif\":" + String(statusPompa ? "true" : "false");
  jsonPayload += "}";

  Serial.println("[HTTP] Mengirim data telemetri ke Vercel...");
  int httpCode = http.POST(jsonPayload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Sukses (%d): %s\n", httpCode, response.c_str());

    // Cek respon instruksi kontrol dari Web
    if (response.indexOf("\"mode\":\"manual\"") != -1) {
      modeOperasi = "manual";
    } else if (response.indexOf("\"mode\":\"auto\"") != -1) {
      modeOperasi = "auto";
    }

    if (modeOperasi == "manual") {
      bool serverPumpState = (response.indexOf("\"state\":true") != -1);
      if (pompaAktif != serverPumpState) {
        Serial.printf("[KONTROL] Override dari Web: Pompa -> %s\n", serverPumpState ? "ON" : "OFF");
        kontrolPompa(serverPumpState);
      }
    }
  } else {
    Serial.printf("[HTTP] Gagal kirim (%s)\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  // 1. Konfigurasi ADC ESP32
  analogReadResolution(12);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);

  // 2. Konfigurasi Relay Pompa
  pinMode(RELAY_PIN, OUTPUT);
  kontrolPompa(false);

  Serial.println();
  Serial.println("=========================================");
  Serial.println("   SISTEM MONITORING HIDROPONIK ESP32    ");
  Serial.println("=========================================");
  Serial.printf("Menghubungkan ke WiFi SSID: %s\n", WIFI_SSID);

  // 3. Konfigurasi WiFi
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true); // Biarkan ESP32 otomatis menyambung ulang di background
  WiFi.persistent(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Tunggu koneksi hingga 40 detik
  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 40) {
    delay(500);
    Serial.print(".");
    attempt++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] ALHAMDULILLAH TERHUBUNG!");
    Serial.print("[WIFI] IP ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WIFI] Gagal terhubung di awal. Pastikan:");
    Serial.println(" 1. WiFi menggunakan frekuensi 2.4 GHz (ESP32 tidak bisa 5 GHz)");
    Serial.println(" 2. SSID dan Password tidak salah ketik (perhatikan huruf besar/kecil)");
    Serial.println("ESP32 akan terus mencoba menyambung di background sambil membaca sensor.");
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

  // 3. Mengambil 10 sampel ADC untuk averaging
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

  // 6. Filter EMA
  if (!filterReady) {
    ppmFiltered = ppmAverage;
    filterReady = true;
  } else {
    ppmFiltered = (EMA_ALPHA * ppmAverage) + ((1.0 - EMA_ALPHA) * ppmFiltered);
  }

  // 7. Kontrol Otomatis Pompa (Hanya jika mode = AUTO)
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
