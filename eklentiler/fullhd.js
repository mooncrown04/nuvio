/**
 * FullHDFilmizlesene Nuvio Scraper - v3.8 (Ultra Resilience)
 */

var cheerio = require("cheerio-without-node-native");

var CONFIG = {
    BASE_URL: 'https://www.fullhdfilmizlesene.live',
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    }
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        var tmdbType = (mediaType === 'movie' ? 'movie' : 'tv');
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[FullHD] Baslatiliyor ID:', tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { 
                if (!res || !res.json) throw new Error('TMDB Baglantisi Yok');
                return res.json(); 
            })
            .then(function(data) {
                var query = data ? (data.title || data.name) : '';
                if (!query) throw new Error('Isim bulunamadi');
                
                var searchUrl = CONFIG.BASE_URL + '/arama/' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) { 
                if (!res) throw new Error('Arama sayfasina ulasilamadi');
                return res.text(); 
            })
            .then(function(html) {
                if (!html) throw new Error('Arama sonucu bos');
                
                var $ = cheerio.load(html);
                var firstResult = $('.film-liste ul li a').first().attr('href');
                
                if (!firstResult) return resolve([]);

                var slug = firstResult.replace(CONFIG.BASE_URL, '').replace(/^\/+/, '').replace(/\/$/, '');
                var targetUrl;

                if (mediaType === 'tv') {
                    var seriesName = slug.replace('diziler/', '').split('-izle')[0].split('-bolum')[0];
                    targetUrl = CONFIG.BASE_URL + '/' + seriesName + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle';
                } else {
                    targetUrl = CONFIG.BASE_URL + '/' + slug;
                }

                console.log('[FullHD] Deneniyor:', targetUrl);
                return fetch(targetUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) {
                if (!res) throw new Error('Icerik sayfasindan yanit yok');

                if (res.status === 404 && mediaType === 'tv') {
                    var altUrl = targetUrl.replace(CONFIG.BASE_URL + '/', CONFIG.BASE_URL + '/diziler/');
                    console.log('[FullHD] 404, Alternatif:', altUrl);
                    return fetch(altUrl, { headers: CONFIG.HEADERS });
                }
                return res;
            })
            .then(function(res) {
                if (!res || !res.text) throw new Error('Sayfa metni okunamadi');
                return res.text();
            })
            .then(function(pageHtml) {
                if (!pageHtml) return resolve([]);
                
                var $ = cheerio.load(pageHtml);
                var streams = [];

                $('iframe').each(function(i, elem) {
                    var src = $(elem).attr('src') || $(elem).attr('data-src');
                    if (src) {
                        var finalUrl = src.startsWith('//') ? 'https:' + src : src;
                        if (finalUrl.includes('fullhd') || finalUrl.includes('video') || finalUrl.includes('player')) {
                            streams.push({
                                name: "FullHD Kaynak " + (i + 1),
                                url: finalUrl,
                                quality: "Auto",
                                headers: { 'Referer': CONFIG.BASE_URL + '/' },
                                provider: "fullhd-resilient"
                            });
                        }
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
