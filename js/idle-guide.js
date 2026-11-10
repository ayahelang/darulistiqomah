/**
 * Idle Guide — carousel video saat idle, lalu tur section + TTS
 * v2: mousemove, carousel ≠ tour bersamaan, hover pause, TTS selektif
 */
(function () {
  'use strict';

  var IDLE_CAROUSEL_MS = 3000;
  var IDLE_AFTER_CAROUSEL_MS = 7000; // idle tambahan SEJAK carousel tampil (tanpa hover)
  var CAROUSEL_SLIDE_MS = 3400;
  var SECTION_DWELL_MS = 4200;
  var TTS_PAUSE_MS = 1000;
  var TTS_SECTION_IDS = { tentang: 1, program: 1, kegiatan: 1 };

  var idleTimer = null;
  var tourArmTimer = null;
  var slideTimer = null;
  var state = 'active'; // active | carousel | tour
  var lastActivity = Date.now();
  var overlay = null;
  var track = null;
  var panel = null;
  var slideIdx = 0;
  var slides = [];
  var sectionQueue = [];
  var sectionPtr = 0;
  var speaking = false;
  var reducedMotion = false;
  var carouselHovered = false;
  var tourArmedAt = 0;
  var moveThrottle = 0;

  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {
      return false;
    }
  }

  function markActivity(ev) {
    // mousemove di atas overlay carousel = hover, jangan anggap "user cancel"
    if (ev && state === 'carousel' && overlay && overlay.classList.contains('is-visible')) {
      var t = ev.target;
      if (t && overlay.contains(t)) {
        lastActivity = Date.now();
        return;
      }
    }
    lastActivity = Date.now();
    if (state !== 'active') stopAll(true);
    else scheduleIdleWatch();
  }

  function onMouseMove(ev) {
    var now = Date.now();
    if (now - moveThrottle < 120) return;
    moveThrottle = now;
    markActivity(ev);
  }

  function scheduleIdleWatch() {
    clearTimeout(idleTimer);
    clearTimeout(tourArmTimer);
    if (reducedMotion) return;
    if (document.hidden) return;
    if (state !== 'active') return;
    idleTimer = setTimeout(tryShowCarousel, IDLE_CAROUSEL_MS);
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
    clearTimeout(tourArmTimer);
    clearInterval(slideTimer);
    slideTimer = null;
    carouselHovered = false;
    tourArmedAt = 0;
    stopSpeech();
    hideOverlay();
    state = 'active';
    sectionPtr = 0;
    if (!fromUser) scheduleIdleWatch();
    else scheduleIdleWatch();
  }

  function collectVideos() {
    var site = window.__sditLiveSite || {};
    var list = [];
    function push(v) {
      if (!v) return;
      var id = v.youtubeId || v.shortcode || '';
      list.push({
        title: v.title || 'Video',
        thumb: v.thumb || (id ? 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg' : ''),
        youtubeId: id,
        embedUrl: v.embedUrl || '',
        url: v.url || '',
        sort: v.date || ''
      });
    }
    (site.videos || []).forEach(push);
    (site.videoGroups || []).forEach(function (g) {
      if (!g || g.active === false) return;
      (g.items || []).forEach(function (it) {
        push({
          title: it.title,
          thumb: it.thumb,
          youtubeId: it.youtubeId,
          embedUrl: it.embedUrl,
          url: it.url,
          date: it.date || g.date || ''
        });
      });
    });
    (site.media || []).forEach(function (m) {
      if (m && m.type === 'video') push(m);
    });
    list.sort(function (a, b) {
      return String(b.sort || '').localeCompare(String(a.sort || ''));
    });
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
        '<div class="idle-video-foot"><span>Hover untuk jeda · klik card untuk putar · klik luar untuk tutup</span></div>' +
      '</div>';
    document.body.appendChild(overlay);
    track = overlay.querySelector('#idleVideoTrack');
    panel = overlay.querySelector('.idle-video-panel');

    overlay.querySelector('.idle-video-close').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      stopAll(true);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) stopAll(true);
    });

    // Hover panel: pause slide + pause countdown tur
    if (panel) {
      panel.addEventListener('mouseenter', function () {
        carouselHovered = true;
        pauseSlide();
        clearTimeout(tourArmTimer);
      });
      panel.addEventListener('mouseleave', function () {
        carouselHovered = false;
        if (state === 'carousel') {
          resumeSlide();
          armTourAfterCarousel();
        }
      });
      // touch: tap tidak langsung cancel; biarkan klik card
      panel.addEventListener('touchstart', function () {
        carouselHovered = true;
        pauseSlide();
        clearTimeout(tourArmTimer);
      }, { passive: true });
    }
    return overlay;
  }

  function hideOverlay() {
    if (!overlay) return;
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
    if (track) {
      track.innerHTML = '';
      track.style.transform = '';
    }
  }

  function pauseSlide() {
    clearInterval(slideTimer);
    slideTimer = null;
  }

  function resumeSlide() {
    if (state !== 'carousel' || !slides.length) return;
    pauseSlide();
    slideTimer = setInterval(function () {
      if (carouselHovered) return;
      slideIdx = (slideIdx + 1) % slides.length;
      paintSlide();
    }, CAROUSEL_SLIDE_MS);
  }

  function armTourAfterCarousel() {
    clearTimeout(tourArmTimer);
    if (state !== 'carousel') return;
    if (carouselHovered) return;
    tourArmedAt = Date.now();
    tourArmTimer = setTimeout(function () {
      if (state !== 'carousel') return;
      if (carouselHovered) return;
      // pastikan masih idle (tidak ada aktivitas di luar overlay)
      startTour();
    }, IDLE_AFTER_CAROUSEL_MS);
  }

  function tryShowCarousel() {
    if (state !== 'active') return;
    if (Date.now() - lastActivity < IDLE_CAROUSEL_MS - 80) {
      scheduleIdleWatch();
      return;
    }
    showCarousel();
  }

  function showCarousel() {
    // PENTING: jangan mulai tur / scroll halaman di sini
    clearTimeout(tourArmTimer);
    var vids = collectVideos();
    state = 'carousel';

    if (!vids.length) {
      // tanpa video → arm tur saja, tanpa overlay
      armTourAfterCarousel();
      return;
    }

    ensureOverlay();
    track.innerHTML = '';
    slides = vids;
    slideIdx = 0;

    vids.forEach(function (v) {
      var card = document.createElement('article');
      card.className = 'idle-video-card video-card';
      var img = v.thumb
        ? '<img src="' + escapeAttr(v.thumb) + '" alt="" loading="lazy">'
        : '<div class="video-placeholder">Video</div>';
      card.innerHTML =
        '<div class="video-thumb idle-v-thumb">' +
          img +
          '<div class="play"><span>▶</span></div>' +
        '</div>' +
        '<h3></h3>';
      card.querySelector('h3').textContent = v.title || 'Video';
      card.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        // putar video tanpa menutup dulu — user explicit
        try {
          if (v.youtubeId && typeof window.openVideo === 'function') {
            stopAll(true);
            window.openVideo(v.youtubeId);
          } else if (v.embedUrl && typeof window.openEmbed === 'function') {
            stopAll(true);
            window.openEmbed(v.embedUrl);
          } else if (v.url) {
            stopAll(true);
            window.open(v.url, '_blank', 'noopener');
          } else {
            stopAll(true);
            var sec = document.getElementById('video');
            if (sec) sec.scrollIntoView({ behavior: 'smooth' });
          }
        } catch (_) {
          stopAll(true);
        }
      });
      track.appendChild(card);
    });

    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
    // layout then slide
    requestAnimationFrame(function () {
      paintSlide();
      resumeSlide();
      armTourAfterCarousel();
    });
  }

  function paintSlide() {
    if (!track) return;
    var card = track.querySelector('.idle-video-card');
    if (!card) return;
    var gap = 14;
    var w = card.getBoundingClientRect().width + gap;
    track.style.transform = 'translate3d(' + (-slideIdx * w) + 'px,0,0)';
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
      if (el.hasAttribute('hidden') || el.hidden) return;
      var st = window.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return;
      out.push(id);
    });
    return out;
  }

  function startTour() {
    // Hanya dari state carousel (atau tanpa video)
    if (state !== 'carousel') return;
    hideOverlay();
    pauseSlide();
    clearTimeout(tourArmTimer);
    state = 'tour';
    sectionQueue = visibleSections();
    sectionPtr = 0;
    if (!sectionQueue.length) {
      state = 'active';
      scheduleIdleWatch();
      return;
    }
    visitNextSection();
  }

  function visitNextSection() {
    if (state !== 'tour') return;
    if (sectionPtr >= sectionQueue.length) {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (_) {
        window.scrollTo(0, 0);
      }
      state = 'active';
      scheduleIdleWatch();
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
    }, 1100);

    if (TTS_SECTION_IDS[id]) {
      speakSectionChunks(id, function () {
        if (state !== 'tour') return;
        setTimeout(visitNextSection, 500);
      });
    } else {
      setTimeout(function () {
        if (state !== 'tour') return;
        visitNextSection();
      }, SECTION_DWELL_MS);
    }
  }

  /** Ambil hanya judul + deskripsi bermakna, bukan label/tombol */
  function extractSpeakChunks(id) {
    var el = document.getElementById(id);
    if (!el) return [];
    var chunks = [];
    var seen = {};

    function add(t) {
      t = String(t || '').replace(/\s+/g, ' ').trim();
      if (!t || t.length < 3) return;
      // skip label sangat pendek uppercase-like
      if (t.length < 40 && t === t.toUpperCase() && /[A-Z]/.test(t)) return;
      var key = t.toLowerCase();
      if (seen[key]) return;
      seen[key] = 1;
      chunks.push(t);
    }

    // h2 utama section
    var h2 = el.querySelector('.section-head h2, .about-panel h2, h2');
    if (h2) add(h2.textContent);

    if (id === 'tentang') {
      var tag = el.querySelector('#schoolTagline, .about-panel .copy > p');
      // semua paragraf di copy, skip yang hanya berisi tombol
      el.querySelectorAll('.about-panel .copy > p, .copy p').forEach(function (p) {
        if (p.closest('a.btn')) return;
        add(p.textContent);
      });
    } else if (id === 'program') {
      var lead = el.querySelector('.section-head > p');
      if (lead) add(lead.textContent);
      el.querySelectorAll('#programs .program-card, #programs .card').forEach(function (card) {
        var t = card.querySelector('h3, h4, .title');
        var d = card.querySelector('p, .desc');
        if (t) add(t.textContent);
        if (d) add(d.textContent);
      });
    } else if (id === 'kegiatan') {
      var lead2 = el.querySelector('.section-head > p');
      if (lead2) add(lead2.textContent);
      el.querySelectorAll('#activities .activity-item, #activities .card').forEach(function (item) {
        var day = item.querySelector('.day');
        var t = item.querySelector('h3, h4, strong, .title');
        var d = item.querySelector('p, .desc');
        var line = '';
        if (day) line += day.textContent.trim() + '. ';
        if (t) line += t.textContent.trim() + '. ';
        if (d) line += d.textContent.trim();
        add(line);
      });
    }

    // batasi total chunk
    return chunks.slice(0, 12);
  }

  function speakSectionChunks(id, onDone) {
    stopSpeech();
    var chunks = extractSpeakChunks(id);
    if (!chunks.length || !window.speechSynthesis) {
      if (onDone) setTimeout(onDone, SECTION_DWELL_MS);
      return;
    }
    var el = document.getElementById(id);
    if (el) el.classList.add('idle-tts-hl');
    speaking = true;

    var voices = [];
    try {
      voices = window.speechSynthesis.getVoices() || [];
    } catch (_) {}
    var idv = null;
    for (var i = 0; i < voices.length; i++) {
      if (/id-ID|Indonesia/i.test(voices[i].lang + ' ' + voices[i].name)) {
        idv = voices[i];
        break;
      }
    }

    var idx = 0;
    function next() {
      if (state !== 'tour') {
        stopSpeech();
        return;
      }
      if (idx >= chunks.length) {
        speaking = false;
        if (el) el.classList.remove('idle-tts-hl');
        if (onDone) onDone();
        return;
      }
      var text = chunks[idx++];
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'id-ID';
      u.rate = 1.0;
      if (idv) u.voice = idv;
      u.onend = function () {
        if (state !== 'tour') return;
        // jeda 1 detik antar paragraf / style
        setTimeout(next, TTS_PAUSE_MS);
      };
      u.onerror = function () {
        setTimeout(next, TTS_PAUSE_MS);
      };
      try {
        window.speechSynthesis.speak(u);
      } catch (_) {
        setTimeout(next, TTS_PAUSE_MS);
      }
    }
    next();
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
    window.addEventListener('mousemove', onMouseMove, { passive: true, capture: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        clearTimeout(idleTimer);
        clearTimeout(tourArmTimer);
        pauseSlide();
        stopSpeech();
        hideOverlay();
        state = 'active';
      } else {
        lastActivity = Date.now();
        scheduleIdleWatch();
      }
    });
    window.addEventListener('resize', function () {
      if (state === 'carousel') paintSlide();
    });
  }

  function setupIdleGuide() {
    reducedMotion = prefersReducedMotion();
    if (reducedMotion) return;
    bindActivity();
    scheduleIdleWatch();
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = function () {
          window.speechSynthesis.getVoices();
        };
      }
    } catch (_) {}
  }

  window.setupIdleGuide = setupIdleGuide;
  window.__idleGuideStop = function () { stopAll(true); };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(setupIdleGuide, 1500);
    });
  } else {
    setTimeout(setupIdleGuide, 1500);
  }
})();
