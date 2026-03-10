/**
 * FullHDFilmizlesene Nuvio Scraper - v3.5 (Dirençli Versiyon)
 */

var cheerio = require("cheerio-without-node-native");

var CONFIG = {
    BASE_URL: 'https://www.fullhdfilmizlesene.live',
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.fullhdfilmizlesene.live/'
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
                if (!query) throw new Error('Isim Bulunamadi');
                
                // Arama yaparken dizi ise sonuna "izle" ekleyerek aramayı daraltabiliriz
                var searchUrl = CONFIG.BASE_URL + '/arama/' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                if (!html) return resolve([]);
                
                var $ = cheerio.load(html);
                var firstResult = $('.film-liste ul li a').first().attr('href');
                
                if (!firstResult) return resolve([]);

                // URL formatını temizle
                var slug = firstResult.replace(CONFIG.BASE_URL, '').replace(/^\/+/, '').replace(/\/$/, '');
                var targetUrl;

                if (mediaType === 'tv') {
                    // Dizi adını temizle (diziler/ kısmını ve sondaki izle/ gibi ekleri at)
                    var seriesName = slug.replace('diziler/', '').split('-izle')[0].split('-bolum')[0];
                    
                    // Standart Format: site.com/dizi-adi-S-sezon-E-bolum-izle
                    targetUrl = CONFIG.BASE_URL + '/' + seriesName + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle';
                } else {
                    targetUrl = CONFIG.BASE_URL + '/' + slug;
                }

                console.log('[FullHD] Deneniyor URL:', targetUrl);
                return fetch(targetUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) {
                // Eğer sayfa 404 ise, alternatif olarak /diziler/ ön ekini deneyelim
                if (res.status === 404 && mediaType === 'tv') {
                     // URL'yi tekrar oluştur (Alternatif yapı)
                     // Bazı diziler sadece ana dizinde değil /diziler/ klasöründe barınır
                     var alternativeUrl = targetUrl.replace(CONFIG.BASE_URL + '/', CONFIG.BASE_URL + '/diziler/');
                     console.log('[FullHD] 404 Alındı, Alternatif Deneniyor:', alternativeUrl);
                     return fetch(alternativeUrl, { headers: CONFIG.HEADERS });
                }
                return res;
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                var $ = cheerio.load(pageHtml);
                var streams = [];

                $('iframe').each(function(i, elem) {
                    var src = $(elem).attr('src') || $(elem).attr('data-src');
                    if (src && (src.includes('fullhd') || src.includes('video'))) {
                        streams.push({
                            name: "FullHD Kaynak " + (i + 1),
                            url: src.startsWith('//') ? 'https:' + src : src,
                            quality: "1080p",
                            headers: { 'Referer': CONFIG.BASE_URL + '/' },
                            provider: "fullhd-v3.5"
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
