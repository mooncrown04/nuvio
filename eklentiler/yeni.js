// ============================================================
//  JetFilmizle — Nuvio Provider (V36 Fix: Clean Pixeldrain)
// ============================================================

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Referer': BASE_URL + '/'
};

// ── Yardımcı Fonksiyonlar ─────────────────────────────────────
function titleToSlug(title) {
  return (title || '').toLowerCase()
    .replace(/\u011f/g,'g').replace(/\u00fc/g,'u').replace(/\u015f/g,'s')
    .replace(/\u0131/g,'i').replace(/\u0130/g,'i').replace(/\u00f6/g,'o')
    .replace(/\u00e7/g,'c').replace(/\u00e2/g,'a').replace(/\u00fb/g,'u')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function fetchTmdbInfo(tmdbId) {
  return fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      return { titleTr: d.title || '', titleEn: d.original_title || '' };
    });
}

// ── Film Sayfasını Bulma ──────────────────────────────────────
function findFilmPage(titleTr, titleEn) {
  var slugTr = titleToSlug(titleTr);
  var slugEn = titleToSlug(titleEn);
  var direct = [BASE_URL + '/film/' + slugTr];
  if (slugEn && slugEn !== slugTr) direct.push(BASE_URL + '/film/' + slugEn);

  function tryNext(i) {
    if (i >= direct.length) return Promise.reject('Sayfa bulunamadı');
    return fetch(direct[i], { headers: HEADERS }).then(function(r) {
      if (!r.ok) return tryNext(i + 1);
      return r.text().then(function(html) { return { url: direct[i], html: html }; });
    });
  }
  return tryNext(0);
}

// ── Pixeldrain İşleme (Hata Ayıklamalı) ────────────────────────
function fetchPixeldrainStream(pdUrl, movieName) {
  // ID'yi temizle (Parametreleri ve boşlukları at)
  var fileId = pdUrl.split('/u/').pop().split('?')[0].split('#')[0].trim();
  
  // Geçersiz ID kontrolü (Pixeldrain ID'leri genelde 8-10 karakterdir)
  if (fileId.length < 5) return Promise.resolve(null);

  return fetch('https://pixeldrain.com/api/file/' + fileId + '/info')
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(info) {
      if (!info) return null; // Dosya silinmiş veya hatalıysa null dön
      
      var name = (info.name || '').toLowerCase();
      var quality = 'Auto';
      if      (name.includes('2160p') || name.includes('4k'))  quality = '4K';
      else if (name.includes('1080p')) quality = '1080p';
      else if (name.includes('720p'))  quality = '720p';

      return {
        url:     'https://pixeldrain.com/api/file/' + fileId + '?download',
        name:    movieName,
        title:   '⌜ JETFILM ⌟ | Pixeldrain | 🇹🇷 Dublaj',
        quality: quality,
        headers: { 'Referer': 'https://pixeldrain.com/' }
      };
    })
    .catch(function() { return null; });
}

// ── Jetv İşleme ───────────────────────────────────────────────
function fetchJetvStream(iframeUrl, movieName) {
  return fetch(iframeUrl, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var srcMatch = html.match(/"file"\s*:\s*"([^"]+)"/);
      if (srcMatch) {
        return {
          url:      srcMatch[1],
          name:     movieName,
          title:    '⌜ JETFILM ⌟ | Jetv | 🇹🇷 Dublaj',
          quality:  'Auto',
          type:     'hls',
          headers:  { 'Referer': iframeUrl }
        };
      }
      return null;
    })
    .catch(function() { return null; });
}

// ── Ana Akış ──────────────────────────────────────────────────
function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== 'movie') return Promise.resolve([]);

  return fetchTmdbInfo(tmdbId).then(function(info) {
    var movieName = info.titleTr || info.titleEn;
    return findFilmPage(info.titleTr, info.titleEn).then(function(result) {
      var streams = [];
      var promises = [];
      
      // Pixeldrain Linklerini Ayıkla (Benzersiz yap)
      var pdLinks = [];
      var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/[^"]+)"/g;
      var m;
      while ((m = pdRe.exec(result.html)) !== null) {
        var cleanId = m[1].split('/u/').pop().split('?')[0];
        if (pdLinks.indexOf(cleanId) === -1) pdLinks.push(cleanId);
      }

      // Pixeldrain'leri işle
      pdLinks.forEach(function(id) {
        var url = 'https://pixeldrain.com/u/' + id;
        promises.push(fetchPixeldrainStream(url, movieName).then(function(s) { if (s) streams.push(s); }));
      });

      // Iframe'leri işle
      var iframeM = result.html.match(/<iframe[^>]+(?:data-litespeed-src|src)="([^"]+)"/i);
      if (iframeM) {
        var src = iframeM[1];
        if (src.includes('jetv.xyz') || src.includes('d2rs')) {
          promises.push(fetchJetvStream(src, movieName).then(function(s) { if (s) streams.push(s); }));
        }
      }

      return Promise.all(promises).then(function() { return streams; });
    });
  }).catch(function() { return []; });
}

module.exports = { getStreams: getStreams };
