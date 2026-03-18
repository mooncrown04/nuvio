/**
 * DiziPal v40 - Nuvio Optimized
 * Mimari: SineWix/DiziYou (Promise tabanlı, Kripto içermez)
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://dizipal1543.com';
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.error('[DiziPal] Islem Basladi: ' + tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.name;
                if (!title) throw new Error('Isim bulunamadi');

                // SineWix/DiziYou tarzı temiz slug oluşturma
                var slug = title.toLowerCase()
                    .replace(/[ğ]/g, 'g').replace(/[ü]/g, 'u').replace(/[ş]/g, 's')
                    .replace(/[ı]/g, 'i').replace(/[ö]/g, 'o').replace(/[ç]/g, 'c')
                    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

                var targetPath = isMovie ? '/film/' + slug : '/bolum/' + slug + '-' + seasonNum + 'x' + episodeNum;
                console.error('[DiziPal] Hedef: ' + targetPath);
                
                return fetch(BASE_URL + targetPath, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var streams = [];
                var $ = cheerio.load(html);

                // 1. Yöntem: Sayfa içindeki doğrudan video dosyalarını ara (Regex)
                var hlsMatch = html.match(/file:\s*["'](http[^"']+\.m3u8)["']/);
                if (hlsMatch) {
                    streams.push({
                        name: 'DiziPal - Direct HLS',
                        url: hlsMatch[1],
                        quality: 'Auto',
                        provider: 'dizipal'
                    });
                }

                // 2. Yöntem: Iframe içindeki dplayer kaynaklarını tara (DiziYou mantığı)
                $('iframe').each(function(i, el) {
                    var src = $(el).attr('src');
                    if (src && src.includes('dplayer')) {
                        streams.push({
                            name: 'DiziPal - Player ' + (i + 1),
                            url: src,
                            quality: 'Auto',
                            headers: { 'Referer': BASE_URL + '/' },
                            provider: 'dizipal'
                        });
                    }
                });

                console.error('[DiziPal] Bulunan kaynak: ' + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[DiziPal] Kritik Hata: ' + err.message);
                resolve([]); // "Job cancelled" olmaması için mutlaka boş dizi dön
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
