(function () {
  const STORAGE_KEY = 'sdit_di_site_data_v1';
  const DATA_URL = '../data/site.json';
  let data = null;

  const $ = (id) => document.getElementById(id);
  const status = (msg) => { $('status').textContent = msg; };

  async function loadFromFile() {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    data = await res.json();
    fillForm();
    status('Data dimuat dari data/site.json');
  }

  function loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    data = JSON.parse(raw);
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
    data.school.name = $('fName').value.trim();
    data.school.tagline = $('fTagline').value.trim();
    data.school.address = $('fAddress').value.trim();
    data.school.email = $('fEmail').value.trim();
    data.school.whatsapp = $('fWa').value.trim();
    data.ppdb.year = $('fPpdbYear').value.trim();
    data.ppdb.open = $('fPpdbOpen').value === 'true';
    data.ppdb.note = $('fPpdbNote').value.trim();
  }

  function renderLists() {
    const cBox = $('carouselList');
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

    const aBox = $('articleList');
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

    const gBox = $('galleryList');
    gBox.innerHTML = '';
    (data.gallery || []).forEach((g, i) => {
      const row = document.createElement('div');
      row.className = 'list-item';
      row.innerHTML = `<div>${escapeHtml(g.title)}</div>`;
      const del = document.createElement('button');
      del.className = 'btn btn-ghost';
      del.type = 'button';
      del.textContent = 'Hapus';
      del.onclick = () => { data.gallery.splice(i, 1); renderLists(); };
      row.appendChild(del);
      gBox.appendChild(row);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
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
    status('File site.json diunduh. Upload ke folder data/ di repo untuk produksi.');
  }

  $('btnLoad').onclick = async () => {
    if (!loadFromStorage()) await loadFromFile();
  };
  $('btnSave').onclick = save;
  $('btnReset').onclick = reset;
  $('btnExport').onclick = exportJson;

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
      image: prompt('URL gambar:') || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1600&q=80',
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
      image: prompt('URL gambar:') || 'https://images.unsplash.com/photo-1577896851231-70ef042ee0b9?w=800&q=80',
      category: prompt('Kategori (Berita/Kegiatan/Prestasi):') || 'Berita'
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
      image: prompt('URL gambar:') || 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80',
      type: 'foto'
    });
    renderLists();
  };

  (async () => {
    if (!loadFromStorage()) await loadFromFile();
  })();
})();
