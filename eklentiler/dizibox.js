var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.dizibox.live';

// SineWix örneğindeki gibi detaylı stream headerları
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'DNT': '1'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        // SineWix örneğindeki gibi sadece TV kontrolü
        if (mediaType !== 'tv') {
            return resolve([]);
        }

        console.log('[DiziBox] İşlem Başladı. ID:', tmdbId);

        // 1. TMDB'den isim al (Arama yapmak için)
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.original_name || '';
                if (!query) throw new Error('İsim bulunamadı');

                // 2. Sitede Arama Yap (SineWix searchAndFetch mantığı)
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                console.log('[DiziBox] Aranıyor:', query);

                return fetch(searchUrl, { headers: { 'User-Agent': STREAM_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var $ = cheerio.load(searchHtml);
                
                // Arama sonuçlarından ilk dizinin linkini yakala
                var firstResult = $('.post-content h2 a').first().attr('href');
                
                if (!firstResult) {
                    console.log('[DiziBox] Sonuç bulunamadı.');
                    return resolve([]);
                }

                // 3. Bölüm URL'sini Oluştur
                // Örn: https://www.dizibox.live/dizi/breaking-bad/ -> breaking-bad
                var slug = firstResult.replace(BASE_URL, '').replace('/dizi/', '').replace(/\//g, '');
                var epUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';
                
                console.log('[DiziBox] Bölüm Sayfası:', epUrl);
                return fetch(epUrl, { headers: { 'User-Agent': STREAM_HEADERS['User-Agent'] } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var streams = [];

                // 4. Iframe / Video Kaynağını Bul
                var playerUrl = $('#video-area iframe').attr('src') || $('iframe[src*="player"]').attr('src');

                if (playerUrl) {
                    if (playerUrl.startsWith('//')) playerUrl = 'https:' + playerUrl;

                    // SineWix formatında sonuç dön
                    streams.push({
                        name: 'DiziBox - MolyStream',
                        title: '1080p Kaynağı',
                        url: playerUrl,
                        quality: '1080p',
                        size: 'Auto',
                        headers: STREAM_HEADERS,
                        provider: 'dizibox'
                    });
                }

                console.log('[DiziBox] Bitti. Link sayısı:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[DiziBox] Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
