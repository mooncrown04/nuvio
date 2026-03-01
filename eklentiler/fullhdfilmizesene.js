// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
};

// ==================== KRİTİK DECODE VE TEMİZLİK ====================

function rot13(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

function hexToUrl(hex) {
    try {
        var raw = hex.replace(/\\\\x/g, '').replace(/\\x/g, '');
        var str = '';
        for (var i = 0; i < raw.length; i += 2) {
            str += String.fromCharCode(parseInt(raw.substr(i, 2), 16));
        }
        return str.replace(/\\/g, '').replace(/"/g, "").replace(/'/g, "").trim();
    } catch (e) { return null; }
}

// ==================== ANA MOTOR ====================

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            return fetch(BASE_URL + '/arama/' + encodeURIComponent(data.title));
        }).then(function(res) { return res.text(); }).then(function(searchHtml) {
            var filmMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
            if (!filmMatch) return resolve([]);
            
            var filmUrl = filmMatch[1].indexOf('http') === -1 ? BASE_URL + filmMatch[1] : filmMatch[1];
            return fetch(filmUrl).then(function(res) { 
                return res.text().then(function(html) { return { html: html, url: filmUrl }; });
            });
        }).then(function(obj) {
            var scxMatch = obj.html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return resolve([]);
            
            var scx = JSON.parse(scxMatch[1]);
            var keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];
            var results = [];
            var pending = 0;

            keys.forEach(function(key) {
                if (!scx[key] || !scx[key].sx || !scx[key].sx.t) return;
                var t = scx[key].sx.t;
                var rawLinks = Array.isArray(t) ? t : Object.values(t);

                rawLinks.forEach(function(enc, index) {
                    var decoded = atob(rot13(enc));
                    if (!decoded) return;

                    // 1. Durum: Atom/Rapid/Vidmoxy gibi ayıklanması gereken kaynaklar
                    if (decoded.indexOf('http') !== -1 && (decoded.indexOf('rapidvid') !== -1 || decoded.indexOf('vidmoxy') !== -1 || decoded.indexOf('atom') !== -1)) {
                        pending++;
                        fetch(decoded, { headers: { 'Referer': obj.url } })
                            .then(function(r) { return r.text(); })
                            .then(function(fHtml) {
                                var fileMatch = fHtml.match(/file["']:\s*["']([^"']+)["']/);
                                if (fileMatch) {
                                    var finalUrl = hexToUrl(fileMatch[1]);
                                    if (finalUrl) {
                                        results.push({
                                            name: '⌜ FHD ⌟ ' + key.toUpperCase() + ' #' + (index + 1),
                                            url: finalUrl,
                                            type: finalUrl.indexOf('.m3u8') !== -1 ? 'M3U8' : 'VIDEO',
                                            headers: Object.assign({}, STREAM_HEADERS, { 'Referer': decoded })
                                        });
                                    }
                                }
                                pending--;
                                if (pending === 0) resolve(results);
                            }).catch(function() { 
                                pending--; 
                                if (pending === 0) resolve(results); 
                            });
                    } 
                    // 2. Durum: Doğrudan m3u8 olan kaynaklar (Proton, Fast vb.)
                    else if (decoded.indexOf('http') !== -1) {
                        results.push({
                            name: '⌜ FHD ⌟ ' + key.toUpperCase() + ' #' + (index + 1),
                            url: decoded,
                            type: decoded.indexOf('.m3u8') !== -1 ? 'M3U8' : 'VIDEO',
                            headers: Object.assign({}, STREAM_HEADERS, { 'Referer': obj.url })
                        });
                    }
                });
            });

            // Eğer hiç bekleyen (pending) işlem yoksa (sadece doğrudan linkler varsa) hemen dön
            if (pending === 0) resolve(results);

        }).catch(function() { resolve([]); });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
