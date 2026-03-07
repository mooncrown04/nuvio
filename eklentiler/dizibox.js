var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.dizibox.live';

// Nuvio ve Video Player için gerekli headerlar
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// Yardımcı Fonksiyonlar (DiziPal örneğindeki mantık)
function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

// 1. Arama Fonksiyonu (DiziPal örneğindeki gibi detaylı)
function searchDiziBox(title) {
    var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(title);
    console.log('[DiziBox] Searching:', searchUrl);

    return fetch(searchUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var $ = cheerio.load(html);
            var results = [];

            // DiziBox arama sonuçları 'post-content' class'ı içindedir
            $('.post-content').each(function() {
                var link = $(this).find('h2 a').attr('href');
                var itemTitle = $(this).find('h2 a').text();
                
                if (link && link.includes('/dizi/')) {
                    results.push({ title: itemTitle, url: link });
                }
            });

            console.log('[DiziBox] Search results:', results.length);
            return results;
        });
}

// 2. Sayfa Yükleme ve Video Yakalama (m3u8/iframe tespiti)
function loadContentPage(url) {
    console.log('[DiziBox] Loading content:', url);

    return fetch(url, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var $ = cheerio.load(html);
            
            // DiziBox video iframe'ini farklı yöntemlerle ara
            var iframeSrc = $('div#video-area iframe').attr('src') || 
                            $('iframe[src*="king"]').attr('src') || 
                            $('iframe[src*="moly"]').attr('src') ||
                            findFirst(html, '<iframe[^>]+src="([^"]+)"')[1];

            if (iframeSrc && iframeSrc.startsWith('//')) {
                iframeSrc = 'https:' + iframeSrc;
            }
            
            return iframeSrc;
        });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // DiziBox sadece dizi (tv) odaklıdır
        if (mediaType !== 'tv') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.name || data.original_name || '';
                if (!title) throw new Error('No title found');

                return searchDiziBox(title);
            })
            .then(function(results) {
                if (!results || results.length === 0) return null;

                // En iyi sonucu seç (DiziPal mantığı)
                var best = results[0]; 
                
                // Bölüm URL'sini oluştur
                var slug = best.url.replace(BASE_URL, '').replace('/dizi/', '').replace(/\//g, '');
                var targetUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';

                return loadContentPage(targetUrl);
            })
            .then(function(iframeUrl) {
                if (!iframeUrl) return resolve([]);

                // Sonuçları Nuvio formatında paketle
                var streams = [{
                    name: '⌜ DiziBox ⌟ | 1080p',
                    title: 'DiziBox Kaynağı',
                    url: iframeUrl,
                    quality: '1080p',
                    size: 'Auto',
                    headers: {
                        'User-Agent': HEADERS['User-Agent'],
                        'Referer': BASE_URL + '/',
                        'Origin': BASE_URL
                    },
                    provider: 'dizibox'
                }];

                resolve(streams);
            })
            .catch(function(err) {
                console.error('[DiziBox] Error:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
