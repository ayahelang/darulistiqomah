(function () {
  'use strict';

  const DATA_URL = 'data/site.json';
  const STORAGE_KEY = 'sdit_di_site_data_v1';

  async function loadData() {
    const c = window.SDIT_CONFIG || {};
    const DATA_URL = 'data/site.json';
    const CACHE_KEY = 'sdit_di_site_cache_v2';

    // 1) Primary: Google Sheets (getSite)
    if (c.useSheets && c.sheetsApiUrl) {
      try {
        // short-lived cache to avoid hammering Apps Script
        let cached = null;
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) {
            const p = JSON.parse(raw);
            if (p && p.data && Date.now() - p.ts < (c.siteCacheTtl || 60000)) cached = p.data;
          }
        } catch (_) {}

        if (cached) {
          console.info('[SDIT] Data dari cache Sheets (TTL)');
          return cached;
        }

        const r = await fetch(c.sheetsApiUrl + '?action=getSite', { cache: 'no-store' });
        const j = await r.json();
        if (j.ok && j.data) {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: j.data }));
          } catch (_) {}
          console.info('[SDIT] Data dari Google Sheets');
          return j.data;
        }
        console.warn('[SDIT] Sheets getSite kosong/ gagal', j);
      } catch (e) {
        console.warn('[SDIT] Gagal fetch Sheets, fallback site.json', e);
      }
    }

    // 2) Fallback: data/site.json (hanya jika Sheets belum diisi / offline)
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Gagal memuat data');
    const data = await res.json();
    if (!data.media) data.media = [];
    console.info('[SDIT] Data dari data/site.json (fallback)');
    return data;
  }

  function applyBrand(brand) {
    if (!brand) return;
    const root = document.documentElement;
    const map = {
      primary: '--primary',
      primaryDark: '--primary-dark',
      primaryLight: '--primary-light',
      accent: '--accent',
      accentSoft: '--accent-soft',
      cream: '--cream',
      ink: '--ink',
      muted: '--muted'
    };
    Object.keys(map).forEach((k) => {
      if (brand[k]) root.style.setProperty(map[k], brand[k]);
    });
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null) node.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function renderCarousel(items) {
    const track = document.getElementById('carousel');
    const dots = document.getElementById('carouselDots');
    if (!track || !items?.length) return;
    track.innerHTML = '';
    dots.innerHTML = '';
    const active = items.filter((i) => i.active !== false);
    active.forEach((item, idx) => {
      const slide = el('div', {
        class: 'slide' + (idx === 0 ? ' active' : ''),
        style: `background-image:url('${item.image}');background-position:${item.imagePosition||'center 40%'}`
      }, [
        el('div', { class: 'slide-content' }, [
          el('div', { class: 'eyebrow' }, ['SDIT · Islam Terpadu']),
          el('h1', {}, [item.title]),
          el('p', {}, [item.subtitle]),
          el('a', { class: 'btn btn-accent', href: item.ctaLink || '#ppdb' }, [item.cta || 'Selengkapnya'])
        ])
      ]);
      track.appendChild(slide);
      const dot = el('button', {
        class: 'dot' + (idx === 0 ? ' active' : ''),
        type: 'button',
        'aria-label': 'Slide ' + (idx + 1),
        onclick: () => go(idx)
      });
      dots.appendChild(dot);
    });

    let current = 0;
    const slides = () => [...track.querySelectorAll('.slide')];
    const dotEls = () => [...dots.querySelectorAll('.dot')];
    function go(n) {
      const s = slides();
      if (!s.length) return;
      current = (n + s.length) % s.length;
      s.forEach((x, i) => x.classList.toggle('active', i === current));
      dotEls().forEach((x, i) => x.classList.toggle('active', i === current));
    }
    setInterval(() => go(current + 1), 6000);
  }

  function renderStats(stats) {
    const box = document.getElementById('stats');
    if (!box || !stats) return;
    box.innerHTML = '';
    stats.forEach((s) => {
      box.appendChild(el('div', { class: 'stat-card' }, [
        el('strong', {}, [s.value]),
        el('span', {}, [s.label])
      ]));
    });
  }

  function renderPrograms(programs) {
    const box = document.getElementById('programs');
    if (!box || !programs) return;
    box.innerHTML = '';
    programs.forEach((p) => {
      box.appendChild(el('article', { class: 'card program-card' }, [
        el('div', { class: 'icon' }, [p.icon || '⭐']),
        el('h3', {}, [p.title]),
        el('p', {}, [p.desc])
      ]));
    });
  }

  function renderArticles(articles) {
    const box = document.getElementById('articles');
    if (!box || !articles) return;
    box.innerHTML = '';
    articles.forEach((a, idx) => {
      box.appendChild(el('article', { class: 'card article-card', 'data-admin-edit': 'articles:' + idx }, [
        el('img', { src: a.image, alt: a.title, loading: 'lazy' }),
        el('div', { class: 'article-body' }, [
          el('div', { class: 'meta' }, [`${a.category || 'Berita'} · ${a.date || ''}`]),
          el('h3', {}, [a.title]),
          el('p', {}, [a.excerpt])
        ])
      ]));
    });
  }

  function renderGallery(items, media) {
    const box = document.getElementById('gallery');
    if (!box) return;
    box.innerHTML = '';
    const list = [];
    (items || []).forEach((g, idx) => {
      list.push({ title: g.title, image: g.image, type: 'foto', _edit: 'gallery:' + idx });
    });
    (media || []).forEach((m, idx) => {
      if (m.type === 'foto' || m.type === 'image') {
        list.push({
          title: m.title || 'Foto',
          image: m.thumb || '',
          url: m.url,
          source: m.source,
          type: 'foto',
          _edit: 'media:' + idx
        });
      }
    });
    list.forEach((g) => {
      const isIg = g.source === 'instagram' || (g.url && g.url.indexOf('instagram.com') !== -1);
      const children = [];
      if (g.image) children.push(el('img', { src: g.image, alt: g.title || '', loading: 'lazy' }));
      else children.push(el('div', { class: 'gallery-placeholder' }, [isIg ? 'Instagram' : 'Foto']));
      children.push(el('figcaption', {}, [g.title || 'Foto']));
      box.appendChild(el('figure', {
        class: 'gallery-item',
        'data-admin-edit': g._edit || '',
        title: 'Ctrl+Alt+Shift + double-click untuk edit',
        onclick: function (ev) {
          // Jangan buka lightbox jika sedang mode edit cepat
          if (ev.ctrlKey && ev.altKey && ev.shiftKey) return;
          if (isIg && g.url) window.open(g.url, '_blank', 'noopener');
          else if (g.image) openLightbox(g.image, g.title);
          else if (g.url) window.open(g.url, '_blank', 'noopener');
        }
      }, children));
    });
  }

  function renderVideos(videos, media) {
    const box = document.getElementById('videos');
    if (!box) return;
    box.innerHTML = '';
    const list = [];
    (videos || []).forEach((v, idx) => {
      list.push({ title: v.title, thumb: v.thumb, youtubeId: v.youtubeId, source: 'youtube', _edit: 'videos:' + idx });
    });
    (media || []).forEach((m, idx) => {
      if (m.type === 'video') {
        list.push({
          title: m.title || 'Video',
          thumb: m.thumb,
          embedUrl: m.embedUrl,
          url: m.url,
          source: m.source,
          _edit: 'media:' + idx
        });
      }
    });
    list.forEach((v) => {
      const kids = [];
      if (v.thumb) kids.push(el('img', { src: v.thumb, alt: v.title || '', loading: 'lazy' }));
      else kids.push(el('div', { class: 'video-placeholder' }, [v.source === 'instagram' ? 'Instagram Reel' : (v.source || 'Video')]));
      kids.push(el('div', { class: 'play' }, [el('span', {}, ['▶'])]));
      box.appendChild(el('article', {
        class: 'video-card',
        'data-admin-edit': v._edit || '',
        title: 'Ctrl+Alt+Shift + double-click untuk edit'
      }, [
        el('div', {
          class: 'video-thumb',
          onclick: function (ev) {
            if (ev.ctrlKey && ev.altKey && ev.shiftKey) return;
            if (v.youtubeId) openVideo(v.youtubeId);
            else if (v.embedUrl) openEmbed(v.embedUrl);
            else if (v.url) window.open(v.url, '_blank', 'noopener');
          }
        }, kids),
        el('h3', {}, [v.title || 'Video'])
      ]));
    });
  }

  function renderActivities(list) {
    const box = document.getElementById('activities');
    if (!box || !list) return;
    box.innerHTML = '';
    list.forEach((a) => {
      box.appendChild(el('div', { class: 'activity-item' }, [
        el('div', { class: 'day' }, [a.day]),
        el('div', {}, [
          el('h3', {}, [a.title]),
          el('p', {}, [a.desc])
        ])
      ]));
    });
  }

  function renderSchool(school, ppdb) {
    const setText = (id, val) => {
      const n = document.getElementById(id);
      if (n && val != null) n.textContent = val;
    };
    setText('schoolName', school.name);
    setText('schoolFullName', school.fullName);
    setText('schoolTagline', school.tagline);
    setText('schoolAddress', school.address);
    setText('schoolEmail', school.email);
    setText('footerAddress', school.address);
    setText('footerEmail', school.email);

    const wa = document.getElementById('waLink');
    if (wa && school.whatsapp) {
      wa.href = `https://wa.me/${school.whatsapp}`;
      wa.textContent = 'Chat WhatsApp';
    }
    const ig = document.getElementById('igLink');
    if (ig && school.instagram) ig.href = school.instagram;

    const map = document.getElementById('mapFrame');
    if (map && school.mapsEmbed) map.src = school.mapsEmbed;

    if (ppdb) {
      setText('ppdbYear', 'PPDB Tahun Ajaran ' + (ppdb.year || ''));
      setText('ppdbNote', ppdb.note || '');
      const ul = document.getElementById('ppdbReqs');
      if (ul && ppdb.requirements) {
        ul.innerHTML = '';
        ppdb.requirements.forEach((r) => ul.appendChild(el('li', {}, [r])));
      }
    }

    document.title = `${school.name} — ${school.tagline}`;
  }

  function openLightbox(src, title) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    if (!lb || !img) return;
    img.src = src;
    img.alt = title || '';
    lb.classList.add('open');
  }
  function closeLightbox() {
    document.getElementById('lightbox')?.classList.remove('open');
  }
  function openVideo(id) {
    const m = document.getElementById('videoModal');
    const frame = document.getElementById('videoFrame');
    if (!m || !frame || !id) return;
    frame.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1';
    m.classList.add('open');
  }
  function openEmbed(embedUrl) {
    const m = document.getElementById('videoModal');
    const frame = document.getElementById('videoFrame');
    if (!m || !frame || !embedUrl) return;
    frame.src = embedUrl;
    m.classList.add('open');
  }
  function closeVideo() {
    const m = document.getElementById('videoModal');
    const frame = document.getElementById('videoFrame');
    if (frame) frame.src = '';
    if (m) m.classList.remove('open');
  }


  function setupSecretAdminEntry() {
    const logo = document.querySelector('.brand-logo-img, .brand');
    if (!logo) return;
    logo.style.cursor = 'default';
    logo.addEventListener('click', (e) => {
      if (e.ctrlKey && e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = 'admin/';
      }
    });
  }

  function setupNav() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    toggle?.addEventListener('click', () => links?.classList.toggle('open'));
    links?.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => links.classList.remove('open'));
    });
  }


  function setupQuickAdminEdit() {
    const ADMIN_PASS = 'Bismillaah9999#';
    // Visual cue when modifier held
    let armed = false;
    function setArmed(on) {
      armed = on;
      document.body.classList.toggle('admin-edit-armed', on);
    }
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.altKey && e.shiftKey) setArmed(true);
    });
    window.addEventListener('keyup', (e) => {
      if (!e.ctrlKey || !e.altKey || !e.shiftKey) setArmed(false);
    });
    window.addEventListener('blur', () => setArmed(false));

    document.addEventListener('dblclick', (e) => {
      if (!(e.ctrlKey && e.altKey && e.shiftKey)) return;
      const target = e.target.closest('[data-admin-edit]');
      if (!target) return;
      const key = (target.getAttribute('data-admin-edit') || '').trim();
      if (!key || key.indexOf(':') < 0) return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      const pass = window.prompt('Password admin untuk mengedit item ini:\n(' + key + ')');
      if (pass === null) return;
      if (pass !== ADMIN_PASS) {
        window.alert('Password salah.');
        return;
      }
      try { sessionStorage.setItem('sdit_di_admin_auth_v1', '1'); } catch (_) {}
      const url = 'admin/?edit=' + encodeURIComponent(key);
      window.open(url, '_blank');
    }, true);
  }

  async function init() {
    setupNav();
    setupSecretAdminEntry();
    setupQuickAdminEdit();
    document.getElementById('lightbox')?.addEventListener('click', (e) => {
      if (e.target.id === 'lightbox' || e.target.classList.contains('lightbox-close')) closeLightbox();
    });
    document.getElementById('videoModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'videoModal' || e.target.classList.contains('modal-close')) closeVideo();
    });

    try {
      const data = await loadData();
      applyBrand(data.brand);
      renderSchool(data.school, data.ppdb);
      renderCarousel(data.carousel);
      renderStats(data.stats);
      renderPrograms(data.programs);
      renderArticles(data.articles);
      renderGallery(data.gallery, data.media);
      renderVideos(data.videos, data.media);
      renderActivities(data.activities);
      // Tag sections that are not item-level
      document.querySelectorAll('#ppdb, .ppdb-box').forEach((node) => {
        node.setAttribute('data-admin-edit', 'school:0');
      });
    } catch (err) {
      console.error(err);
      const h = document.getElementById('schoolName');
      if (h) h.textContent = 'SDIT Daarul Istiqomah';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
