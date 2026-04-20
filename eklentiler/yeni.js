/**
 * JetFilmizle — Nuvio Provider
 * FULL DEBUG & SINGLE PAGE DIZI SOLVER
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

    console.error('[JetFilm-Debug] Başladı. TMDB:' + tmdbId + ' S' + s + ' E' + e);

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var slugTR = jetSlug(info.name || info.title);
            var slugEN = jetSlug(info.original_name || info.original_title);
            
            var urls = [];
            if (mediaType === 'tv') {
                // Attığın HTML'deki gibi ana dizi sayfalarını hedefliyoruz
                urls.push(BASE_URL + '/dizi/' + slugTR);
                if (slugTR !== slugEN) urls.push(BASE_URL + '/dizi/' + slugEN);
                urls.push(BASE_URL + '/dizi/' + slugTR + '-izle');
                // Alternatif: Bazı diziler direkt ana dizinde
                urls.push(BASE_URL + '/' + slugTR);
            } else {
                urls.push(BASE_URL + '/film/' + slugTR);
                urls.push(BASE_URL + '/film/' + slugTR + '-izle');
            }

            return attemptUrls(urls);
        })
        .then(function(html) {
            if (!html) {
                console.error('[JetFilm-Error] Sayfa bulunamadı (404).');
                return [];
            }

            var streams = [];
            // Sayfada dublaj var mı kontrolü
            var isDublaj = html.indexOf('Dublaj') !== -1;
            var label = isDublaj ? "Dublaj" : "Altyazı";

            console.error('[JetFilm-Debug] Sayfa bulundu, kaynaklar taranıyor...');

            // 1. Pixeldrain Yakalayıcı (Attığın HTML'de yoğunlukta)
            var pdRe = /(?:href|data-url)="https?:\/\/pixeldrain\.com\/u\/([^"&\s]+)"/g;
            var m;
            while ((m = pdRe.exec(html)) !== null) {
                console.error('[JetFilm-Debug] Pixeldrain Bulundu: ' + m[1]);
                streams.push({
                    name: "JetFilm",
                    title: '⌜ Pixeldrain ⌟ | ' + label,
                    url: 'https://pixeldrain.com/api/file/' + m[1] + '?download',
                    type: 'video',
                    quality: '1080p',
                    headers: { 'Referer': 'https://pixeldrain.com/' }
                });
            }

            // 2. Iframe/Embed Yakalayıcı (JetV, D2RS, Vidmoly)
            var iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
            while ((m = iframeRe.exec(html)) !== null) {
                var src = m[1];
                if (/jetv|d2rs|vidmoly|moly|vido|player/.test(src)) {
                    var finalSrc = src.startsWith('//') ? 'https:' + src : src;
                    console.error('[JetFilm-Debug] Embed Bulundu: ' + finalSrc);
                    streams.push({
                        name: "JetFilm",
                        title: '⌜ Player ⌟ | ' + label,
                        url: finalSrc,
                        type: 'embed'
                    });
                }
            }

            // 3. Dosya içinde gizli olabilecek 'data-proxy' veya 'file' linkleri
            var fileRe = /["']?(?:file|source)["']?\s*:\s*["'](https?:\/\/[^"']+\.mp4[^"']*)["']/gi;
            while ((m = fileRe.exec(html)) !== null) {
                console.error('[JetFilm-Debug] MP4 Linki Bulundu: ' + m[1]);
                streams.push({
                    name: "JetFilm",
                    title: '⌜ MP4 Direkt ⌟',
                    url: m[1],
                    type: 'video'
                });
            }

            console.error('[JetFilm-Debug] İşlem Tamam. Toplam Kaynak: ' + streams.length);
            return streams;
        })
        .catch(function(err) {
            console.error('[JetFilm-Fatal] Hata Oluştu: ' + err.message);
            return [];
        });
}

function attemptUrls(urls) {
    if (urls.length === 0) return Promise.resolve(null);
    var currentUrl = urls.shift();
    
    console.error('[JetFilm-Debug] Deneniyor: ' + currentUrl);
    
    return fetch(currentUrl, { headers: HEADERS })
        .then(function(r) {
            if (r.status === 200) return r.text();
            console.error('[JetFilm-Debug] ' + r.status + ' : ' + currentUrl);
            return null;
        })
        .then(function(html) {
            // HTML içinde "Sayfa Bulunamadı" yazmıyorsa ve yeterince büyükse kabul et
            if (html && html.indexOf('Sayfa Bulunamadı') === -1 && html.length > 5000) {
                console.error('[JetFilm-Success] Eşleşme: ' + currentUrl);
                return html;
            }
            return attemptUrls(urls);
        })
        .catch(function() { return attemptUrls(urls); });
}

module.exports = { getStreams: getStreams };
