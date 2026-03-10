/**
 * FullHDFilmizlesene Nuvio Scraper - v3.4
 * Fix: Dizi URL yolu ve link doğrulama iyileştirildi.
 */

var cheerio = require("cheerio-without-node-native");

var CONFIG = {
    BASE_URL: 'https://www.fullhdfilmizlesene.live',
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer': 'https://www.fullhdfilmizlesene.live/',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
    }
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        var tmdbType = (mediaType === 'movie' ? 'movie' : 'tv');
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data ? (data.title || data.name) : '';
                if (!query) throw new Error('İsim Bulunamadı');
                
                var searchUrl = CONFIG.BASE_URL + '/arama/' + encodeURIComponent(query);
                console.log('[FullHD] Araniyor:', query);
                return fetch(searchUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                if (!html) return resolve([]);
                
                var $ = cheerio.load(html);
                var firstResult = $('.film-liste ul li a').first().attr('href');
                
                if (!firstResult) {
                    console.log('[FullHD] Sonuc bulunamadi');
                    return resolve([]);
                }

                // URL Temizleme
                var slug = firstResult.replace(CONFIG.BASE_URL, '').replace(/^\/+/, '');
                var targetUrl = CONFIG.BASE_URL + '/' + slug;

                if (mediaType === 'tv') {
                    // Örn: /diziler/breaking-bad/ -> breaking-bad-1-sezon-1-bolum-izle
                    var cleanSlug = slug.replace('diziler/', '').replace(/\/$/, '');
                    targetUrl = CONFIG.BASE_URL + '/' + cleanSlug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle';
                }

                console.log('[FullHD] Deneniyor:', targetUrl);
                return fetch(targetUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) {
                if (!res || res.status === 404) throw new Error('Sayfa bulunamadi');
                return res.text();
            })
            .then(function(pageHtml) {
                var $ = cheerio.load(pageHtml);
                var streams = [];

                // Player iframe'lerini yakala
                $('.video-player iframe, #video-player iframe, iframe[src*="fullhd"]').each(function(i, elem) {
                    var src = $(elem).attr('src') || $(elem).attr('data-src');
                    if (src) {
                        var finalSrc = src.startsWith('//') ? 'https:' + src : src;
                        streams.push({
                            name: "FullHD - Kaynak " + (i + 1),
                            url: finalSrc,
                            quality: "Auto",
                            headers: { 'Referer': CONFIG.BASE_URL + '/' },
                            provider: "fullhd-scraper"
                        });
                    }
                });

                resolve(streams);
            })
            .catch(function(err) {
                console.error('[FullHD] Hata:', err.message);
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
