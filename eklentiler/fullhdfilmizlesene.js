var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
};

// Şifreli linkleri çözen fonksiyon (atob + rot13)
function decodeFullHDLink(encoded) {
    try {
        var rot13 = encoded.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        // QuickJS'de atob yoksa diye kontrol
        if (typeof atob === 'undefined') {
            console.log('[FullHD] Hata: Sistemde atob fonksiyonu bulunamadı!');
            return null;
        }
        return atob(rot13);
    } catch (e) {
        return null;
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        if (mediaType !== 'movie') {
            console.log('[FullHD] Sadece filmler destekleniyor.');
            return resolve([]);
        }

        console.log('[FullHD] 1. TMDB Sorgusu Başlatıldı. ID:', tmdbId);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || '';
                console.log('[FullHD] 2. Film İsmi Alındı:', query);
                
                if (!query) throw new Error('Film ismi bulunamadı');

                var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
                console.log('[FullHD] 3. Arama Yapılıyor:', searchUrl);
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var $ = cheerio.load(searchHtml);
                var firstFilm = $('li.film a').first().attr('href');
                
                if (!firstFilm) {
                    console.log('[FullHD] 4. Hata: Arama sonucunda film bulunamadı!');
                    return resolve([]);
                }

                var finalUrl = firstFilm.startsWith('http') ? firstFilm : BASE_URL + firstFilm;
                console.log('[FullHD] 5. Film Sayfasına Gidiliyor:', finalUrl);
                
                return fetch(finalUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                console.log('[FullHD] 6. Film Sayfası Yüklendi. scx verisi aranıyor...');
                
                var streams = [];
                // Sitenin içindeki gizli video objesini (scx) yakala
                var scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
                
                if (!scxMatch) {
                    console.log('[FullHD] 7. Hata: Sayfada scx (video verisi) bulunamadı!');
                    return resolve([]);
                }

                try {
                    var scxData = JSON.parse(scxMatch[1]);
                    console.log('[FullHD] 8. scx Başarıyla Ayrıştırıldı. Kaynaklar:', Object.keys(scxData));
                    
                    var sources = ['proton', 'fast', 'tr', 'en', 'atom'];
                    
                    sources.forEach(function(key) {
                        var source = scxData[key];
                        if (source && source.sx && source.sx.t) {
                            var linkList = source.sx.t;
                            console.log('[FullHD] - ' + key + ' kaynağında ' + linkList.length + ' link bulundu.');
                            
                            linkList.forEach(function(encLink, index) {
                                var decoded = decodeFullHDLink(encLink);
                                if (decoded && decoded.includes('.m3u8')) {
                                    streams.push({
                                        name: '⌜ FullHD ⌟ | ' + key.toUpperCase() + ' #' + (index + 1),
                                        url: decoded,
                                        quality: 'Auto',
                                        headers: { 'Referer': BASE_URL + '/' }
                                    });
                                }
                            });
                        }
                    });
                } catch (e) {
                    console.log('[FullHD] 9. Hata: JSON ayrıştırma veya Link çözme hatası:', e.message);
                }

                if (streams.length === 0) {
                    console.log('[FullHD] 10. Sonuç: Hiç geçerli stream linki üretilemedi.');
                } else {
                    console.log('[FullHD] 10. Başarılı: ' + streams.length + ' adet link gönderiliyor.');
                }
                
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[FullHD] Kritik Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
