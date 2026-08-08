# LayarSehat

Kontrol orang tua untuk HP anak: memantau aplikasi yang terpasang, memblokir aplikasi yang
tidak diizinkan, membatasi waktu layar harian, dan menerapkan jam tidur.

| Komponen | Teknologi | Domain | Port |
| --- | --- | --- | --- |
| Frontend (dasbor orang tua) | Astro + adapter Node | layarsehat.nasir.id | 5005 |
| Backend (API) | FastAPI + PostgreSQL | api.layarsehat.nasir.id | 9005 |
| Android (HP anak) | Flutter + Kotlin | — | — |

Berkas statis (`.env` produksi, APK/AAB rilis) disimpan di bucket S3 `layarsehat.nasir.id`.
Deploy berjalan lewat `.github/workflows/apps-layarsehat.yml` pada runner `nasir-contabo`.

## Cara kerja

Orang tua membuat profil anak di dasbor, lalu menghasilkan **kode pemasangan 6 digit**
(berlaku 15 menit, sekali pakai). Aplikasi Android di HP anak menukar kode itu dengan
`device_token` permanen, kemudian:

1. Mengirim daftar aplikasi terpasang dan statistik pemakaian ke `POST /agent/sync`.
2. Menerima kebijakan terbaru (daftar paket terblokir, batas harian, jam tidur).
3. Menyimpan kebijakan secara lokal sehingga tetap berlaku saat luring, lalu
   `MonitorService` memeriksa aplikasi yang sedang dibuka setiap 2 detik dan menampilkan
   `BlockActivity` bila melanggar.

Dua mode aturan aplikasi baru:

- `allow` — semua aplikasi boleh dipakai kecuali yang diblokir orang tua.
- `block_new` — aplikasi non-sistem yang baru terpasang otomatis terkunci (`pending`)
  sampai orang tua menyetujuinya.

## Struktur

```
backend/    FastAPI: parents, children, devices, agent, dashboard
frontend/   Astro: /, /masuk, /daftar, /dasbor, /perangkat/[id], /unduh
android/    Flutter (lib/) + Kotlin (android/app/src/main/kotlin/id/nasir/layarsehat/)
```

Tampilan dasbor mengikuti gaya Argon: bilah sisi tetap, kepala bergradien, kartu
statistik yang menimpa gradien, dan grafik Chart.js. Berkas tata letaknya ada di
`frontend/src/layouts/` (`PanelLayout` untuk halaman ber-login, `AuthLayout` untuk
masuk/daftar), sementara token warna dan komponen dasar ada di `Layout.astro`.
Angka pada kartu statistik diambil dari `GET /dashboard/summary`.

Sisi Kotlin memuat `AppInspector` (daftar aplikasi & UsageStatsManager), `PolicyStore`
(kebijakan tersimpan), `MonitorService` (layanan latar depan), `BlockActivity` (layar
pengunci), dan `BootReceiver` (nyala ulang setelah reboot).

## Pengembangan lokal

```bash
# Backend
cd backend && python -m venv venv && ./venv/bin/pip install -r requirements.txt
cp .env.example .env    # isi DATABASE_URL dan SECRET_KEY
uvicorn main:app --reload --port 9005

# Frontend
cd frontend && npm install
PUBLIC_API_URL=http://localhost:9005 npm run dev

# Android (emulator memakai 10.0.2.2 untuk localhost)
cd android && flutter pub get && flutter run
```

`lib/constants.dart` menyimpan `kBaseUrl`; ubah ke `http://10.0.2.2:9005` saat pengembangan.

## Variabel lingkungan backend

| Nama | Keterangan |
| --- | --- |
| `DATABASE_URL` | Koneksi PostgreSQL (`sslmode=require` dipaksa di kode) |
| `SECRET_KEY` | Kunci penandatanganan JWT orang tua |

## Izin Android yang dibutuhkan

| Izin | Kegunaan |
| --- | --- |
| Akses Penggunaan (`PACKAGE_USAGE_STATS`) | Membaca aplikasi aktif dan durasi pemakaian |
| Tampil di atas aplikasi lain | Syarat agar layanan boleh menampilkan layar pengunci |
| Notifikasi | Menampilkan status pemantauan secara terbuka |
| Bebas optimasi baterai | Mencegah sistem menghentikan pemantauan |

## Catatan etika

Aplikasi ini dirancang untuk pengawasan yang terbuka, bukan penyadapan: ikonnya tetap
terlihat, notifikasi "LayarSehat aktif" selalu tampil, dan hanya metadata aplikasi
(nama paket, label, durasi) yang dikirim. Isi pesan, foto, kata sandi, dan riwayat
penjelajahan tidak pernah dibaca.
