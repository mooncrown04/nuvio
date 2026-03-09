/**
 * FullHDFilmizlesene Nuvio Scraper - v3.1
 * Güncel Adres: .live
 * Hata Giderme: "text of undefined" hatası için güvenlik kontrolleri eklendi.
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
        
        // 1. TMDB Bilgilerini Çek
        var tmdbType = (mediaType === 'movie' ? 'movie' : 'tv');
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { 
                if (!res) throw new Error('TMDB Baglantisi Kurulamadi');
                return res.json(); 
            })
            .then(function(data) {
                var query = data ? (data.title || data.name) : '';
                if (!query) throw new Error('Medya ismi bulunamadi');
                
                // 2. Sitede Arama Yap
                var searchUrl = CONFIG.BASE_URL + '/arama/' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) { 
                if (!res) throw new Error('Arama istegi basarisiz');
                return res.text(); 
            })
            .then(function(html) {
                if (!html) return resolve([]);
                
                var $ = cheerio.load(html);
                var firstResult = $('.film-liste ul li a').first().attr('href');
                
                if (!firstResult) {
                    console.log('[FullHD] Arama sonucu bulunamadi.');
                    return resolve([]);
                }

                var targetUrl = firstResult.startsWith('http') ? firstResult : CONFIG.BASE_URL + firstResult;

                // 3. Dizi ise Bölüm URL'si Oluştur
                if (mediaType === 'tv') {
                    targetUrl = targetUrl.replace(/\/$/, '') + '/' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle';
                }

                return fetch(targetUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) { 
                if (!res) throw new Error('Icerik sayfasi yuklenemedi');
                return res.text(); 
            })
            .then(function(pageHtml) {
                if (!pageHtml) return resolve([]);
                
                var $ = cheerio.load(pageHtml);
                var streams = [];

                // 4. Video Kaynaklarını Ayıkla
                $('.video-player iframe, #video-player iframe, .player-container iframe').each(function(i, elem) {
                    var src = $(elem).attr('src');
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

                // Hiç kaynak bulunamadıysa bile uygulama çökmemeli
                resolve(streams);
            })
            .catch(function(err) {
                // Loglardaki "text of undefined" hatasını burada yakalayıp sessizce resolve ediyoruz
                console.error('[FullHD] Hata:', err.message);
                resolve([]); 
            });
    });
}

// Nuvio için export yapısı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
