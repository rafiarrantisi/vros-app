# VROS

**Vehicle Routing Optimization System untuk PT. Pindad International Logistic.**

Aplikasi web yang membantu tim operasional merencanakan pengiriman antar kota secara terorganisir. Manager dapat menerima order dari pelanggan, menjalankan optimasi rute otomatis berdasarkan kapasitas kendaraan dan jarak, lalu menugaskan rute kepada supir. Pelanggan dan manager dapat memantau posisi pengiriman secara real-time selama supir dalam perjalanan.

**URL Aplikasi:** https://vros-app.vercel.app/

---

## Daftar Isi

1. [Latar Belakang dan Tujuan](#1-latar-belakang-dan-tujuan)
2. [Fitur Utama](#2-fitur-utama)
3. [Akses dan Akun Demo](#3-akses-dan-akun-demo)
4. [Panduan Pengguna per Peran](#4-panduan-pengguna-per-peran)
5. [Algoritma Optimasi Rute](#5-algoritma-optimasi-rute)
6. [Stack Teknologi](#6-stack-teknologi)
7. [Struktur Repositori](#7-struktur-repositori)
8. [Skema Basis Data](#8-skema-basis-data)
9. [Privasi Data dan Hak Akses](#9-privasi-data-dan-hak-akses)
10. [Pengembangan Lokal](#10-pengembangan-lokal)
11. [Proses Deployment](#11-proses-deployment)
12. [Operasi Reguler](#12-operasi-reguler)

---

## 1. Latar Belakang dan Tujuan

PT. Pindad International Logistic mengelola pengiriman barang dari depot Bandung ke tiga koridor utama, yaitu Jakarta, Surabaya, dan Malang. Setiap periode tertentu, tim operasional menerima sejumlah purchase order dari pelanggan dan harus menentukan kombinasi pesanan yang dimuat di kendaraan mana, serta urutan kunjungan yang paling efisien. Keputusan ini berpengaruh langsung pada total kilometer tempuh, biaya bahan bakar, utilisasi armada, dan ketepatan waktu pengiriman.

VROS dirancang untuk mengotomatiskan proses keputusan tersebut. Sistem mengambil seluruh order yang berstatus pending, menjalankan algoritma optimasi rute, lalu menyajikan saran rute yang sudah memperhitungkan kapasitas berat, kapasitas volume, dan total jarak. Manager memiliki kendali penuh untuk mengkonfirmasi atau membatalkan saran tersebut sebelum rute diberikan kepada supir.

Tujuan akhir aplikasi:

* Menurunkan total kilometer tempuh per periode pengiriman.
* Menaikkan utilisasi kapasitas kendaraan.
* Memberikan visibilitas posisi pengiriman kepada pelanggan dan manager secara real-time.
* Menjaga kerapian data master (akun, kendaraan, pelanggan, jarak antar kota) lewat antarmuka admin yang terstruktur.

---

## 2. Fitur Utama

**Manajemen Order.** Form input order menampilkan rincian per produk (berat, kuantitas) dan per kemasan (panjang, lebar, tinggi, jumlah kemasan). Total berat dan total volume dihitung otomatis oleh sistem, sehingga manager tidak perlu menghitung manual.

**Optimasi Rute Otomatis.** Sekali klik, sistem mengelompokkan order pending menjadi beberapa draft rute yang feasible terhadap kapasitas kendaraan, sambil meminimalkan total jarak tempuh. Animasi tujuh tahap algoritma ditampilkan untuk transparansi proses.

**Pelacakan Live.** Saat supir memperbarui posisinya di salah satu checkpoint koridor, perubahan tersebut langsung muncul di portal pelanggan dan halaman tracking manager tanpa perlu refresh halaman.

**Privasi Data Berbasis Peran.** Pelanggan hanya melihat order miliknya sendiri. Supir hanya melihat rute yang ditugaskan kepadanya. Pemisahan ini ditegakkan di tingkat basis data, bukan hanya di tampilan, sehingga tidak dapat ditembus dengan mengakses URL secara langsung.

**Laporan Operasional.** Tiga laporan dasar tersedia untuk manager: performa pengiriman (on-time vs late), utilisasi kendaraan, dan distribusi jarak per koridor.

**Manajemen Master Data.** Administrator memiliki halaman terpisah untuk mengelola akun pengguna, master kendaraan, master pelanggan, dan matriks jarak antar kota.

---

## 3. Akses dan Akun Demo

Login menggunakan kombinasi *username* dan *password* di halaman https://vros-app.vercel.app/login.

Pada lingkungan demo tersedia akun untuk setiap peran:

| Peran                | Username         | Password   | Halaman Awal           |
|----------------------|------------------|------------|------------------------|
| Manager Operasional  | `manager01`      | `mgr123`   | Dashboard              |
| Administrator        | `admin01`        | `admin123` | User Accounts          |
| Customer             | `cv.mitausaha`   | `cust123`  | Portal Pelanggan       |
| Driver               | `driver01`       | `drv123`   | Portal Supir           |

Daftar lengkap (2 manager, 1 admin, 5 customer, 3 driver) terdapat di file `supabase/seed.ts`. Untuk mencoba fitur live tracking, login sebagai driver di satu browser dan sebagai customer atau manager di browser lain, lalu lakukan update lokasi dari sisi driver.

---

## 4. Panduan Pengguna per Peran

### 4.1 Manager Operasional

Manager memiliki akses penuh terhadap data operasional. Menu yang tersedia di sidebar:

* **Dashboard.** Ringkasan KPI mingguan: jumlah order aktif, persentase on-time, utilisasi armada, total kilometer.
* **Delivery Orders.** Daftar seluruh purchase order. Tombol *New Order* membuka form input dengan struktur berat per produk, kuantitas, dimensi per kemasan, dan jumlah kemasan. Total berat dan total volume terkalkulasi otomatis.
* **Route Optimizer.** Halaman utama untuk menjalankan optimasi rute. Memilih order pending lalu menekan *Run CVRP* akan menampilkan animasi proses algoritma, diikuti daftar draft rute yang dapat dikonfirmasi.
* **Delivery Status.** Pusat aktivitas setelah rute dikonfirmasi. Tiga aksi yang tersedia di sini: (1) *Assign Driver*, memilih supir yang akan menjalankan rute, dengan peringatan bila supir sudah memegang rute aktif lain; (2) *Ganti / Lepas Assignment*, mengubah atau melepas supir dari rute; (3) *On-Time / Late*, menandai outcome akhir saat pengiriman selesai. Saat supir di-assign, status rute otomatis berpindah dari `confirmed` ke `in-transit` dan supir langsung dapat melihat rute tersebut di portalnya.
* **Live Tracking.** Daftar semua supir yang sedang dalam perjalanan, lengkap dengan progress bar dan timeline checkpoint. Update otomatis tanpa perlu refresh.
* **Plan History.** Arsip seluruh route plan yang pernah dijalankan.
* **Performance Report.** Distribusi pengiriman on-time vs late.
* **Utilization Report.** Persentase pemakaian kapasitas tiap kendaraan.
* **Distance Report.** Total kilometer per koridor.

### 4.2 Administrator

Administrator bertanggung jawab atas data master sistem.

* **User Accounts.** Pengelolaan akun untuk semua peran. Tab terpisah untuk akun internal (manager, admin), akun pelanggan, dan akun supir.
* **Vehicle Master.** Empat jenis kendaraan tersedia: Towing, CDD Box, Fuso Bak, CDE Box. Setiap kendaraan memiliki kapasitas berat (ton) dan kapasitas volume (m³) yang dipakai oleh algoritma optimasi.
* **Customer Master.** Data pelanggan beserta tujuan pengiriman default.
* **Distance Matrix.** Matriks jarak antar kota (Bandung, Jakarta, Surabaya, Malang). Bersifat simetris, sehingga update jarak A ke B juga otomatis memperbarui jarak B ke A.

### 4.3 Customer (Pelanggan)

Portal pelanggan tersusun dalam dua tab.

* **My Orders.** Daftar order milik pelanggan tersebut, beserta status pengirimannya.
* **Track Driver.** Aktif ketika ada order berstatus *in-transit*. Pelanggan melihat posisi terkini supir di sepanjang koridor pengirimannya, lengkap dengan timestamp update terakhir dan catatan supir bila ada.

Pelanggan tidak dapat melihat order milik perusahaan lain meskipun mengakses URL secara langsung.

### 4.4 Driver (Supir)

Portal supir tersusun dalam dua tab.

* **My Route.** Detail rute yang sedang dikerjakan, mencakup daftar pesanan yang dibawa, urutan kunjungan, dan total muatan.
* **Update Location.** Form untuk memperbarui posisi terkini. Supir memilih checkpoint mana yang sedang dilewati lalu dapat menambahkan catatan singkat (misalnya kondisi lalu lintas atau perkiraan kendala). Update ini langsung terlihat oleh pelanggan dan manager.

---

## 5. Algoritma Optimasi Rute

VROS menggunakan dua algoritma yang dirangkai secara berurutan.

**Tahap pertama: Clarke-Wright Savings Algorithm.** Algoritma klasik untuk Capacitated Vehicle Routing Problem. Logikanya, setiap order awalnya dianggap sebagai rute terpisah dari depot ke tujuan dan kembali. Kemudian sistem menghitung *savings* dari penggabungan dua rute, yaitu seberapa banyak kilometer yang dihemat jika kedua order dimuat di satu kendaraan. Pasangan dengan savings tertinggi digabung terlebih dahulu, dengan syarat hasil gabungan tidak melebihi kapasitas berat dan kapasitas volume kendaraan yang tersedia.

**Tahap kedua: Brute-force Sequencing.** Setelah rute terbentuk, urutan kunjungan dalam rute tersebut dioptimalkan dengan mencoba seluruh permutasi yang mungkin lalu memilih yang total jaraknya paling pendek. Pendekatan brute force layak dipakai di sini karena jumlah stop per rute umumnya kecil (dua hingga empat lokasi), sehingga jumlah permutasi tetap terkendali.

Implementasi algoritma berada di `lib/cvrp.ts` dalam bentuk pure function, yaitu fungsi yang tidak melakukan I/O dan menerima seluruh input lewat parameter. Eksekusi optimasi dilakukan di sisi server pada endpoint `app/api/optimize/route.ts` agar perhitungan tidak membebani browser dan agar data master (kapasitas kendaraan, matriks jarak) selalu dibaca dari sumber resmi.

---

## 6. Stack Teknologi

| Layer                  | Teknologi                                          |
|------------------------|----------------------------------------------------|
| Framework aplikasi     | Next.js 16 (App Router, Turbopack, React 19)       |
| Bahasa pemrograman     | TypeScript                                         |
| Basis data             | PostgreSQL (Supabase)                              |
| Otentikasi             | Supabase Auth (email + password)                   |
| Push real-time         | Supabase Realtime via channel `postgres_changes`   |
| Penyimpanan state      | React `useState` + `useEffect`, tanpa state manager eksternal |
| Hosting aplikasi       | Vercel, auto-deploy on push to branch `main`       |
| Hosting basis data     | Supabase Cloud, region Singapore (ap-southeast-1)  |
| Styling                | Inline style native React, tanpa CSS framework     |
| Tipografi              | DM Sans + DM Mono via `next/font`                  |

---

## 7. Struktur Repositori

```
vros-app/
├── app/                                    Halaman dan route Next.js
│   ├── layout.tsx                          Root layout (font, global CSS)
│   ├── globals.css                         Style global
│   ├── page.tsx                            Redirect awal sesuai peran
│   ├── (auth)/
│   │   └── login/page.tsx                  Halaman login
│   ├── (app)/                              Layout dengan sidebar (manager + admin)
│   │   ├── layout.tsx
│   │   ├── manager/
│   │   │   ├── dashboard/page.tsx          KPI dashboard
│   │   │   ├── orders/page.tsx             Manajemen delivery order
│   │   │   ├── optimizer/page.tsx          Eksekusi CVRP + konfirmasi rute
│   │   │   ├── delivery/page.tsx           Update status route plan
│   │   │   ├── tracking/page.tsx           Live tracking semua supir
│   │   │   ├── plans/page.tsx              Arsip route plan
│   │   │   ├── reports-performance/page.tsx
│   │   │   ├── reports-utilization/page.tsx
│   │   │   └── reports-distance/page.tsx
│   │   └── admin/
│   │       ├── accounts/page.tsx           CRUD akun pengguna
│   │       ├── vehicles/page.tsx           Master kendaraan
│   │       ├── customers/page.tsx          Master pelanggan
│   │       └── distances/page.tsx          Matriks jarak antar kota
│   ├── (portal)/                           Layout full-screen tanpa sidebar
│   │   ├── layout.tsx
│   │   ├── customer/page.tsx               Portal pelanggan
│   │   └── driver/page.tsx                 Portal supir
│   └── api/                                Endpoint server-side
│       ├── optimize/route.ts               Eksekusi CVRP
│       └── admin/users/route.ts            CRUD pengguna (perlu service-role)
│
├── components/                             Komponen UI yang dipakai berulang
│   ├── Sidebar.tsx                         Navigasi kiri (manager + admin)
│   ├── TopBar.tsx                          Header atas
│   ├── Icon.tsx                            Library SVG icon
│   ├── Card.tsx                            Container surface dengan shadow
│   ├── Badge.tsx, StatusBadge.tsx          Indikator status berwarna
│   ├── KPICard.tsx                         Card metrik di dashboard
│   ├── FormInput.tsx, FormSelect.tsx       Komponen form
│   ├── Modal.tsx                           Dialog overlay
│   ├── Btn.tsx                             Tombol primer, danger, ghost
│   ├── CapBar.tsx                          Bar kapasitas (di optimizer)
│   └── EmptyState.tsx                      Tampilan kosong dengan ikon dan pesan
│
├── lib/                                    Helper logika aplikasi
│   ├── supabase/
│   │   ├── client.ts                       Supabase client untuk sisi browser
│   │   ├── server.ts                       Supabase client untuk SSR
│   │   ├── middleware.ts                   Helper auth di middleware
│   │   └── admin.ts                        Service-role client (untuk admin user CRUD)
│   ├── cvrp.ts                             Implementasi algoritma rute (pure function)
│   ├── constants.ts                        TODAY, DEPOT, CORRIDORS, ROLE_HOME
│   ├── types.ts                            Tipe TypeScript untuk semua tabel
│   ├── auth.ts                             signIn(username, password), signOut()
│   └── nav.ts                              Konfigurasi item sidebar per peran
│
├── supabase/                               Konfigurasi basis data
│   ├── migrations/
│   │   ├── 0001_init.sql                   Skema awal (8 tabel + RLS + Realtime)
│   │   └── 0002_quantity_packaging.sql     Tambahan kolom per produk dan per kemasan
│   └── seed.ts                             Data demo (jalankan via npm run seed)
│
├── middleware.ts                           Auth gate global di semua route
├── .env.local.example                      Template environment variables
├── package.json                            Daftar dependencies dan npm scripts
└── README.md                               Dokumen ini
```

### Konvensi Penataan File

Halaman dikelompokkan dengan **route group** Next.js (folder dalam tanda kurung) sehingga layout yang dipakai bisa berbeda tanpa mempengaruhi URL. Tiga group yang dipakai:

* `(auth)` untuk halaman login, tanpa sidebar.
* `(app)` untuk halaman manager dan admin, dengan sidebar dan topbar.
* `(portal)` untuk halaman pelanggan dan supir, full-screen tanpa sidebar.

Komponen reusable diletakkan di `components/` dan diimpor dengan path alias `@/components/...`. Helper non-UI diletakkan di `lib/`.

---

## 8. Skema Basis Data

Total delapan tabel di skema `public`:

| Tabel               | Isi                                                              |
|---------------------|------------------------------------------------------------------|
| `users`             | Profil pengguna, terhubung ke `auth.users` Supabase              |
| `customers`         | Master data pelanggan                                            |
| `vehicles`          | Master data armada beserta kapasitas berat dan volume            |
| `checkpoints`       | Daftar titik singgah per koridor (tiga koridor, enam checkpoint masing-masing) |
| `distances_matrix`  | Matriks jarak antar kota (simetris)                              |
| `orders`            | Purchase order dari pelanggan                                    |
| `route_plans`       | Rute hasil optimasi CVRP                                         |
| `driver_locations`  | Posisi terkini supir, dipakai untuk live tracking                |

### Rincian Tabel `orders`

Tabel paling banyak kolomnya. Beberapa kolom kunci:

| Kolom                       | Tipe       | Keterangan                                                 |
|-----------------------------|------------|------------------------------------------------------------|
| `id`                        | text       | Format `PO-2026-001`                                       |
| `customer_id`               | text       | Foreign key ke `customers`                                 |
| `dest`                      | text       | Tujuan: Jakarta, Surabaya, atau Malang                     |
| `weight_per_product_kg`     | numeric    | Berat satu unit produk dalam kg                            |
| `quantity`                  | int        | Jumlah unit produk                                         |
| `length_per_pkg_m`          | numeric    | Panjang satu kemasan dalam meter                           |
| `width_per_pkg_m`           | numeric    | Lebar satu kemasan dalam meter                             |
| `height_per_pkg_m`          | numeric    | Tinggi satu kemasan dalam meter                            |
| `total_packaging`           | int        | Jumlah kemasan dalam pesanan                               |
| `weight_ton`                | numeric    | Total berat dalam ton, dipakai oleh algoritma CVRP         |
| `vol_m3`                    | numeric    | Total volume dalam m³, dipakai oleh algoritma CVRP         |
| `status`                    | enum       | `pending`, `confirmed`, `in-transit`, `delivered`          |
| `route_plan_id`             | text       | Diisi setelah order masuk ke route plan                    |
| `driver_id`                 | uuid       | Supir yang ditugaskan                                      |

Total berat dan total volume dihitung di sisi form (`Weight per Product × Quantity` dan `L × W × H × Total Packaging`) lalu disimpan ke kolom `weight_ton` dan `vol_m3` untuk dibaca algoritma. Kombinasi penyimpanan rinci dan total ini memungkinkan tampilan ringkasan tanpa kehilangan informasi per produk.

---

## 9. Privasi Data dan Hak Akses

Privasi diatur dengan Row Level Security (RLS) pada PostgreSQL Supabase. Aturan ini berlaku di tingkat basis data, sehingga query yang dijalankan dari browser tetap terbatas meskipun pengguna mencoba memanggil API langsung.

| Tabel              | Manager / Admin | Customer                              | Driver                                |
|--------------------|-----------------|---------------------------------------|---------------------------------------|
| `orders`           | Semua baris     | Hanya baris dengan `customer_id` cocok | Hanya baris dengan `driver_id` cocok |
| `route_plans`      | Semua baris     | Semua baris (read)                    | Hanya baris dengan `driver_id` cocok |
| `driver_locations` | Semua baris     | Semua baris (read)                    | Hanya baris milik dirinya (write)    |
| `users`            | Semua baris     | Hanya profil dirinya                  | Hanya profil dirinya                 |

Customer dan driver tetap dapat melihat data yang dibutuhkan untuk tracking (semua `driver_locations` boleh di-read agar progres terlihat), namun tidak dapat menulis ke data tersebut. Hanya driver pemilik yang boleh melakukan write ke posisinya sendiri.

Otentikasi memakai email sintetis dengan format `username@vros.local` agar pengguna cukup mengingat username tanpa memerlukan email asli. Konfirmasi email dimatikan pada konfigurasi Supabase Auth, sesuai konteks demo. Untuk produksi, konfigurasi tersebut dapat dinaikkan tanpa mengubah kode aplikasi.

---

## 10. Pengembangan Lokal

### Prasyarat

* Node.js versi 20 atau lebih baru
* npm
* Akun Supabase (gratis)

### Langkah Setup

```bash
# 1. Clone repositori
git clone https://github.com/rafiarrantisi/vros-app.git
cd vros-app

# 2. Pasang dependencies
npm install

# 3. Salin template environment variable
cp .env.local.example .env.local
```

Lengkapi `.env.local` dengan tiga nilai dari Supabase Dashboard di Settings > API:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Apply Skema dan Data Demo

Buka Supabase Dashboard project Anda, masuk ke **SQL Editor**. Jalankan dua file migration secara berurutan:

1. Paste isi `supabase/migrations/0001_init.sql`, klik *Run*. Hasil yang diharapkan: *Success. No rows returned*.
2. Paste isi `supabase/migrations/0002_quantity_packaging.sql`, klik *Run*. Hasil yang sama.

Setelah skema terbentuk, isi data demo:

```bash
npm run seed
```

Script ini akan membuat akun-akun demo di Supabase Auth, lalu mengisi tabel master dan data transaksi.

### Menjalankan Dev Server

```bash
npm run dev
```

Aplikasi tersedia di http://localhost:3000. Login dengan salah satu akun demo dari tabel di Bagian 3.

---

## 11. Proses Deployment

Deployment dikonfigurasi otomatis lewat Vercel. Alur singkatnya:

1. Developer melakukan commit dan push ke branch `main` di GitHub.
2. Vercel mendeteksi perubahan dan mulai build process di server mereka.
3. Vercel menjalankan `npm install` lalu `npm run build`.
4. Setelah build sukses, Vercel mempromosikan deployment baru ke production URL `https://vros-app.vercel.app/`.
5. Total waktu dari push hingga live sekitar dua menit.

Environment variables (Supabase URL, anon key, service role key) di-set sekali di Vercel Project Settings dan diwariskan ke seluruh deployment baru tanpa intervensi manual.

Branch selain `main` (kalau ada) akan menghasilkan *preview deployment* dengan URL unik yang berbeda, sehingga perubahan dapat dicoba dahulu sebelum di-merge.

---

## 12. Operasi Reguler

### Re-seed Data Demo

Bila data demo perlu direset (misalnya setelah uji coba yang banyak menulis data):

```bash
npm run seed
```

Script ini idempotent. Akun di `auth.users` yang sudah ada akan di-skip, sedangkan tabel data akan di-truncate dan diisi ulang. Aman dijalankan berulang kali.

### Menambah Migrasi Skema Baru

1. Buat file di `supabase/migrations/` dengan nama `0003_<deskripsi>.sql` (mengikuti urutan).
2. Tulis perintah SQL: `ALTER TABLE`, `CREATE TABLE`, dan lain-lain.
3. Buka Supabase SQL Editor, paste, lalu *Run*.
4. Sesuaikan `lib/types.ts` jika ada perubahan tipe data.
5. Sesuaikan `supabase/seed.ts` jika ada kolom baru yang perlu di-isi saat seeding.

### Mengganti Password Akun Demo

1. Edit array `USERS` di `supabase/seed.ts`, ubah field `password`.
2. Hapus user terkait di Supabase Dashboard > Authentication > Users.
3. Jalankan `npm run seed` untuk membuat ulang akun dengan password baru.

### Menambahkan Pengguna Baru Lewat UI

Login sebagai administrator, masuk ke menu **User Accounts**, klik *Add User*. Pilih peran, isi nama, username, dan password. Akun langsung dapat dipakai login.

### Memantau Aplikasi Setelah Deployment

* **Vercel Dashboard.** https://vercel.com/dashboard, pilih project `vros-app`, tab *Deployments* untuk melihat status build dan log runtime.
* **Supabase Dashboard.** https://supabase.com/dashboard, pilih project, tab *Database* untuk inspeksi tabel, *Auth* untuk daftar pengguna, *Logs* untuk audit query.

---

## Lisensi

Hak cipta PT. Pindad International Logistic. Penggunaan dan distribusi terbatas pada pihak yang berwenang.
