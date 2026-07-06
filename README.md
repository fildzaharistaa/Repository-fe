# Campus Repository System — Frontend

Aplikasi web frontend untuk Campus Repository System FIK UPNVJ. Dibangun dengan Next.js 16 App Router, memberikan antarmuka lengkap untuk manajemen file, folder, pengguna, dan kontrol akses berbasis role.

---

## Project Overview

**Tujuan:** Menyediakan antarmuka pengguna yang responsif dan aman untuk sistem repository kampus, mendukung alur kerja manajemen file multi-role dari mahasiswa biasa hingga super administrator.

**Target Pengguna:**
- Mahasiswa/Dosen/Tendik: Mengelola file dalam workspace mereka
- Admin Fakultas: Mengelola pengguna dan hak akses folder
- Super Admin: Mengkonfigurasi role, permission, dan pengaturan sistem

**URL Produksi:** `https://dashboard.repository-upnvj.online`

> **Catatan:** Frontend ini memerlukan backend (`Repository-be`) yang sudah berjalan. Pastikan backend sudah di-deploy dan `NEXT_PUBLIC_API_BASE_URL` mengarah ke URL backend yang benar.

---

## Prerequisites

| Software | Versi Minimum | Keterangan |
|----------|--------------|------------|
| **Node.js** | 18.x | Runtime JavaScript |
| **npm** | 9.x | Package manager |
| **Repository-be** | — | Backend harus sudah berjalan |

---

## Tech Stack

| Teknologi | Versi | Keterangan |
|-----------|-------|------------|
| **Next.js** | 16.1.4 | React framework dengan App Router |
| **React** | 19.2.3 | UI library |
| **TypeScript** | 5 | Type safety, strict mode |
| **Tailwind CSS** | 4 | Utility-first CSS framework |
| **PostCSS** | 4 | CSS processing |
| **lucide-react** | 0.468.0 | Icon library |
| **react-hot-toast** | 2.6.0 | Toast notifications |
| **mammoth** | 1.12.0 | Preview dokumen Word (.docx) |
| **xmlbuilder** | 15.1.1 | Generasi XML |
| **zod** | 4.4.3 | Schema validation |
| **underscore** | 1.13.8 | Utility functions |
| **ESLint** | 9 | Linting |

**Font:** Geist & Geist Mono (dari Google Fonts)

---

## Features

### 1. Autentikasi & Otorisasi
- Login dengan email dan password (JWT)
- Token disimpan di `localStorage`, otomatis dihapus saat logout atau 401
- Protected routes — redirect otomatis ke `/login` jika belum autentikasi
- Pengecekan permission berbasis slug (contoh: `file.upload`, `folder.create`)
- Dukungan wildcard permission (`*`, `module.*`)

### 2. Dashboard & Statistik
- Tampilan statistik personal (jumlah folder, file, ukuran storage)
- Super admin dashboard dengan stats seluruh sistem
- Overview folder dengan recursive count (subfolder & file)
- File terbaru (recent files)
- Indikator file tidak aktif (tidak diakses >5 tahun)

### 3. Manajemen Folder
- Struktur folder hierarki (tree view)
- Buat, edit, hapus folder
- Dukungan nested folder dengan batas kedalaman per role
- Lazy loading folder children untuk performa
- Statistik per folder (jumlah file, subfolder, ukuran)

### 4. Manajemen File
- Upload file ke folder tertentu
- Download file
- Preview file inline: gambar, PDF, Word (.docx), Excel, PowerPoint
- Rename file
- Soft-delete (masuk recycle bin, bukan langsung hapus)
- Tracking akses terakhir (`last_accessed_at`)
- Deteksi file tidak aktif (badge visual)

### 5. Multi-Role & Role Switching
- Satu user dapat memiliki beberapa role (contoh: "Dosen" sekaligus "WD2")
- Dropdown switcher untuk berpindah role aktif tanpa logout
- Setiap role punya workspace (folder tree) yang terisolasi
- Role dapat di-suspend dengan alasan, memerlukan reaktivasi

### 6. Shared Folders & Shared Files
- Tampilkan folder yang di-share ke role/user tertentu
- Tampilkan file yang di-share langsung ke pengguna
- Tree navigasi khusus untuk shared content

