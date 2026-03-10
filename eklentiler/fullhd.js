/**
 * FullHDFilmizlesene Nuvio Scraper - v3.7 (Tam Stabil Versiyon)
 */

var cheerio = require("cheerio-without-node-native");

var CONFIG = {
    BASE_URL: 'https://www.fullhdfilmizlesene.live',
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.fullhdfilmizlesene.live/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
    }
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        var tmdbType = (mediaType === 'movie' ? 'movie' : 'tv');
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { 
                return (res && res.json) ? res.json() : null; 
            })
            .then(function(data) {
                var query = data ? (data.title || data.name) : '';
                if (!query) throw new Error('TMDB Verisi Alinamadi');
                
                var searchUrl = CONFIG.BASE_URL + '/arama/' + encodeURIComponent(query);
                console.log('[FullHD] Araniyor:', query);
                return fetch(searchUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) { 
                return (res && res.text) ? res.text() : null; 
            })
            .then(function(html) {
                if (!html) return resolve([]);
                
                var $ = cheerio.load(html);
                var firstResult = $('.film-liste ul li a').first().attr('href');
                
                if (!firstResult) {
                    console.log('[FullHD] Arama sonucu bulunamadi');
                    return resolve([]);
                }

                var slug = firstResult.replace(CONFIG.BASE_URL, '').replace(/^\/+/, '').replace(/\/$/, '');
                var targetUrl;

                if (mediaType === 'tv') {
                    // Dizi ismini temizle (gereksiz ekleri atar)
                    var seriesName = slug.replace('diziler/', '').split('-izle')[0].split('-bolum')[0];
                    targetUrl = CONFIG.BASE_URL + '/' + seriesName + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle';
                } else {
                    targetUrl = CONFIG.BASE_URL + '/' + slug;
                }

                console.log('[FullHD] Deneniyor:', targetUrl);
                return fetch(targetUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) {
                // HATA KONTROLÜ: res undefined ise burada yakalanır
                if (!res) throw new Error('Ilk baglanti basarisiz');

                // 404 Aldıysak (Özellikle dizilerde klasör yapısı değişebiliyor)
                if (res.status === 404 && mediaType === 'tv') {
                    var altUrl = targetUrl.replace(CONFIG.BASE_URL + '/', CONFIG.BASE_URL + '/diziler/');
                    console.log('[FullHD] 404 alindi, alternatif deneniyor:', altUrl);
                    return fetch(altUrl, { headers: CONFIG.HEADERS });
                }
                return res;
            })
            .then(function(res) {
                if (!res || !res.text) throw new Error('Icerik sayfasi bos');
                return res.text();
            })
            .then(function(pageHtml) {
                var $ = cheerio.load(pageHtml);
                var streams = [];

                // Sitedeki iframe kaynaklarını topla
                $('iframe').each(function(i, elem) {
                    var src = $(elem).attr('src') || $(elem).attr('data-src');
                    if (src) {
                        // Protokolü kontrol et (// ile başlıyorsa https ekle)
                        var finalUrl = src.startsWith('//') ? 'https:' + src : src;
                        
                        // Sadece video barındıran kaynakları filtrele (opsiyonel)
                        if (finalUrl.includes('fullhd') || finalUrl.includes('video') || finalUrl.includes('player')) {
                            streams.push({
                                name: "FullHD Kaynak " + (i + 1),
                                url: finalUrl,
                                quality: "Auto",
                                headers: { 'Referer': CONFIG.BASE_URL + '/' },
                                provider: "fullhd-nuvio"
                            });
                        }
                    }
                });

                console.log('[FullHD] Bulunan kaynak sayisi:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                // Loglardaki "status of undefined" hatasını bu catch bloğu engeller
                console.error('[FullHD] Scraper Hatasi:', err.message);
                resolve([]); 
            });
    });
}

// Nuvio/SineWix Export yapısı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
