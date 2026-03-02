// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// ==================== KRİTİK DECODE VE HEX ÇÖZÜCÜ ====================

function decodeSource(encoded) {
    try {
        var rot13 = function(s) { return s.replace(/[a-zA-Z]/g, function(c) { return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26); }); };
        var clean = rot13(encoded).replace(/\s/g, '');
        return atob(clean);
    } catch (e) { return null; }
}

function hexDecode(hex) {
    try {
        var str = '';
        var clean = hex.replace(/\\\\x|\\x/g, '');
        for (var i = 0; i < clean.length; i += 2) {
            str += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
        }
        return str;
    } catch (e) { return null; }
}

// ==================== 3003 HATASI ÇÖZÜCÜ (EXTRACTOR) ====================

function getM3U8FromSource(url, filmUrl) {
    return fetch(url, { headers: Object.assign({}, HEADERS, { 'Referer': filmUrl }) })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            // Rapidvid/Vidmoxy içindeki gizli hex m3u8'i bul
            var match = text.match(/file["']?\s*[:=]\s*["']([^"']+)["']/);
            if (!match) return null;
            var realUrl = hexDecode(match[1]);
            
            // Eğer hala 3003 alıyorsak linkin sonuna referer eklemeliyiz (Nuvio formatı)
            if (realUrl && realUrl.includes('.m3u8')) {
                return realUrl; 
            }
            return null;
        }).catch(function() { return null; });
}

// ==================== ANA MANTIK ====================

function fetchDetailAndStreams(filmUrl) {
    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return [];

            var scxData = JSON.parse(scxMatch[1]);
            var keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];
            var promises = [];

            keys.forEach(function(key) {
                if (!scxData[key] || !scxData[key].sx || !scxData[key].sx.t) return;
                var sourceObj = scxData[key].sx.t;
                var encodedLinks = Array.isArray(sourceObj) ? sourceObj : Object.values(sourceObj);

                encodedLinks.forEach(function(encoded, index) {
                    var decoded = decodeSource(encoded);
                    if (!decoded) return;

                    var p = (decoded.includes('rapidvid') || decoded.includes('vidmoxy')) 
                            ? getM3U8FromSource(decoded, filmUrl) 
                            : Promise.resolve(decoded);

                    promises.push(p.then(function(finalUrl) {
                        if (!finalUrl) return null;
                        
                        var isHls = finalUrl.includes('.m3u8') || ["proton", "fast", "atom"].indexOf(key) > -1;

                        return {
                            name: "FHD | " + key.toUpperCase() + " #" + (index + 1),
                            url: finalUrl,
                            quality: "1080p",
                            is_direct: true,
                            // Oynatıcıya m3u8 olduğunu zorla öğret
                            streamType: isHls ? "hls" : "video",
                            // 3003 HATASI ÇÖZÜMÜ: Headerları her parça (segment) için zorunlu tut
                            headers: {
                                'User-Agent': HEADERS['User-Agent'],
                                'Referer': BASE_URL + '/',
                                'Origin': BASE_URL,
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        };
                    }));
                });
            });

            return Promise.all(promises);
        })
        .then(function(results) {
            return results.filter(function(r) { return r !== null; });
        });
}

// Nuvio'nun standart getStreams fonksiyonu
function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);
    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
    
    return fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(movie) {
        return fetch(BASE_URL + '/arama/' + encodeURIComponent(movie.title), { headers: HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var match = html.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
                if (!match) return [];
                var filmUrl = match[1].startsWith('http') ? match[1] : BASE_URL + match[1];
                return fetchDetailAndStreams(filmUrl);
            });
    }).catch(function() { return []; });
}

module.exports = { getStreams };
