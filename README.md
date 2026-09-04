# 🛒 Business Management System & POS (Point of Sale)

A modern, fast, and intuitive **Point of Sale (POS) & Business Management System** built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, and **Supabase**. Designed specifically for digital printing services (percetakan), retail, and small-to-medium enterprises (UMKM) to streamline transactions, manage inventory, track finances, and generate professional business reports.

---

## 🌟 Fitur Utama (Key Features)

### 1. ⚡ Kasir & Point of Sale (POS)
- **Pencarian Cepat & Kategori**: Temukan produk secara instan berdasarkan nama atau kategori.
- **Dukungan Barcode / SKU**: Pindai atau masukkan barcode/SKU untuk checkout cepat.
- **Keranjang Belanja Real-Time**: Atur kuantitas, hitung subtotal, diskon, dan total secara otomatis.
- **Multi Metode Pembayaran**: Mendukung pembayaran Tunai (Cash) dengan kalkulator kembalian otomatis serta Non-Tunai (QRIS / Transfer Bank).
- **Cetak Struk Thermal**: Format struk 58mm/80mm yang bersih dan profesional, dilengkapi logo bisnis dan catatan kaki kustom dari pengaturan.

### 2. 📦 Manajemen Produk & Katalog
- **Katalog Lengkap**: Kelola informasi produk, SKU, barcode, kategori, harga modal, dan harga jual.
- **Kalkulasi Margin Otomatis**: Menampilkan persentase keuntungan/margin kotor secara transparan.
- **Upload Foto Produk**: Mendukung unggah gambar produk langsung ke penyimpanan cloud (Supabase Storage).
- **Input Rupiah Otomatis**: Format angka rupiah otomatis dengan pemisah ribuan titik untuk kenyamanan input data.

### 3. 📊 Manajemen Stok & Inventaris
- **Pengurangan Stok Otomatis**: Setiap transaksi penjualan berhasil langsung memotong stok produk.
- **Penyesuaian Stok (Stock Adjustment)**: Catat mutasi stok masuk (restok), keluar, atau rusak/hilang beserta alasan/keterangan.
- **Peringatan Stok Rendah (Low Stock Alert)**: Indikator visual otomatis ketika stok mendekati batas minimum.

### 4. 💰 Manajemen Keuangan & Arus Kas (Cash Flow)
- **Pencatatan Pengeluaran**: Catat pengeluaran operasional dengan kategori (Gaji, Bahan Baku, Utilitas, Pemeliharaan, dll.).
- **Fitur Kunci Data 7 Hari (Anti-Manipulasi)**: Data pengeluaran yang berumur lebih dari 7 hari otomatis terkunci dan tidak dapat diedit untuk menjaga integritas data keuangan bisnis.
- **Ringkasan Laba / Rugi**: Pantau pendapatan kotor, total pengeluaran, dan laba bersih secara akurat.

### 5. 📑 Laporan & Analitik Bisnis
- **Dashboard Eksekutif Interaktif**: Metrik penjualan harian, tren pendapatan, rata-rata transaksi per hari, dan distribusi metode pembayaran.
- **Ekspor Riwayat Transaksi**: Unduh riwayat transaksi ke format file CSV untuk kebutuhan audit eksternal.
- **Cetak Laporan Profesional**: Tata letak cetak dokumen formal dilengkapi Kop Surat bisnis, tabel rincian transaksi, ringkasan keuangan, serta kolom tanda tangan pimpinan/penanggung jawab.

### 6. 👥 Manajemen Pengguna & Hak Akses (RBAC)
- **Multi-Role User**: Pemisahan peran antara **Admin / Pemilik** (akses penuh) dan **Kasir** (akses operasional POS & transaksi).
- **Keamanan Akun**: Pembuatan akun kasir terintegrasi dengan Supabase Auth secara aman.
- **Status Pengguna**: Kemudahan mengaktifkan atau menonaktifkan akun staf sewaktu-waktu.

### 7. ⚙️ Pengaturan Bisnis (Settings)
- **Profil Perusahaan / Toko**: Atur nama bisnis, slogan, alamat, nomor telepon, dan email.
- **Branding & Logo**: Unggah logo bisnis yang otomatis tampil pada Dashboard, Navbar, Struk Kasir, dan Kop Surat Laporan.
- **Pesan Struk Kustom**: Atur pesan penutup di struk (misal: garansi, ucapan terima kasih).

