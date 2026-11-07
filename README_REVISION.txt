REVISI — VERSI PERCOBAAN (darulistiqomah / silverhawk)
=====================================================
Domain CNAME: darulistiqomah.silverhawk.web.id
robots.txt & sitemap.xml disesuaikan ke domain trial.

Perubahan utama:
1. UI Admin → tab Galeri: section "Grup Galeri Foto (bulk dari folder)"
   - + Tambah Grup Galeri Foto
   - Scan Folder (GitHub API, coba kedua repo)
   - Judul default dari nama file
   - Deskripsi default = nama grup + judul foto
   - CRUD per-foto via tombol Edit File di setiap grup
2. Grup Video (playlist / multi-link) sudah ada di tab Video.
3. CNAME, robots, sitemap selalu disesuaikan saat revisi.

Cara pakai bulk foto:
1. Pastikan folder gambar sudah di-push ke repo (mis. images/foto/mabit/)
2. Admin → Galeri → + Tambah Grup Galeri Foto → isi Nama + Path folder
3. Simpan → Scan Folder → edit judul/desc jika perlu → Simpan ke Google Sheets
4. Frontend: card grup muncul; klik untuk membuka daftar foto.

Upload zip ini ke repo darulistiqomah (overwrite code files; images tetap).
