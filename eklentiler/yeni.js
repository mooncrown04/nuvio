/**
 * JetFilmizle — Nuvio Provider (MoOnCrOwN - V26)
 * Titan / Videopark Worker Desteği Eklendi.
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 9; Fire TV Stick 4K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var originalTitle = info.name || info.title;
            
            // 1. Sitede Aramayı Başlat (404 koruması)
            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                body: 's=' + encodeURIComponent(originalTitle)
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var regex = new RegExp('href="(https?://jetfilmizle\\.net/(film|dizi)/([^"/]+))"', 'i');
                var m = regex.exec(searchHtml);
                
                var targetUrl = '';
                if (m) {
                    targetUrl = BASE_URL + '/' + m[2] + '/' + m[3];
                    if (mediaType === 'tv') {
                        // Sezon ve Bölüm yapısını Jetfilm formatına çeviriyoruz
                        targetUrl += '/' + season + '-sezon-' + episode + '-bolum';
                    }
                }
                
                console.error('[JetFilm-V26] Hedef URL: ' + targetUrl);
                return fetch(targetUrl, { headers: HEADERS });
            });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            // Bot koruması kontrolü (58361)
            if (html.length < 60000) {
                console.error('[JetFilm-V26] Bot engeli yakalandı, sayfa eksik.');
            }

            var streams = [];

            // --- TİTAN & WORKER YAKALAYICI (Senin bulduğun yöntem) ---
            var titanHashRe = /videopark\.top\/titan\/w\/([a-zA-Z0-9_-]+)/;
            var hashMatch = titanHashRe.exec(html);

            if (hashMatch) {
                var titanUrl = 'https://videopark.top/titan/w/' + hashMatch[1];
                
                // Titan sayfasından Worker linkini çekiyoruz
                return fetch(titanUrl, { headers: { 'Referer': BASE_URL + '/' } })
                    .then(function(tr) { return tr.text(); })
                    .then(function(titanHtml) {
                        // Senin bulduğun /i/ veya /e/ kodunu yakala
                        var workerRe = /workers\.dev\/[i|e]\/([a-zA-Z0-9_-]{50,})/i;
                        var wm = workerRe.exec(titanHtml);
                        
                        if (wm) {
                            streams.push({
                                name: "JetFilmizle",
                                title: '⌜ Titan Worker ⌟ | 🇹🇷 HLS',
                                url: 'https://videopark.erikkalinina1994.workers.dev/i/' + wm[1],
                                type: 'video',
                                quality: '1080p',
                                headers: { 
                                    'Referer': 'https://videopark.top/',
                                    'Origin': 'https://videopark.top'
                                }
                            });
                        }
                        return streams;
                    });
            }

            // Pixeldrain ve diğer kaynaklar (Eskisi gibi devam)
            var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/([^"]+))"/g;
            var m;
            while ((m = pdRe.exec(html)) !== null) {
                streams.push({
                    name: "JetFilmizle",
                    title: '⌜ Pixeldrain ⌟',
                    url: 'https://pixeldrain.com/api/file/' + m[2] + '?download',
                    type: 'video',
                    quality: '1080p'
                });
            }

            return streams;
        })
        .catch(function(e) {
            console.error('[JetFilm-V26 Error]: ' + e.message);
            return [];
        });
}

module.exports = { getStreams: getStreams };
