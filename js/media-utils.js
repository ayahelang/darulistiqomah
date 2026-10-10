/**
 * Utilitas deteksi & normalisasi link Instagram / Facebook / media langsung.
 * Dipakai admin panel & (opsional) frontend.
 */
(function (global) {
  function parseMediaUrl(raw) {
    const input = (raw || '').trim();
    if (!input) return { ok: false, error: 'URL kosong' };

    let url;
    try {
      url = new URL(input.startsWith('http') ? input : 'https://' + input);
    } catch {
      return { ok: false, error: 'URL tidak valid' };
    }

    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const path = url.pathname;

    // Instagram
    if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
      const m = path.match(/\/(reel|p|tv)\/([A-Za-z0-9_-]+)/);
      if (m) {
        const kind = m[1]; // reel | p | tv
        const shortcode = m[2];
        const isVideo = kind === 'reel' || kind === 'tv';
        return {
          ok: true,
          source: 'instagram',
          type: isVideo ? 'video' : 'foto',
          shortcode,
          canonical: `https://www.instagram.com/${kind}/${shortcode}/`,
          embedUrl: `https://www.instagram.com/${kind}/${shortcode}/embed`,
          thumb: '', // oEmbed tidak lagi supply thumbnail
          suggestedCategory: isVideo ? 'Video' : 'Foto',
          suggestedTitle: isVideo ? 'Video Instagram' : 'Foto Instagram'
        };
      }
      return { ok: false, error: 'Link Instagram harus berupa /p/, /reel/, atau /tv/' };
    }

    // Facebook
    if (host === 'facebook.com' || host === 'fb.com' || host === 'fb.watch' || host.endsWith('.facebook.com')) {
      const isVideo =
        /\/(reel|videos|watch)\b/i.test(path) ||
        host === 'fb.watch' ||
        url.searchParams.has('v');
      return {
        ok: true,
        source: 'facebook',
        type: isVideo ? 'video' : 'foto',
        shortcode: '',
        canonical: url.href.split('?')[0],
        embedUrl: url.href,
        thumb: '',
        suggestedCategory: isVideo ? 'Video' : 'Foto',
        suggestedTitle: isVideo ? 'Video Facebook' : 'Foto Facebook'
      };
    }

    // Direct image
    if (/\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(path) || /fbcdn|cdninstagram|scontent/i.test(host)) {
      return {
        ok: true,
        source: 'direct',
        type: 'foto',
        shortcode: '',
        canonical: url.href,
        embedUrl: '',
        thumb: url.href,
        suggestedCategory: 'Foto',
        suggestedTitle: 'Foto'
      };
    }

    // YouTube (bonus)
    if (host.includes('youtube.com') || host === 'youtu.be') {
      let id = url.searchParams.get('v') || '';
      if (host === 'youtu.be') id = path.replace(/^\//, '').split('/')[0];
      const m = path.match(/\/(embed|shorts)\/([A-Za-z0-9_-]+)/);
      if (m) id = m[2];
      if (id) {
        return {
          ok: true,
          source: 'youtube',
          type: 'video',
          shortcode: id,
          canonical: `https://www.youtube.com/watch?v=${id}`,
          embedUrl: `https://www.youtube.com/embed/${id}`,
          thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
          suggestedCategory: 'Video',
          suggestedTitle: 'Video YouTube'
        };
      }
    }

    return { ok: false, error: 'Sumber belum didukung. Gunakan link Instagram, Facebook, YouTube, atau URL gambar langsung.' };
  }

  function makeMediaItem(parsed, overrides) {
    const o = overrides || {};
    return {
      id: o.id || 'm' + Date.now(),
      url: parsed.canonical,
      type: o.type || parsed.type,
      source: parsed.source,
      shortcode: parsed.shortcode || '',
      title: (o.title || '').trim() || parsed.suggestedTitle,
      description: (o.description || '').trim(),
      category: (o.category || '').trim() || parsed.suggestedCategory,
      thumb: o.thumb || parsed.thumb || '',
      embedUrl: parsed.embedUrl,
      active: o.active !== false,
      date: o.date || new Date().toISOString().slice(0, 10)
    };
  }

  global.MediaUtils = { parseMediaUrl, makeMediaItem };
})(typeof window !== 'undefined' ? window : globalThis);
