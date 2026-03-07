var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.dizibox.live';

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB'den Orijinal İsmi Çek
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var originalName = data.original_name || data.name;
                
                // Slug oluştur: "Breaking Bad" -> "breaking-bad"
                var slug = originalName.toLowerCase().trim()
                    .replace(/\s+/g, '-')
                    .replace(/[^\w-]+/g, '')
                    .replace(/--+/g, '-');

                // DiziBox'ın standart bölüm URL formatı
                var targetUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';
                
                console.log('[DiziBox] Deneniyor:', targetUrl);

                return fetch(targetUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        'Referer': BASE_URL
                    }
                });
            })
            .then(function(res) {
                if (res.status === 404) {
                    console.log('[DiziBox] Sayfa bulunamadı (404).');
                    return resolve([]); 
                }
                return res.text();
            })
            .then(function(html) {
                if (!html) return;

                var $ = cheerio.load(html);
                var streams = [];

                // Video alanını ve iframe'i bul
                // Dizibox bazen 'iframe#diziboxPlayer' bazen direkt 'iframe' kullanır
                var iframe = $('div#video-area iframe').attr('src') || 
                             $('iframe[src*="king"]').attr('src') || 
                             $('iframe[src*="moly"]').attr('src');

                if (iframe) {
                    if (iframe.startsWith('//')) iframe = 'https:' + iframe;

                    streams.push({
                        name: "DiziBox",
                        title: "DiziBox - 1080p",
                        url: iframe,
                        quality: "1080p",
                        headers: {
                            'Referer': BASE_URL + '/',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        },
                        provider: "dizibox"
                    });
                }

                console.log('[DiziBox] Bulunan Link Sayısı:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.log('[DiziBox] Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
