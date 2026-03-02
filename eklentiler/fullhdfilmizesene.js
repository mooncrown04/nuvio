// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene - SADECE STREAM YAPISI DÜZELTİLMİŞ

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// ==================== SABİT HEADERS (DEĞİŞMEZ) ====================
var API_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// ==================== STREAM HEADERS (SABİT - KRİTİK) ====================
// Bu headers her stream için AYNI olmalı, dinamik değil!
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'identity',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};

// ==================== YARDIMCI FONKSİYONLAR (Aynı) ====================

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
        return (result && result.startsWith('http')) ? result : null;
    } catch (e) {
        return null;
    }
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
    } catch (e) {
        return null;
    }
}

// ==================== EXTRACTOR'LAR (SADELEŞTİRİLMİŞ) ====================

function rapid2m3u8(url, referer) {
    return fetch(url, { headers: Object.assign({}, API_HEADERS, { 'Referer': referer }) })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            var hexMatch = text.match(/file":\s*"(\\x[0-9a-fA-F\\]+)"/) || 
                           text.match(/file":"(\\x[0-9a-fA-F\\]+)"/);
            
            if (hexMatch) {
                var decoded = hexDecodeFixed(hexMatch[1]);
                if (decoded && decoded.includes('.m3u8')) {
                    // KRİTİK: Direkt obje dön, fonksiyon kullanma!
                    return [{
                        url: decoded,
                        quality: '720p',
                        type: 'M3U8'
                    }];
                }
            }
            return [];
        })
        .catch(function() { return []; });
}

