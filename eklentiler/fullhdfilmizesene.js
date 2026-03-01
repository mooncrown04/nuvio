// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// SineWix ve DiziPal örneklerindeki gibi detaylı header yapısı
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// ==================== ŞİFRE ÇÖZÜCÜLER ====================

function rot13(str) {
    if (!str) return '';
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

function decodeLink(encoded) {
    try {
        // ROT13 ve ardından Base64 (atob)
        return atob(rot13(encoded));
    } catch (e) { return null; }
}

// ==================== ANA FONKSİYONLAR ====================

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        // FullHDFilmizlesene sadece film odaklıdır
        if (mediaType !== 'movie') {
            console.log('[FullHD] Sadece filmler destekleniyor.');
            return resolve([]);
        }

        // TMDB'den film bilgilerini al (SineWix örneğindeki gibi)
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.original_title;
                console.log('[FullHD] Aranıyor:', title);

                // Site içi arama (DiziPal mantığı)
                var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(title);
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // İlk film sonucunu yakala
                var filmMatch = html.match(/<li[^>]*class="film"[^>]*>[\s\S]*?<a href="([^"]+)"/i);
                if (!filmMatch) {
                    console.log('[FullHD] Film bulunamadı.');
                    return resolve([]);
                }

                var filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];
                console.log('[FullHD] Film sayfası:', filmUrl);
                return fetch(filmUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // scx değişkenini yakala (Sitenin ana veri kaynağı)
                var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
                if (!scxMatch) return resolve([]);

                var scx = JSON.parse(scxMatch[1]);
                var streams = [];
                // Sitenin kullandığı yaygın player anahtarları
                var keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];

                keys.forEach(function(key) {
                    if (scx[key] && scx[key].sx && scx[key].sx.t) {
                        var t = scx[key].sx.t;
                        var encodedLinks = Array.isArray(t) ? t : Object.values(t);

                        encodedLinks.forEach(function(enc, index) {
                            var decoded = decodeLink(enc);
                            if (decoded) {
                                // M3U8 veya MP4 kontrolü
                                var isM3u8 = decoded.includes('m3u8');
                                
                                streams.push({
                                    name: '⌜ FullHD ⌟ ' + key.toUpperCase() + (encodedLinks.length > 1 ? ' #' + (index + 1) : ''),
                                    url: decoded,
                                    quality: 'HD',
                                    headers: {
                                        'User-Agent': HEADERS['User-Agent'],
                                        'Referer': BASE_URL + '/',
                                        'Origin': BASE_URL
                                    },
                                    type: isM3u8 ? 'M3U8' : 'VIDEO'
                                });
                            }
                        });
                    }
                });

                console.log('[FullHD] Toplam link:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[FullHD] Hata:', err.message);
                resolve([]);
            });
    });
}

// Export yapısı (SineWix/DiziPal ile aynı)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
