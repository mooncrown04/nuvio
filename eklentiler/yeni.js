/**
 * FilmCennetim - Nuvio Provider (Final Optimized)
 * 1. TMDB Bridge (Köprü) mantığı düzeltildi.
 * 2. Boş TMDB verisi gelme riski (TMDB Bilgisi: ()) engellendi.
 * 3. URL bozulmaları (tv7555 vb.) tamamen temizlendi.
 */

var BASE_URL     = 'https://stream.watchbuddy.tv';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

// JetFilmizle şablonundaki headers yapısı
var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Referer': BASE_URL + '/'
};

function fetchTmdbInfo(tmdbId) {
  var url = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR';
  return fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      // Loglarda gördüğümüz () hatasını önlemek için kontrol ekledik
      if (!d.title) throw new Error('TMDB film ismini bulamadı.');
      return {
        titleTr: d.title || '',
        titleEn: d.original_title || '',
        year: (d.release_date || '').slice(0, 4)
      };
    });
}

function searchFilm(query) {
  var searchUrl = BASE_URL + '/ara/FilmCennetim?lang=tr&sorgu=' + encodeURIComponent(query);
  return fetch(searchUrl, { headers: HEADERS })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var re = /href="(\/izle\/FilmCennetim\?[^"]+)"/g;
      var m, links = [];
      while ((m = re.exec(html)) !== null) {
        var path = m[1].replace(/&amp;/g, '&');
        // URL sonuna eklenen tv7555 gibi sayıları regex ile uçuruyoruz
        var cleanPath = path.split(' ')[0].replace(/\d+$/, '');
        links.push(cleanPath);
      }
      return links;
    })
    .catch(function() { return []; });
}

function getStreams(id, mediaType) {
  // Nuvio'da ID bazen tam URL gelir, bazen sadece rakam (TMDB ID)
  var tmdbId = id.toString().replace(/[^0-9]/g, '');
  console.error('[Nuvio-Debug] Akış Başladı. TMDB ID: ' + tmdbId);

  return fetchTmdbInfo(tmdbId)
    .then(function(info) {
      console.error('[Nuvio-Debug] TMDB Bilgisi: ' + info.titleTr + ' (' + info.year + ')');
      return searchFilm(info.titleTr);
    })
    .then(function(links) {
      if (!links || links.length === 0) throw new Error('Providerda film bulunamadı.');
      
      var targetUrl = BASE_URL + links[0];
      console.error('[Nuvio-Debug] Sayfa Çekiliyor: ' + targetUrl);

      return fetch(targetUrl, { headers: HEADERS });
    })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var streams = [];
      var iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
      var m;
      while ((m = iframeRe.exec(html)) !== null) {
        var src = m[1];
        if (src.indexOf('http') !== -1 && src.indexOf('google') === -1) {
          streams.push({
            title: 'Kaynak ' + (streams.length + 1),
            url: src,
            type: 'embed',
            headers: { 'Referer': BASE_URL + '/' }
          });
        }
      }
      return streams;
    })
    .catch(function(err) {
      console.error('[Nuvio-Critical] Hata: ' + err.message);
      return [];
    });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
}
