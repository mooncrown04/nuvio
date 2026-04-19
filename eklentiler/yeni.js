// ============================================================
//  JetFilmizle — Nuvio Provider (V35 UI & Quality Sync)
//  Kaynak: jetfilmizle.net | Sadece Film
// ============================================================

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/'
};

// ── Yardımcı ─────────────────────────────────────────────────
function titleToSlug(title) {
  return (title || '').toLowerCase()
    .replace(/\u011f/g,'g').replace(/\u00fc/g,'u').replace(/\u015f/g,'s')
    .replace(/\u0131/g,'i').replace(/\u0130/g,'i').replace(/\u00f6/g,'o')
    .replace(/\u00e7/g,'c').replace(/\u00e2/g,'a').replace(/\u00fb/g,'u')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

// ── TMDB ─────────────────────────────────────────────────────
function fetchTmdbInfo(tmdbId) {
  return fetch(
    'https://api.themoviedb.org/3/movie/' + tmdbId +
    '?api_key=' + TMDB_API_KEY + '&language=tr-TR'
  )
  .then(function(r) {
    if (!r.ok) throw new Error('TMDB hata: ' + r.status);
    return r.json();
  })
  .then(function(d) {
    return {
      titleTr: d.title || '',
      titleEn: d.original_title || '',
      year:    (d.release_date || '').slice(0, 4)
    };
  });
}

// ── Arama ────────────────────────────────────────────────────
function searchFilm(query) {
  return fetch(BASE_URL + '/filmara.php', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, {
      'Content-Type': 'application/x-www-form-urlencoded'
    }),
    body: 's=' + encodeURIComponent(query)
  })
  .then(function(r) { return r.text(); })
  .then(function(html) {
    var re = /href="(https?:\/\/jetfilmizle\.net\/film\/[^"?#]+)"/g;
    var m, seen = {}, links = [];
    while ((m = re.exec(html)) !== null) {
      if (!seen[m[1]]) { seen[m[1]] = true; links.push(m[1]); }
    }
    return links;
  })
  .catch(function() { return []; });
}

// ── Film sayfasını bul ────────────────────────────────────────
function findFilmPage(titleTr, titleEn) {
  var slugTr = titleToSlug(titleTr);
  var slugEn = titleToSlug(titleEn);
  var direct = [];
  if (slugTr) direct.push(BASE_URL + '/film/' + slugTr);
  if (slugEn && slugEn !== slugTr) direct.push(BASE_URL + '/film/' + slugEn);

  function tryDirect(i) {
    if (i >= direct.length) return trySearch();
    return fetch(direct[i], { headers: HEADERS })
      .then(function(r) {
        if (!r.ok) return tryDirect(i + 1);
        return r.text().then(function(html) {
          if (html.indexOf('div#movie') !== -1 || html.indexOf('download-btn') !== -1 || html.indexOf('film_id') !== -1) {
            return { url: direct[i], html: html };
          }
          return tryDirect(i + 1);
        });
      })
      .catch(function() { return tryDirect(i + 1); });
  }

  function trySearch() {
    return searchFilm(titleTr)
      .then(function(links) {
        if (links.length === 0 && titleEn && titleEn !== titleTr) {
          return searchFilm(titleEn);
        }
        return links;
      })
      .then(function(links) {
        if (links.length === 0) throw new Error('Film bulunamadi');
        var best = null;
        for (var i = 0; i < links.length; i++) {
          var slug = (links[i].split('/film/')[1] || '').replace(/\/$/, '');
          if (slug === slugTr || slug === slugEn) { best = links[i]; break; }
        }
        var target = best || links[0];
        return fetch(target, { headers: HEADERS })
          .then(function(r) { return r.text(); })
          .then(function(html) { return { url: target, html: html }; });
      });
  }

  return tryDirect(0);
}

