/**
 * Konfigurasi website SDIT Daarul Istiqomah
 * -----------------------------------------
 * Setelah deploy Google Apps Script, isi sheetsApiUrl & apiToken.
 * Lihat apps-script/SETUP.md
 */
window.SDIT_CONFIG = {
  // URL Web App dari Google Apps Script (kosongkan jika belum setup)
  sheetsApiUrl: '',
  // Token rahasia (sama dengan Script Property API_TOKEN)
  apiToken: '',
  // true = frontend & admin pakai Google Sheets sebagai sumber media
  useSheets: false,
  // Cache media di browser (ms)
  mediaCacheTtl: 5 * 60 * 1000
};
