/**
 * NUVIO ŞABLON NOTU:
 * Üstte (name): TMDB Film/Dizi İsmi
 * Altta (title): ⌜ WEBTEIZLE ⌟ | Kaynak | Dil Bilgisi
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
        title: d.title || d.name || 'İçerik',
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
    if (!items.length) throw new Error('Film bulunamadı');
    var best = items[0];
    var pageUrl = best.url.startsWith('http') ? best.url : BASE_URL + best.url;
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
  .then(function(data) { return (data.status === 'success' && Array.isArray(data.data)) ? data.data : []; })
  .catch(function() { return []; });
}

function fetchEmbedIframe(embedId) {
  return fetch(BASE_URL + '/ajax/dataEmbed.asp', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' }),
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

function processEmbed(embedData, dilTag, diziIsmi) {
  if (['pixel', 'netu'].includes((embedData.baslik || '').toLowerCase())) return Promise.resolve(null);

  return fetchEmbedIframe(embedData.id).then(function(src) {
    if (!src) return null;
    var provider = embedData.baslik || "Video";
    if (src.indexOf('vidmoly') !== -1) provider = "VidMoly";
    else if (src.indexOf('sibnet.ru') !== -1) provider = "Sibnet";
    else if (src.indexOf('dzen.ru') !== -1) provider = "Dzen";
    else if (src.indexOf('filemoon') !== -1) provider = "FileMoon";

    var streamBase = {
        name: diziIsmi,
        title: '⌜ WEBTEIZLE ⌟ | ' + provider + ' | ' + dilTag,
        quality: 'Auto',
        headers: { 'Referer': src }
    };

    // VidMoly, Sibnet vb. için m3u8 çekim mantığı (Basitleştirilmiş)
    return fetch(src, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            var m = html.match(/file\s*:\s*['"]?(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
            if (!m) return null;
            streamBase.url = m[1];
            streamBase.type = 'hls';
            return streamBase;
        }).catch(function() { return null; });
  });
}

function getStreams(tmdbId, mediaType, season, episode) {
  return fetchTmdbInfo(tmdbId, mediaType)
    .then(function(info) {
      return findFilmPage(info.titleTr, info.titleEn).then(function(result) {
        var filmId = (result.html.match(/data-id="(\d+)"/) || [])[1];
        if (!filmId) throw new Error('ID yok');
        
        var diller = [];
        if (result.html.includes('/izle/dublaj/')) diller.push({ dil: '0', ad: '🇹🇷 Dublaj' });
        if (result.html.includes('/izle/altyazi/')) diller.push({ dil: '🌐 Altyazı' });

        var allStreams = [];
        return Promise.all(diller.map(function(d) {
          return fetchAlternatifler(filmId, d.dil, season, episode).then(function(list) {
            return Promise.all(list.map(function(e) { return processEmbed(e, d.ad, info.title); }));
          }).then(function(res) { res.forEach(function(s) { if(s) allStreams.push(s); }); });
        })).then(function() { return allStreams; });
      });
    }).catch(function() { return []; });
}

module.exports = { getStreams: getStreams };
