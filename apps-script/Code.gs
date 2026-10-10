/**
 * SDIT Daarul Istiqomah — Google Apps Script API
 * ------------------------------------------------
 * Deploy sebagai Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Sheet yang dibutuhkan (buat di spreadsheet yang sama):
 *   1) media     — galeri foto & video
 *   2) config    — key/value (opsional)
 *   3) admins    — daftar email guru (opsional)
 *
 * Header baris 1 sheet "media":
 * id | url | type | source | shortcode | title | description | category | thumb | embedUrl | active | date | created_by
 */

var SHEET_MEDIA = 'media';
var SHEET_ADMINS = 'admins';
var CACHE_SECONDS = 60; // cache GET agar website tidak lambat

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    var action = (e.parameter && e.parameter.action) || 'list';
    var body = {};
    if (method === 'POST' && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
      if (body.action) action = body.action;
    }

    // Auth sederhana: token rahasia (set di Script Properties)
    var token = PropertiesService.getScriptProperties().getProperty('API_TOKEN') || '';
    if (action !== 'list' && action !== 'ping') {
      var clientToken = (e.parameter && e.parameter.token) || body.token || '';
      if (token && clientToken !== token) {
        return json_({ ok: false, error: 'Unauthorized' }, 401);
      }
    }

    if (action === 'ping') return json_({ ok: true, service: 'sdit-di', ts: new Date().toISOString() });
    if (action === 'list') return json_({ ok: true, media: listMedia_() });
    if (action === 'add') return json_(addMedia_(body.item || body));
    if (action === 'update') return json_(updateMedia_(body.item || body));
    if (action === 'delete') return json_(deleteMedia_(body.id || (e.parameter && e.parameter.id)));
    if (action === 'publish') return json_(publishSnapshot_());

    return json_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function listMedia_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('media_list');
  if (cached) return JSON.parse(cached);

  var sheet = getSheet_(SHEET_MEDIA);
  ensureHeaders_(sheet);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var headers = values[0].map(String);
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row[0]) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    obj.active = String(obj.active).toUpperCase() !== 'FALSE' && obj.active !== false && obj.active !== 0;
    rows.push(obj);
  }

  cache.put('media_list', JSON.stringify(rows), CACHE_SECONDS);
  return rows;
}

function addMedia_(item) {
  if (!item || !item.url) return { ok: false, error: 'url wajib' };
  var sheet = getSheet_(SHEET_MEDIA);
  ensureHeaders_(sheet);

  var id = item.id || ('m' + new Date().getTime());
  var row = [
    id,
    item.url || '',
    item.type || 'foto',
    item.source || '',
    item.shortcode || '',
    item.title || '',
    item.description || '',
    item.category || '',
    item.thumb || '',
    item.embedUrl || '',
    item.active !== false ? 'TRUE' : 'FALSE',
    item.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    item.created_by || ''
  ];
  sheet.appendRow(row);
  CacheService.getScriptCache().remove('media_list');
  return { ok: true, id: id };
}

function updateMedia_(item) {
  if (!item || !item.id) return { ok: false, error: 'id wajib' };
  var sheet = getSheet_(SHEET_MEDIA);
  ensureHeaders_(sheet);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(item.id)) {
      var row = i + 1;
      if (item.url != null) sheet.getRange(row, 2).setValue(item.url);
      if (item.type != null) sheet.getRange(row, 3).setValue(item.type);
      if (item.source != null) sheet.getRange(row, 4).setValue(item.source);
      if (item.shortcode != null) sheet.getRange(row, 5).setValue(item.shortcode);
      if (item.title != null) sheet.getRange(row, 6).setValue(item.title);
      if (item.description != null) sheet.getRange(row, 7).setValue(item.description);
      if (item.category != null) sheet.getRange(row, 8).setValue(item.category);
      if (item.thumb != null) sheet.getRange(row, 9).setValue(item.thumb);
      if (item.embedUrl != null) sheet.getRange(row, 10).setValue(item.embedUrl);
      if (item.active != null) sheet.getRange(row, 11).setValue(item.active ? 'TRUE' : 'FALSE');
      if (item.date != null) sheet.getRange(row, 12).setValue(item.date);
      CacheService.getScriptCache().remove('media_list');
      return { ok: true, id: item.id };
    }
  }
  return { ok: false, error: 'id tidak ditemukan' };
}

function deleteMedia_(id) {
  if (!id) return { ok: false, error: 'id wajib' };
  var sheet = getSheet_(SHEET_MEDIA);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      CacheService.getScriptCache().remove('media_list');
      return { ok: true };
    }
  }
  return { ok: false, error: 'id tidak ditemukan' };
}

/** Snapshot JSON untuk di-copy ke data/media.json di website (opsional publish manual) */
function publishSnapshot_() {
  var media = listMedia_().filter(function (m) { return m.active; });
  return { ok: true, generatedAt: new Date().toISOString(), media: media };
}

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'id', 'url', 'type', 'source', 'shortcode', 'title', 'description',
      'category', 'thumb', 'embedUrl', 'active', 'date', 'created_by'
    ]);
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Setup sekali jalan: isi Script Properties
 * File > Project properties > Script properties
 *   API_TOKEN = string rahasia (contoh: sdit-di-rahasia-2026)
 */
function setupToken() {
  PropertiesService.getScriptProperties().setProperty('API_TOKEN', 'ganti-dengan-token-rahasia');
}
