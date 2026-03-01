// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
};

// ==================== KRİTİK ÇÖZÜCÜLER ====================

function rot13(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

// Sunucudan gelen \x68\x74\x74\x70... şeklindeki hex veriyi çözer
function hexToString(hex) {
    try {
        var cleanHex = hex.replace(/\\\\x/g, '').replace(/\\x/g, '');
        var str = '';
        for (var i = 0; i < cleanHex.length; i += 2) {
            str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
        }
        return str;
    } catch (e) { return hex; }
}

// ==================== ANA MOTOR ====================

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(data.title);
            return fetch(searchUrl);
        }).then(function(res) { return res.text(); }).then(function(searchHtml) {
            var filmMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
            if (!filmMatch) return resolve([]);
            
            var filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];
            return fetch(filmUrl).then(function(res) { 
                return res.text().then(function(html) { return { html: html, url: filmUrl }; });
            });
        }).then(function(obj) {
            var scxMatch = obj.html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return resolve([]);
            
            var scx = JSON.parse(scxMatch[1]);
            var keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];
            var allStreams = [];

            // Tüm anahtarları döngüye al
            var promises = keys.map(function(key) {
                if (!scx[key] || !scx[key].sx || !scx[key].sx.t) return Promise.resolve([]);
                
                var t = scx[key].sx.t;
                var rawLinks = Array.isArray(t) ? t : Object.values(t);
                
                return Promise.all(rawLinks.map(function(enc, index) {
                    var decoded = atob(rot13(enc));
                    
                    // Eğer link bir extractor sayfasıysa (Rapid/Atom vb.)
                    if (decoded.indexOf('rapidvid') !== -1 || decoded.indexOf('vidmoxy') !== -1 || decoded.indexOf('atom') !== -1) {
                        return fetch(decoded, { headers: { 'Referer': obj.url } })
                            .then(function(res) { return res.text(); })
                            .then(function(frameHtml) {
                                var fileMatch = frameHtml.match(/file["']:\s*["']([^"']+)["']/);
                                if (fileMatch) {
                                    var finalUrl = hexToString(fileMatch[1]);
                                    return {
                                        name: '⌜ FHD ⌟ ' + key.toUpperCase() + ' #' + (index + 1),
                                        url: finalUrl,
                                        type: finalUrl.indexOf('.m3u8') !== -1 ? 'M3U8' : 'VIDEO',
                                        headers: Object.assign({}, STREAM_HEADERS, { 'Referer': obj.url })
                                    };
                                }
                                return null;
                            }).catch(function() { return null; });
                    } else if (decoded.indexOf('http') !== -1) {
                        return Promise.resolve({
                            name: '⌜ FHD ⌟ ' + key.toUpperCase() + ' #' + (index + 1),
                            url: decoded,
                            type: decoded.indexOf('.m3u8') !== -1 ? 'M3U8' : 'VIDEO',
                            headers: Object.assign({}, STREAM_HEADERS, { 'Referer': obj.url })
                        });
                    }
                    return Promise.resolve(null);
                }));
            });

            Promise.all(promises).then(function(results) {
                var flatResults = [].concat.apply([], results).filter(function(x) { return x !== null; });
                resolve(flatResults);
            });
        }).catch(function() { resolve([]); });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
