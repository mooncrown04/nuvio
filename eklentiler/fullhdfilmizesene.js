// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene - KRİTİK HATA DÜZELTMELİ VERSİYON (Atom & Proton Fix)

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// ==================== KRİTİK ŞİFRE ÇÖZÜCÜLER ====================

function rot13(str) {
    if (!str) return '';
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

function decodeLink(encoded) {
    if (!encoded) return null;
    try {
        // [1004] Malformed URL hatasını önlemek için güvenli decode
        var rotated = rot13(encoded);
        var decoded = '';
        if (typeof Buffer !== 'undefined') {
            decoded = Buffer.from(rotated, 'base64').toString('utf-8');
        } else {
            decoded = atob(rotated);
        }
        return decoded.includes('http') ? decoded : null;
    } catch (e) {
        return null;
    }
}

function hexDecode(hex) {
    if (!hex) return null;
    try {
        var str = '';
        var cleanHex = hex.replace(/\\x/g, ''); // \x formatını temizle
        for (var i = 0; i < cleanHex.length; i += 2) {
            str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
        }
        return str;
    } catch (e) {
        return null;
    }
}

// ==================== EXTRACTOR FONKSİYONLARI ====================

function rapid2m3u8(url, referer) {
    return fetch(url, { headers: Object.assign({}, HEADERS, { 'Referer': referer }) })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            var match = text.match(/file":\s*"(.*?)"/) || text.match(/file":"(.*?)"/);
            if (!match) return [];
            var decoded = hexDecode(match[1]);
            return decoded ? [{ url: decoded, type: 'hls' }] : [];
        }).catch(function() { return []; });
}

function trstx2m3u8(url, referer) {
    var domain = url.split('/').slice(0, 3).join('/');
    return fetch(url, { headers: Object.assign({}, HEADERS, { 'Referer': referer }) })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            var file = (text.match(/file":"([^"]+)"/) || [])[1];
            if (!file) return [];
            return fetch(domain + '/' + file.replace(/\\/g, ''), {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Referer': referer, 'Content-Type': 'application/x-www-form-urlencoded' })
            });
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var tasks = data.slice(1).map(function(item) {
                return fetch(domain + '/playlist/' + item.file.substring(1) + '.txt', {
                    method: 'POST',
                    headers: Object.assign({}, HEADERS, { 'Referer': referer })
                }).then(function(r) { return r.text(); })
                  .then(function(u) { return { url: u.trim(), quality: item.title, type: 'hls' }; });
            });
            return Promise.all(tasks);
        }).catch(function() { return []; });
}

// ==================== ANA MOTOR ====================

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
        
        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(movie) {
            var query = movie.title || movie.original_title;
            return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: HEADERS });
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var match = html.match(/<li[^>]*class="film"[^>]*>[\s\S]*?<a href="([^"]+)"/i);
            if (!match) return resolve([]);
            return fetch(match[1], { headers: HEADERS });
        })
        .then(function(res) { 
            var finalUrl = res.url;
            return res.text().then(function(html) { return { html: html, url: finalUrl }; });
        })
        .then(function(data) {
            var scxMatch = data.html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return resolve([]);

            var scx = JSON.parse(scxMatch[1]);
            var promises = [];
            var keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];

            keys.forEach(function(key) {
                if (!scx[key] || !scx[key].sx || !scx[key].sx.t) return;
                var t = scx[key].sx.t;
                var links = Array.isArray(t) ? t : Object.values(t);

                links.forEach(function(enc, i) {
                    var decoded = decodeLink(enc);
                    if (!decoded) return;

                    var p = (function(sourceUrl, k) {
                        // Extractor seçimi
                        var extractor;
                        if (sourceUrl.includes('rapidvid') || sourceUrl.includes('vidmoxy')) extractor = rapid2m3u8(sourceUrl, data.url);
                        else if (sourceUrl.includes('trstx') || sourceUrl.includes('sobreatsesuyp')) extractor = trstx2m3u8(sourceUrl, data.url);
                        else extractor = Promise.resolve([{ url: sourceUrl, type: sourceUrl.includes('.m3u8') ? 'hls' : 'mp4' }]);

                        return extractor.then(function(results) {
                            return results.map(function(r) {
                                return {
                                    name: '⌜ FullHD ⌟ ' + k.toUpperCase() + (results.length > 1 ? ' #' + (i+1) : ''),
                                    url: r.url,
                                    // [3003] Sniff hatasını engellemek için MIME tiplerini netleştiriyoruz
                                    type: r.type === 'hls' ? 'application/x-mpegURL' : 'video/mp4',
                                    headers: {
                                        'User-Agent': HEADERS['User-Agent'],
                                        'Referer': data.url,
                                        'Origin': 'https://www.fullhdfilmizlesene.live'
                                    }
                                };
                            });
                        });
                    })(decoded, key);
                    promises.push(p);
                });
            });

            Promise.all(promises).then(function(res) {
                resolve([].concat.apply([], res));
            });
        })
        .catch(function() { resolve([]); });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
