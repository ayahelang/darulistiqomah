(function () {
  const STORAGE_KEY = 'sdit_di_site_data_v1';
  const DATA_URL = '../data/site.json';
  let data = null;
  let lastParsed = null;
  let editCtx = null; // { type, index }

  const $ = (id) => document.getElementById(id);
  const status = (msg) => { const s = $('status'); if (s) s.textContent = msg; };
  const cfg = () => window.SDIT_CONFIG || {};

  // --- Auth ---
  const AUTH_KEY = 'sdit_di_admin_auth_v1';
  const ADMIN_PASS = 'Bismillaah9999#';

  function isAuthed() {
    try { return sessionStorage.getItem(AUTH_KEY) === '1'; } catch (_) { return false; }
  }
  function unlockAdmin() {
    const login = document.getElementById('adminLogin');
    const app = document.getElementById('adminApp');
    if (login) login.classList.add('hidden');
    if (app) app.classList.remove('locked');
    status('Berhasil masuk panel admin.');
  }
  function grantAuth() {
    try { sessionStorage.setItem(AUTH_KEY, '1'); } catch (_) {}
    unlockAdmin();
  }
  function tryLogin() {
    const pass = (document.getElementById('loginPass') || {}).value || '';
    const err = document.getElementById('loginErr');
    if (pass === ADMIN_PASS) {
      grantAuth();
    } else {
      if (err) err.textContent = 'Password salah. Coba lagi.';
      status('Password salah.');
    }
  }

  // Secret keystroke on login: Ctrl+Alt then type 9999
  let secretBuf = '';
  let secretArmed = false;
  document.addEventListener('keydown', (e) => {
    if (isAuthed()) return;
    // Arm when Ctrl+Alt held and a digit pressed, or track sequence
    if (e.ctrlKey && e.altKey) {
      const k = e.key;
      if (k >= '0' && k <= '9') {
        e.preventDefault();
        secretBuf += k;
        if (secretBuf.length > 4) secretBuf = secretBuf.slice(-4);
        if (secretBuf === '9999') {
          secretBuf = '';
          grantAuth();
          status('Masuk via keystroke rahasia.');
        }
      } else if (k === 'Control' || k === 'Alt') {
        // ignore
      } else {
        secretBuf = '';
      }
    } else if (!e.ctrlKey && !e.altKey) {
      // reset if released without completing
      if (secretBuf && secretBuf.length < 4) secretBuf = '';
    }
  });

  // Selalu tampilkan login saat halaman dimuat (wajib password / keystroke)
  // sessionStorage hanya menandai "sudah login di tab ini" setelah password benar
  function lockAdmin() {
    document.body.classList.add('admin-locked');
    const login = document.getElementById('adminLogin');
    const app = document.getElementById('adminApp');
    if (login) login.classList.remove('hidden');
    if (app) app.classList.add('locked');
  }
  function unlockAdminUI() {
    document.body.classList.remove('admin-locked');
    const login = document.getElementById('adminLogin');
    const app = document.getElementById('adminApp');
    if (login) login.classList.add('hidden');
    if (app) app.classList.remove('locked');
  }
  // Override unlockAdmin used by grantAuth
  unlockAdmin = function () {
    unlockAdminUI();
    status('Berhasil masuk panel admin.');
  };
  function logoutAdmin() {
    try { sessionStorage.removeItem(AUTH_KEY); } catch (_) {}
    lockAdmin();
    const err = document.getElementById('loginErr');
    if (err) err.textContent = '';
    const pass = document.getElementById('loginPass');
    if (pass) pass.value = '';
    status('Anda telah keluar. Masukkan password untuk mengakses panel.');
  }

  // Paksa login setiap kali buka halaman admin (hapus auto-login dari session lama)
  try { sessionStorage.removeItem(AUTH_KEY); } catch (_) {}
  lockAdmin();

  const btnLogin = document.getElementById('btnLogin');
  const inpLogin = document.getElementById('loginPass');
  if (btnLogin) btnLogin.onclick = tryLogin;
  if (inpLogin) inpLogin.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) btnLogout.onclick = logoutAdmin;

  function sheetsConfigured() {
    const c = cfg();
    return !!(c.useSheets && c.sheetsApiUrl);
  }

  function updateSheetsHint() {
    const el = $('sheetsHint');
    if (!el) return;
    if (sheetsConfigured()) {
      el.innerHTML = 'Google Sheets: <strong>aktif</strong>. Media bisa disinkron ke Sheet.';
    } else {
      el.innerHTML = 'Google Sheets: belum dikonfigurasi. Isi <code>js/config.js</code> — lihat <code>apps-script/SETUP.md</code>.';
    }
  }

  async function loadFromFile() {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    data = await res.json();
    if (!data.media) data.media = [];
    fillForm();
    status('Data dimuat dari data/site.json');
  }

  function loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    data = JSON.parse(raw);
    if (!data.media) data.media = [];
    fillForm();
    status('Data dimuat dari localStorage (hasil edit admin).');
    return true;
  }

  function fillForm() {
    if (!data) return;
    const s = data.school || {};
    $('fName').value = s.name || '';
    $('fTagline').value = s.tagline || '';
    $('fAddress').value = s.address || '';
    $('fEmail').value = s.email || '';
    $('fWa').value = s.whatsapp || '';
    const p = data.ppdb || {};
    $('fPpdbYear').value = p.year || '';
    $('fPpdbOpen').value = String(p.open !== false);
    $('fPpdbNote').value = p.note || '';
    renderLists();
  }

  function readForm() {
    if (!data.school) data.school = {};
    if (!data.ppdb) data.ppdb = {};
    data.school.name = $('fName').value.trim();
    data.school.tagline = $('fTagline').value.trim();
    data.school.address = $('fAddress').value.trim();
    data.school.email = $('fEmail').value.trim();
    data.school.whatsapp = $('fWa').value.trim();
    data.ppdb.year = $('fPpdbYear').value.trim();
    data.ppdb.open = $('fPpdbOpen').value === 'true';
    data.ppdb.note = $('fPpdbNote').value.trim();
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  // --- CRUD Modal ---
  const SCHEMAS = {
    media: [
      { key: 'title', label: 'Judul', type: 'text' },
      { key: 'url', label: 'URL / Link', type: 'text' },
      { key: 'type', label: 'Tipe (foto/video)', type: 'text' },
      { key: 'source', label: 'Sumber', type: 'text' },
      { key: 'category', label: 'Kategori', type: 'text' },
      { key: 'description', label: 'Deskripsi', type: 'textarea' },
      { key: 'thumb', label: 'URL Thumbnail', type: 'text' },
      { key: 'embedUrl', label: 'Embed URL', type: 'text' },
      { key: 'date', label: 'Tanggal', type: 'text' }
    ],
    carousel: [
      { key: 'title', label: 'Judul', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'image', label: 'URL / path gambar', type: 'text' },
      { key: 'imagePosition', label: 'Posisi gambar (mis. center 30%)', type: 'text' },
      { key: 'cta', label: 'Teks tombol CTA', type: 'text' },
      { key: 'ctaLink', label: 'Link CTA', type: 'text' }
    ],
    articles: [
      { key: 'title', label: 'Judul', type: 'text' },
      { key: 'category', label: 'Kategori', type: 'text' },
      { key: 'date', label: 'Tanggal', type: 'text' },
      { key: 'excerpt', label: 'Ringkasan', type: 'textarea' },
      { key: 'image', label: 'URL / path gambar', type: 'text' }
    ],
    gallery: [
      { key: 'title', label: 'Judul', type: 'text' },
      { key: 'image', label: 'URL / path gambar', type: 'text' },
      { key: 'type', label: 'Tipe', type: 'text' }
    ],
    videos: [
      { key: 'title', label: 'Judul', type: 'text' },
      { key: 'youtubeId', label: 'YouTube ID', type: 'text' },
      { key: 'thumb', label: 'URL Thumbnail', type: 'text' }
    ]
  };

  function openEditor(type, index) {
    editCtx = { type, index };
    const list = data[type] || [];
    const item = index >= 0 ? Object.assign({}, list[index]) : {};
    const schema = SCHEMAS[type] || [];
    $('editModalTitle').textContent = index >= 0 ? 'Edit ' + type : 'Tambah ' + type;
    const box = $('editFields');
    box.innerHTML = '';
    schema.forEach((f) => {
      const lab = document.createElement('label');
      lab.textContent = f.label;
      box.appendChild(lab);
      let input;
      if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.value = item[f.key] || '';
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.value = item[f.key] || '';
      }
      input.dataset.key = f.key;
      input.id = 'ef_' + f.key;
      box.appendChild(input);
    });
    $('editModal').hidden = false;
  }

  function closeEditor() {
    $('editModal').hidden = true;
    editCtx = null;
  }

  function saveEditor() {
    if (!editCtx) return;
    const { type, index } = editCtx;
    const schema = SCHEMAS[type] || [];
    const item = index >= 0 ? Object.assign({}, (data[type] || [])[index]) : { id: type[0] + Date.now() };
    schema.forEach((f) => {
      const el = document.getElementById('ef_' + f.key);
      if (el) item[f.key] = el.value.trim();
    });
    if (!data[type]) data[type] = [];
    if (index >= 0) data[type][index] = item;
    else data[type].unshift(item);
    closeEditor();
    renderLists();
    status('Perubahan disimpan di form. Klik "Simpan ke Browser" agar permanen di sesi ini.');
  }

  function deleteItem(type, index) {
    if (!confirm('Hapus item ini?')) return;
    data[type].splice(index, 1);
    renderLists();
    status('Item dihapus. Klik Simpan ke Browser.');
  }

  function rowActions(type, index) {
    const wrap = document.createElement('div');
    wrap.className = 'actions-row';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'btn btn-primary';
    edit.textContent = 'Edit';
    edit.setAttribute('data-tip', 'Buka form untuk mengubah data item ini (judul, gambar, tautan, dll). Setelah edit, klik Simpan di form, lalu Simpan ke Browser.');
    edit.onclick = () => openEditor(type, index);
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn btn-ghost';
    del.textContent = 'Hapus';
    del.setAttribute('data-tip', 'Hapus item ini dari daftar. Perubahan belum permanen sampai Anda klik Simpan ke Browser atau Export JSON.');
    del.onclick = () => deleteItem(type, index);
    wrap.appendChild(edit);
    wrap.appendChild(del);
    return wrap;
  }

  function renderLists() {
    // Media
    const mBox = $('mediaList');
    if (mBox) {
      mBox.innerHTML = '';
      (data.media || []).forEach((m, i) => {
        const row = document.createElement('div');
        row.className = 'list-item';
        const badge = m.type === 'video' ? 'video' : 'foto';
        row.innerHTML = `<div>
          <span class="badge ${badge}">${escapeHtml(m.type || 'foto')}</span>
          <span class="badge">${escapeHtml(m.source || '')}</span>
          <strong>${escapeHtml(m.title || m.url)}</strong>
          <div class="meta">${escapeHtml(m.category || '')} · ${escapeHtml(m.date || '')}</div>
        </div>`;
        row.appendChild(rowActions('media', i));
        mBox.appendChild(row);
      });
      if (!(data.media || []).length) mBox.innerHTML = '<p class="hint">Belum ada media.</p>';
    }

    const cBox = $('carouselList');
    if (cBox) {
      cBox.innerHTML = '';
      (data.carousel || []).forEach((c, i) => {
        const row = document.createElement('div');
        row.className = 'list-item';
        row.innerHTML = `<div><span class="badge">#${i + 1}</span> <strong>${escapeHtml(c.title)}</strong>
          <div class="meta">${escapeHtml(c.image || '')}</div></div>`;
        row.appendChild(rowActions('carousel', i));
        cBox.appendChild(row);
      });
    }

    const aBox = $('articleList');
    if (aBox) {
      aBox.innerHTML = '';
      (data.articles || []).forEach((a, i) => {
        const row = document.createElement('div');
        row.className = 'list-item';
        row.innerHTML = `<div><span class="badge">${escapeHtml(a.category || 'Berita')}</span> <strong>${escapeHtml(a.title)}</strong>
          <div class="meta">${escapeHtml(a.date || '')}</div></div>`;
        row.appendChild(rowActions('articles', i));
        aBox.appendChild(row);
      });
    }

    const gBox = $('galleryList');
    if (gBox) {
      gBox.innerHTML = '';
      (data.gallery || []).forEach((g, i) => {
        const row = document.createElement('div');
        row.className = 'list-item';
        row.innerHTML = `<div><span class="badge foto">foto</span> <strong>${escapeHtml(g.title)}</strong>
          <div class="meta">${escapeHtml(g.image || '')}</div></div>`;
        row.appendChild(rowActions('gallery', i));
        gBox.appendChild(row);
      });
    }

    // Videos list if container exists
    let vBox = $('videoList');
    if (!vBox) {
      // optional - create under media if needed
    } else {
      vBox.innerHTML = '';
      (data.videos || []).forEach((v, i) => {
        const row = document.createElement('div');
        row.className = 'list-item';
        row.innerHTML = `<div><span class="badge video">video</span> <strong>${escapeHtml(v.title)}</strong>
          <div class="meta">YT: ${escapeHtml(v.youtubeId || '')}</div></div>`;
        row.appendChild(rowActions('videos', i));
        vBox.appendChild(row);
      });
    }
  }

  function save() {
    readForm();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    status('Tersimpan di browser. Buka halaman utama untuk melihat perubahan.');
  }

  function reset() {
    if (!confirm('Reset semua edit lokal ke data/site.json?')) return;
    localStorage.removeItem(STORAGE_KEY);
    loadFromFile();
    status('localStorage dihapus. Kembali ke data/site.json.');
  }

  function exportJson() {
    readForm();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'site.json';
    a.click();
    status('File site.json diunduh. Upload ke folder data/ untuk produksi.');
  }

  function detectMedia() {
    const url = $('mediaUrl').value;
    const parsed = window.MediaUtils.parseMediaUrl(url);
    const box = $('detectBox');
    if (!parsed.ok) {
      box.classList.remove('show');
      status(parsed.error || 'Gagal deteksi');
      lastParsed = null;
      return;
    }
    lastParsed = parsed;
    box.classList.add('show');
    $('detectResult').textContent = `${parsed.type.toUpperCase()} · ${parsed.source} · ${parsed.canonical}`;
    $('mediaTitle').value = parsed.suggestedTitle || '';
    $('mediaCategory').value = parsed.suggestedCategory || '';
    $('mediaDesc').value = '';
    status('Link terdeteksi. Lengkapi judul bila perlu, lalu klik Tambahkan.');
  }

  function addMedia() {
    if (!lastParsed) {
      status('Deteksi link dulu.');
      return;
    }
    const item = window.MediaUtils.makeMediaItem(lastParsed, {
      title: $('mediaTitle').value,
      description: $('mediaDesc').value,
      category: $('mediaCategory').value
    });
    data.media = data.media || [];
    data.media.unshift(item);
    renderLists();
    $('mediaUrl').value = '';
    $('detectBox').classList.remove('show');
    lastParsed = null;
    status('Media ditambahkan. Klik Simpan ke Browser.');
  }

  async function sheetsRequest(action, payload) {
    const c = cfg();
    if (!c.sheetsApiUrl) throw new Error('sheetsApiUrl belum diisi di config.js');
    const isWrite = action !== 'list' && action !== 'ping' && action !== 'publish';
    if (isWrite) {
      const res = await fetch(c.sheetsApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action: action, token: c.apiToken }, payload || {}))
      });
      return res.json();
    }
    const url = c.sheetsApiUrl + '?action=' + encodeURIComponent(action);
    const res = await fetch(url);
    return res.json();
  }

  async function syncToSheets() {
    if (!sheetsConfigured()) { status('Aktifkan useSheets + sheetsApiUrl di js/config.js'); return; }
    status('Menyinkronkan media ke Google Sheets…');
    try {
      const items = data.media || [];
      let ok = 0;
      for (const item of items) {
        const r = await sheetsRequest('add', { item: item });
        if (r.ok) ok++;
      }
      status(`Sinkron selesai: ${ok}/${items.length} item.`);
    } catch (e) { status('Gagal sinkron: ' + e.message); }
  }

  async function pullFromSheets() {
    if (!sheetsConfigured()) { status('Aktifkan useSheets + sheetsApiUrl di js/config.js'); return; }
    status('Mengambil media dari Google Sheets…');
    try {
      const r = await sheetsRequest('list');
      if (!r.ok) throw new Error(r.error || 'Gagal list');
      data.media = (r.media || []).filter((m) => m.active !== false && String(m.active).toUpperCase() !== 'FALSE');
      renderLists();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      status(`Diambil ${data.media.length} media dari Sheets.`);
    } catch (e) { status('Gagal ambil: ' + e.message); }
  }

  // Bind
  $('btnLoad').onclick = async () => { if (!loadFromStorage()) await loadFromFile(); };
  $('btnSave').onclick = save;
  $('btnReset').onclick = reset;
  $('btnExport').onclick = exportJson;
  $('btnDetect').onclick = detectMedia;
  $('btnAddMedia').onclick = addMedia;
  $('btnSyncSheets').onclick = syncToSheets;
  $('btnPullSheets').onclick = pullFromSheets;
  $('btnEditSave').onclick = saveEditor;
  $('btnEditCancel').onclick = closeEditor;
  $('editModal').addEventListener('click', (e) => { if (e.target.id === 'editModal') closeEditor(); });

  $('btnAddCarousel').onclick = () => openEditor('carousel', -1);
  $('btnAddArticle').onclick = () => openEditor('articles', -1);
  $('btnAddGallery').onclick = () => openEditor('gallery', -1);
  const bv = $('btnAddVideo'); if (bv) bv.onclick = () => openEditor('videos', -1);

  updateSheetsHint();
  (async () => {
    if (!loadFromStorage()) await loadFromFile();
  })();
})();
