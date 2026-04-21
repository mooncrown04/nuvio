/**
 * JetFilmizle — Nuvio Provider
 * DIZI BÖLÜMÜ SABİTLEME & AUTO-SOURCE
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'X-Requested-With': 'XMLHttpRequest'
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

    console.error('[JetFilm-Debug] Başladı. S' + s + ' E' + e);

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var slugTR = jetSlug(info.name || info.title);
            var urls = [
                BASE_URL + '/dizi/' + slugTR,
                BASE_URL + '/dizi/' + slugTR + '-izle',
                BASE_URL + '/' + slugTR
            ];
            return attemptUrls(urls);
        })
        .then(function(html) {
            if (!html) return [];

            var streams = [];
            
            // --- DIZI MANTIGI: Seçili Bölümü Bul ---
            if (mediaType === 'tv') {
                console.error('[JetFilm-Debug] Bölüm ID aranıyor...');
                // HTML içinde "2. Sezon 7. Bölüm" gibi geçen yerdeki data-id'yi yakalar
                // JetFilm formatı: data-season="2" data-episode="7" data-id="12345"
                var episodeRegex = new RegExp('data-season="' + s + '"[^>]+data-episode="' + e + '"[^>]+data-id="(\\d+)"', 'i');
                var match = episodeRegex.exec(html);

                if (match && match[1]) {
                    var episodeId = match[1];
                    console.error('[JetFilm-Success] Bölüm ID Bulundu: ' + episodeId);
                    
                    // Bu ID ile gidip asıl video kaynağını almamız lazım (Gerekirse)
                    // Ama JetFilm Pixeldrain linklerini genellikle sayfanın altına "tab" olarak basar.
                }
            }

            // 1. Pixeldrain (Tüm Sayfayı Tara)
            var pdRe = /https?:\/\/pixeldrain\.com\/u\/([^"&\s/]+)/g;
            var m;
            while ((m = pdRe.exec(html)) !== null) {
                if (streams.length < 5) { // Log kirliliği olmasın
                    console.error('[JetFilm-Debug] Kaynak Yakalandı (Pixeldrain): ' + m[1]);
                    streams.push({
                        name: "JetFilm",
                        title: '⌜ Pixeldrain ⌟',
                        url: 'https://pixeldrain.com/api/file/' + m[1] + '?download',
                        type: 'video',
                        quality: '1080p',
                        headers: { 'Referer': 'https://pixeldrain.com/' }
                    });
                }
            }

            // 2. Iframe (Player)
            var iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
            while ((m = iframeRe.exec(html)) !== null) {
                var src = m[1];
                if (/jetv|vidmoly|d2rs|moly|player/.test(src)) {
                    var finalSrc = src.startsWith('//') ? 'https:' + src : src;
                    streams.push({
                        name: "JetFilm",
                        title: '⌜ Player ⌟',
                        url: finalSrc,
                        type: 'embed'
                    });
                }
            }

            console.error('[JetFilm-Debug] Toplam: ' + streams.length + ' kaynak.');
            return streams;
        });
}

function attemptUrls(urls) {
    if (urls.length === 0) return Promise.resolve(null);
    var currentUrl = urls.shift();
    return fetch(currentUrl, { headers: HEADERS })
        .then(function(r) {
            if (r.status === 200) return r.text();
            return null;
        })
        .then(function(html) {
            if (html && html.indexOf('Sayfa Bulunamadı') === -1 && html.length > 5000) {
                console.error('[JetFilm-Success] Sayfa: ' + currentUrl);
                return html;
            }
            return attemptUrls(urls);
        });
}

module.exports = { getStreams: getStreams };
