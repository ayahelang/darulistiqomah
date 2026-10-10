/**
 * Konfigurasi website SDIT Daarul Istiqomah
 * -----------------------------------------
 * Setelah deploy Google Apps Script, isi sheetsApiUrl & apiToken.
 * Lihat apps-script/SETUP.md
 */
window.SDIT_CONFIG = {
  // URL Web App dari Google Apps Script (kosongkan jika belum setup)
  sheetsApiUrl: 'https://script.google.com/macros/s/AKfycbxsEoAUFqVq2Pa11lYASnBFuUK1Q70Zbz-Wi_eXlDnGhHPzkaNbQ0JdLnRpsZnY-mHr6g/exec',
  // Token rahasia (sama dengan Script Property API_TOKEN)
  apiToken: 'sdit-di-rahasia-2026',
  // true = frontend & admin pakai Google Sheets sebagai sumber media
  useSheets: true,
  // Cache Site (ms)
   siteCacheTtl: 60000
};
