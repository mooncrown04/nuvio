// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// Video oynatılırken gönderilmesi gereken kritik başlıklar (DiziPal/SineWix örneğinden)
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
};

// ==================== YARDIMCI FONKSİYONLAR ====================

function atobFixed(str) {
    try {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(str, 'base64').toString('utf-8');
        }
        return window.atob(str);
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
        return (result && result.includes('http')) ? result : null;
    } catch (e) { return null; }
}

function hexDecodeFixed(hexString) {
    if (!hexString) return null;
    try {
        var cleanHex = hexString.replace(/\\x/g, '').replace(/\\\\x/g, '');
        var str = '';
        for (var i = 0; i < cleanHex.length; i += 2) {
            str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
        }
        return str;
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
            return decoded ? [{ url: decoded, quality: '720p' }] : [];
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
                headers: Object.assign({}, HEADERS, { 'Referer': referer }),
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
                  .then(function(url) { return { url: url.trim(), quality: item.title }; });
            });
            return Promise.all(promises);
        }).catch(function() { return []; });
}

// ==================== ANA MANTIK ====================

function fetchDetailAndStreams(filmUrl) {
    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            var title = titleMatch ? titleMatch[1].trim() : 'FullHD Film';
            var yearMatch = html.match(/(\d{4})/);
            var year = yearMatch ? yearMatch[1] : '';
            
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
                        var extractorPromise;
                        if (decoded.includes('rapidvid.net') || decoded.includes('vidmoxy.com')) {
                            extractorPromise = rapid2m3u8(decoded, filmUrl);
                        } else if (decoded.includes('trstx.org')) {
                            extractorPromise = trstx2m3u8(decoded, filmUrl);
                        } else {
                            extractorPromise = Promise.resolve([{ url: decoded, quality: '720p' }]);
                        }

                        allPromises.push(extractorPromise.then(function(results) {
                            return results.map(function(r) {
                                // Dinamik Tip Belirleme (Kritik)
                                var type = 'VIDEO';
                                if (r.url.includes('.m3u8')) type = 'M3U8';
                                else if (r.url.includes('.mpd')) type = 'DASH';

                                return {
                                    name: '⌜ FullHD ⌟ | ' + item.label,
                                    title: title + (year ? ' (' + year + ')' : '') + ' · ' + r.quality,
                                    url: r.url,
                                    quality: r.quality,
                                    headers: STREAM_HEADERS, // Yukarıdaki geniş başlıklar kullanılıyor
                                    type: type,
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

function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);
    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
    
    return fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
        var searchTitle = data.title || data.original_title;
        return searchFullHD(searchTitle).then(function(results) {
            var best = results[0]; 
            return best ? fetchDetailAndStreams(best.url) : [];
        });
    }).catch(function() { return []; });
}

function searchFullHD(title) {
    return fetch(BASE_URL + '/arama/' + encodeURIComponent(title), { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            var regex = /<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/gi;
            var m;
            while ((m = regex.exec(html)) !== null) {
                results.push({ url: m[1].startsWith('http') ? m[1] : BASE_URL + m[1] });
            }
            return results;
        });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
