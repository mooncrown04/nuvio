/**
 * JetFilmizle — Nuvio Provider
 * Gelişmiş Eşleştirme: Arama motorunu atlayıp doğrudan slug denemesi yapar.
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

// Türkçe karakterleri ve boşlukları siteye uygun slug haline getirir
function jetSlug(t) {
    return (t || '').toLowerCase()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/â/g,'a')
        .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var slugTR = jetSlug(info.name || info.title);
            var slugEN = jetSlug(info.original_name || info.original_title);
            
            // Sırasıyla denenecek URL varyasyonları
            var urls = [];
            if (mediaType === 'tv') {
                var suffix = '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                urls.push(BASE_URL + '/dizi/' + slugTR + suffix);
                if (slugTR !== slugEN) urls.push(BASE_URL + '/dizi/' + slugEN + suffix);
                urls.push(BASE_URL + '/dizi/' + slugTR + '-izle' + suffix);
            } else {
                urls.push(BASE_URL + '/film/' + slugTR);
                urls.push(BASE_URL + '/film/' + slugTR + '-izle');
            }

            // İlk başarılı URL'yi bulana kadar dene
            return attemptUrls(urls);
        })
        .then(function(html) {
            if (!html) return [];

            var streams = [];
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
        .catch(function() { return []; });
}

// URL'leri sırayla kontrol eden yardımcı fonksiyon
function attemptUrls(urls) {
    if (urls.length === 0) return Promise.resolve(null);
    var currentUrl = urls.shift();
    
    return fetch(currentUrl, { headers: HEADERS })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            if (html.indexOf('Sayfa Bulunamadı') === -1 && html.length > 5000) {
                console.error('[JetFilm-Success] URL Bulundu: ' + currentUrl);
                return html;
            }
            return attemptUrls(urls);
        });
}

module.exports = { getStreams: getStreams };