function trstx2m3u8(url, referer) {
    var baseUrl = 'https://trstx.org';
    
    return fetch(url, { headers: Object.assign({}, API_HEADERS, { 'Referer': referer }) })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            var match = text.match(/file":"([^"]+)/);
            if (!match) return [];
            
            return fetch(baseUrl + '/' + match[1].replace(/\\/g, ''), {
                method: 'POST',
                headers: {
                    'User-Agent': API_HEADERS['User-Agent'],
                    'Referer': referer,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: ''
            });
        })
        .then(function(res) { return res ? res.json() : []; })
        .then(function(postData) {
            if (!Array.isArray(postData)) return [];
            
            var promises = postData.slice(1).map(function(item) {
                if (!item.file) return null;
                
                var playlistUrl = baseUrl + '/playlist/' + item.file.substring(1) + '.txt';
                
                return fetch(playlistUrl, {
                    method: 'POST',
                    headers: {
                        'User-Agent': API_HEADERS['User-Agent'],
                        'Referer': referer
                    },
                    body: ''
                })
                .then(function(r) { return r.text(); })
                .then(function(videoUrl) {
                    videoUrl = videoUrl.trim();
                    if (!videoUrl.startsWith('http')) return null;
                    
                    // KRİTİK: Sadece url, quality, type dön!
                    return {
                        url: videoUrl,
                        quality: item.title || '720p',
                        type: 'M3U8'
                    };
                })
                .catch(function() { return null; });
            });
            
            return Promise.all(promises).then(function(results) {
                return results.filter(function(r) { return r !== null; });
            });
        })
        .catch(function() { return []; });
}

function sobreatsesuyp2m3u8(url, referer) {
    var baseUrl = 'https://sobreatsesuyp.com';
    
    return fetch(url, { headers: Object.assign({}, API_HEADERS, { 'Referer': referer }) })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            var match = text.match(/file":"([^"]+)/);
            if (!match) return [];
            
            return fetch(baseUrl + '/' + match[1].replace(/\\/g, ''), {
                method: 'POST',
                headers: {
                    'User-Agent': API_HEADERS['User-Agent'],
                    'Referer': referer,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: ''
            });
        })
        .then(function(res) { return res ? res.json() : []; })
        .then(function(postData) {
            if (!Array.isArray(postData)) return [];
            
            var promises = postData.slice(1).map(function(item) {
                if (!item.file) return null;
                
                var playlistUrl = baseUrl + '/playlist/' + item.file.substring(1) + '.txt';
                
                return fetch(playlistUrl, {
                    method: 'POST',
                    headers: {
                        'User-Agent': API_HEADERS['User-Agent'],
                        'Referer': referer
                    },
                    body: ''
                })
                .then(function(r) { return r.text(); })
                .then(function(videoUrl) {
                    videoUrl = videoUrl.trim();
                    if (!videoUrl.startsWith('http')) return null;
                    
                    return {
                        url: videoUrl,
                        quality: item.title || '720p',
                        type: 'M3U8'
                    };
                })
                .catch(function() { return null; });
            });
            
            return Promise.all(promises).then(function(results) {
                return results.filter(function(r) { return r !== null; });
            });
        })
        .catch(function() { return []; });
}

function turboimgz2m3u8(url, referer) {
    return fetch(url, { headers: Object.assign({}, API_HEADERS, { 'Referer': referer }) })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            var match = text.match(/file:\s*"(.*?)"/);
            if (!match) return [];
            
            return [{
                url: match[1],
                quality: '720p',
                type: 'M3U8'
            }];
        })
        .catch(function() { return []; });
}

function extractVideoUrl(url, sourceKey, referer) {
    if (url.includes('rapidvid.net') || url.includes('vidmoxy.com')) {
        return rapid2m3u8(url, referer);
    }
    if (url.includes('trstx.org')) {
        return trstx2m3u8(url, referer);
    }
    if (url.includes('sobreatsesuyp.com')) {
        return sobreatsesuyp2m3u8(url, referer);
    }
    if (url.includes('turbo.imgz.me')) {
        return turboimgz2m3u8(url, referer);
    }
    
    // Direkt linkler
    var isDirect = ['proton', 'fast', 'tr', 'en'].some(function(k) { 
        return sourceKey.toLowerCase().includes(k); 
    });
    
    if (isDirect || url.match(/\.(m3u8|mp4)/i)) {
        var isM3u8 = url.includes('.m3u8');
        return Promise.resolve([{
            url: url,
            quality: '720p',
            type: isM3u8 ? 'M3U8' : 'VIDEO'
        }]);
    }
    
    return Promise.resolve([]);
}

// ==================== ANA MANTIK (KRİTİK DÜZELTME) ====================

function fetchDetailAndStreams(filmUrl) {
    return fetch(filmUrl, { headers: API_HEADERS })
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

                    var promise = extractVideoUrl(decoded, key, filmUrl).then(function(results) {
                        // KRİTİK: Her stream için STREAM_HEADERS'ı doğrudan ata!
                        // Fonksiyon çağrısı kullanma, sabit obje kullan!
                        return results.map(function(r) {
                            return {
                                name: '⌜ FullHD ⌟ | ' + item.label,
                                title: title + (year ? ' (' + year + ')' : '') + ' · ' + r.quality,
                                url: r.url,
                                quality: r.quality,
                                // SABİT HEADERS - Dinamik değil!
                                headers: STREAM_HEADERS,
                                type: r.type,
                                provider: 'fullhdfilmizlesene'
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
            results.forEach(function(r) { 
                if (Array.isArray(r)) streams = streams.concat(r); 
            });
            return streams.filter(function(s) { 
                return s && s.url && s.url.startsWith('http'); 
            });
        });
}

function searchFullHD(title) {
    return fetch(BASE_URL + '/arama/' + encodeURIComponent(title), { headers: API_HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            var regex = /<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][\s\S]*?<span[^>]+class=["']film-title["'][^>]*>([^<]+)<\/span>/gi;
            var m;
            
            while ((m = regex.exec(html)) !== null) {
                results.push({ 
                    url: m[1].startsWith('http') ? m[1] : BASE_URL + m[1], 
                    title: m[2].trim() 
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
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[FullHD] Error:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