// ── Sayfa Ayrıştırma ──────────────────────────────────────────
function parseFilmPage(html) {
  var result = { iframeSrc: null, pixeldrains: [] };
  var iframeRe = /<iframe[^>]+(?:data-litespeed-src|src)="([^"]+)"/gi;
  var m;
  while ((m = iframeRe.exec(html)) !== null) {
    if (!result.iframeSrc) result.iframeSrc = m[1];
  }
  var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/[^"]+)"/g;
  while ((m = pdRe.exec(html)) !== null) {
    result.pixeldrains.push(m[1]);
  }
  return result;
}

// ── Pixeldrain İşleme ─────────────────────────────────────────
function fetchPixeldrainStream(pdUrl, movieName) {
  var fileId = pdUrl.split('/u/').pop().split('?')[0];
  return fetch('https://pixeldrain.com/api/file/' + fileId + '/info')
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(info) {
      var name = (info && info.name) || '';
      var quality = 'Auto';
      if      (/2160p|4k/i.test(name))  quality = '4K';
      else if (/1080p/i.test(name))      quality = '1080p';
      else if (/720p/i.test(name))       quality = '720p';
      else if (/480p/i.test(name))       quality = '480p';

      return {
        url:     'https://pixeldrain.com/api/file/' + fileId + '?download',
        name:    movieName,
        title:   '⌜ JETFILM ⌟ | Pixeldrain | 🇹🇷 Dublaj',
        quality: quality,
        headers: { 'Referer': 'https://pixeldrain.com/' }
      };
    })
    .catch(function() {
      return {
        url:     'https://pixeldrain.com/api/file/' + fileId + '?download',
        name:    movieName,
        title:   '⌜ JETFILM ⌟ | Pixeldrain | 🇹🇷 Dublaj',
        quality: 'Auto',
        headers: { 'Referer': 'https://pixeldrain.com/' }
      };
    });
}

// ── Jetv İşleme ───────────────────────────────────────────────
function fetchJetvStream(iframeUrl, movieName) {
  var fullUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
  return fetch(fullUrl, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var srcMatch = html.match(/"sources"\s*:\s*\[\s*\{[^}]+\}/);
      if (srcMatch) {
        var fileM  = srcMatch[0].match(/"file"\s*:\s*"([^"]+)"/);
        var labelM = srcMatch[0].match(/"label"\s*:\s*"([^"]+)"/);
        if (fileM) {
          return {
            url:      fileM[1],
            name:     movieName,
            title:    '⌜ JETFILM ⌟ | Jetv | 🇹🇷 Dublaj',
            quality:  labelM ? labelM[1] : 'Auto',
            type:     'hls',
            headers:  { 'Referer': fullUrl }
          };
        }
      }
      var innerM = html.match(/<iframe[^>]+src="([^"]+)"/i);
      if (innerM) return fetchJetvStream(innerM[1], movieName);
      return null;
    })
    .catch(function() { return null; });
}

// ── Ana Akış ──────────────────────────────────────────────────
function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== 'movie') return Promise.resolve([]);

  return fetchTmdbInfo(tmdbId)
    .then(function(info) {
      var movieName = info.titleTr || info.titleEn;
      return findFilmPage(info.titleTr, info.titleEn).then(function(result) {
        var parsed = parseFilmPage(result.html);
        var streams = [];
        var promises = [];

        // 1. Pixeldrain
        if (parsed.pixeldrains.length > 0) {
          promises.push(
            Promise.all(parsed.pixeldrains.map(function(u) { return fetchPixeldrainStream(u, movieName); }))
              .then(function(res) {
                var seen = {};
                res.forEach(function(s) { if (!seen[s.url]) { seen[s.url] = true; streams.push(s); } });
              })
          );
        }

        // 2. Iframe (Jetv / d2rs)
        if (parsed.iframeSrc) {
          var src = parsed.iframeSrc;
          if (src.indexOf('jetv.xyz') !== -1 || src.indexOf('d2rs') !== -1) {
            promises.push(
              fetchJetvStream(src, movieName).then(function(s) { if (s) streams.push(s); })
            );
          }
        }

        return Promise.all(promises).then(function() { return streams; });
      });
    })
    .catch(function() { return []; });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}
