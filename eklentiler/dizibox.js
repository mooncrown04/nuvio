var cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.dizibox.live';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Cookie': 'LockUser=true; isTrustedUser=true; dbxu=1743289650198'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        // DiziBox Sadece Dizi Destekler
        if (mediaType === 'movie') {
            return resolve([]);
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.original_name || data.name || '';
                console.log('[DiziBox] Aranan:', query);
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var firstLink = $('article.detailed-article a').first().attr('href') || $('.post-title a').first().attr('href');

                if (!firstLink) throw new Error("Dizi bulunamadı");

                // Bölüm linkini oluştur
                var epUrl = firstLink.replace(/\/$/, "") + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                console.log('[DiziBox] Hedef:', epUrl);
                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(epHtml) {
                var $ = cheerio.load(epHtml);
                var iframeUrl = $('#video-area iframe').attr('src');

                if (!iframeUrl) throw new Error("Iframe yok");
                if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;

                // Iframe'e git (King/Moly/Haydi vb.)
                return fetch(iframeUrl, { headers: { 'Referer': BASE_URL + '/' } });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                // Katman 2: Gizli m3u8 linkini ayıkla
                var streams = [];
                
                // 1. Yöntem: Standart regex
                var m3u8Match = playerHtml.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
                
                // 2. Yöntem: Unescape/Base64 koruması varsa (DiziBox bazen yapar)
                if (!m3u8Match) {
                    var encoded = playerHtml.match(/unescape\(['"](.*?)['"]\)/);
                    if (encoded) {
                        var decoded = decodeURIComponent(encoded[1]);
                        m3u8Match = decoded.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
                    }
                }

                if (m3u8Match) {
                    streams.push({
                        name: "⌜ DiziBox ⌟ | King Sunucu",
                        url: m3u8Match[1],
                        quality: "1080p",
                        headers: { 
                            'Referer': BASE_URL + '/',
                            'User-Agent': HEADERS['User-Agent']
                        },
                        provider: "dizibox"
                    });
                }

                resolve(streams);
            })
            .catch(function(err) {
                console.log('[DiziBox] Durum:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
