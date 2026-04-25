/**
 * JetFilmizle — Nuvio Provider (DEBUG MODE)
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
    // --- VERİ KONTROLÜ VE LOGLAMA ---
    var rawId = id;
    var safeId = (id !== undefined && id !== null) ? id.toString().replace(/[^0-9]/g, '') : null;
    
    // Her şeyi kapsayan devasa bir log basıyoruz
    console.error(
        "\n========================================\n" +
        "[JETFILM DEBUG] Gelen Ham ID: " + rawId + "\n" +
        "[JETFILM DEBUG] Medya Tipi: " + mediaType + "\n" +
        "[JETFILM DEBUG] Sezon/Bölüm: " + season + "/" + episode + "\n" +
        "========================================\n"
    );

    if (!safeId) {
        console.error("[JETFILM ERROR] ID bulunamadığı için işlem iptal edildi!");
        return [];
    }

    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + safeId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            // TMDB'den gelen tüm datayı gör
            console.error("[JETFILM TMDB DATA]: " + JSON.stringify(info));

            var originalTitle = info.name || info.title;
            if (!originalTitle) return [];

            console.error("[JETFILM] Aranıyor: " + originalTitle);

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
                    if (mediaType === 'tv') {
                        finalUrl += '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                    }
                } else {
                    var fallbackSlug = titleToSlug(originalTitle);
                    finalUrl = (mediaType === 'tv') 
                        ? BASE_URL + '/dizi/' + fallbackSlug + '/sezon-' + (season || 1) + '/bolum-' + (episode || 1)
                        : BASE_URL + '/film/' + fallbackSlug;
                }

                console.error("[JETFILM] Gidilen URL: " + finalUrl);
                return fetch(finalUrl, { headers: HEADERS });
            });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            var streams = [];
            if (html.indexOf('Sayfa Bulunamadı') !== -1) {
                console.error("[JETFILM] SONUÇ: Sayfa Bulunamadı (404)");
                return [];
            }

            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // Pixeldrain
            var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/([^"]+))"/g;
            var m;
            while ((m = pdRe.exec(html)) !== null) {
                streams.push({
                    name: "JetFilmizle",
                    title: '⌜ Pixeldrain ⌟ | ' + dil,
                    url: 'https://pixeldrain.com/api/file/' + m[2] + '?download',
                    type: 'video',
                    quality: '1080p',
                    headers: { 'Referer': 'https://pixeldrain.com/' }
                });
            }

            // Iframe/Embed
            var iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
            while ((m = iframeRe.exec(html)) !== null) {
                var src = m[1];
                if (src.indexOf('jetv') !== -1 || src.indexOf('d2rs') !== -1) {
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Hızlı Kaynak ⌟ | ' + dil,
                        url: src.startsWith('//') ? 'https:' + src : src,
                        type: 'embed'
                    });
                }
            }
            
            console.error("[JETFILM] Bulunan Kaynak Sayısı: " + streams.length);
            return streams;
        })
        .catch(function(e) {
            console.error("[JETFILM ERROR]: " + e.message);
            return [];
        });
}

module.exports = { getStreams: getStreams };
