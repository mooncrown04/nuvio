// Yardımcı Fonksiyonlar (Bundler bağımlılığını ortadan kaldırmak için)
var __cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.diziyou.one';
const STORAGE_URL = 'https://storage.diziyou.one';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
};

function getStreams(tmdbId, mediaType, season, episode) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') {
            console.log('[DiziYou] Sadece dizi destekleniyor.');
            return resolve([]);
        }

        console.log('[DiziYou] İstek Başladı:', tmdbId, 'S:', season, 'E:', episode);

        // 1. TMDB'den isim al
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var query = tmdbData.name;
                if (!query) throw new Error('TMDB ismi bulunamadı');
                
                console.log('[DiziYou] TMDB İsmi:', query);
                // 2. Arama Yap
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var $ = __cheerio.load(searchHtml);
                var firstResult = $('div.incontent div#list-series div#categorytitle a').first().attr('href');
                
                if (!firstResult) {
                    console.log('[DiziYou] Arama sonucu bulunamadı.');
                    return resolve([]);
                }

                // 3. Bölüm Sayfasına Git
                var slug = firstResult.replace(BASE_URL + '/', '').replace(/\/$/, '');
                var episodeUrl = BASE_URL + '/' + slug + '-' + season + '-sezon-' + episode + '-bolum/';
                console.log('[DiziYou] Bölüm URL:', episodeUrl);
                
                return fetch(episodeUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(epHtml) {
                var $ = __cheerio.load(epHtml);
                var playerSrc = $('#diziyouPlayer').attr('src') || $('iframe[src*="diziyou"]').attr('src');
                
                if (!playerSrc) {
                    console.log('[DiziYou] Player iframe bulunamadı.');
                    return resolve([]);
                }

                // 4. itemId Ayıkla (Kotlin mantığı)
                var itemId = playerSrc.split('/').pop().replace('.html', '');
                console.log('[DiziYou] Yakalanan ID:', itemId);

                var streams = [];
                var subtitles = [];

                // 5. Seçenekleri Kontrol Et (Altyazı / Dublaj)
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

                if (epHtml.indexOf('id="turkceDublaj"') !== -1) {
                    streams.push({
                        name: '⌜ DiziYou ⌟ | Dublaj',
                        url: STORAGE_URL + '/episodes/' + itemId + '_tr/play.m3u8'
                    });
                }

                // Fallback (Hiçbiri yoksa)
                if (streams.length === 0) {
                    streams.push({
                        name: '⌜ DiziYou ⌟ | Video',
                        url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8'
                    });
                }

                // 6. Sonuçları Formatla (Sinewix/Dizipal örneğindeki gibi)
                var results = streams.map(function(s) {
                    return {
                        name: s.name,
                        url: s.url,
                        quality: '720p',
                        headers: { 'Referer': BASE_URL + '/' },
                        subtitles: subtitles
                    };
                });

                console.log('[DiziYou] Başarılı, bulunan stream:', results.length);
                resolve(results);
            })
            .catch(function(err) {
                console.error('[DiziYou] Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
}
