// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene - DÜZELTİLMİŞ VERSİYON

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// STREAM_HEADERS'a type belirtmek için kullanılacak
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Accept-Encoding': 'identity',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};

// ==================== YARDIMCI FONKSİYONLAR (Sizinkiler Aynı) ====================

function atobFixed(str) {
    try {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(str, 'base64').toString('utf-8');
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
        var result = atobFixed(rot13Fixed(encoded));
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
        return String.fromCharCode.apply(null, bytes);
    } catch (e) {
        return null;
    }
}

// ==================== EXTRACTOR'LAR (Düzeltilmiş) ====================

function rapid2m3u8(url, referer) {
    return fetch(url, { headers: Object.assign({}, HEADERS, { 'Referer': referer }) })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            var links = [];
            
            // Hex decode
            var hexMatch = text.match(/file":\s*"(\\x[0-9a-fA-F\\]+)"/) || 
                           text.match(/file":"(\\x[0-9a-fA-F\\]+)"/);
            
            if (hexMatch) {
                var decoded = hexDecodeFixed(hexMatch[1].replace(/\\\\x/g, '\\x'));
                if (decoded && decoded.includes('.m3u8')) {
                    links.push({ 
                        url: decoded, 
                        quality: '720p', 
                        type: 'M3U8'  // EKSİK OLAN BU!
                    });
                }
            }
            
            return links;
        })
        .catch(function() { return []; });
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
                headers: Object.assign({}, HEADERS, { 
                    'Referer': referer,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }),
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
                })
                .then(function(r) { return r.text(); })
                .then(function(videoUrl) {
                    return { 
                        url: videoUrl.trim(), 
                        quality: item.title || '720p',
                        type: 'M3U8'  // EKSİK OLAN BU!
                    };
                });
            });
            return Promise.all(promises);
        })
        .catch(function() { return []; });
}

function sobreatsesuyp2m3u8(url, referer) {
    var baseUrl = 'https://sobreatsesuyp.com';
    
    return fetch(url, { headers: Object.assign({}, HEADERS, { 'Referer': referer }) })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            var match = text.match(/file":"([^"]+)/);
            if (!match) return [];
            
            return fetch(baseUrl + '/' + match[1].replace(/\\/g, ''), {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 
                    'Referer': referer,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }),
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
                })
                .then(function(r) { return r.text(); })
                .then(function(videoUrl) {
                    return { 
                        url: videoUrl.trim(), 
                        quality: item.title || '720p',
                        type: 'M3U8'  // EKSİK OLAN BU!
                    };
                });
            });
            return Promise.all(promises);
        })
        .catch(function() { return []; });
}

function turboimgz2m3u8(url, referer) {
    return fetch(url, { headers: Object.assign({}, HEADERS, { 'Referer': referer }) })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            var match = text.match(/file:\s*"(.*?)"/);
            return match ? { 
                url: match[1], 
                quality: '720p',
                type: 'M3U8'  // EKSİK OLAN BU!
            } : null;
        })
        .catch(function() { return null; });
}

// ==================== ANA MANTIK (Sizinkine Çok Benzer) ====================

function fetchDetailAndStreams(filmUrl) {
    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            var title = titleMatch ? titleMatch[1].trim() : 'FullHD Film';
            var yearMatch = html.match(/(\d{4})/);
            var year = yearMatch ? yearMatch[1] : null;

            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return [];

            var scxData;
            try {
                scxData = JSON.parse(scxMatch[1]);
            } catch (e) {
                return [];
            }

            var keys = ['atom', 'advid', 'advidprox', 'proton', 'fast', 'fastly', 'tr', 'en'];
            var allPromises = [];

            keys.forEach(function(key) {
                var sourceData = scxData[key];
                if (!sourceData || !sourceData.sx || !sourceData.sx.t) return;
                
                var t = sourceData.sx.t;
                var items = [];

                if (Array.isArray(t)) {
                    items = t.map(function(v, i) { 
                        return { encoded: v, label: key.toUpperCase() + ' #' + (i+1) }; 
                    });
                } else if (typeof t === 'object') {
                    items = Object.keys(t).map(function(k) { 
                        return { encoded: t[k], label: key.toUpperCase() + ' ' + k }; 
                    });
                }

                items.forEach(function(item) {
                    var decoded = decodeLinkFixed(item.encoded);
                    if (!decoded) return;

                    var promise;
                    
                    if (decoded.includes('rapidvid.net') || decoded.includes('vidmoxy.com')) {
                        promise = rapid2m3u8(decoded, filmUrl);
                    } else if (decoded.includes('trstx.org')) {
                        promise = trstx2m3u8(decoded, filmUrl);
                    } else if (decoded.includes('sobreatsesuyp.com')) {
                        promise = sobreatsesuyp2m3u8(decoded, filmUrl);
                    } else if (decoded.includes('turbo.imgz.me')) {
                        promise = Promise.resolve([turboimgz2m3u8(decoded, filmUrl)]);
                    } else {
                        // Direkt linkler
                        var isM3u8 = decoded.includes('.m3u8');
                        promise = Promise.resolve([{ 
                            url: decoded, 
                            quality: '720p',
                            type: isM3u8 ? 'M3U8' : 'VIDEO'  // EKSİK OLAN BU!
                        }]);
                    }

                    allPromises.push(promise.then(function(results) {
                        if (!Array.isArray(results)) results = results ? [results] : [];
                        
                        return results.filter(function(r) { return r && r.url; }).map(function(r) {
                            return {
                                name: '⌜ FullHD ⌟ | ' + item.label,
                                title: title + (year ? ' (' + year + ')' : '') + ' · ' + r.quality,
                                url: r.url,
                                quality: r.quality,
                                headers: STREAM_HEADERS,
                                type: r.type,  // BURADA TYPE EKLENİYOR
                                provider: 'fullhdfilmizlesene'
                            };
                        });
                    }));
                });
            });

            return Promise.all(allPromises);
        })
        .then(function(results) {
            var streams = [];
            results.forEach(function(r) { 
                if (Array.isArray(r)) streams = streams.concat(r); 
            });
            return streams.filter(function(s) { return s && s.url; });
        });
}

function searchFullHD(title) {
    return fetch(BASE_URL + '/arama/' + encodeURIComponent(title), { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            var regex = /<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][\s\S]*?<span[^>]+class=["']film-title["'][^>]*>([^<]+)<\/span>/gi;
            var match;
            
            while ((match = regex.exec(html)) !== null) {
                results.push({ 
                    url: match[1].startsWith('http') ? match[1] : BASE_URL + match[1], 
                    title: match[2].trim() 
                });
            }
            return results;
        });
}

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'movie') {
            resolve([]);
            return;
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + 
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.original_title || '';
                if (!title) {
                    resolve([]);
                    return null;
                }
                return searchFullHD(title);
            })
            .then(function(results) {
                if (!results || results.length === 0) return [];
                return fetchDetailAndStreams(results[0].url);
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[FullHD] Error:', err);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
