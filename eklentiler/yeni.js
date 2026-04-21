/**
 * JetFilmizle — Nuvio Provider
 * DIZI BOLUM & DINAMIK KAYNAK FIX
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
            if (!html) {
                console.error('[JetFilm-Error] Sayfa bulunamadı.');
                return [];
            }

            var streams = [];
            console.error('[JetFilm-Debug] Sayfa Analiz Ediliyor...');

            // 1. Bölüm Spesifik Filtreleme (Diziler için)
            // Sitede bölümler <li ... data-season="2" data-episode="7" data-id="XXXXX"> şeklinde olabilir.
            var epPattern = new RegExp('data-season=["\']' + s + '["\'][^>]+data-episode=["\']' + e + '["\']', 'i');
            var isEpisodeFound = epPattern.test(html);
            
            if (mediaType === 'tv') {
                console.error('[JetFilm-Debug] Bölüm eşleşmesi durumu: ' + (isEpisodeFound ? 'BAŞARILI' : 'BULUNAMADI'));
            }

            // 2. Pixeldrain Yakalayıcı (Tüm yapıları kapsar)
            // HTML içinde hem link hem de data-url olarak arar
            var pdRe = /(?:href|data-url|value)=["\']?(https?:\/\/pixeldrain\.com\/u\/[a-zA-Z0-9_-]+)/g;
            var m;
            while ((m = pdRe.exec(html)) !== null) {
                var pdUrl = m[1];
                var pdId = pdUrl.split('/u/')[1];
                
                // Aynı linki tekrar ekleme
                if (!streams.some(x => x.url.includes(pdId))) {
                    console.error('[JetFilm-Debug] Pixeldrain Linki Bulundu: ' + pdId);
                    streams.push({
                        name: "JetFilm",
                        title: '⌜ Pixeldrain ⌟ | S' + s + ' E' + e,
                        url: 'https://pixeldrain.com/api/file/' + pdId + '?download',
                        type: 'video',
                        quality: '1080p',
                        headers: { 'Referer': 'https://pixeldrain.com/' }
                    });
                }
            }

            // 3. Iframe / Player Yakalayıcı
            var iframeRe = /<iframe[^>]+src=["\']([^"\']+)["\']/gi;
            while ((m = iframeRe.exec(html)) !== null) {
                var src = m[1];
                if (/jetv|vidmoly|d2rs|moly|player|vido/.test(src)) {
                    var finalSrc = src.startsWith('//') ? 'https:' + src : src;
                    console.error('[JetFilm-Debug] Player Kaynağı Bulundu: ' + finalSrc);
                    streams.push({
                        name: "JetFilm",
                        title: '⌜ Hızlı Kaynak ⌟',
                        url: finalSrc,
                        type: 'embed'
                    });
                }
            }

            // 4. Eğer hala 0 ise, JS içindeki gizli "video_url" veya "file" tanımlarını ara
            if (streams.length === 0) {
                console.error('[JetFilm-Debug] Standart yöntemler sonuç vermedi, derin tarama yapılıyor...');
                var deepRe = /["']?(?:file|link|url)["']?\s*[:=]\s*["'](https?:\/\/[^"']+)["']/gi;
                while ((m = deepRe.exec(html)) !== null) {
                    if (m[1].indexOf('pixeldrain') !== -1) {
                         // Pixeldrain linkini JS içinden yakala
                         var dId = m[1].split('/u/')[1].split(/[?&"']/)[0];
                         streams.push({
                            name: "JetFilm",
                            title: '⌜ Pixeldrain (Derin) ⌟',
                            url: 'https://pixeldrain.com/api/file/' + dId + '?download',
                            type: 'video'
                         });
                    }
                }
            }

            console.error('[JetFilm-Debug] İşlem Bitti. Toplam: ' + streams.length + ' kaynak.');
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
            if (html && html.indexOf('Sayfa Bulunamadı') === -1 && html.length > 3000) {
                console.error('[JetFilm-Success] Giriş Yapıldı: ' + currentUrl);
                return html;
            }
            return attemptUrls(urls);
        });
}

module.exports = { getStreams: getStreams };
