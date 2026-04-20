/**
 * JetFilmizle — Nuvio Provider
 * DEBUG MODU AKTİF - Loglar kaldırılmadı.
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

    console.error('[JetFilm-Debug] İşlem Başladı. TMDB ID: ' + tmdbId + ' Tip: ' + type);

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var slugTR = jetSlug(info.name || info.title);
            var slugEN = jetSlug(info.original_name || info.original_title);
            
            console.error('[JetFilm-Debug] İsimler: TR=' + slugTR + ' | EN=' + slugEN);
            
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

            return attemptUrls(urls);
        })
        .then(function(html) {
            if (!html) {
                console.error('[JetFilm-Error] Hiçbir geçerli URL bulunamadı veya sayfalar boş döndü.');
                return [];
            }

            var streams = [];
            var isDublaj = html.indexOf('dublaj') !== -1 || html.indexOf('Türkçe Dublaj') !== -1;
            var label = isDublaj ? "Dublaj" : "Altyazı";

            // Pixeldrain Ayıklama
            var pdRe = /(?:href|data-url)="https?:\/\/pixeldrain\.com\/u\/([^"&\s]+)"/g;
            var m;
            while ((m = pdRe.exec(html)) !== null) {
                console.error('[JetFilm-Debug] Pixeldrain Linki Yakalandı: ' + m[1]);
                streams.push({
                    name: "JetFilm",
                    title: '⌜ Pixeldrain ⌟ | 🇹🇷 ' + label,
                    url: 'https://pixeldrain.com/api/file/' + m[1] + '?download',
                    type: 'video',
                    quality: '1080p',
                    headers: { 'Referer': 'https://pixeldrain.com/' }
                });
            }

            // Iframe/Embed Ayıklama
            var iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
            while ((m = iframeRe.exec(html)) !== null) {
                var src = m[1];
                if (src.indexOf('jetv') !== -1 || src.indexOf('d2rs') !== -1 || src.indexOf('vidmoly') !== -1) {
                    console.error('[JetFilm-Debug] Embed Kaynağı Yakalandı: ' + src);
                    streams.push({
                        name: "JetFilm",
                        title: '⌜ Hızlı Kaynak ⌟ | 🇹🇷 ' + label,
                        url: src.startsWith('//') ? 'https:' + src : src,
                        type: 'embed'
                    });
                }
            }

            console.error('[JetFilm-Debug] Toplam Bulunan Stream Sayısı: ' + streams.length);
            return streams;
        })
        .catch(function(err) {
            console.error('[JetFilm-Fatal] Bir hata oluştu: ' + err.message);
            return [];
        });
}

function attemptUrls(urls) {
    if (urls.length === 0) return Promise.resolve(null);
    var currentUrl = urls.shift();
    
    console.error('[JetFilm-Debug] Deneniyor: ' + currentUrl);
    
    return fetch(currentUrl, { headers: HEADERS })
        .then(function(r) { 
            console.error('[JetFilm-Debug] Status: ' + r.status + ' | URL: ' + currentUrl);
            return r.text(); 
        })
        .then(function(html) {
            if (html.indexOf('Sayfa Bulunamadı') === -1 && html.length > 4000) {
                console.error('[JetFilm-Success] EŞLEŞME SAĞLANDI: ' + currentUrl);
                return html;
            }
            console.error('[JetFilm-Debug] Sayfa geçersiz veya 404 içeriği var. Diğer URL\'ye geçiliyor...');
            return attemptUrls(urls);
        });
}

module.exports = { getStreams: getStreams };
