FITUR BARU — Drive Folder → YouTube Playlist → Grup Video
=========================================================
Repo target uji: darulistiqomah (trial)

Cara deploy singkat:
1. Upload/overwrite file di zip ini ke repo trial (kecuali images/).
2. Di Google Apps Script project yang terhubung:
   - Ganti Code.gs dengan apps-script/Code.gs terbaru
   - Aktifkan Advanced Service: YouTube Data API v3
   - (Opsional) tempel appsscript.json scopes
   - Run sekali sembarang fungsi → Authorize semua izin
   - Deploy → New version
3. Folder Drive yang di-scan harus di-share ke akun script (Viewer+).

Alur admin:
1. Tab Video → "Dari folder Google Drive"
2. Nama grup + link folder → Scan Folder Drive
3. Centang video → Buat Playlist + Grup Video
4. Simpan ke Google Sheets

Catatan:
- Upload otomatis satu-per-satu; file sangat besar bisa gagal (timeout).
- Jika upload gagal: upload manual ke YT, lalu pakai form "Deteksi dari playlist".
- Fitur lama (playlist URL) tetap ada.
