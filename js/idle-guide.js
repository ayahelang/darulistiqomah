/**
 * Idle Guide — carousel video saat idle, lalu tur section + TTS
 * Non-intrusive: berhenti total saat user berinteraksi.
 */
(function () {
  'use strict';

  var IDLE_CAROUSEL_MS = 3000;
  var IDLE_TOUR_MS = 7000; // total idle sebelum tur (setelah carousel aktif ~4s lagi, atau 7s dari idle awal)
  var CAROUSEL_SLIDE_MS = 3200;
  var SECTION_DWELL_MS = 5500;
  var TTS_SECTION_IDS = { tentang: 1, program: 1, kegiatan: 1 };

  var idleTimer = null;
  var tourTimer = null;
  var slideTimer = null;
  var state = 'active'; // active | carousel | tour
  var lastActivity = Date.now();
  var overlay = null;
  var track = null;
  var slideIdx = 0;
  var slides = [];
  var sectionQueue = [];
  var sectionPtr = 0;
  var speaking = false;
  var reducedMotion = false;

  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {
      return false;
    }
  }

  function markActivity() {
    lastActivity = Date.now();
    if (state !== 'active') stopAll(true);
    scheduleIdle();
  }

  function scheduleIdle() {
    clearTimeout(idleTimer);
    clearTimeout(tourTimer);
    if (reducedMotion) return;
    if (document.hidden) return;
    idleTimer = setTimeout(onIdleCarousel, IDLE_CAROUSEL_MS);
  }

  function stopSpeech() {
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (_) {}
    speaking = false;
    document.querySelectorAll('.idle-tts-hl').forEach(function (n) {
      n.classList.remove('idle-tts-hl');
    });
  }

  function stopAll(fromUser) {
    clearTimeout(idleTimer);
    clearTimeout(tourTimer);
    clearInterval(slideTimer);
    slideTimer = null;
    stopSpeech();
    hideOverlay();
    state = 'active';
    sectionPtr = 0;
    if (!fromUser) scheduleIdle();
  }

  function collectVideos() {
    var site = window.__sditLiveSite || {};
    var list = [];
    (site.videos || []).forEach(function (v, i) {
      if (!v) return;
      list.push({
        title: v.title || 'Video',
        thumb: v.thumb || (v.youtubeId ? 'https://img.youtube.com/vi/' + v.youtubeId + '/hqdefault.jpg' : ''),
        youtubeId: v.youtubeId || '',
        embedUrl: v.embedUrl || '',
        url: v.url || '',
        date: v.date || '',
        sort: v.date || ''
      });
    });
    (site.videoGroups || []).forEach(function (g) {
      if (!g || g.active === false) return;
      (g.items || []).forEach(function (it) {
        if (!it) return;
        var id = it.youtubeId || '';
        list.push({
          title: it.title || 'Video',
          thumb: it.thumb || (id ? 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg' : ''),
          youtubeId: id,
          embedUrl: it.embedUrl || '',
          url: it.url || '',
          date: it.date || g.date || '',
          sort: it.date || g.date || ''
        });
      });
    });
    (site.media || []).forEach(function (m) {
      if (!m || m.type !== 'video') return;
      list.push({
        title: m.title || 'Video',
        thumb: m.thumb || '',
        youtubeId: m.shortcode || m.youtubeId || '',
        embedUrl: m.embedUrl || '',
        url: m.url || '',
        date: m.date || '',
        sort: m.date || ''
      });
    });
    // terkini dulu
    list.sort(function (a, b) {
      return String(b.sort || '').localeCompare(String(a.sort || ''));
    });
    // ambil pool terkini lalu acak
    var pool = list.slice(0, Math.min(24, list.length));
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pool[i];
      pool[i] = pool[j];
      pool[j] = t;
    }
    return pool.slice(0, Math.min(10, pool.length));
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'idleVideoOverlay';
    overlay.className = 'idle-video-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="idle-video-panel" role="dialog" aria-label="Cuplikan video sekolah">' +
        '<div class="idle-video-head">' +
          '<strong>Cuplikan Galeri Video</strong>' +
          '<button type="button" class="idle-video-close" aria-label="Tutup">×</button>' +
        '</div>' +
        '<div class="idle-video-viewport"><div class="idle-video-track" id="idleVideoTrack"></div></div>' +
        '<div class="idle-video-foot"><span>Geser otomatis · klik untuk menutup</span></div>' +
      '</div>';
    document.body.appendChild(overlay);
    track = overlay.querySelector('#idleVideoTrack');
    overlay.querySelector('.idle-video-close').addEventListener('click', function (e) {
      e.stopPropagation();
      markActivity();
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) markActivity();
    });
    return overlay;
  }

  function hideOverlay() {
    if (!overlay) return;
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
    if (track) track.innerHTML = '';
  }

  function showCarousel() {
    var vids = collectVideos();
    if (!vids.length) {
      // tidak ada video — langsung jadwalkan tur
      state = 'carousel';
      tourTimer = setTimeout(startTour, Math.max(500, IDLE_TOUR_MS - IDLE_CAROUSEL_MS));
      return;
    }
    ensureOverlay();
    track.innerHTML = '';
    slides = vids;
    slideIdx = 0;
    vids.forEach(function (v) {
      var card = document.createElement('article');
      card.className = 'idle-video-card';
      var thumb = v.thumb
        ? '<img src="' + escapeAttr(v.thumb) + '" alt="" loading="lazy">'
        : '<div class="idle-video-ph">Video</div>';
      card.innerHTML =
        '<div class="idle-video-thumb">' + thumb + '<span class="idle-play">▶</span></div>' +
        '<h3>' + escapeHtml(v.title || 'Video') + '</h3>';
      card.addEventListener('click', function () {
        markActivity();
        try {
          if (v.youtubeId && typeof window.openVideo === 'function') window.openVideo(v.youtubeId);
          else if (v.embedUrl && typeof window.openEmbed === 'function') window.openEmbed(v.embedUrl);
          else if (v.url) window.open(v.url, '_blank', 'noopener');
          else {
            var sec = document.getElementById('video');
            if (sec) sec.scrollIntoView({ behavior: 'smooth' });
          }
        } catch (_) {}
      });
      track.appendChild(card);
    });
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
    state = 'carousel';
    paintSlide();
    clearInterval(slideTimer);
    slideTimer = setInterval(function () {
      slideIdx = (slideIdx + 1) % Math.max(1, slides.length);
      paintSlide();
    }, CAROUSEL_SLIDE_MS);
    // jika tetap idle → tur
    clearTimeout(tourTimer);
    tourTimer = setTimeout(startTour, Math.max(1000, IDLE_TOUR_MS - IDLE_CAROUSEL_MS));
  }

  function paintSlide() {
    if (!track) return;
    var card = track.querySelector('.idle-video-card');
    if (!card) return;
    var w = card.offsetWidth + 14;
    track.style.transform = 'translateX(' + (-slideIdx * w) + 'px)';
  }

  function onIdleCarousel() {
    if (Date.now() - lastActivity < IDLE_CAROUSEL_MS - 50) {
      scheduleIdle();
      return;
    }
    if (state !== 'active') return;
    showCarousel();
  }

  function visibleSections() {
    var order = [
      'tentang', 'program', 'berita', 'galeri', 'video', 'kegiatan',
      'visi', 'pimpinan', 'fasilitas', 'guru', 'prestasi', 'kalender',
      'ppdb', 'biaya', 'kontak'
    ];
    var out = [];
    order.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (el.hidden || el.getAttribute('hidden') !== null) return;
      if (el.classList.contains('sec-optional') && el.hasAttribute('hidden')) return;
      // display none
      var st = window.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return;
      out.push(id);
    });
    return out;
  }

  function startTour() {
    if (state === 'active') return;
    if (Date.now() - lastActivity < IDLE_TOUR_MS - 100) {
      stopAll(false);
      return;
    }
    hideOverlay();
    clearInterval(slideTimer);
    slideTimer = null;
    state = 'tour';
    sectionQueue = visibleSections();
    sectionPtr = 0;
    if (!sectionQueue.length) {
      stopAll(false);
      return;
    }
    visitNextSection();
  }

  function visitNextSection() {
    if (state !== 'tour') return;
    if (sectionPtr >= sectionQueue.length) {
      // kembali ke atas
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (_) {
        window.scrollTo(0, 0);
      }
      state = 'active';
      scheduleIdle();
      return;
    }
    var id = sectionQueue[sectionPtr++];
    var el = document.getElementById(id);
    if (!el) {
      visitNextSection();
      return;
    }
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_) {
      el.scrollIntoView(true);
    }
    el.classList.add('idle-section-pulse');
    setTimeout(function () {
      el.classList.remove('idle-section-pulse');
    }, 1200);

    var dwell = SECTION_DWELL_MS;
    if (TTS_SECTION_IDS[id]) {
      speakSection(id, function () {
        if (state !== 'tour') return;
        setTimeout(visitNextSection, 600);
      });
    } else {
      setTimeout(function () {
        if (state !== 'tour') return;
        visitNextSection();
      }, dwell);
    }
  }

  function sectionPlainText(id) {
    var el = document.getElementById(id);
    if (!el) return '';
    var clone = el.cloneNode(true);
    clone.querySelectorAll('script, style, button, .engage-wrap, nav').forEach(function (n) {
      n.remove();
    });
    var text = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
    // batasi panjang agar TTS tidak terlalu lama
    if (text.length > 900) text = text.slice(0, 897) + '…';
    return text;
  }

  function speakSection(id, onDone) {
    stopSpeech();
    var text = sectionPlainText(id);
    if (!text || !window.speechSynthesis) {
      if (onDone) onDone();
      return;
    }
    var el = document.getElementById(id);
    if (el) el.classList.add('idle-tts-hl');
    speaking = true;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'id-ID';
    u.rate = 1.02;
    u.pitch = 1;
    // pilih voice ID jika ada
    try {
      var voices = window.speechSynthesis.getVoices() || [];
      var idv = voices.find(function (v) {
        return /id-ID|Indonesia/i.test(v.lang + ' ' + v.name);
      });
      if (idv) u.voice = idv;
    } catch (_) {}
    u.onend = function () {
      speaking = false;
      if (el) el.classList.remove('idle-tts-hl');
      if (onDone) onDone();
    };
    u.onerror = function () {
      speaking = false;
      if (el) el.classList.remove('idle-tts-hl');
      if (onDone) onDone();
    };
    try {
      window.speechSynthesis.speak(u);
    } catch (_) {
      speaking = false;
      if (el) el.classList.remove('idle-tts-hl');
      if (onDone) onDone();
    }
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, '');
  }

  function bindActivity() {
    ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function (ev) {
      window.addEventListener(ev, markActivity, { passive: true, capture: true });
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopAll(true);
      else {
        lastActivity = Date.now();
        scheduleIdle();
      }
    });
  }

  function setupIdleGuide() {
    reducedMotion = prefersReducedMotion();
    if (reducedMotion) return;
    // tunggu data site sedikit
    bindActivity();
    scheduleIdle();
    // voices async di Chrome
    try {
      if (window.speechSynthesis) window.speechSynthesis.getVoices();
    } catch (_) {}
  }

  window.setupIdleGuide = setupIdleGuide;
  window.__idleGuideStop = function () { stopAll(true); };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(setupIdleGuide, 1200);
    });
  } else {
    setTimeout(setupIdleGuide, 1200);
  }
})();
