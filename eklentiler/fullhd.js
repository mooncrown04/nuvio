/**
 * FullHDFilmizlesene Nuvio Scraper - v3.0
 * Adres: .live güncel versiyon
 */

var cheerio = require("cheerio-without-node-native");

// Değişkenlerin kaybolmaması için sabit bir objede topluyoruz
var CONFIG = {
    BASE_URL: 'https://www.fullhdfilmizlesene.live',
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer': 'https://www.fullhdfilmizlesene.live/'
    }
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        // 1. TMDB'den Türkçe isim çek (Arama doğruluğu için)
        var tmdbType = (mediaType === 'movie' ? 'movie' : 'tv');
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.name || '';
                if (!query) throw new Error('Film/Dizi adı bulunamadı');
                
                // 2. Sitede Arama Yap (Dizipal mantığıyla benzer)
                var searchUrl = CONFIG.BASE_URL + '/arama/' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                // Arama sonucundaki ilk kartın linkini al
                var firstResult = $('.film-liste ul li a').first().attr('href');
                
                if (!firstResult) {
                    console.log('[FullHD] Sonuç bulunamadı.');
                    return resolve([]);
                }

                // URL'nin tam olduğundan emin ol
                var targetUrl = firstResult.startsWith('http') ? firstResult : CONFIG.BASE_URL + firstResult;

                // 3. Eğer dizi ise sezon/bölüm URL'sini oluştur
                if (mediaType === 'tv') {
                    // Örn: .../dizi-adi/1-sezon-1-bolum-izle
                    targetUrl = targetUrl.replace(/\/$/, '') + '/' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle';
                }

                console.log('[FullHD] Hedef URL:', targetUrl);
                return fetch(targetUrl, { headers: CONFIG.HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                var $ = cheerio.load(pageHtml);
                var streams = [];

                // 4. Video Kaynaklarını Ayıkla (Template formatına uygun)
                $('.video-player iframe, #video-player iframe').each(function(i, elem) {
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

                // Hiç kaynak bulunamazsa boş dön
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[FullHD] Hata:', err.message);
                resolve([]); // Hata anında boş dizi dönmek Nuvio için zorunludur
            });
    });
}

// Nuvio ve React Native uyumluluğu için export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
