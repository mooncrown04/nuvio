var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.dizibox.live';

var WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB'den dizinin adını al
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || '';
                if (!query) throw new Error('Dizi ismi bulunamadı');

                // 2. DiziBox üzerinde arama yap
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                console.log('[DiziBox] Aranıyor:', query);
                
                return fetch(searchUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var $ = cheerio.load(searchHtml);
                
                // Arama sonuçlarından ilk dizinin linkini al
                var diziPageUrl = $('.post-content h2 a').first().attr('href');
                
                if (!diziPageUrl) {
                    console.log('[DiziBox] Arama sonucu bulunamadı.');
                    return resolve([]);
                }

                // 3. Bölüm URL'sini inşa et
                // diziPageUrl genellikle 'https://www.dizibox.live/dizi/breaking-bad/' şeklindedir
                // Bunu 'https://www.dizibox.live/breaking-bad-1-sezon-1-bolum-hd-1-izle/' formatına çeviriyoruz
                var slug = diziPageUrl.replace(BASE_URL, '').replace('/dizi/', '').replace(/\//g, '');
                var targetUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';

                console.log('[DiziBox] Bölüm Sayfasına Gidiliyor:', targetUrl);
                return fetch(targetUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var streams = [];
                var iframeSrc = $('div#video-area iframe').attr('src') || $('iframe[src*="player"]').attr('src');

                if (iframeSrc) {
                    if (iframeSrc.startsWith('//')) iframeSrc = 'https:' + iframeSrc;

                    streams.push({
                        name: "DiziBox - MolyStream",
                        title: "Dizi Kaynağı",
                        url: iframeSrc,
                        quality: "1080p",
                        size: "Auto",
                        headers: {
                            'User-Agent': WORKING_HEADERS['User-Agent'],
                            'Referer': BASE_URL + '/',
                            'Origin': BASE_URL
                        },
                        provider: "dizibox"
                    });
                }

                console.log('[DiziBox] Sonuç bulundu:', streams.length);
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