### 7. Share Link (Public Link)
- Generate link publik untuk file atau folder
- Pilihan access level: `anyone` atau `organization`
- Pilihan permission: `view` atau `download`
- Support expiration date
- Halaman `/share/[token]` dapat diakses tanpa login
- Preview & download via share link tanpa autentikasi

### 8. Access Request
- User dapat meminta akses ke folder/file yang dibatasi
- Pemilik folder menerima notifikasi dan dapat approve/reject
- Persetujuan otomatis membuat permission baru
- User dapat meminta peningkatan kedalaman hierarki folder

### 9. Notifikasi
- Bell icon dengan badge jumlah notifikasi belum dibaca
- Notifikasi untuk: access request baru, approval/rejection, pending reaktivasi role
- Modal approval permission langsung dari notifikasi

### 10. Recycle Bin
- Tampilkan semua file & folder yang dihapus (soft delete)
- Restore item ke lokasi semula
- Permanent delete (hapus permanen dari sistem)
- Tanggal penghapusan ditampilkan

### 11. Pencarian Global
- Cari folder dan file di seluruh sistem
- Hasil pencarian mempertimbangkan hak akses user

### 12. Manajemen Pengguna (Admin)
- List pengguna dengan pagination
- Buat, edit, hapus pengguna
- Assign role ke pengguna

### 13. Manajemen Permission (Admin)
- Assign/edit/hapus permission pada folder tertentu
- Pilihan permission: read, create, update, delete, download
- Dapat assign ke role atau user spesifik
- Support expiration date per permission

### 14. Super Admin Panel
- Buat/edit/hapus role dinamis
- Buat/edit/hapus permission dinamis
- Matrix role-permission (assign permission ke role)
- Assign/suspend/reaktivasi role untuk user
- Clone role beserta seluruh permissionnya

### 15. System Settings
- Konfigurasi max ukuran upload file (1–500 MB)
- Pengaturan tersimpan di backend (persistent)
- Hanya dapat diakses Super Admin

---

## Folder Structure

