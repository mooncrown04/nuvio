// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene - URL Getirme ve Extractor Düzeltilmiş Versiyon

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// ==================== YARDIMCI FONKSİYONLAR ====================

function rot13(str) {
    if (!str) return '';
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

function decodeLink(encoded) {
    if (!encoded) return null;
    try {
        var rotated = rot13(encoded);
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(rotated, 'base64').toString('utf-8');
        }
        return atob(rotated);
    } catch (e) {
        console.error('[FullHD] Decode Hatası:', e.message);
        return null;
    }
}

function hexDecode(hex) {
    if (!hex) return null;
    try {
        var cleanHex = hex.replace(/\\x/g, '').replace(/[^0-9a-fA-F]/g, '');
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
            var decoded = hexDecode(match[1]);
            return decoded ? [{ url: decoded, type: 'application/x-mpegURL', quality: '720p' }] : [];
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
            if (!data || data.length < 2) return [];
            var tasks = data.slice(1).map(function(item) {
                return fetch(domain + '/playlist/' + item.file.substring(1) + '.txt', {
                    method: 'POST',
                    headers: Object.assign({}, HEADERS, { 'Referer': referer })
                }).then(function(r) { return r.text(); })
                  .then(function(u) { return { url: u.trim(), quality: item.title, type: 'application/x-mpegURL' }; });
            });
            return Promise.all(tasks);
        }).catch(function() { return []; });
}

// ==================== ANA MOTOR ====================

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
        
        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(movie) {
            var query = movie.title || movie.original_title;
            console.log('[FullHD] Aranan Film:', query);
            return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: HEADERS });
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var match = html.match(/<li[^>]*class="film"[^>]*>[\s\S]*?<a href="([^"]+)"/i);
            if (!match) {
                console.log('[FullHD] Arama sonucu bulunamadı.');
                return resolve([]);
            }
            var filmUrl = match[1].startsWith('http') ? match[1] : BASE_URL + match[1];
            console.log('[FullHD] Film Sayfası:', filmUrl);
            return fetch(filmUrl, { headers: HEADERS }).then(function(res) {
                return res.text().then(function(h) { return { html: h, url: filmUrl }; });
            });
        })
        .then(function(data) {
            var scxMatch = data.html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) {
                console.log('[FullHD] SCX verisi bulunamadı.');
                return resolve([]);
            }

            var scx = JSON.parse(scxMatch[1]);
            var promises = [];
            var keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];

            keys.forEach(function(key) {
                if (!scx[key] || !scx[key].sx || !scx[key].sx.t) return;
                var t = scx[key].sx.t;
                var encodedLinks = Array.isArray(t) ? t : (typeof t === 'object' ? Object.values(t) : [t]);

                encodedLinks.forEach(function(enc, i) {
                    var decoded = decodeLink(enc);
                    if (!decoded) return;

                    var p = (function(sourceUrl, k) {
                        var extractor;
                        if (sourceUrl.includes('rapidvid') || sourceUrl.includes('vidmoxy')) {
                            extractor = rapid2m3u8(sourceUrl, data.url);
                        } else if (sourceUrl.includes('trstx') || sourceUrl.includes('sobreatsesuyp')) {
                            extractor = trstx2m3u8(sourceUrl, data.url);
                        } else {
                            extractor = Promise.resolve([{ 
                                url: sourceUrl, 
                                type: sourceUrl.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4',
                                quality: '720p'
                            }]);
                        }

                        return extractor.then(function(results) {
                            return results.map(function(r) {
                                return {
                                    name: '⌜ FullHD ⌟ ' + k.toUpperCase() + (results.length > 1 ? ' #' + (i+1) : ''),
                                    title: r.quality || 'HD',
                                    url: r.url,
                                    type: r.type,
                                    headers: {
                                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
                var finalStreams = [].concat.apply([], res);
                console.log('[FullHD] Toplam bulunan link sayısı:', finalStreams.length);
                resolve(finalStreams);
            });
        })
        .catch(function(err) {
            console.error('[FullHD] Genel Hata:', err.message);
            resolve([]);
        });
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
