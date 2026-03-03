/**
 * FullHDFilmizlesene Scraper - Nuvio/QuickJS Uyumlu
 * DiziPal ve DiziYou mantığıyla, karmaşık extractorlar yerine 
 * doğrudan kaynak çözme odaklı hazırlandı.
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
};

// Yardımcı Fonksiyon: Sitenin şifreli linklerini çözer (atob + rot13)
function decodeFullHDLink(encoded) {
    try {
        // ROT13 Çözümü
        var rot13 = encoded.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        // Base64 Çözümü (QuickJS uyumlu basit yöntem)
        // Eğer ortamda atob yoksa bu kısım hata verebilir, 
        // ancak çoğu QuickJS implementasyonunda mevcuttur.
        return atob(rot13);
    } catch (e) {
        return null;
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        // Bu site sadece film odaklıdır
        if (mediaType !== 'movie') {
            return resolve([]);
        }

        // 1. TMDB'den film ismini al
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[FullHD] Film aranıyor ID:', tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || '';
                if (!query) throw new Error('Film ismi bulunamadı');

                // 2. Sitede Arama Yap
                var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var $ = cheerio.load(searchHtml);
                // Arama sonuçlarındaki ilk filmin linki
                var firstFilm = $('li.film a').first().attr('href');
                
                if (!firstFilm) {
                    console.log('[FullHD] Arama sonucu bulunamadı.');
                    return resolve([]);
                }

                var finalUrl = firstFilm.startsWith('http') ? firstFilm : BASE_URL + firstFilm;
                console.log('[FullHD] Film Sayfası:', finalUrl);
                
                return fetch(finalUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                var streams = [];
                
                // 3. scx verisini bul (Sitenin video kaynakları burada saklıdır)
                var scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
                if (!scxMatch) {
                    console.log('[FullHD] Video verisi (scx) bulunamadı.');
                    return resolve([]);
                }

                try {
                    var scxData = JSON.parse(scxMatch[1]);
                    
                    // Önemli kaynaklar: proton, fast, atom, tr, en
                    var sources = ['proton', 'fast', 'tr', 'en'];
                    
                    sources.forEach(function(key) {
                        var source = scxData[key];
                        if (source && source.sx && source.sx.t) {
                            var linkList = source.sx.t;
                            
                            // Linkleri listeye ekle
                            if (Array.isArray(linkList)) {
                                linkList.forEach(function(encLink, index) {
                                    var decoded = decodeFullHDLink(encLink);
                                    if (decoded && decoded.includes('.m3u8')) {
                                        streams.push({
                                            name: '⌜ FullHD ⌟ | ' + key.toUpperCase() + ' #' + (index + 1),
                                            url: decoded,
                                            quality: 'HD',
                                            headers: { 'Referer': BASE_URL + '/' }
                                        });
                                    }
                                });
                            }
                        }
                    });
                } catch (e) {
                    console.error('[FullHD] JSON ayrıştırma hatası');
                }

                console.log('[FullHD] Bulunan kaynak sayısı:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[FullHD] Hata:', err.message);
                resolve([]);
            });
    });
}

// Export yapısı (SineWix/Dizipal ile aynı)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
