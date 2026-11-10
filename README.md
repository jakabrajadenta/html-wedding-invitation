# Undangan Pernikahan Online

Undangan pernikahan digital berbentuk website satu halaman (*single page*). Tamu cukup membuka satu link, tanpa perlu memasang aplikasi.

**Link undangan:** https://jakabrajadenta.github.io/html-wedding-invitation/

> Status: final dan siap disebar.

Tampilan dibuat selebar ponsel, termasuk saat dibuka di desktop.

## Versi 2 (penuh animasi)

**Link V2:** https://jakabrajadenta.github.io/html-wedding-invitation/v2/

Tampilan alternatif bertema songket Minang (cokelat gelap, merah, emas) dengan banyak animasi: pintu sampul terbuka, kelopak bunga berjatuhan, rumah gadang, garis waktu cerita, dan photobooth swafoto berbingkai. Semua file V2 ada di folder `v2/` dan tidak mengubah versi pertama.

- Isi undangan tetap dibaca dari `data/wedding.json`, jadi perubahan data langsung berlaku di kedua versi.
- Musik V2 diatur di konstanta `MUSIC` pada `v2/assets/js/app.js`: "Canon in D Major" oleh Kevin MacLeod ([incompetech.com](https://incompetech.com)), lisensi [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Lisensi ini mewajibkan kredit, dan kreditnya sudah tampil di bagian bawah halaman.
- `?to=` dan `#bagian` berlaku juga, misalnya `v2/?to=Bapak%20Ahmad#acara`. Bagian tambahannya adalah `beranda` dan `photobooth`.
- Photobooth butuh HTTPS (GitHub Pages) atau `localhost`. Foto hanya diproses di perangkat tamu.

## Mengubah isi undangan

- Ubah isi undangan di `data/wedding.json`.
- Selama `start` pada `events` kosong, jadwal tampil sebagai "Menyusul" dan hitung mundur disembunyikan. Format isinya `2026-12-08T09:00:00+07:00`.
- `end` boleh kosong. Isi `endLabel` dengan `selesai` untuk menampilkan "11.00 WIB – selesai".
- Bagian amplop digital baru tampil setelah `gifts.accounts` diisi.
- Bagian cerita baru tampil setelah `story.chapters` diisi.
- Setelah isi final, ubah `DRAFT_MODE=true` menjadi `DRAFT_MODE=false` di `config/public.env` untuk menghilangkan label contoh.

## Musik

Musik mulai saat tamu menekan **Buka Undangan** dan dapat dimatikan lewat tombol di layar. Untuk mengganti lagu, ubah `music.src` dan `music.credit` di `data/wedding.json`. Kosongkan `music.src` untuk menghilangkan musik.

Hanya gunakan audio yang lisensinya mengizinkan file disebarkan di repo publik.

- **Lagu saat ini:** Nocturne Op. 9 No. 2 karya Frédéric Chopin, dimainkan oleh Frank Lévy.
- **Sumber:** [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Nocturne_in_E_flat_major,_Op._9_no._2.mp3), berasal dari Musopen.
- **Lisensi:** domain publik.

## Link untuk tamu

Tambahkan `?to=` untuk menampilkan nama tamu di sampul, dan tambahkan `#` untuk langsung menuju bagian tertentu (`salam`, `mempelai`, `cerita`, `acara`, `info`, `hadir`, `hadiah`, `doa`):

```text
https://jakabrajadenta.github.io/html-wedding-invitation/?to=Bapak%20Ahmad
https://jakabrajadenta.github.io/html-wedding-invitation/?to=Bapak%20Ahmad#acara
```

## Konsep

- **Satu halaman:** seluruh tampilan diakses dari `index.html`.
- **Tanpa framework dan proses build:** hanya HTML, CSS, dan JavaScript biasa, sehingga tidak butuh Node.js, Java, atau server.
- **Konten terpisah dari tampilan:** nama, jadwal, lokasi, dan teks lainnya disimpan di file data, lalu dibaca berdasarkan nama file dan key.

## Struktur

```text
.
├── index.html            # Satu-satunya halaman
├── assets/               # CSS, JavaScript, dan audio
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

Fungsi pembacanya ada di `assets/js/app.js`:

```js
// getJson('data/wedding.json', 'event.venue') -> "Nama Gedung"
async function getJson(file, key) {
  const data = await (await fetch(file)).json();
  return key.split('.').reduce((value, part) => value?.[part], data);
}

// getEnv('config/public.env', 'DRAFT_MODE') -> "true"
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
