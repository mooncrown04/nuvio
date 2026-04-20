/**
 * JetFilmizle — ARAMA DEBUG
 * Sadece arama sonuçlarını analiz etmek içindir.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var originalTitle = info.name || info.title;
            console.error('[JetFilm-Arama] Aranan: ' + originalTitle);
            
            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0'
                },
                body: 's=' + encodeURIComponent(originalTitle)
            });
        })
        .then(function(res) { return res.text(); })
        .then(function(searchHtml) {
            // Arama sonucunda dönen TÜM href linklerini logla
            console.error('--- ARAMA SONUÇLARI BAŞLANGIÇ ---');
            var hrefRe = /href="([^"]+)"/g;
            var match;
            var count = 0;
            while ((match = hrefRe.exec(searchHtml)) !== null) {
                // Sadece film veya dizi içerebilecek linkleri filtrele
                if (match[1].indexOf('jetfilmizle.net') !== -1 || match[1].startsWith('/')) {
                    console.error('[Link-Bulundu]: ' + match[1]);
                    count++;
                }
            }
            console.error('--- Toplam ' + count + ' link bulundu. ---');
            return [];
        });
}

module.exports = { getStreams: getStreams };
