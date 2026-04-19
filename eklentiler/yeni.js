var BASE_URL     = 'https://webteizle3.xyz';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/',
  'Origin': BASE_URL
};

function fetchTmdbInfo(tmdbId, mediaType) {
  var endpoint = (mediaType === 'tv') ? 'tv' : 'movie';
  return fetch('https://api.themoviedb.org/3/' + endpoint + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
    .then(function(r) { return r.json(); })
    .catch(function(e) { console.error("TMDB_ERROR: " + e.message); throw e; });
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
    var url = candidates[i];
    return fetch(url, { headers: HEADERS }).then(function(r) {
      if (!r.ok) return tryNext(i + 1);
      return r.text().then(function(html) {
        if (html.indexOf('data-id') === -1) return tryNext(i + 1);
        return { url: url, html: html };
      });
    }).catch(function(e) { console.error("CANDIDATE_FETCH_ERROR: " + e.message); return tryNext(i + 1); });
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

function getStreams(tmdbId, mediaType, season, episode) {
  var diziIsmi = ""; 

  return fetchTmdbInfo(tmdbId, mediaType)
    .then(function(info) {
      diziIsmi = info.title || info.name || info.titleTr || info.titleEn;
      return findFilmPage(info.titleTr, info.titleEn);
    })
    .then(function(result) {
      var filmId = (result.html.match(/data-id="(\d+)"/) || [])[1];
      if (!filmId) { console.error("FINAL_FILM_ID_NOT_FOUND"); throw new Error('ID Yok'); }

      var diller = [];
      if (result.html.includes('/izle/dublaj/') || result.url.includes('/izle/dublaj/')) diller.push({ dil: '0', ad: 'TR Dublaj' });
      if (result.html.includes('/izle/altyazi/') || result.url.includes('/izle/altyazi/')) diller.push({ dil: '1', ad: 'TR Altyazı' });
      if (diller.length === 0) { diller.push({ dil: '0', ad: 'TR Dublaj' }, { dil: '1', ad: 'TR Altyazı' }); }

      var streams = [];
      return Promise.all(diller.map(function(d) {
        var body = 'filmid=' + filmId + '&dil=' + d.dil + '&s=' + (season || '') + '&b=' + (episode || '') + '&bot=0';
        return fetch(BASE_URL + '/ajax/dataAlternatif3.asp', {
          method: 'POST',
          headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' }),
          body: body
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var list = (data.status === 'success' && Array.isArray(data.data)) ? data.data : [];
          return Promise.all(list.map(function(embed) {
             // URL Kontrolü: Başı boşsa BASE_URL ekle
             var embedAjaxUrl = BASE_URL + '/ajax/dataEmbed.asp';
             
             return fetch(embedAjaxUrl, {
               method: 'POST',
               headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' }),
               body: 'id=' + embed.id
             })
             .then(function(r) { return r.text(); })
             .then(function(html) {
                // Eğer reCAPTCHA sayfasına yönlendiyse iptal et
                if(html.indexOf('reCAPTCHADATA') !== -1) { 
                    console.error("RECAPTCHA_DETECTED: " + embed.id); 
                    return null; 
                }

                var src = (html.match(/<iframe[^>]+src="([^"]+)"/i) || [])[1];
                if (!src) return null;
                if (src.startsWith('//')) src = 'https:' + src;
                if (src.startsWith('/')) src = BASE_URL + src;

                var p = embed.baslik || "Kaynak";
                if (src.indexOf('vidmoly') !== -1) p = "VidMoly";
                else if (src.indexOf('sibnet') !== -1) p = "Sibnet";
                else if (src.indexOf('filemoon') !== -1) p = "FileMoon";

                var flag = d.ad === 'TR Dublaj' ? '🇹🇷 ' : '🌐 ';
                
                return fetch(src, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
                  .then(function(r) { return r.text(); })
                  .then(function(innerHtml) {
                    var m = innerHtml.match(/file\s*:\s*['"]?(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
                    if (!m) { console.error("M3U8_NOT_FOUND_IN_SRC: " + src); return null; }

                    return {
                      name: diziIsmi,
                      title: '⌜ WEBTEIZLE ⌟ | ' + p + ' | ' + flag + d.ad,
                      url: m[1],
                      quality: 'Auto',
                      type: 'hls',
                      headers: { 'Referer': src }
                    };
                  });
             }).catch(function(e) { console.error("EMBED_FETCH_ERROR: " + e.message); return null; });
          }));
        })
        .then(function(results) {
          results.forEach(function(s) { if (s) streams.push(s); });
        }).catch(function(e) { console.error("ALTERNATIF_FETCH_ERROR: " + e.message); });
      })).then(function() { return streams; });
    })
    .catch(function(err) {
      console.error("GET_STREAMS_CRITICAL_ERROR: " + err.message);
      return [];
    });
}

module.exports = { getStreams: getStreams };
