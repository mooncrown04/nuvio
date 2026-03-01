// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': BASE_URL + '/'
};

// ==================== YARDIMCI FONKSİYONLAR ====================

function rot13(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

function decodeFHD(encoded) {
    try {
        return atob(rot13(encoded));
    } catch (e) { return null; }
}

// ==================== ANA MOTOR ====================

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(data.title);
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var filmMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
                if (!filmMatch) return resolve([]);
                
                var filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];
                return fetch(filmUrl, { headers: HEADERS }).then(function(res) {
                    return res.text().then(function(html) { return { html: html, url: filmUrl }; });
                });
            })
            .then(function(obj) {
                var scxMatch = obj.html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
                if (!scxMatch) return resolve([]);
                
                var scx = JSON.parse(scxMatch[1]);
                var results = [];
                var keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];

                keys.forEach(function(key) {
                    if (scx[key] && scx[key].sx && scx[key].sx.t) {
                        var t = scx[key].sx.t;
                        var rawLinks = Array.isArray(t) ? t : Object.values(t);

                        rawLinks.forEach(function(enc, index) {
                            var decoded = decodeFHD(enc);
                            if (decoded && decoded.indexOf('http') !== -1) {
                                
                                // PLAYER HATASINI ÇÖZEN KRİTİK AYARLAR
                                var isM3U8 = decoded.indexOf('.m3u8') !== -1 || decoded.indexOf('playlist') !== -1;

                                results.push({
                                    name: '⌜ FHD ⌟ ' + key.toUpperCase() + ' #' + (index + 1),
                                    url: decoded,
                                    title: 'FullHD Filmizlesene',
                                    type: isM3U8 ? 'M3U8' : 'VIDEO',
                                    headers: {
                                        'User-Agent': HEADERS['User-Agent'],
                                        'Referer': obj.url, // Videonun açılması için o filmin linki şart!
                                        'Origin': BASE_URL,
                                        'Sec-Fetch-Dest': 'video',
                                        'Sec-Fetch-Mode': 'no-cors'
                                    },
                                    provider: 'fullhdfilmizlesene'
                                });
                            }
                        });
                    }
                });
                resolve(results);
            })
            .catch(function() {
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
