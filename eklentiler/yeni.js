/**
 * JetFilmizle — DEBUG MODU
 * Bu sürüm sadece ham veriyi loglamak içindir.
 * Logcat üzerinden "Ham-Veri" kelimesini aratarak içeriği inceleyebilirsin.
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

function titleToSlug(t) {
    return (t || '').toLowerCase()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/â/g,'a').replace(/û/g,'u')
        .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    
    // TMDB'den isim al
    return fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var slug = titleToSlug(info.name || info.title);
            var targetUrl = BASE_URL + '/dizi/' + slug + '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);

            console.error('[JetFilm-Debug] Hedef URL: ' + targetUrl);

            return fetch(targetUrl, { headers: HEADERS });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            // DİKKAT: Ham veriyi 1000'er karakterlik bloklar halinde basıyoruz (Logcat sınırı için)
            console.error('--- HAM VERİ BAŞLANGIÇ ---');
            for (var i = 0; i < html.length; i += 1000) {
                console.error('[Ham-Veri-Blok]: ' + html.substring(i, i + 1000));
            }
            console.error('--- HAM VERİ BİTİŞ ---');

            // Geçici olarak boş dizi dönüyoruz, amacımız sadece logları okumak
            return [];
        })
        .catch(function(err) {
            console.error('[JetFilm-Error]: ' + err.message);
            return [];
        });
}

module.exports = { getStreams: getStreams };
