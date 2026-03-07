var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.diziyou.one';
var STORAGE_URL = 'https://storage.diziyou.one';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
};

/**
 * Kotlin kodundaki storage ve itemId mantığını kullanarak linkleri çözer
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // DiziYou sadece TV dizilerini destekler
        if (mediaType !== 'tv') {
            return resolve([]);
        }

        console.log('[DiziYou] İşlem Başladı:', tmdbId, 'S:', seasonNum, 'E:', episodeNum);

        // 1. TMDB'den Türkçe isim al (Arama yapmak için)
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || '';
                if (!query) throw new Error('TMDB ismi alınamadı');
                
                // 2. Sitede Arama Yap (Dizipal'deki gibi)
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                // Kotlin seçicisi: div.incontent div#list-series
                var firstLink = $('div.incontent div#list-series div#categorytitle a').first().attr('href');
                
                if (!firstLink) {
                    console.log('[DiziYou] Dizi bulunamadı.');
                    return resolve([]);
                }

                // 3. Bölüm URL'sini oluştur (Kotlin'deki slug mantığı)
                var slug = firstLink.replace(BASE_URL + '/', '').replace(/\/$/, '');
                var epUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                console.log('[DiziYou] Bölüm URL:', epUrl);
                
                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(epHtml) {
                var $ = cheerio.load(epHtml);
                // Kotlin: iframe#diziyouPlayer
                var playerSrc = $('#diziyouPlayer').attr('src');
                
                if (!playerSrc) {
                    console.log('[DiziYou] Iframe bulunamadı.');
                    return resolve([]);
                }

                // 4. itemId ayıkla (Örn: /abc/123.html -> 123)
                var itemId = playerSrc.split('/').pop().replace('.html', '');
                console.log('[DiziYou] itemId Yakalandı:', itemId);

                var streams = [];
                var subtitles = [];

                // 5. Kaynak ve Altyazı Kontrolleri (Kotlin forEach mantığı)
                
                // Türkçe Altyazı seçeneği var mı?
                if (epHtml.indexOf('id="turkceAltyazili"') !== -1) {
                    subtitles.push({
                        label: 'Turkish',
                        url: STORAGE_URL + '/subtitles/' + itemId + '/tr.vtt'
                    });
                    streams.push({
                        name: '⌜ DiziYou ⌟ | Altyazılı',
                        url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8'
                    });
                }

                // Dublaj seçeneği var mı?
                if (epHtml.indexOf('id="turkceDublaj"') !== -1) {
                    streams.push({
                        name: '⌜ DiziYou ⌟ | Dublaj',
                        url: STORAGE_URL + '/episodes/' + itemId + '_tr/play.m3u8'
                    });
                }

                // Hiçbir buton yoksa bile varsayılanı ekle
                if (streams.length === 0) {
                    streams.push({
                        name: '⌜ DiziYou ⌟ | Video',
                        url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8'
                    });
                }

                // 6. SineWix formatında sonuçları döndür
                var results = streams.map(function(s) {
                    return {
                        name: s.name,
                        url: s.url,
                        quality: 'Auto',
                        headers: { 'Referer': BASE_URL + '/' },
                        subtitles: subtitles
                    };
                });

                resolve(results);
            })
            .catch(function(err) {
                console.error('[DiziYou] Hata:', err.message);
                resolve([]);
            });
    });
}

// Export yapısı SineWix/Dizipal ile aynı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
