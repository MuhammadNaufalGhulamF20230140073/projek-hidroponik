# 🌱 Smart Hydroponic IoT System (Next.js + Vercel Postgres + ESP32)

Sistem monitoring dan kontrol otomasi nutrisi hidroponik berbasis IoT. Menggunakan framework **Next.js (App Router)** yang di-deploy ke **Vercel** dengan database **Vercel Postgres (Serverless)**, terhubung ke mikrokontroler **ESP32**, sensor **TDS Meter**, dan **Relay Pompa**.

---

## 📁 Struktur Folder Proyek (Modular & Clean)

Struktur proyek dirancang modular untuk memudahkan pemeliharaan *(maintenance)* dan pengembangan fitur di masa depan:

```text
PROJEK-HIDROPONIK/
├── arduino/
│   └── esp32_hidroponik.ino       # Firmware ESP32 (TDS + Relay + Sinkronisasi WiFi Vercel)
│
├── database/
│   └── schema.sql                 # Skema DDL tabel Vercel Postgres (sensor_logs & system_control)
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── sensor/route.ts    # POST: Terima telemetri dari ESP32 & respon kontrol balik
│   │   │   ├── control/route.ts   # GET/POST: Status & override saklar pompa dari Web
│   │   │   ├── history/route.ts   # GET: Riwayat log data sensor untuk grafik
│   │   │   └── init-db/route.ts   # GET: Inisialisasi otomatis tabel Vercel Postgres (1-Klik)
│   │   ├── globals.css            # Styling tema Tailwind CSS
│   │   ├── layout.tsx             # Root layout aplikasi
│   │   └── page.tsx               # Halaman utama Web Dashboard
│   │
│   ├── components/                # Komponen antarmuka yang terpisah rapi berdasarkan domain
│   │   ├── dashboard/             # Folder UI khusus Dashboard Monitoring
│   │   │   ├── DashboardHeader.tsx    # Header, status koneksi ESP32 & Vercel DB
│   │   │   ├── TDSMetricCard.tsx      # Kartu metrik PPM Stabil & Raw + Visual Gauge
│   │   │   ├── VoltageCard.tsx        # Kartu ADC Raw (12-bit) & Tegangan (V)
│   │   │   ├── StatusBanner.tsx       # Rekomendasi nutrisi (Rendah / Optimal / Pekat)
│   │   │   └── SensorChart.tsx        # Grafik garis SVG responsif & realtime
│   │   ├── control/               # Folder UI khusus Kontrol Pompa & Aktuator
│   │   │   ├── PumpControlPanel.tsx   # Switch Mode Auto / Manual & Tombol Relay Pompa
│   │   │   └── CalibrationInfo.tsx    # Parameter kalibrasi & formula matematis ESP32
│   │   └── ui/                    # Reusable UI Primitives
│   │       ├── Card.tsx               # Kartu kontainer serbaguna
│   │       ├── Badge.tsx              # Label status indikator
│   │       └── Button.tsx             # Tombol interaktif
│   │
│   └── lib/                       # Layer Logic & Database
│       ├── db/
│       │   ├── client.ts          # Koneksi client Vercel Postgres / Neon + Fallback Mock
│       │   └── queries.ts         # Kueri database (insert, getLatest, getHistory, updateControl)
│       ├── types/
│       │   └── hidroponik.ts      # Definisi tipe TypeScript sensor & kontrol
│       └── utils/
│           └── hydroCalc.ts       # Logika perhitungan batas nutrisi & format waktu
│
├── .env.example                   # Contoh konfigurasi environment database Vercel
├── next.config.ts                 # Konfigurasi Next.js
└── package.json                   # Dependensi project
```

---

## 🚀 Cara Menjalankan di Komputer Lokal

1. **Jalankan development server:**
   ```bash
   npm run dev
   ```
2. Buka browser di `http://localhost:3000`.
   *(Aplikasi otomatis berjalan dalam mode Mock Simulator jika database Vercel Postgres belum dihubungkan, sehingga tampilan web bisa langsung diuji tanpa error).*

---

## ☁️ Cara Deploy ke Vercel & Mengaktifkan Vercel Postgres

1. **Push proyek ke GitHub/GitLab:**
   ```bash
   git add .
   git commit -m "feat: complete hydroponic nextjs vercel postgres setup"
   git push
   ```
2. **Deploy di Vercel:**
   - Masuk ke dashboard [vercel.com](https://vercel.com) dan klik **Add New Project**.
   - Pilih repository GitHub Anda, lalu klik **Deploy**.
3. **Hubungkan Database Vercel Postgres (1-Klik):**
   - Pada project Anda di Vercel Dashboard, buka tab **Storage**.
   - Klik **Create Database** -> Pilih **Postgres** (Neon Serverless).
   - Klik **Connect Project**. Vercel akan otomatis menyuntikkan environment variable `POSTGRES_URL` ke aplikasi Anda tanpa perlu copy-paste manual!
4. **Inisialisasi Tabel Database:**
   - Setelah selesai connect, buka halaman web Anda dan klik tab **Log Riwayat & Kalibrasi** -> klik tombol **"Inisialisasi Tabel DB"** (atau buka URL `https://projek-anda.vercel.app/api/init-db`).

---

## 🔌 Konfigurasi Hardware ESP32 (Arduino)

1. Buka file [arduino/esp32_hidroponik.ino](file:///c:/KULIAH/CPSTN/PROJEK%20HIDRPONIK/arduino/esp32_hidroponik.ino) di Arduino IDE.
2. Install library **ArduinoJson** (Tools -> Manage Libraries -> cari "ArduinoJson").
3. Sesuaikan SSID WiFi dan URL API Vercel Anda:
   ```cpp
   const char* WIFI_SSID     = "NAMA_WIFI_ANDA";
   const char* WIFI_PASSWORD = "PASSWORD_WIFI_ANDA";
   const char* VERCEL_API_URL = "https://projek-anda.vercel.app/api/sensor";
   ```
4. Wiring Pin ESP32:
   - **TDS Sensor Pin Data**: GPIO **34** (ADC 12-Bit).
   - **Relay Pompa Pin IN**: GPIO **23** (Aktif LOW).
5. Upload program ke board ESP32.

---

## 🛠️ Keunggulan untuk Maintenance & Pemeliharaan

- **Pemisahan Domain Jelas**: Kode firmware (`/arduino`), UI Dashboard (`/components/dashboard`), UI Kontrol (`/components/control`), dan Database Query (`/lib/db`) berada di tempat masing-masing.
- **Bi-directional Control**: ESP32 tidak hanya mengirim data, tetapi juga menerima instruksi balik dari Web (bisa mematikan/menyalakan pompa secara remote).
- **Graceful Fallback**: Jika koneksi internet terputus, ESP32 tetap bekerja mandiri secara offline. Jika database belum terhubung di local, Next.js tidak crash karena memiliki in-memory fallback.
