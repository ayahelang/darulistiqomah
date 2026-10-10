(function () {
  const STORAGE_KEY = 'sdit_di_site_data_v1';
  const DATA_URL = '../data/site.json';
  let data = null;
  let lastParsed = null;

  const $ = (id) => document.getElementById(id);
  const status = (msg) => { const s = $('status'); if (s) s.textContent = msg; };
  const cfg = () => window.SDIT_CONFIG || {};

  // --- Auth ---
  const AUTH_KEY = 'sdit_di_admin_auth_v1';
  const ADMIN_PASS = 'Bismillaah9999#';

  function isAuthed() {
    try {
      return sessionStorage.getItem(AUTH_KEY) === '1';
    } catch (_) { return false; }
  }
  function unlockAdmin() {
    const login = document.getElementById('adminLogin');
    const app = document.getElementById('adminApp');
    if (login) login.classList.add('hidden');
    if (app) app.classList.remove('locked');
  }
  function tryLogin() {
    const pass = (document.getElementById('loginPass') || {}).value || '';
    const err = document.getElementById('loginErr');
    if (pass === ADMIN_PASS) {
      try { sessionStorage.setItem(AUTH_KEY, '1'); } catch (_) {}
      unlockAdmin();
      status('Berhasil masuk panel admin.');
    } else {
      if (err) err.textContent = 'Password salah. Coba lagi.';
      status('Password salah.');
    }
  }
  if (isAuthed()) {
    unlockAdmin();
  } else {
    const btn = document.getElementById('btnLogin');
    const inp = document.getElementById('loginPass');
    if (btn) btn.onclick = tryLogin;
    if (inp) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });
  }



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

  function renderLists() {
    // Media (new unified list)
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
          <div class="meta">${escapeHtml(m.category || '')} · ${escapeHtml(m.date || '')}<br>${escapeHtml(m.url)}</div>
        </div>`;
        const del = document.createElement('button');
        del.className = 'btn btn-ghost';
        del.type = 'button';
        del.textContent = 'Hapus';
        del.onclick = () => { data.media.splice(i, 1); renderLists(); };
        row.appendChild(del);
        mBox.appendChild(row);
      });
      if (!(data.media || []).length) {
        mBox.innerHTML = '<p class="hint">Belum ada media. Paste link IG/FB di atas.</p>';
      }
    }

    const cBox = $('carouselList');
    if (cBox) {
      cBox.innerHTML = '';
      (data.carousel || []).forEach((c, i) => {
        const row = document.createElement('div');
        row.className = 'list-item';
        row.innerHTML = `<div><span class="badge">#${i + 1}</span> ${escapeHtml(c.title)}</div>`;
        const del = document.createElement('button');
        del.className = 'btn btn-ghost';
        del.type = 'button';
        del.textContent = 'Hapus';
        del.onclick = () => { data.carousel.splice(i, 1); renderLists(); };
        row.appendChild(del);
        cBox.appendChild(row);
      });
    }

    const aBox = $('articleList');
    if (aBox) {
      aBox.innerHTML = '';
      (data.articles || []).forEach((a, i) => {
        const row = document.createElement('div');
        row.className = 'list-item';
        row.innerHTML = `<div><span class="badge">${escapeHtml(a.category || 'Berita')}</span> ${escapeHtml(a.title)}</div>`;
        const del = document.createElement('button');
        del.className = 'btn btn-ghost';
        del.type = 'button';
        del.textContent = 'Hapus';
        del.onclick = () => { data.articles.splice(i, 1); renderLists(); };
        row.appendChild(del);
        aBox.appendChild(row);
      });
    }

    const gBox = $('galleryList');
    if (gBox) {
      gBox.innerHTML = '';
      (data.gallery || []).forEach((g, i) => {
        const row = document.createElement('div');
        row.className = 'list-item';
        row.innerHTML = `<div><span class="badge foto">foto</span> ${escapeHtml(g.title)}</div>`;
        const del = document.createElement('button');
        del.className = 'btn btn-ghost';
        del.type = 'button';
        del.textContent = 'Hapus';
        del.onclick = () => { data.gallery.splice(i, 1); renderLists(); };
        row.appendChild(del);
        gBox.appendChild(row);
      });
    }
  }

  function save() {
    readForm();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    status('Tersimpan di browser. Buka halaman utama untuk melihat perubahan.');
  }

  function reset() {
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

  // --- Media detect / add ---
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
    status('Media ditambahkan. Klik Simpan ke Browser (dan opsional Sinkron ke Sheets).');
  }

  // --- Sheets API ---
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
    const url = c.sheetsApiUrl + '?action=' + encodeURIComponent(action) +
      (c.apiToken && action === 'publish' ? '&token=' + encodeURIComponent(c.apiToken) : '');
    const res = await fetch(url);
    return res.json();
  }

  async function syncToSheets() {
    if (!sheetsConfigured()) {
      status('Aktifkan useSheets + sheetsApiUrl di js/config.js');
      return;
    }
    status('Menyinkronkan media ke Google Sheets…');
    try {
      const items = data.media || [];
      let ok = 0;
      for (const item of items) {
        const r = await sheetsRequest('add', { item: item });
        if (r.ok) ok++;
      }
      status(`Sinkron selesai: ${ok}/${items.length} item dikirim ke Sheets.`);
    } catch (e) {
      status('Gagal sinkron: ' + e.message);
    }
  }

  async function pullFromSheets() {
    if (!sheetsConfigured()) {
      status('Aktifkan useSheets + sheetsApiUrl di js/config.js');
      return;
    }
    status('Mengambil media dari Google Sheets…');
    try {
      const r = await sheetsRequest('list');
      if (!r.ok) throw new Error(r.error || 'Gagal list');
      data.media = (r.media || []).filter((m) => m.active !== false && String(m.active).toUpperCase() !== 'FALSE');
      renderLists();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      status(`Diambil ${data.media.length} media dari Sheets + disimpan ke browser.`);
    } catch (e) {
      status('Gagal ambil dari Sheets: ' + e.message);
    }
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

  $('btnAddCarousel').onclick = () => {
    const title = prompt('Judul slide:');
    if (!title) return;
    data.carousel = data.carousel || [];
    data.carousel.push({
      id: 'c' + Date.now(),
      title,
      subtitle: prompt('Subtitle:') || '',
      cta: 'Selengkapnya',
      ctaLink: '#ppdb',
      image: prompt('URL gambar / path images/…:') || 'images/upacara.jpg',
      active: true
    });
    renderLists();
  };

  $('btnAddArticle').onclick = () => {
    const title = prompt('Judul artikel:');
    if (!title) return;
    data.articles = data.articles || [];
    data.articles.unshift({
      id: 'a' + Date.now(),
      title,
      date: new Date().toISOString().slice(0, 10),
      excerpt: prompt('Ringkasan:') || '',
      image: prompt('URL gambar:') || 'images/belajar.jpg',
      category: prompt('Kategori:') || 'Berita'
    });
    renderLists();
  };

  $('btnAddGallery').onclick = () => {
    const title = prompt('Judul foto:');
    if (!title) return;
    data.gallery = data.gallery || [];
    data.gallery.unshift({
      id: 'g' + Date.now(),
      title,
      image: prompt('URL gambar:') || 'images/belajar.jpg',
      type: 'foto'
    });
    renderLists();
  };

  updateSheetsHint();
  (async () => {
    if (!loadFromStorage()) await loadFromFile();
  })();
})();
