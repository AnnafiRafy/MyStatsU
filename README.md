# Anggota Kelompok
Kavka Yuza Gazetta                              103012400339
Annafi Rafy Kurnia Nurhakim                     103012400352
Rafa Khayzura Erlano Putra                      103012400269
I Made Ranadi Wijaya                            103012400390
Felly Adhiansyah Putra Nababan                  103012400129

# MyStatsU
MyStatsU adalah aplikasi web untuk memantau performa akademik mahasiswa. Aplikasi ini menyediakan pencatatan nilai, jam belajar, insight akademik, prediksi IPK, badge, notifikasi, serta halaman admin untuk mengelola mahasiswa.

## Fitur Utama

- Autentikasi mahasiswa dan admin menggunakan JWT.
- Registrasi dan login mahasiswa.
- Dashboard ringkasan aktivitas akademik.
- Manajemen nilai mata kuliah.
- Pencatatan dan pemantauan jam belajar.
- Insight akademik dan prediksi IPK.
- Badge pencapaian dan notifikasi.
- Panel admin untuk melihat, memverifikasi, dan menghapus data mahasiswa.
- Frontend statis HTML, CSS, dan JavaScript yang dilayani langsung oleh backend Express.

## Tech Stack

- Node.js
- Express.js
- Sequelize
- MySQL
- JSON Web Token
- HTML, CSS, JavaScript

## Struktur Proyek

```text
mystatsu/
├── backend/
│   ├── app.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── css/
│   ├── js/
│   └── *.html
├── .gitignore
└── README.md
```

## Prasyarat

Pastikan sudah menginstall:

- Node.js 18 atau versi yang lebih baru
- npm
- MySQL atau MariaDB
- Git

## Instalasi

Clone repository:

```bash
git clone https://github.com/Felllyy/MyStatsU.git
cd MyStatsU
```

Masuk ke folder backend dan install dependency:

```bash
cd backend
npm install
```

Buat file environment dari template:

```bash
cp .env.example .env
```

Sesuaikan isi file `.env`:

```env
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mystatsu
DB_USER=root
DB_PASS=
JWT_SECRET=change-this-secret
JWT_EXPIRES=24h
```

Buat database MySQL sesuai nilai `DB_NAME`:

```sql
CREATE DATABASE mystatsu;
```

Tabel akan dibuat otomatis oleh Sequelize ketika server dijalankan karena aplikasi memanggil `sequelize.sync()`.

## Menjalankan Aplikasi

Jalankan server dari folder `backend`:

```bash
npm start
```

Untuk mode development dengan auto-reload:

```bash
npm run dev
```

Aplikasi dapat dibuka di:

```text
http://localhost:3001
```

Backend Express juga melayani file frontend dari folder `frontend/`, sehingga halaman utama, dashboard, nilai, jam belajar, insight, prediksi, badge, dan notifikasi dapat diakses melalui server yang sama.

## Penggunaan Singkat

1. Buka `http://localhost:3001`.
2. Daftar sebagai mahasiswa atau login jika akun sudah tersedia.
3. Masukkan data nilai dan jam belajar melalui halaman yang tersedia.
4. Pantau ringkasan akademik pada dashboard.
5. Gunakan halaman prediksi, insight, badge, dan notifikasi untuk melihat perkembangan akademik.
6. Admin login dari formulir masuk yang sama menggunakan akun khusus, lalu mengelola data mahasiswa.

Akun admin tetap:

```text
Email: admin@tubes.ac.id
Password: admin123
```

## Endpoint API

Semua endpoint API menggunakan prefix:

```text
/api
```

Route utama:

- `POST /api/auth/register` - registrasi mahasiswa
- `POST /api/auth/login` - login mahasiswa atau admin berdasarkan akun
- `GET /api/auth/me` - mengambil profil user login
- `/api/nilai` - data nilai
- `/api/jam` - data jam belajar
- `/api/prediksi` - data prediksi akademik
- `/api/insight` - data insight akademik
- `/api/badge` - data badge
- `/api/notifikasi` - data notifikasi
- `/api/admin` - fitur admin

Endpoint yang membutuhkan autentikasi harus mengirim token pada header:

```text
Authorization: Bearer <token>
```

## Troubleshooting

Jika server gagal terhubung ke database:

- Pastikan MySQL atau MariaDB sedang berjalan.
- Pastikan database sudah dibuat.
- Pastikan `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, dan `DB_PASS` pada `.env` sudah benar.

Jika dependency belum tersedia:

```bash
cd backend
npm install
```

Jika port sudah digunakan, ubah nilai `PORT` pada file `.env`.

## Catatan Repository

File berikut tidak ikut dipush ke GitHub:

- `node_modules/`
- `.env`
- `.DS_Store`
- file log npm/yarn
- folder build, dist, dan coverage

Gunakan `.env.example` sebagai referensi konfigurasi lokal. Jangan commit kredensial asli atau secret production ke repository.
