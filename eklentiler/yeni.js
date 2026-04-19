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
        originalTitle: d.title || d.name || 'İçerik',
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

// ── Sayfa Bulma ──────────────────────────────────────────
function findFilmPage(titleTr, titleEn) {
  var slugTr = titleToSlug(titleTr);
  var slugEn = titleToSlug(titleEn);
  var candidates = [];
  if (slugTr) { candidates.push(BASE_URL + '/izle/dublaj/' + slugTr); candidates.push(BASE_URL + '/izle/altyazi/' + slugTr); }
  if (slugEn && slugEn !== slugTr) { candidates.push(BASE_URL + '/izle/dublaj/' + slugEn); candidates.push(BASE_URL + '/izle/altyazi/' + slugEn); }

  function tryNext(i) {
    if (i >= candidates.length) return searchFallback(titleTr, titleEn);
    var url = candidates[i];
    return fetch(url, { headers: HEADERS }).then(function(r) {
      if (!r.ok) return tryNext(i + 1);
      return r.text().then(function(html) {
        if (html.indexOf('data-id') === -1) return tryNext(i + 1);
        return { url: url, html: html };
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
    if (!items.length) throw new Error('Arama Sonucu Bos');
    var pageUrl = items[0].url.startsWith('http') ? items[0].url : BASE_URL + items[0].url;
    return fetch(pageUrl, { headers: HEADERS }).then(function(r) { return r.text().then(function(html) { return { url: pageUrl, html: html }; }); });
  });
}

// ── Embed İşleme ────────────────────────────────────────────────
function processEmbed(embedData, dilTag, originalTitle) {
  var providerName = embedData.baslik || "Kaynak";
  if (['pixel', 'netu'].includes(providerName.toLowerCase())) return Promise.resolve(null);

  return fetch(BASE_URL + '/ajax/dataEmbed.asp', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'Origin': BASE_URL }),
    body: 'id=' + embedData.id
  })
  .then(function(r) { return r.text(); })
  .then(function(html) {
    var src = (html.match(/<iframe[^>]+src="([^"]+)"/i) || [])[1];
    if (!src) {
        var sm = html.match(/(vidmoly|filemoon)\s*\(\s*'([^']+)'/i);
        if (sm) {
            if (sm[1] === 'vidmoly') src = 'https://vidmoly.to/embed-' + sm[2] + '.html';
            if (sm[1] === 'filemoon') src = 'https://filemoon.sx/e/' + sm[2];
        }
    }
    
    if (!src) return null;

    var p = providerName;
    if (src.indexOf('vidmoly') !== -1) p = "VidMoly";
    else if (src.indexOf('sibnet') !== -1) p = "Sibnet";
    else if (src.indexOf('filemoon') !== -1) p = "FileMoon";

    var label = dilTag === 'TR Dublaj' ? '🇹🇷 Dublaj' : '🌐 Altyazı';

    return fetch(src, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
      .then(function(r) { return r.text(); })
      .then(function(innerHtml) {
        var m = innerHtml.match(/file\s*:\s*['"]?(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
        if (!m) return null;

        return {
          name: originalTitle,
          title: '⌜ WEBTEIZLE ⌟ | ' + p + ' | ' + label,
          url: m[1],
          quality: 'Auto',
          type: 'hls',
          headers: { 'Referer': src }
        };
      });
  })
  .catch(function(e) { return null; });
}

// ── getStreams ────────────────────────────────────────────────
function getStreams(tmdbId, mediaType, season, episode) {
  return fetchTmdbInfo(tmdbId, mediaType)
    .then(function(info) {
      return findFilmPage(info.titleTr, info.titleEn).then(function(result) {
        var filmId = (result.html.match(/data-id="(\d+)"/) || [])[1];
        
        // EĞER ID BULUNAMAZSA LİSTEYE ERROR YAZ
        if (!filmId) return [{ name: "ERROR: ID BULUNAMADI", title: info.originalTitle, url: "" }];

        var diller = [];
        if (result.html.includes('/izle/dublaj/') || result.url.includes('/izle/dublaj/')) diller.push({ dil: '0', ad: 'TR Dublaj' });
        if (result.html.includes('/izle/altyazi/') || result.url.includes('/izle/altyazi/')) diller.push({ dil: '1', ad: 'TR Altyazı' });
        if (diller.length === 0) diller.push({ dil: '0', ad: 'TR Dublaj' }, { dil: '1', ad: 'TR Altyazı' });

        var finalStreams = [];
        return Promise.all(diller.map(function(d) {
          var body = 'filmid=' + filmId + '&dil=' + d.dil + '&s=' + (season || '') + '&b=' + (episode || '') + '&bot=0';
          return fetch(BASE_URL + '/ajax/dataAlternatif3.asp', {
            method: 'POST',
            headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' }),
            body: body
          })
          .then(function(r) { return r.json(); })
          .then(function(res) {
            var list = (res.status === 'success' && Array.isArray(res.data)) ? res.data : [];
            return Promise.all(list.map(function(e) { return processEmbed(e, d.ad, info.originalTitle); }));
          })
          .then(function(results) {
            results.forEach(function(s) { if (s) finalStreams.push(s); });
          });
        })).then(function() { 
            // KAYNAK YOKSA ERROR YAZ
            if (finalStreams.length === 0) return [{ name: "ERROR: KAYNAK BULUNAMADI", title: info.originalTitle, url: "" }];
            return finalStreams; 
        });
      })
      .catch(function(e) {
          // FETCH HATASI VARSA ERROR YAZ
          return [{ name: "ERROR: FETCH HATASI", title: e.message, url: "" }];
      });
    })
    .catch(function(err) {
      return [{ name: "ERROR: TMDB HATASI", title: err.message, url: "" }];
    });
}

module.exports = { getStreams: getStreams };