### 8. 📱 Responsif & PWA-Friendly
- Tampilan optimal di berbagai perangkat: Desktop, Tablet, hingga Layar Ponsel (Mobile).
- Dilengkapi navigasi bawah (bottom navigation bar) yang ramah sentuhan untuk operasional kasir portabel.

---

## 🛠️ Teknologi yang Digunakan (Tech Stack)

| Bagian | Teknologi |
| --- | --- |
| **Framework** | [Next.js 16.3](https://nextjs.org/) (App Router, Turbopack) |
| **Library UI** | [React 19](https://react.dev/) |
| **Bahasa** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Ikon** | [Lucide React](https://lucide.dev/) |
| **Backend & Database** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **Autentikasi** | Supabase Auth (Cookie-based session & SSR) |
| **File Storage** | Supabase Storage (Bucket: `assets`) |

---

## 📁 Struktur Direktori (Project Structure)

```text
├── app/                      # Next.js App Router (Halaman & Rute)
│   ├── (auth)/               # Rute autentikasi (Login)
│   ├── kasir/                # Antarmuka Kasir / Point of Sale
│   ├── produk/               # Manajemen Katalog & Tambah Produk
│   ├── stok/                 # Manajemen & Penyesuaian Stok
│   ├── transaksi/            # Riwayat Transaksi & Detail Struk
│   ├── keuangan/             # Pencatatan Pengeluaran & Arus Kas
│   ├── laporan/              # Laporan Penjualan & Cetak Dokumen Formal
│   ├── pengguna/             # Manajemen Pengguna & Kasir (RBAC)
│   ├── pengaturan/           # Profil Toko, Upload Logo, dan Pengaturan Sistem
│   ├── globals.css           # Konfigurasi Tailwind & Global Theme
│   ├── layout.tsx            # Root Layout dengan AppShell & Auth Provider
│   └── page.tsx              # Dashboard Utama & Grafik Analitik
├── components/               # Komponen UI Reusable
│   ├── app-shell.tsx         # Sidebar, Header, dan Mobile Bottom Navigation
│   └── ui/                   # Elemen antarmuka pendukung
├── lib/                      # Utilitas & Helper Functions
│   ├── format.ts             # Formatter Angka Rupiah, Tanggal, dan Parsing Input
│   └── supabase/             # Inisialisasi Supabase Client (Browser & Server SSR)
├── public/                   # Aset Statis (Logo, Ikon, Gambar)
└── proxy.ts                  # Middleware Proxy untuk Proteksi Rute & Autentikasi
```

---

## 🚀 Panduan Memulai (Getting Started)

### 1. Prasyarat (Prerequisites)
Pastikan sistem Anda telah terinstal:
- [Node.js](https://nodejs.org/) versi 20.x atau lebih baru
- Package Manager: `npm`, `pnpm`, atau `yarn`
- Akun [Supabase](https://supabase.com/)

### 2. Kloning Repositori
```bash
git clone https://github.com/ariftsx/Business-Management-System-POS.git
cd Business-Management-System-POS
```

### 3. Instal Dependensi
```bash
npm install
```

### 4. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Buka file `.env.local` dan masukkan URL serta Public Anon Key dari proyek Supabase Anda:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_publishable_key
```

### 5. Setup Database Supabase
Pastikan tabel database, RLS (Row Level Security), storage bucket `assets`, dan fungsi RPC (`create_new_user`, `update_user_profile`, `toggle_user_status`) telah diaplikasikan di dashboard Supabase Anda.

### 6. Jalankan Server Pengembangan
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

---

## 🔒 Keamanan (Security Best Practices)

- **Row Level Security (RLS)**: Seluruh tabel dilindungi oleh kebijakan RLS Supabase untuk memastikan akses data hanya diberikan kepada pengguna yang berhak.
- **Kunci Edit Pengeluaran 7 Hari**: Mencegah pemalsuan data pembukuan lampau oleh staf.
- **Hashing Kredensial**: Password akun staf dienkripsi secara aman dengan algoritma bcrypt tingkat lanjut via Supabase Auth.
- **Pemisahan Secret**: Token rahasia dan service role key tidak pernah disimpan pada client atau diikutsertakan dalam repository publik.

---

## 📄 Lisensi (License)

Proyek ini didistribusikan di bawah lisensi [MIT License](LICENSE). Anda bebas menggunakannya untuk kebutuhan komersial maupun pengembangan lebih lanjut.
