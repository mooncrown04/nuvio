// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': BASE_URL + '/'
};

// Player'ın videoyu açabilmesi için gereken headerlar
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'Accept': '*/*',
    'Connection': 'keep-alive'
};

// ==================== YARDIMCI FONKSİYONLAR ====================

function atobFixed(str) {
    try { return atob(str.replace(/\s/g, '')); } catch (e) { return null; }
}

function rot13Fixed(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
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
        var cleaned = hexString.replace(/\\\\x/g, '').replace(/\\x/g, '');
        var str = '';
        for (var i = 0; i < cleaned.length; i += 2) {
            str += String.fromCharCode(parseInt(cleaned.substr(i, 2), 16));
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
            if (decoded && decoded.includes('.m3u8')) {
                return [{ url: decoded, quality: '1080p' }];
            }
            return [];
        }).catch(function() { return []; });
}

function extractVideoUrl(url, sourceKey, referer) {
    if (url.includes('rapidvid.net') || url.includes('vidmoxy.com')) return rapid2m3u8(url, referer);
    
    // Direkt linkler
    var isDirect = ['proton', 'fast', 'tr', 'en', 'atom'].some(function(k) { return sourceKey.toLowerCase().includes(k); });
    if (isDirect || url.includes('.m3u8') || url.includes('.mp4')) {
        return Promise.resolve([{ url: url, quality: '1080p' }]);
    }
    return Promise.resolve([]);
}

// ==================== ANA MANTIK ====================

function fetchDetailAndStreams(filmUrl) {
    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            var title = titleMatch ? titleMatch[1].trim() : 'Film';
            
            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return [];

            var scxData = JSON.parse(scxMatch[1]);
            var allPromises = [];
            var keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];

            keys.forEach(function(key) {
                if (!scxData[key] || !scxData[key].sx || !scxData[key].sx.t) return;
                var t = scxData[key].sx.t;

                var items = Array.isArray(t) ? t.map(function(v, i) { return { encoded: v, label: key.toUpperCase() + ' #' + (i+1) }; }) 
                                           : Object.keys(t).map(function(k) { return { encoded: t[k], label: key.toUpperCase() + ' ' + k }; });

                items.forEach(function(item) {
                    var decoded = decodeLinkFixed(item.encoded);
                    if (!decoded) return;

                    var promise = extractVideoUrl(decoded, key, filmUrl).then(function(results) {
                        return results.map(function(r) {
                            // Linkin HLS olup olmadığını belirle
                            var isHls = r.url.includes('.m3u8') || ["proton", "fast", "atom"].indexOf(key) > -1;
                            
                            // Oynatma hatasını çözen nesne yapısı
                            return {
                                name: '⌜ FHD ⌟ | ' + item.label,
                                title: title,
                                url: r.url,
                                quality: '1080p',
                                // Headers'ı URL'ye gömmek yerine doğrudan nesneye veriyoruz
                                headers: STREAM_HEADERS, 
                                is_direct: true,
                                streamType: isHls ? 'hls' : 'video',
                                mimeType: isHls ? 'application/x-mpegURL' : 'video/mp4'
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

function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return Promise.resolve([]);
    var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
    
    return fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
        var query = data.title || data.original_title;
        return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var match = html.match(/<li class="film">[\s\S]*?<a href="([^"]+)"/);
                if (!match) return [];
                var filmUrl = match[1].startsWith('http') ? match[1] : BASE_URL + match[1];
                return fetchDetailAndStreams(filmUrl);
            });
    }).catch(function() { return []; });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
