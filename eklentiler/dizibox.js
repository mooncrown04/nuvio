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
        
        if (mediaType === 'movie') return resolve([]);

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
                
                console.log('[DiziBox] Dizi Sayfası:', firstLink);
                return fetch(firstLink, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(diziHtml) {
                var $ = cheerio.load(diziHtml);
                var targetEpUrl = '';
                
                // Dizi slug'ını al (Örn: breaking-bad-izle-2)
                var diziSlug = diziHtml.match(/postid-(\d+)/) ? diziHtml.match(/postid-(\d+)/)[1] : ""; 

                // Hatalı eşleşmeyi önlemek için linkleri daha sıkı kontrol et
                $('a').each(function() {
                    var href = $(this).attr('href') || '';
                    // Link hem sezonu, hem bölümü, hem de dizinin kendi adını içermeli
                    if (href.includes(seasonNum + '-sezon') && 
                        href.includes(episodeNum + '-bolum') && 
                        href.indexOf('/diziler/') !== -1) {
                        
                        targetEpUrl = href;
                        return false; 
                    }
                });

                if (!targetEpUrl) throw new Error("Bölüm linki bulunamadı");
                
                console.log('[DiziBox] Bölüm Sayfası:', targetEpUrl);
                return fetch(targetEpUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(epHtml) {
                var $ = cheerio.load(epHtml);
                var streams = [];
                
                // Iframe bulma mantığını genişlet (Data-src desteği dahil)
                var iframeUrl = $('#video-area iframe').attr('src') || 
                                $('#video-area iframe').attr('data-src') ||
                                $('iframe[src*="king"]').attr('src') || 
                                $('iframe[src*="moly"]').attr('src');

                if (!iframeUrl) throw new Error("Oynatıcı bulunamadı");
                if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;

                console.log('[DiziBox] Iframe:', iframeUrl);
                return fetch(iframeUrl, { headers: { 'Referer': BASE_URL + '/' } })
                    .then(function(r) { return r.text(); })
                    .then(function(playerHtml) {
                        // m3u8 linkini ayıkla
                        var m3u8Match = playerHtml.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
                        
                        if (m3u8Match) {
                            streams.push({
                                name: "⌜ DiziBox ⌟ | HD Sunucu",
                                url: m3u8Match[1],
                                quality: "1080p",
                                headers: { 
                                    'Referer': iframeUrl,
                                    'User-Agent': HEADERS['User-Agent']
                                },
                                provider: "dizibox"
                            });
                        }
                        resolve(streams);
                    });
            })
            .catch(function(err) {
                console.log('[DiziBox] Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
