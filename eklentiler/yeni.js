/**
 * JetFilmizle — Nuvio Provider (LOW-LEVEL TRAFFIC DEBUGGER)
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

function getStreams(id, mediaType, season, episode) {
    // 1. HAM VERİ GİRİŞİ (Hiçbir temizleme yapmadan olduğu gibi basıyoruz)
    console.error(
        "\n[RAW_DATA_INCOME]\n" +
        "----------------------------------------\n" +
        "ID (Ham): " + id + " (Type: " + (typeof id) + ")\n" +
        "MediaType: " + mediaType + "\n" +
        "S/E: " + season + " / " + episode + "\n" +
        "----------------------------------------"
    );

    // Çökme yapmaması için sadece null kontrolü
    if (id === undefined || id === null) {
        console.error("[JETFILM ERROR] ID Tanımsız!");
        return [];
    }

    var cleanId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    // 2. DIŞ SERVİS TRAFİĞİ (TMDB İstek Analizi)
    var tmdbUrl = 'https://api.themoviedb.org/3/' + type + '/' + cleanId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR';
    console.error("[OUTBOUND_REQUEST] TMDB URL: " + tmdbUrl);

    return fetch(tmdbUrl)
        .then(function(r) { return r.json(); })
        .then(function(info) {
            // TMDB'den dönen ham yanıtı olduğu gibi logla
            console.error("[RAW_TMDB_RESPONSE]: " + JSON.stringify(info));

            var originalTitle = info.name || info.title;
            if (!originalTitle) return [];

            // 3. SITE ARAMA TRAFİĞİ
            console.error("[OUTBOUND_REQUEST] POST -> /filmara.php | Data: s=" + originalTitle);

            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                body: 's=' + encodeURIComponent(originalTitle)
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                // Arama sonucundaki URL yakalama
                var regex = new RegExp('href="(https?://jetfilmizle\\.net/(film|dizi)/([^"/]+))"', 'i');
                var m = regex.exec(searchHtml);
                
                var finalUrl = '';
                if (m) {
                    finalUrl = BASE_URL + '/' + m[2] + '/' + m[3];
                    if (mediaType === 'tv') {
                        finalUrl += '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                    }
                } else {
                    finalUrl = BASE_URL + '/?s=' + encodeURIComponent(originalTitle);
                }

                console.error("[TARGET_PAGE_URL] " + finalUrl);
                return fetch(finalUrl, { headers: HEADERS });
            });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            var streams = [];
            
            // 4. HAM HTML ANALİZİ (Önemli script taglerini ve iframe'leri yakala)
            // Cihazdan çıkan linklerin kaynağını bulmak için
            console.error("[PAGE_HTML_SAMPLE] İlk 500 karakter: " + html.substring(0, 500));

            // Pixeldrain yakalayıcı (Cihazın dışarıya verdiği asıl stream linki budur)
            var pdRe = /https?:\/\/pixeldrain\.com\/u\/[a-zA-Z0-9]+/g;
            var pdMatches = html.match(pdRe);
            if (pdMatches) {
                pdMatches.forEach(function(link) {
                    var fileId = link.split('/').pop();
                    var directLink = 'https://pixeldrain.com/api/file/' + fileId + '?download';
                    
                    console.error("[STREAM_OUT] Verilen Link (Direct): " + directLink);
                    
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Pixeldrain ⌟ | RAW STREAM',
                        url: directLink,
                        quality: '1080p',
                        headers: { 
                            'User-Agent': 'Mozilla/5.0',
                            'Referer': 'https://pixeldrain.com/'
                        }
                    });
                });
            }

            // Iframe/Embed yakalayıcı (Proxy üzerinden mi gidiyor?)
            var iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
            var m;
            while ((m = iframeRe.exec(html)) !== null) {
                console.error("[STREAM_OUT] Verilen Link (Embed): " + m[1]);
                streams.push({
                    name: "JetFilmizle",
                    title: '⌜ Embed ⌟ | RAW IFRAME',
                    url: m[1].startsWith('//') ? 'https:' + m[1] : m[1],
                    type: 'embed'
                });
            }
            
            return streams;
        })
        .catch(function(e) {
            console.error("[FATAL_DEBUG_ERROR]: " + e.stack);
            return [];
        });
}

module.exports = { getStreams: getStreams };
