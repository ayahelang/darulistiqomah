/**
 * Konfigurasi SDIT Daarul Istiqomah
 * ---------------------------------
 * WAJIB isi sheetsApiUrl + apiToken setelah deploy Apps Script.
 * Lihat apps-script/SETUP.md
 *
 * Mode: SEMUA data website (carousel, berita, galeri, media, video, profil)
 * dibaca & disimpan lewat Google Sheets — bukan localStorage.
 */
window.SDIT_CONFIG = {
  // URL Web App Google Apps Script (Deploy → Web app → Anyone)
  sheetsApiUrl: '',
  // Token sama dengan Script Property API_TOKEN
  apiToken: '',
  // true = wajib pakai Google Sheets sebagai sumber & tujuan data
  useSheets: true,
  // Cache singkat di browser (ms) — tetap refetch dari Sheets setelah TTL
  siteCacheTtl: 60 * 1000
};
