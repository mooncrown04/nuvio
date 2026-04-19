/**
 * NUVIO ŞABLON NOTU:
 * name: Üstte görünen içerik ismi
 * title: Altta görünen ⌜ WEBTEIZLE ⌟ | Kaynak | Dil
 */

var BASE_URL     = 'https://webteizle3.xyz';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/'
};

// ── TMDB ──────────────────────────────────────────────────────
function fetchTmdbInfo(tmdbId, mediaType) {
  var endpoint = (mediaType === 'tv') ? 'tv' : 'movie';
  return fetch('https://api.themoviedb.org/3/' + endpoint + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      return {
        originalTitle: d.title || d.name || 'İçerik', // Üstte görünecek isim için
        titleTr: d.title  || d.name  || '',
        titleEn: d.original_title || d.original_name || '',
        year: (d.release_date || d.first_air_date || '').slice(0, 4)
      };
    });
}

function titleToSlug(title) {
  return (title || '').toLowerCase()
    .replace(/\u011f/g,'g').replace(/\u00fc/g,'u').replace(/\u015f/g,'s')
    .replace(/\u0131/g,'i').replace(/\u0130/g,'i').replace(/\u00f6/g,'o').replace(/\u00e7/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function findFilmPage(titleTr, titleEn) {
  var slugTr = titleToSlug(titleTr);
  var slugEn = titleToSlug(titleEn);
  var candidates = [];
  if (slugTr) { candidates.push(BASE_URL + '/izle/dublaj/' + slugTr); candidates.push(BASE_URL + '/izle/altyazi/' + slugTr); }
  if (slugEn && slugEn !== slugTr) { candidates.push(BASE_URL + '/izle/dublaj/' + slugEn); candidates.push(BASE_URL + '/izle/altyazi/' + slugEn); }

  function tryNext(i) {
    if (i >= candidates.length) return searchFallback(titleTr, titleEn);
    return fetch(candidates[i], { headers: HEADERS }).then(function(r) {
      if (!r.ok) return tryNext(i + 1);
      return r.text().then(function(html) {
        if (html.indexOf('data-id') === -1) return tryNext(i + 1);
        return { url: candidates[i], html: html };
      });
    }).catch(function() { return tryNext(i + 1); });
  }
  return tryNext(0);
}

function searchFallback(titleTr, titleEn) {
  var query = titleTr || titleEn;
  return fetch(BASE_URL + '/ajax/arama.asp', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' }),
    body: 'q=' + encodeURIComponent(query)
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var items = (data.results && data.results.filmler && data.results.filmler.results) || [];
    if (!items.length) throw new Error('Film bulunamadi');
    var pageUrl = items[0].url.startsWith('http') ? items[0].url : BASE_URL + items[0].url;
    return fetch(pageUrl, { headers: HEADERS }).then(function(r) { return r.text().then(function(html) { return { url: pageUrl, html: html }; }); });
  });
}

function fetchAlternatifler(filmId, dil, seasonNum, episodeNum) {
  var body = 'filmid=' + filmId + '&dil=' + dil + '&s=' + (seasonNum || '') + '&b=' + (episodeNum || '') + '&bot=0';
  return fetch(BASE_URL + '/ajax/dataAlternatif3.asp', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'Origin': BASE_URL }),
    body: body
  })
  .then(function(r) { return r.json(); })
  .then(function(data) { return (data.status === 'success' && Array.isArray(data.data)) ? data.data : []; });
}

function fetchEmbedIframe(embedId) {
  return fetch(BASE_URL + '/ajax/dataEmbed.asp', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'Origin': BASE_URL }),
    body: 'id=' + embedId
  })
  .then(function(r) { return r.text(); })
  .then(function(html) {
    var m = html.match(/<iframe[^>]+src="([^"]+)"/i);
    if (m) return m[1];
    var sm = html.match(/(vidmoly|okru|filemoon|dzen)\s*\(\s*'([^']+)'/i);
    if (sm) {
        var p = sm[1].toLowerCase(), vid = sm[2];
        if (p === 'vidmoly') return 'https://vidmoly.to/embed-' + vid + '.html';
        if (p === 'filemoon') return 'https://filemoon.sx/e/' + vid;
    }
    return null;
  });
}

// ── Extractors (Özetlendi - Çalışan Mantık) ──────────────────
function processEmbed(embedData, dilTag, originalTitle) {
  if (['pixel', 'netu'].includes((embedData.baslik || '').toLowerCase())) return Promise.resolve(null);

  return fetchEmbedIframe(embedData.id).then(function(src) {
    if (!src) return null;
    
    // Kaynak tespiti
    var provider = embedData.baslik || "Video";
    if (src.indexOf('vidmoly') !== -1) provider = "VidMoly";
    else if (src.indexOf('sibnet.ru') !== -1) provider = "Sibnet";
    else if (src.indexOf('dzen.ru') !== -1) provider = "Dzen";
    else if (src.indexOf('filemoon') !== -1) provider = "FileMoon";

    // Dil Etiketi Güzelleştirme
    var dilLabel = dilTag === 'TR Dublaj' ? '🇹🇷 TR Dublaj' : '🌐 TR Altyazı';

    return fetch(src, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
      .then(function(r) { return r.text(); })
      .then(function(html) {
        var m = html.match(/file\s*:\s*['"]?(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
        if (!m) return null;
        
        return {
          name: originalTitle, // Üst satır
          title: '⌜ WEBTEIZLE ⌟ | ' + provider + ' | ' + dilLabel, // Alt satır
          url: m[1],
          quality: 'Auto',
          type: 'hls',
          headers: { 'Referer': src }
        };
      }).catch(function() { return null; });
  });
}

// ── getStreams ────────────────────────────────────────────────
function getStreams(tmdbId, mediaType, season, episode) {
  return fetchTmdbInfo(tmdbId, mediaType)
    .then(function(info) {
      return findFilmPage(info.titleTr, info.titleEn).then(function(result) {
        var filmId = (result.html.match(/data-id="(\d+)"/) || [])[1];
        if (!filmId) throw new Error('Film ID bulunamadi');

        var diller = [];
        if (result.html.includes('/izle/dublaj/') || result.url.includes('/izle/dublaj/')) diller.push({ dil: '0', ad: 'TR Dublaj' });
        if (result.html.includes('/izle/altyazi/') || result.url.includes('/izle/altyazi/')) diller.push({ dil: '1', ad: 'TR Altyazı' });
        if (diller.length === 0) { diller.push({ dil: '0', ad: 'TR Dublaj' }, { dil: '1', ad: 'TR Altyazı' }); }

        var streams = [];
        return Promise.all(diller.map(function(d) {
          return fetchAlternatifler(filmId, d.dil, season, episode).then(function(embedList) {
            return Promise.all(embedList.map(function(e) { return processEmbed(e, d.ad, info.originalTitle); }));
          }).then(function(results) {
            results.forEach(function(s) { if (s) streams.push(s); });
          });
        })).then(function() { return streams; });
      });
    }).catch(function() { return []; });
}

module.exports = { getStreams: getStreams };
