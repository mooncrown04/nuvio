// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene - Gelişmiş Extractor ve Sniff Hatası Çözümlü Versiyon

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// ==================== YARDIMCI FONKSİYONLAR ====================

function atobFixed(str) {
    try {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(str, 'base64').toString('utf-8'); // 'binary' yerine 'utf-8'
        }
        return window.atob(str);
    } catch (e) {
        return null;
    }
}

function rot13Fixed(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(char) {
        var code = char.charCodeAt(0);
        var base = code < 97 ? 65 : 97;
        return String.fromCharCode(((code - base + 13) % 26) + base);
    });
}

function decodeLinkFixed(encoded) {
    try {
        var result = atobFixed(rot13Fixed(encoded)); // ROT13 + Base64
        return (result && result.includes('http')) ? result : null;
    } catch (e) {
        return null;
    }
}

function hexDecodeFixed(hexString) {
    if (!hexString) return null;
    try {
        var bytes = [];
        if (hexString.includes('\\x')) {
            var parts = hexString.split('\\x');
            for (var i = 1; i < parts.length; i++) {
                bytes.push(parseInt(parts[i].substring(0, 2), 16));
            }
        } else {
            for (var j = 0; j < hexString.length; j += 2) {
                bytes.push(parseInt(hexString.substring(j, j + 2), 16));
            }
        }
        return String.fromCharCode.apply(null, bytes); // Python bytes.fromhex() eşdeğeri
    } catch (e) {
        return null;
    }
}

// ==================== EXTRACTOR'LAR ====================

function rapid2m3u8(url, referer) {
    return fetch(url, { headers: Object.assign({}, HEADERS, { 'Referer': referer }) })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            var match = text.match(/file":\s*"(.*?)"/) || text.match(/file":"(.*?)"/);
            if (!match) return [];
            var decoded = hexDecodeFixed(match[1].replace(/\\\\x/g, '\\x'));
            return decoded ? [{ url: decoded, quality: '720p', type: 'M3U8' }] : [];
        }).catch(function() { return []; });
}

function trstx2m3u8(url, referer) {
    var baseUrl = 'https://trstx.org';
    return fetch(url, { headers: Object.assign({}, HEADERS, { 'Referer': referer }) })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            var match = text.match(/file":"([^"]+)/);
            if (!match) return [];
            return fetch(baseUrl + '/' + match[1].replace(/\\/g, ''), {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Referer': referer, 'Content-Type': 'application/x-www-form-urlencoded' }),
                body: ''
            });
        })
        .then(function(res) { return res.json(); })
        .then(function(postData) {
            var promises = postData.slice(1).map(function(item) {
                return fetch(baseUrl + '/playlist/' + item.file.substring(1) + '.txt', {
                    method: 'POST',
                    headers: Object.assign({}, HEADERS, { 'Referer': referer }),
                    body: ''
                }).then(function(r) { return r.text(); })
                  .then(function(url) { return { url: url.trim(), quality: item.title, type: 'M3U8' }; });
            });
            return Promise.all(promises);
        }).catch(function() { return []; });
}

function extractVideoUrl(url, sourceKey, referer) {
    if (url.includes('rapidvid.net') || url.includes('vidmoxy.com')) return rapid2m3u8(url, referer);
    if (url.includes('trstx.org')) return trstx2m3u8(url, referer);
    
    // Direkt Linkler
    var isDirect = ['proton', 'fast', 'tr', 'en'].some(function(k) { return sourceKey.toLowerCase().includes(k); });
    if (isDirect || url.match(/\.(m3u8|mp4)/i)) {
        return Promise.resolve([{ url: url, quality: '720p', type: url.includes('.m3u8') ? 'M3U8' : 'VIDEO' }]);
    }
    return Promise.resolve([]);
}

// ==================== ANA MANTIK ====================

function fetchDetailAndStreams(filmUrl) {
    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var title = (html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [null, 'FullHD'])[1].trim();
            var year = (html.match(/(\d{4})/ ) || [null, null])[1];
            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return [];

            var scxData = JSON.parse(scxMatch[1]);
            var allPromises = [];
            var keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];

            keys.forEach(function(key) {
                var sourceData = scxData[key];
                if (!sourceData || !sourceData.sx || !sourceData.sx.t) return;
                var t = sourceData.sx.t;

                var items = Array.isArray(t) ? t.map(function(v, i) { return { encoded: v, label: key.toUpperCase() + ' #' + (i+1) }; }) 
                                           : Object.keys(t).map(function(k) { return { encoded: t[k], label: key.toUpperCase() + ' ' + k }; });

                items.forEach(function(item) {
                    var decoded = decodeLinkFixed(item.encoded);
                    if (decoded) {
                        allPromises.push(extractVideoUrl(decoded, key, filmUrl).then(function(results) {
                            return results.map(function(r) {
                                return {
                                    name: '⌜ FullHD ⌟ | ' + item.label,
                                    title: title + (year ? ' (' + year + ')' : '') + ' · ' + r.quality,
                                    url: r.url,
                                    quality: r.quality,
                                    headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': filmUrl, 'Origin': BASE_URL },
                                    type: r.type,
                                    provider: 'fullhdfilmizlesene'
                                };
                            });
                        }));
                    }
                });
            });
            return Promise.all(allPromises);
        })
        .then(function(results) { return [].concat.apply([], results); });
}

// TMDB ve Arama fonksiyonları ilk kodun aynısıdır...
function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);
    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
    
    return fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
        return searchFullHD(data.title).then(function(results) {
            var best = results[0]; // Basitleştirilmiş eşleşme
            return best ? fetchDetailAndStreams(best.url) : [];
        });
    });
}

function searchFullHD(title) {
    return fetch(BASE_URL + '/arama/' + encodeURIComponent(title), { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            var regex = /<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][\s\S]*?<span[^>]+>([^<]+)<\/span>/gi;
            var m;
            while ((m = regex.exec(html)) !== null) {
                results.push({ url: m[1].startsWith('http') ? m[1] : BASE_URL + m[1], title: m[2].trim() });
            }
            return results;
        });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