```
Repository-fe/
├── app/                              # Next.js App Router (file-based routing)
│   ├── layout.tsx                    # Root layout dengan providers
│   ├── page.tsx                      # Home page (redirect ke dashboard/login)
│   ├── globals.css                   # Global styles
│   ├── dashboard/
│   │   ├── page.tsx                  # Halaman dashboard utama
│   │   └── components/
│   │       └── FileList.tsx
│   ├── login/
│   │   ├── page.tsx                  # Halaman login
│   │   └── components/
│   │       └── Login.tsx
│   ├── users/
│   │   ├── page.tsx                  # Manajemen user (admin)
│   │   └── components/
│   │       ├── UserManagement.tsx
│   │       └── AddUserModal.tsx
│   ├── permissions/
│   │   ├── page.tsx                  # Manajemen permission folder (admin)
│   │   └── components/
│   │       └── PermissionManagement.tsx
│   ├── super-admin/
│   │   ├── page.tsx                  # Super admin dashboard
│   │   └── components/
│   │       ├── DynamicRoleManager.tsx
│   │       ├── PermissionManager.tsx
│   │       ├── RolePermissionMatrix.tsx
│   │       └── UserRoleAssignment.tsx
│   ├── system-settings/
│   │   └── page.tsx                  # Pengaturan sistem (super admin)
│   └── share/
│       └── [token]/
│           └── page.tsx              # Public share link viewer (no auth)
│
├── components/                       # Reusable React components
│   ├── Layout.tsx                    # Layout utama (sidebar + header)
│   ├── FolderTree.tsx                # Navigasi pohon folder
│   ├── FolderModal.tsx               # Modal buat/edit folder
│   ├── FileUpload.tsx                # Komponen upload file
│   ├── FileList.tsx                  # Daftar file dalam folder
│   ├── FilePreview.tsx               # Preview file inline
│   ├── FileIcon.tsx                  # Ikon berdasarkan tipe file
│   ├── GlobalSearch.tsx              # Search bar global
│   ├── ProtectedRoute.tsx            # Wrapper proteksi route
│   ├── RoleSwitcher.tsx              # Dropdown switch role
│   ├── NotificationBell.tsx          # Notifikasi & bell icon
│   ├── ShareLinkModal.tsx            # Generate share link
│   ├── ConfirmModal.tsx              # Dialog konfirmasi
│   ├── DashboardStats.tsx            # Kartu statistik dashboard
│   ├── AllFoldersView.tsx            # Tampilan semua folder
│   ├── AllFilesView.tsx              # Tampilan semua file
│   ├── SharedFoldersView.tsx         # Tampilan folder yang dishare
│   ├── SharedFilesView.tsx           # Tampilan file yang dishare
│   ├── RecentFilesView.tsx           # File yang baru diakses
│   ├── RecycleBinView.tsx            # Recycle bin
│   ├── FolderOverviewSection.tsx     # Overview statistik folder
│   ├── SuperAdminDashboard.tsx       # Dashboard super admin
│   └── InactiveBadge.tsx            # Badge file tidak aktif
│
├── context/                          # React Context API
│   ├── AuthContext.tsx               # Auth state, roles, permissions, JWT
│   └── FolderContext.tsx             # State navigasi folder aktif
│
├── hooks/                            # Custom React hooks
│   ├── useAuth.ts                    # Login & logout
│   ├── useAuthContext.ts             # Consumer AuthContext
│   ├── useFolders.ts                 # CRUD folder
│   ├── useFolderChildren.ts          # Load children folder
│   ├── useFolderOverview.ts          # Statistik folder
│   ├── useFiles.ts                   # CRUD file
│   ├── useAllFiles.ts                # Semua file user
│   ├── useSharedFolders.ts           # Folder yang dishare
│   ├── useSharedFiles.ts             # File yang dishare
│   ├── useUsers.ts                   # Manajemen user (admin)
│   ├── useRoles.ts                   # Manajemen role
│   └── usePermissions.ts             # Manajemen permission
│
├── lib/                              # Utilities & helpers
│   ├── api/
│   │   ├── client.ts                 # API client (semua endpoint)
│   │   └── logger.ts                 # API logging utility
│   └── utils/
│       ├── errorHandler.ts           # Error handling
│       ├── formatters.ts             # Format tanggal & ukuran file
│       └── filePermissions.ts        # Utilitas permission file
│
├── types/
│   └── index.ts                      # Semua TypeScript type definitions
│
├── public/                           # Static assets
├── .env                              # Environment variables
├── env.example                       # Template environment variables
├── next.config.ts                    # Konfigurasi Next.js
├── tsconfig.json                     # Konfigurasi TypeScript
├── postcss.config.mjs                # Konfigurasi PostCSS
└── package.json                      # Dependencies & scripts
```

---

## Routes

| Route | Akses | Deskripsi |
|-------|-------|-----------|
| `/` | Publik | Redirect ke `/dashboard` atau `/login` |
| `/login` | Publik | Form login email & password |
| `/dashboard` | Login | Dashboard utama dengan folder tree & file management |
| `/users` | Admin | Manajemen pengguna |
| `/permissions` | Admin | Manajemen permission folder |
| `/super-admin` | Super Admin | Manajemen role, permission, dan user-role |
| `/system-settings` | Super Admin | Pengaturan sistem |
| `/share/[token]` | Publik | Viewer share link (tanpa login) |

---

## Environment Variables

Buat file `.env` di root `Repository-fe/`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3031/api
```

| Variable | Wajib | Deskripsi |
|----------|-------|-----------|
| `NEXT_PUBLIC_API_BASE_URL` | Ya | Base URL backend API. Awali dengan `NEXT_PUBLIC_` agar tersedia di browser. |

**Catatan:** Untuk production, ganti dengan URL backend production:
```env
NEXT_PUBLIC_API_BASE_URL=https://api.repository-upnvj.online
```

---

## Quick Start (Local Development)

```bash
# 1. Masuk ke direktori frontend
cd Repository-fe

# 2. Install dependencies
npm install

# 3. Salin template environment
cp env.example .env
# Isi NEXT_PUBLIC_API_BASE_URL=http://localhost:3031/api

# 4. Jalankan development server
npm run dev
```

Aplikasi berjalan di `http://localhost:3000`. Pastikan backend sudah berjalan di port `3031`.

---

## Installation

```bash
# Masuk ke direktori frontend
cd Repository-fe

# Install semua dependencies
npm install
```

---

## Running Development

```bash
npm run dev
```

Aplikasi berjalan di `http://localhost:3000`.

