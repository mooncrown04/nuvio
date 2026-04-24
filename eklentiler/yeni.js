/**
 * JetFilmizle — Nuvio Provider
 * 404 HATASI ÇÖZÜLDÜ: TMDB isimleri uymadığında otomatik arama yapar.
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
        .replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    // 1. TMDB'den doğru ismi al
    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var originalTitle = info.name || info.title;
            
            // 2. Sitede bu ismi ARA (404 almamak için en güvenli yol)
            console.error('[JetFilm-Debug] Aranan İsim: ' + originalTitle);
            
            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                body: 's=' + encodeURIComponent(originalTitle)
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                // Arama sonucundan doğru slug'ı yakala
                var regex = new RegExp('href="(https?://jetfilmizle\\.net/(film|dizi)/([^"/]+))"', 'i');
                var m = regex.exec(searchHtml);
                
                var finalUrl = '';
                if (m) {
                    // Sitenin kendi verdiği slug'ı kullanıyoruz
                    finalUrl = BASE_URL + '/' + m[2] + '/' + m[3];
                    if (mediaType === 'tv') {
                        finalUrl += '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                    }
                } else {
                    // Arama sonuç vermezse tahmin yürüt (Eski mantık)
                    var fallbackSlug = titleToSlug(originalTitle);
                    finalUrl = (mediaType === 'tv') 
                        ? BASE_URL + '/dizi/' + fallbackSlug + '/sezon-' + (season || 1) + '/bolum-' + (episode || 1)
                        : BASE_URL + '/film/' + fallbackSlug;
                }

                console.error('[JetFilm-Debug] Gidilen URL: ' + finalUrl);
                return fetch(finalUrl, { headers: HEADERS });
            });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            if (html.indexOf('Sayfa Bulunamadı') !== -1) {
                console.error('[JetFilm-Debug] Hata: Hala 404 alıyoruz.');
                return [];
            }

            var streams = [];
            // Dil Etiketi
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // Pixeldrain Yakalayıcı
            var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/([^"]+))"/g;
            var m;
            while ((m = pdRe.exec(html)) !== null) {
                streams.push({
                    name: "JetFilmizle",
                    title: '⌜ Pixeldrain ⌟ | 🇹🇷 ' + dil,
                    url: 'https://pixeldrain.com/api/file/' + m[2] + '?download',
                    type: 'video',
                    quality: '1080p',
                    headers: { 'Referer': 'https://pixeldrain.com/' }
                });
            }

            // Hızlı Kaynak (JetV/D2RS)
            var iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
            while ((m = iframeRe.exec(html)) !== null) {
                var src = m[1];
                if (src.indexOf('jetv') !== -1 || src.indexOf('d2rs') !== -1) {
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Hızlı Kaynak ⌟ | 🇹🇷 ' + dil,
                        url: src.startsWith('//') ? 'https:' + src : src,
                        type: 'embed'
                    });
                }
            }
            return streams;
        })
        .catch(function(e) {
            console.error('[JetFilm-Error]: ' + e.message);
            return [];
        });
}

module.exports = { getStreams: getStreams };
