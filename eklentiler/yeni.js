// JetFilmizle — Nuvio Provider (Fixed & Stable)
var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var FETCH_TIMEOUT_MS = 8000;

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Referer': BASE_URL + '/'
};

function fetchWithTimeout(url, options, ms) {
  var timeout = ms || FETCH_TIMEOUT_MS;
  return new Promise(function(resolve, reject) {
    var t = setTimeout(function() { reject(new Error('Timeout: ' + url)); }, timeout);
    fetch(url, options)
      .then(function(r) { clearTimeout(t); resolve(r); })
      .catch(function(e) { clearTimeout(t); reject(e); });
  });
}

function titleToSlug(t) {
  return (t || '').toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
    .replace(/ç/g,'c').replace(/â/g,'a').replace(/û/g,'u')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function fetchTmdbInfo(tmdbId) {
  return fetchWithTimeout('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      return { titleTr: d.title || '', titleEn: d.original_title || '', year: (d.release_date || '').slice(0, 4) };
    });
}

function searchFilm(query) {
  return fetchWithTimeout(BASE_URL + '/filmara.php', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
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
  }).catch(function() { return []; });
}

function findFilmPage(titleTr, titleEn) {
  var slugTr = titleToSlug(titleTr);
  var slugEn = titleToSlug(titleEn);
  var candidates = [];
  if (slugTr) candidates.push(BASE_URL + '/film/' + slugTr);
  if (slugEn && slugEn !== slugTr) candidates.push(BASE_URL + '/film/' + slugEn);

  function checkUrl(url) {
    return fetchWithTimeout(url, { headers: HEADERS })
      .then(function(r) {
        if (!r.ok) return null;
        return r.text().then(function(html) {
          // SAHTE LİNK KONTROLÜ (Kritik nokta burası)
          if (html.indexOf('div#movie') !== -1 || html.indexOf('download-btn') !== -1 || html.indexOf('film_id') !== -1) {
            return { url: url, html: html };
          }
          return null;
        });
      }).catch(function() { return null; });
  }

  // Adayları sırayla kontrol et (Daha güvenli)
  return checkUrl(candidates[0])
    .then(function(res) {
      if (res) return res;
      if (candidates[1]) return checkUrl(candidates[1]);
      return null;
    })
    .then(function(res) {
      if (res) return res;
      // Eğer direkt linkler patlarsa aramaya geç
      return searchFilm(titleTr).then(function(links) {
        if (links.length === 0) throw new Error('Film bulunamadı');
        return fetchWithTimeout(links[0], { headers: HEADERS })
          .then(function(r) { return r.text(); })
          .then(function(html) { return { url: links[0], html: html }; });
      });
    });
}

function parseFilmPage(html) {
  var result = { iframeSrc: null, pixeldrains: [] };
  var iframeRe = /<iframe[^>]+(?:data-litespeed-src|src)="([^"]+)"/gi;
  var m;
  while ((m = iframeRe.exec(html)) !== null) {
    if (!result.iframeSrc && (m[1].indexOf('jetv') !== -1 || m[1].indexOf('d2rs') !== -1)) {
       result.iframeSrc = m[1];
    }
  }
  var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/[^"]+)"/g;
  while ((m = pdRe.exec(html)) !== null) result.pixeldrains.push(m[1]);
  return result;
}

// ... (Pixeldrain ve Jetv stream fonksiyonları aynı kalabilir) ...
function fetchPixeldrainStream(pdUrl) {
  var fileId = pdUrl.split('/u/').pop().split('?')[0];
  return fetchWithTimeout('https://pixeldrain.com/api/file/' + fileId + '/info', {}, 4000)
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(info) {
      var name = (info && info.name) || '';
      var quality = /2160p|4k/i.test(name) ? '4K' : /1080p/i.test(name) ? '1080p' : /720p/i.test(name) ? '720p' : 'Auto';
      return {
        url: 'https://pixeldrain.com/api/file/' + fileId + '?download',
        name: 'TR Dublaj',
        title: 'Pixeldrain ' + quality,
        quality: quality,
        headers: { 'Referer': 'https://pixeldrain.com/' }
      };
    }).catch(function() {
      return { url: 'https://pixeldrain.com/api/file/' + fileId + '?download', name: 'TR Dublaj', title: 'Pixeldrain', quality: 'Auto', headers: { 'Referer': 'https://pixeldrain.com/' } };
    });
}

function fetchJetvStream(iframeUrl) {
  var fullUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
  return fetchWithTimeout(fullUrl, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var srcMatch = html.match(/"sources"\s*:\s*\[\s*\{[^}]+\}/);
      if (srcMatch) {
        var fileM = srcMatch[0].match(/"file"\s*:\s*"([^"]+)"/);
        var labelM = srcMatch[0].match(/"label"\s*:\s*"([^"]+)"/);
        if (fileM) return { url: fileM[1], name: 'TR Dublaj', title: 'Jetv', quality: labelM ? labelM[1] : 'Auto', type: 'hls', headers: { 'Referer': fullUrl } };
      }
      return null;
    }).catch(function() { return null; });
}

function getStreams(tmdbId, mediaType) {
  return fetchTmdbInfo(tmdbId)
    .then(function(info) { return findFilmPage(info.titleTr, info.titleEn); })
    .then(function(result) {
      var parsed = parseFilmPage(result.html);
      var promises = [];
      var streams = [];

      if (parsed.pixeldrains.length > 0) {
        promises.push(Promise.all(parsed.pixeldrains.map(fetchPixeldrainStream)).then(function(s) { streams = streams.concat(s); }));
      }
      if (parsed.iframeSrc) {
        promises.push(fetchJetvStream(parsed.iframeSrc).then(function(s) { if (s) streams.push(s); }));
      }
      return Promise.all(promises).then(function() { return streams; });
    })
    .catch(function() { return []; });
}

// Global tanımlamalar
if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
else { 
  var g = (typeof global !== 'undefined') ? global : (typeof window !== 'undefined' ? window : self);
  g.getStreams = getStreams; 
}