Next.js akan melakukan hot-reload otomatis saat ada perubahan file.

---

## Build Production

```bash
# Build aplikasi
npm run build

# Jalankan production server
npm start
```

Server production berjalan di port `3000` secara default.

---

## Deployment Guide

### Vercel (Direkomendasikan)

1. Push folder `Repository-fe` ke repository GitHub
2. Login ke [vercel.com](https://vercel.com) dan klik **Add New Project**
3. Import repository tersebut
4. Set **Root Directory** ke `Repository-fe` (jika monorepo)
5. Tambahkan environment variable:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://api.repository-upnvj.online`
6. Klik **Deploy**

Vercel akan otomatis mendeteksi Next.js dan mengonfigurasi build pipeline.

---

### VPS (Ubuntu/Debian)

**Prasyarat:** Node.js v18+, PM2, Nginx

```bash
# Di server, clone/upload project dan masuk ke direktori
cd Repository-fe

# Install dependencies
npm install

# Set environment variable production
echo "NEXT_PUBLIC_API_BASE_URL=https://api.repository-upnvj.online" > .env

# Build aplikasi
npm run build

# Jalankan dengan PM2
npm install -g pm2
pm2 start npm --name "repository-fe" -- start
pm2 save
pm2 startup
```

**Konfigurasi Nginx:**

```nginx
server {
    listen 80;
    server_name dashboard.repository-upnvj.online;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name dashboard.repository-upnvj.online;

    ssl_certificate /etc/letsencrypt/live/dashboard.repository-upnvj.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.repository-upnvj.online/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Scripts

```bash
npm run dev      # Development server di http://localhost:3000 (hot-reload)
npm run build    # Build production ke .next/
npm start        # Jalankan production server (perlu build dulu)
npm run lint     # ESLint check
```

---

## State Management

Aplikasi menggunakan React Context (bukan Redux):

| Context | State yang Dikelola |
|---------|---------------------|
| `AuthContext` | User, roles, active role, permissions, JWT token |
| `FolderContext` | Folder yang dipilih, menu aktif, navigasi folder |

**LocalStorage Keys:**
| Key | Isi |
|-----|-----|
| `token` | JWT access token |
| `user` | Data user (JSON) |
| `active_role_id` | ID role yang sedang aktif |
| `sidebar_width` | Lebar sidebar (persistence UI) |

---

## Common Issues

### CORS Error
**Penyebab:** Backend tidak mengizinkan origin frontend.
**Solusi:** Set `CORS_ORIGIN` di backend `.env` sesuai URL frontend. Contoh: `CORS_ORIGIN=http://localhost:3000`.

### 401 Unauthorized Terus-Menerus
**Penyebab:** Token expired atau `JWT_SECRET` berubah.
**Solusi:** Hapus `token` dari localStorage browser (DevTools → Application → Local Storage), lalu login ulang.

### API Connection Error / Network Error
**Penyebab:** Backend tidak berjalan atau `NEXT_PUBLIC_API_BASE_URL` salah.
**Solusi:**
1. Pastikan backend berjalan: `npm run start:dev` di `Repository-be`
2. Cek nilai `NEXT_PUBLIC_API_BASE_URL` di file `.env`
3. Buka Network tab di DevTools untuk melihat request yang gagal

### File Preview Tidak Muncul
**Penyebab:** File tipe yang tidak didukung atau URL preview salah.
**Solusi:** Preview mendukung: gambar, PDF, Word (.docx), Excel, PowerPoint. Untuk tipe lain, gunakan tombol download.

### Build Gagal di Production
**Penyebab:** TypeScript error atau dependency issue.
**Solusi:** Jalankan `npm run lint` dan `npx tsc --noEmit` untuk menemukan error sebelum build.

### Halaman Share Link Error 404
**Penyebab:** Token share link sudah expired atau di-disable.
**Solusi:** Minta pemilik file untuk generate ulang share link.

### Backend Database Error (Prisma)
**Penyebab:** `DATABASE_URL` di backend `.env` tidak dikonfigurasi atau salah format.
**Solusi:** Pastikan file `.env` di `Repository-be/` memiliki variabel:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/repository?schema=public
```
Kemudian jalankan `npx prisma generate` di direktori `Repository-be/` lalu restart server.
