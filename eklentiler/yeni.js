/**
 * JetFilmizle — Nuvio Provider
 * HEM FILM HEM DIZI DESTEKLI - LEGACY JS UYUMLU
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': 'https://jetfilmizle.net/'
};

// Nuvio için güvenli slug fonksiyonu
function safeSlug(t) {
    return (t || '').toLowerCase()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var originalTitle = info.name || info.title;
            var sTitle = encodeURIComponent(originalTitle);
            
            // Nuvio'da Object.assign HATALIDIR: Manuel header oluşturuyoruz
            var searchHeaders = {
                'User-Agent': HEADERS['User-Agent'],
                'Referer': HEADERS['Referer'],
                'Content-Type': 'application/x-www-form-urlencoded'
            };

            // 2. Sitede ARA
            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: searchHeaders,
                body: 's=' + sTitle
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var regex = new RegExp('href="(https?://jetfilmizle\\.net/(film|dizi)/([^"/]+))"', 'i');
                var m = regex.exec(searchHtml);
                
                var finalUrl = '';
                if (m) {
                    finalUrl = BASE_URL + '/' + m[2] + '/' + m[3];
                    if (mediaType === 'tv') {
                        finalUrl += '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                    }
                } else {
                    // Bulamazsa tahmin yürüt
                    var fallbackSlug = safeSlug(originalTitle);
                    finalUrl = (mediaType === 'tv') 
                        ? BASE_URL + '/dizi/' + fallbackSlug + '/sezon-' + (season || 1) + '/bolum-' + (episode || 1)
                        : BASE_URL + '/film/' + fallbackSlug;
                }

                return fetch(finalUrl, { headers: HEADERS }).then(function(r) { return r.text(); });
            });
        })
        .then(function(html) {
            if (!html || html.indexOf('Sayfa Bulunamadı') !== -1) return [];

            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // --- 1. VIDEOPARK (TITAN) - DIZILERIN ANA KAYNAGI ---
            // match() bazen Nuvio'da TypeError verir, o yüzden split ile güvenli alıyoruz
            if (html.indexOf('var _sd =') !== -1) {
                try {
                    var rawData = html.split('var _sd =')[1].split('};')[0] + '}';
                    var vData = JSON.parse(rawData);
                    if (vData && vData.stream_url) {
                        streams.push({
                            name: "JetFilmizle",
                            title: '⌜ Videopark ⌟ | 🇹🇷 ' + dil,
                            url: vData.stream_url,
                            type: 'hls',
                            quality: '1080p',
                            headers: { 'Referer': 'https://videopark.top/', 'User-Agent': HEADERS['User-Agent'] }
                        });
                    }
                } catch(e) {}
            }

            // --- 2. PIXELDRAIN ---
            var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/([^"]+))"/g;
            var pdMatch;
            while ((pdMatch = pdRe.exec(html)) !== null) {
                streams.push({
                    name: "JetFilmizle",
                    title: '⌜ Pixeldrain ⌟ | 🇹🇷 ' + dil,
                    url: 'https://pixeldrain.com/api/file/' + pdMatch[2] + '?download',
                    type: 'video',
                    quality: '1080p',
                    headers: { 'Referer': 'https://pixeldrain.com/' }
                });
            }

            // --- 3. HIZLI KAYNAK (JETV/D2RS) ---
            var iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
            var ifMatch;
            while ((ifMatch = iframeRe.exec(html)) !== null) {
                var src = ifMatch[1];
                if (src.indexOf('jetv') !== -1 || src.indexOf('d2rs') !== -1) {
                    // startsWith yerine indexOf === 0 (Nuvio için)
                    var fixedSrc = (src.indexOf('//') === 0) ? 'https:' + src : src;
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Hızlı Kaynak ⌟ | 🇹🇷 ' + dil,
                        url: fixedSrc,
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
