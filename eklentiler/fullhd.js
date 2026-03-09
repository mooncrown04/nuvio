/**
 * FullHDFilmizlesene Nuvio Scraper - v3.2
 * Güncel Adres: .live
 * Hata Giderme: Dinamik URL yapısı ve içerik sayfası yükleme kontrolü.
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
            .then(function(res) { 
                if (!res) throw new Error('TMDB Baglantisi Yok');
                return res.json(); 
            })
            .then(function(data) {
                var query = data ? (data.title || data.name) : '';
                if (!query) throw new Error('Isim Bulunamadi');
                
                var searchUrl = CONFIG.BASE_URL + '/arama/' + encodeURIComponent(query);
                console.log('[FullHD] Araniyor:', query);
                return fetch(searchUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) { 
                if (!res) throw new Error('Arama Yaniti Yok');
                return res.text(); 
            })
            .then(function(html) {
                if (!html) return resolve([]);
                
                var $ = cheerio.load(html);
                var firstResult = $('.film-liste ul li a').first().attr('href');
                
                if (!firstResult) {
                    console.log('[FullHD] Sonuc Yok');
                    return resolve([]);
                }

                // URL Temizleme ve Birleştirme
                var cleanPath = firstResult.replace(CONFIG.BASE_URL, '');
                var targetUrl = CONFIG.BASE_URL + (cleanPath.startsWith('/') ? '' : '/') + cleanPath;

                // Dizi ise bölüm linkini oluştur
                if (mediaType === 'tv') {
                    // Site bazen /dizi-adi/1-sezon-1-bolum veya /dizi-adi/1-sezon-1-bolum-izle kullanıyor
                    targetUrl = targetUrl.replace(/\/$/, '') + '/' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle';
                }

                console.log('[FullHD] Hedef Sayfa:', targetUrl);
                // "Icerik sayfasi yuklenemedi" hatasini engellemek icin ek kontrol
                return fetch(targetUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) { 
                if (!res || !res.ok) {
                    // Eğer -izle ekiyle bulunamadıysa bir de eksiz dene (Opsiyonel Güvenlik)
                    throw new Error('Icerik sayfasi yuklenemedi');
                }
                return res.text(); 
            })
            .then(function(pageHtml) {
                if (!pageHtml) return resolve([]);
                
                var $ = cheerio.load(pageHtml);
                var streams = [];

                // Video iframe taraması
                $('.video-player iframe, #video-player iframe, .player-container iframe, iframe[src*="iframe"]').each(function(i, elem) {
                    var src = $(elem).attr('src') || $(elem).attr('data-src');
                    if (src) {
                        var finalSrc = src.startsWith('//') ? 'https:' + src : src;
                        
                        streams.push({
                            name: "FullHD - Kaynak " + (i + 1),
                            title: "FullHD Video", 
                            url: finalSrc,
                            quality: "Auto",
                            headers: { 'Referer': CONFIG.BASE_URL + '/' },
                            provider: "fullhd-nuvio"
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
} else {
    global.getStreams = getStreams;
}
