// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': BASE_URL + '/'
};// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
};

// ==================== KRİTİK ŞİFRE ÇÖZÜCÜLER ====================

function rot13(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

// RapidVid ve VidMoxy içindeki \x68\x74\x74... şeklindeki Hex kodlarını çözer
function hexDecode(hex) {
    try {
        var cleanHex = hex.replace(/\\\\x/g, '').replace(/\\x/g, '');
        var str = '';
        for (var i = 0; i < cleanHex.length; i += 2) {
            str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
        }
        return str;
    } catch (e) { return hex; }
}

function decodeLink(enc) {
    try {
        return atob(rot13(enc));
    } catch (e) { return null; }
}

// ==================== ANA MOTOR ====================

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl).then(res => res.json()).then(async data => {
            var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(data.title);
            var searchHtml = await (await fetch(searchUrl)).text();
            
            var filmMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
            if (!filmMatch) return resolve([]);
            
            var filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];
            var filmPage = await (await fetch(filmUrl)).text();

            var scxMatch = filmPage.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return resolve([]);
            
            var scx = JSON.parse(scxMatch[1]);
            var results = [];
            var keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];

            for (var key of keys) {
                if (!scx[key] || !scx[key].sx || !scx[key].sx.t) continue;
                var t = scx[key].sx.t;
                var rawLinks = Array.isArray(t) ? t : Object.values(t);

                for (var enc of rawLinks) {
                    var decoded = decodeLink(enc);
                    if (!decoded) continue;

                    // PLAYBACK ERROR'I ÖNLEYEN KISIM:
                    // Eğer link bir iframe sayfasıysa (Rapid/VidMoxy), içeriğini çekip hex decode yapıyoruz
                    if (decoded.includes('rapidvid') || decoded.includes('vidmoxy') || decoded.includes('atom')) {
                        try {
                            var framePage = await (await fetch(decoded, { headers: { 'Referer': filmUrl } })).text();
                            var fileMatch = framePage.match(/file["']:\s*["']([^"']+)["']/);
                            if (fileMatch) {
                                decoded = hexDecode(fileMatch[1]); // Hex karmaşasını gerçek linke çevirir
                            }
                        } catch (e) {}
                    }

                    if (decoded.includes('http')) {
                        results.push({
                            name: '⌜ FHD ⌟ ' + key.toUpperCase(),
                            url: decoded,
                            title: data.title,
                            type: decoded.includes('m3u8') ? 'M3U8' : 'VIDEO',
                            headers: Object.assign({}, STREAM_HEADERS, { 'Referer': filmUrl }),
                            provider: 'fullhdfilmizlesene'
                        });
                    }
                }
            }
            resolve(results);
        }).catch(() => resolve([]));
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };

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

