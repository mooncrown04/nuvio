// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

// ==================== KRİTİK DECODE FONKSİYONLARI ====================

function decodeFullHD(encoded) {
    try {
        // Site önce ROT13 yapıyor, sonra Base64.
        var rot13 = function(str) {
            return str.replace(/[a-zA-Z]/g, function(c) {
                return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
            });
        };
        // Base64 decode (Buffer desteği kontrolü ile)
        var decoded = "";
        var rotVal = rot13(encoded).replace(/\s/g, '');
        if (typeof Buffer !== 'undefined') {
            decoded = Buffer.from(rotVal, 'base64').toString('utf-8');
        } else {
            decoded = atob(rotVal);
        }
        return decoded.startsWith('http') ? decoded : null;
    } catch (e) { return null; }
}

function hexToUtf8(hex) {
    try {
        var str = '';
        var cleanHex = hex.replace(/\\\\x|\\x/g, '');
        for (var i = 0; i < cleanHex.length; i += 2) {
            str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
        }
        return str;
    } catch (e) { return null; }
}

// ==================== EXTRACTOR (RAPID/VIDMOXY) ====================

function extractM3U8(url, referer) {
    return fetch(url, { headers: Object.assign({}, HEADERS, { 'Referer': referer }) })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            // "file":"\x68\x74\x74\x70..." şeklindeki hex linki yakalar
            var match = text.match(/file["']?\s*[:=]\s*["']([^"']+)["']/);
            if (!match) return null;
            var realLink = hexToUtf8(match[1]);
            return (realLink && realLink.includes('.m3u8')) ? realLink : null;
        }).catch(function() { return null; });
}

// ==================== ANA AKIŞ ====================

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
                    var decoded = decodeFullHD(encoded);
                    if (!decoded) return;

                    var p;
                    // Eğer link bir aracı site ise (Rapidvid vb.) içine girip m3u8'i çek
                    if (decoded.includes('rapidvid.net') || decoded.includes('vidmoxy.com')) {
                        p = extractM3U8(decoded, filmUrl);
                    } else {
                        p = Promise.resolve(decoded);
                    }

                    promises.push(p.then(function(finalUrl) {
                        if (!finalUrl) return null;
                        var isHls = finalUrl.includes('.m3u8') || ["proton", "fast"].indexOf(key) > -1;
                        
                        return {
                            name: "FHD | " + key.toUpperCase() + " #" + (index + 1),
                            url: finalUrl,
                            quality: "1080p",
                            is_direct: true, // Nuvio için kritik
                            streamType: isHls ? "hls" : "video",
                            headers: {
                                'User-Agent': HEADERS['User-Agent'],
                                'Referer': BASE_URL + '/',
                                'Origin': BASE_URL
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

function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);
    
    // TMDB'den film ismini alıp aramaya gönderiyoruz
    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
    
    return fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(movie) {
        var query = movie.title || movie.original_title;
        return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Senin paylaştığın Cloudstream örneğindeki gibi linki yakalıyoruz
                var match = html.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
                if (!match) return [];
                var filmUrl = match[1].startsWith('http') ? match[1] : BASE_URL + match[1];
                return fetchDetailAndStreams(filmUrl);
            });
    }).catch(function() { return []; });
}

module.exports = { getStreams };
