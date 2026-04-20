/**
 * FilmCennetim - Nuvio Provider
 * TMDB hatası durumunda orijinal başlıkla aramaya devam eden güvenli versiyon.
 */

var BASE_URL     = 'https://stream.watchbuddy.tv';
var TMDB_API_KEY = '65166299966144e590059e7987771746';

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
            if (!d || !d.title) return null; // Hata fırlatmak yerine null dönüyoruz
            return {
                titleTr: d.title || '',
                titleEn: d.original_title || '',
                year: (d.release_date || '').slice(0, 4)
            };
        })
        .catch(function() { return null; });
}

function searchFilm(query) {
    if (!query) return Promise.resolve([]);
    var cleanQuery = query.replace(/\([0-9]{4}\)/g, '').trim();
    var searchUrl = BASE_URL + '/ara/FilmCennetim?lang=tr&sorgu=' + encodeURIComponent(cleanQuery);
    
    return fetch(searchUrl, { headers: HEADERS })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            var re = /href="(\/izle\/FilmCennetim\?[^"]+)"/g;
            var m, links = [];
            while ((m = re.exec(html)) !== null) {
                links.push(m[1].replace(/&amp;/g, '&').split(' ')[0]);
            }
            return links;
        })
        .catch(function() { return []; });
}

function getStreams(id, mediaType, extra) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var originalTitle = (extra && extra.title) ? extra.title : ""; // Nuvio'dan gelen orijinal başlık
    
    console.error('[Nuvio-Debug] İşlem Başladı: ' + tmdbId);

    return fetchTmdbInfo(tmdbId)
        .then(function(info) {
            var searchTasks = [];
            
            if (info) {
                console.error('[Nuvio-Debug] TMDB Başarılı: ' + info.titleTr);
                searchTasks.push(searchFilm(info.titleTr));
                if (info.titleEn && info.titleEn !== info.titleTr) {
                    searchTasks.push(searchFilm(info.titleEn));
                }
            } else {
                // TMDB Boşsa JetFilmizle mantığı: Orijinal başlıkla dene
                console.error('[Nuvio-Debug] TMDB Boş, Orijinal Başlıkla Deneniyor: ' + originalTitle);
                if (originalTitle) searchTasks.push(searchFilm(originalTitle));
            }

            return Promise.all(searchTasks);
        })
        .then(function(results) {
            var allLinks = [].concat.apply([], results);
            if (allLinks.length === 0) throw new Error('Providerda bulunamadı.');

            var targetUrl = BASE_URL + allLinks[0];
            console.error('[Nuvio-Debug] Sayfa Açılıyor: ' + targetUrl);

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
