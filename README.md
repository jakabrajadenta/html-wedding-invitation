# Undangan Pernikahan Online

Undangan pernikahan digital berbentuk website satu halaman (*single page*). Tamu cukup membuka satu link, tanpa perlu memasang aplikasi.

**Link undangan:** https://jakabrajadenta.github.io/html-wedding-invitation/

> Status: tahap awal. `index.html` dan struktur di bawah ini belum dibuat. Link aktif setelah `index.html` ada di branch `master` dan GitHub Pages diaktifkan.

## Konsep

- **Satu halaman:** seluruh tampilan diakses dari `index.html`.
- **Tanpa framework dan proses build:** hanya HTML, CSS, dan JavaScript biasa, sehingga tidak butuh Node.js, Java, atau server.
- **Konten terpisah dari tampilan:** nama, jadwal, lokasi, dan teks lainnya disimpan di file data, lalu dibaca berdasarkan nama file dan key.

## Struktur

```text
.
├── index.html            # Satu-satunya halaman
├── assets/               # CSS, JavaScript, gambar, musik, font
├── data/                 # Konten undangan (JSON)
│   └── wedding.json
└── config/
    └── public.env        # Pengaturan publik (format KEY=VALUE)
```

## Membaca data

Data diambil dengan `fetch` berdasarkan file dan key. Contoh `data/wedding.json`:

```json
{
  "bride": { "name": "Nama Mempelai" },
  "event": { "date": "2027-01-01", "venue": "Nama Gedung" }
}
```

Contoh fungsi pembacanya:

```js
// getJson('data/wedding.json', 'event.venue') -> "Nama Gedung"
async function getJson(file, key) {
  const data = await (await fetch(file)).json();
  return key.split('.').reduce((value, part) => value?.[part], data);
}

// getEnv('config/public.env', 'MUSIC_ENABLED') -> "true"
async function getEnv(file, key) {
  const text = await (await fetch(file)).text();
  const line = text.split(/\r?\n/).find((row) => row.startsWith(`${key}=`));
  return line?.slice(key.length + 1);
}
```

Gunakan path relatif (`data/...`, bukan `/data/...`) karena situs berjalan di subfolder `/html-wedding-invitation/`.

## Keamanan data

Repo ini publik dan situsnya statis, jadi **semua file yang di-commit dapat dibaca siapa pun**, termasuk isi `data/` dan `config/public.env`.

- Jangan menyimpan token, API key, atau password di file yang dibaca situs. Browser tidak bisa menyembunyikan nilai rahasia.
- File `.env` dan `.env.*` di-ignore, sehingga tidak ikut terbit dan tidak bisa dibaca situs. Gunakan hanya untuk kebutuhan lokal.
- Data pribadi, seperti daftar tamu lengkap dan nomor telepon, simpan di `private/` atau `*.private.json` (keduanya di-ignore).
- Riwayat Git juga publik. File rahasia yang terlanjur di-commit tetap terbaca meskipun sudah dihapus, jadi segera ganti nilainya.

## Menjalankan secara lokal

`fetch` tidak berjalan jika `index.html` dibuka langsung dari file (`file://`), jadi gunakan server lokal:

```bash
python -m http.server 8000
```

Lalu buka http://localhost:8000.

## Deploy

1. Push perubahan ke branch `master`.
2. Buka **Settings → Pages** di repo GitHub.
3. Pada **Source**, pilih **Deploy from a branch**, lalu pilih `master` dan folder `/ (root)`.
4. Tunggu beberapa menit, lalu buka link undangan di atas.

Setiap push berikutnya ke `master` akan memperbarui situs secara otomatis.
