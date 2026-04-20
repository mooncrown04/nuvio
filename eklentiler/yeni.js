/**
 * JetFilmizle — Nuvio Provider
 * URL Yapısı Güncellendi (/diziler/ desteği eklendi)
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

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
    var s = season || 1;
    var e = episode || 1;

    console.error('[JetFilm-Debug] İşlem Başladı: ' + tmdbId + ' (' + mediaType + ')');

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var slugTR = jetSlug(info.name || info.title);
            var slugEN = jetSlug(info.original_name || info.original_title);
            var urls = [];

            if (mediaType === 'tv') {
                // Dizi için denenecek klasör ve URL yapıları
                var paths = ['/dizi/', '/diziler/'];
                var suffixes = [
                    '/sezon-' + s + '/bolum-' + e,
                    '/' + s + '-sezon-' + e + '-bolum'
                ];

                paths.forEach(function(p) {
                    suffixes.forEach(function(sx) {
                        urls.push(BASE_URL + p + slugTR + sx);
                        if (slugTR !== slugEN) urls.push(BASE_URL + p + slugEN + sx);
                        urls.push(BASE_URL + p + slugTR + '-izle' + sx);
                    });
                });
            } else {
                // Film yapıları
                urls.push(BASE_URL + '/film/' + slugTR);
                urls.push(BASE_URL + '/film/' + slugTR + '-izle');
                if (slugTR !== slugEN) urls.push(BASE_URL + '/film/' + slugEN);
            }

            return attemptUrls(urls);
        })
        .then(function(html) {
            if (!html) {
                console.error('[JetFilm-Error] Tüm varyasyonlar denendi, sonuç: 404.');
                return [];
            }

            var streams = [];
            var label = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // Pixeldrain & Iframe Regex (Geliştirilmiş)
            var pdRe = /(?:href|data-url)="https?:\/\/pixeldrain\.com\/u\/([^"&\s]+)"/g;
            var iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
            var m;

            while ((m = pdRe.exec(html)) !== null) {
                console.error('[JetFilm-Debug] Kaynak: Pixeldrain');
                streams.push({
                    name: "JetFilm",
                    title: '⌜ Pixeldrain ⌟ | 🇹🇷 ' + label,
                    url: 'https://pixeldrain.com/api/file/' + m[1] + '?download',
                    type: 'video',
                    quality: '1080p',
                    headers: { 'Referer': 'https://pixeldrain.com/' }
                });
            }

            while ((m = iframeRe.exec(html)) !== null) {
                var src = m[1];
                if (/jetv|d2rs|vidmoly|moly/.test(src)) {
                    console.error('[JetFilm-Debug] Kaynak: Embed (' + src.split('/')[2] + ')');
                    streams.push({
                        name: "JetFilm",
                        title: '⌜ Hızlı Kaynak ⌟ | 🇹🇷 ' + label,
                        url: src.startsWith('//') ? 'https:' + src : src,
                        type: 'embed'
                    });
                }
            }

            console.error('[JetFilm-Debug] Final Stream Sayısı: ' + streams.length);
            return streams;
        })
        .catch(function(err) {
            console.error('[JetFilm-Fatal] Hata: ' + err.message);
            return [];
        });
}

function attemptUrls(urls) {
    if (urls.length === 0) return Promise.resolve(null);
    var currentUrl = urls.shift();
    
    return fetch(currentUrl, { headers: HEADERS })
        .then(function(r) {
            console.error('[JetFilm-Debug] Deneniyor: ' + currentUrl + ' [' + r.status + ']');
            if (r.status === 200) return r.text();
            return null;
        })
        .then(function(html) {
            if (html && html.indexOf('Sayfa Bulunamadı') === -1 && html.length > 3000) {
                console.error('[JetFilm-Success] DOĞRU URL: ' + currentUrl);
                return html;
            }
            return attemptUrls(urls);
        });
}

module.exports = { getStreams: getStreams };
