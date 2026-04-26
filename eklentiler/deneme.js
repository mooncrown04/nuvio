/**
 * JetFilmizle — Nuvio Provider (PURE RAW DEBUG MODE)
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
    // --- TAM HAM VERİ LOGLAMASI (CİHAZDAN GELEN SAF PAKET) ---
    console.error("########################################################");
    console.error("[NUVIO_RAW_IN] ID: " + id + " (Type: " + (typeof id) + ")");
    console.error("[NUVIO_RAW_IN] MEDIATYPE: " + mediaType + " (Type: " + (typeof mediaType) + ")");
    console.error("[NUVIO_RAW_IN] SEASON: " + season + " (Type: " + (typeof season) + ")");
    console.error("[NUVIO_RAW_IN] EPISODE: " + episode + " (Type: " + (typeof episode) + ")");
    
    // Eğer gelen ID bir nesneyse (Object), içindeki tüm gizli özellikler:
    try {
        if (id && typeof id === 'object') {
            console.error("[NUVIO_RAW_ID_OBJECT]: " + JSON.stringify(id));
        }
    } catch(e) { 
        console.error("[NUVIO_RAW_ID_OBJECT_ERROR]: Obje stringify edilemedi.");
    }
    console.error("########################################################");

    // Çökme koruması
    if (!id) return Promise.resolve([]);

    // İşlem için zorunlu temizlik (Burayı sadece API isteği atabilmek için yapıyoruz)
    var safeId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + safeId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var originalTitle = info.name || info.title;
            if (!originalTitle) return [];

            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                body: 's=' + encodeURIComponent(originalTitle)
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var regex = new RegExp('href="(https?://jetfilmizle\\.net/(film|dizi)/([^"/]+))"', 'i');
                var m = regex.exec(searchHtml);
                
                var finalUrl = '';
                if (m) {
                    finalUrl = BASE_URL + '/' + m[2] + '/' + m[3];
                    if (type === 'tv') {
                        finalUrl += '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                    }
                } else {
                    var fallbackSlug = titleToSlug(originalTitle);
                    finalUrl = (type === 'tv') 
                        ? BASE_URL + '/dizi/' + fallbackSlug + '/sezon-' + (season || 1) + '/bolum-' + (episode || 1)
                        : BASE_URL + '/film/' + fallbackSlug;
                }

                return fetch(finalUrl, { headers: HEADERS });
            });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            var streams = [];
            
            // Pixeldrain Yakalayıcı
            var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/([^"]+))"/g;
            var m;
            while ((m = pdRe.exec(html)) !== null) {
                streams.push({
                    name: "JetFilmizle",
                    title: '⌜ Pixeldrain ⌟ | HD',
                    url: 'https://pixeldrain.com/api/file/' + m[2] + '?download',
                    headers: { 'Referer': 'https://pixeldrain.com/' }
                });
            }

            // Iframe/Embed Yakalayıcı
            var iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
            while ((m = iframeRe.exec(html)) !== null) {
                var src = m[1];
                if (src.indexOf('jetv') !== -1 || src.indexOf('d2rs') !== -1) {
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Hızlı Kaynak ⌟',
                        url: src.startsWith('//') ? 'https:' + src : src,
                        type: 'embed'
                    });
                }
            }
            return streams;
        })
        .catch(function(e) {
            console.error("[FATAL_ERROR]: " + e.message);
            return [];
        });
}

module.exports = { getStreams: getStreams };
