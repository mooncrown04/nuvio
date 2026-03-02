// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene - VLC & Atom Fix Version

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'X-Requested-With': 'XMLHttpRequest'
};

// ==================== YARDIMCI FONKSİYONLAR ====================

function atobFixed(str) {
    try {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(str, 'base64').toString('utf-8');
        }
        return atob(str);
    } catch (e) { return null; }
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
        var result = atobFixed(rot13Fixed(encoded));
        return (result && result.startsWith('http')) ? result : null;
    } catch (e) { return null; }
}

function hexDecodeFixed(hexString) {
    if (!hexString) return null;
    try {
        var cleaned = hexString.replace(/\\\\x/g, '\\x').replace(/\\x/g, '');
        var bytes = [];
        for (var i = 0; i < cleaned.length; i += 2) {
            bytes.push(parseInt(cleaned.substr(i, 2), 16));
        }
        return String.fromCharCode.apply(null, bytes);
    } catch (e) { return null; }
}

// ==================== EXTRACTOR'LAR ====================

function rapid2m3u8(url, referer) {
    return fetch(url, { headers: Object.assign({}, HEADERS, { 'Referer': referer }) })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            var match = text.match(/file":\s*"(.*?)"/) || text.match(/file":"(.*?)"/);
            if (!match) return [];
            var decoded = hexDecodeFixed(match[1]);
            if (!decoded || !decoded.includes('.m3u8')) return [];
            return [{ url: decoded, quality: '1080p' }];
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
                var playlistUrl = baseUrl + '/playlist/' + item.file.substring(1) + '.txt';
                return fetch(playlistUrl, {
                    method: 'POST',
                    headers: Object.assign({}, HEADERS, { 'Referer': referer }),
                    body: ''
                }).then(function(r) { return r.text(); })
                  .then(function(videoUrl) {
                    videoUrl = videoUrl.trim();
                    return videoUrl.startsWith('http') ? { url: videoUrl, quality: item.title || '720p' } : null;
                }).catch(function() { return null; });
            });
            return Promise.all(promises).then(function(results) {
                return results.filter(function(r) { return r !== null; });
            });
        }).catch(function() { return []; });
}

function extractVideoUrl(url, sourceKey, referer) {
    if (url.includes('rapidvid.net') || url.includes('vidmoxy.com')) return rapid2m3u8(url, referer);
    if (url.includes('trstx.org')) return trstx2m3u8(url, referer);
    return Promise.resolve([{ url: url, quality: '1080p' }]);
}

// ==================== ANA MOTOR ====================

function fetchDetailAndStreams(filmUrl) {
    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var title = (html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [null, 'FullHD'])[1].trim();
            var year = (html.match(/(\d{4})/) || [null, null])[1];
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
                    if (!decoded) return;

                    var promise = extractVideoUrl(decoded, key, filmUrl).then(function(results) {
                        return results.map(function(r) {
                            return {
                                name: '⌜ FullHD ⌟ | ' + item.label,
                                title: title + (year ? ' (' + year + ')' : '') + ' · ' + r.quality,
                                url: r.url,
                                quality: r.quality,
                                behaviorHints: {
                                    notDirect: true,
                                    proxyHeaders: {
                                        "common": {
                                            'User-Agent': HEADERS['User-Agent'],
                                            'Referer': filmUrl,
                                            'Origin': BASE_URL,
                                            'X-Requested-With': 'XMLHttpRequest'
                                        }
                                    }
                                }
                            };
                        });
                    });
                    allPromises.push(promise);
                });
            });
            return Promise.all(allPromises);
        })
        .then(function(results) { 
            var streams = [];
            results.forEach(function(r) { if (Array.isArray(r)) streams = streams.concat(r); });
            return streams;
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

function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);
    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
    
    return fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
        return searchFullHD(data.title).then(function(results) {
            return results.length > 0 ? fetchDetailAndStreams(results[0].url) : [];
        });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
