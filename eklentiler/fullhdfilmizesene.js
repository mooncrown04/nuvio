// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene - Nuvio ExoPlayer Uyumlu (Tüm Kaynaklar)

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

// ==================== GELİŞMİŞ EXTRACTOR'LAR ====================

function rapid2m3u8(url, referer) {
    return fetch(url, { 
        headers: Object.assign({}, HEADERS, { 'Referer': referer }),
        redirect: 'follow'
    })
    .then(function(res) { 
        var finalUrl = res.url;
        return res.text().then(function(text) { return { text: text, finalUrl: finalUrl }; });
    })
    .then(function(data) {
        var text = data.text;
        var pageUrl = data.finalUrl;
        
        // Hex decode
        var hexMatch = text.match(/file":\s*"(\\x[0-9a-fA-F\\]+)"/) || 
                       text.match(/file":"(\\x[0-9a-fA-F\\]+)"/);
        
        if (hexMatch) {
            var decoded = hexDecodeFixed(hexMatch[1]);
            if (decoded && decoded.includes('.m3u8')) {
                return [{ url: decoded, quality: '720p', type: 'M3U8', sourceReferer: pageUrl }];
            }
        }
        
        // Direkt m3u8
        var directMatch = text.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
        if (directMatch) {
            return [{ url: directMatch[1], quality: '720p', type: 'M3U8', sourceReferer: pageUrl }];
        }
        
        return [];
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
                  .then(function(url) { 
                    return { 
                        url: url.trim(), 
                        quality: item.title || '720p',
                        type: 'M3U8'
                    }; 
                }).catch(function() { return null; });
            });
            return Promise.all(promises).then(function(results) {
                return results.filter(function(r) { return r !== null; });
            });
        }).catch(function() { return []; });
}

function extractVideoUrl(url, sourceKey, referer) {
    if (url.includes('rapidvid.net') || url.includes('vidmoxy.com')) {
        return rapid2m3u8(url, referer);
    }
    if (url.includes('trstx.org')) {
        return trstx2m3u8(url, referer);
    }
    
    // Direkt linkler
    var isDirect = ['proton', 'fast', 'fastly', 'tr', 'en'].some(function(k) { 
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

// ==================== ANA MANTIK (NUVIO UYUMLU) ====================

function fetchDetailAndStreams(filmUrl) {
    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var title = (html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [null, 'FullHD'])[1].trim();
            var year = (html.match(/(\d{4})/) || [null, null])[1];
            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) {
                console.log('[FullHD] scx not found');
                return [];
            }

            var scxData = JSON.parse(scxMatch[1]);
            var allPromises = [];
            
            // Tüm kaynaklar - öncelik direkt olanlarda
            var keys = ['proton', 'fast', 'fastly', 'tr', 'en', 'atom', 'advid', 'advidprox'];

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
                        return results.map(function(r) {
                            var isM3u8 = r.url.includes('.m3u8');
                            
                            // ==================== NUVIO STREAM FORMATI ====================
                            // ExoPlayer için en uyumlu yapı
                            
                            // Kaynağa göre referer belirle
                            var streamReferer = r.sourceReferer || filmUrl;
                            
                            return {
                                name: '⌜ FullHD ⌟ | ' + item.label,
                                title: title + (year ? ' (' + year + ')' : '') + ' · ' + r.quality,
                                url: r.url,
                                quality: r.quality,
                                
                                // ExoPlayer/Nuvio için kritik
                                type: isM3u8 ? 'hls' : 'video',
                                
                                // Headers - sade gerekli alanlar
                                headers: {
                                    'User-Agent': HEADERS['User-Agent'],
                                    'Referer': streamReferer,
                                    'Origin': BASE_URL
                                },
                                
                                // Ekstra Nuvio alanları
                                drmScheme: null,
                                drmLicenseUrl: null,
                                
                                provider: 'fullhdfilmizlesene',
                                
                                // Debug için
                                sourceType: key
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
            
            console.log('[FullHD] Total streams:', streams.length);
            
            // Sadece geçerli URL'leri filtrele
            return streams.filter(function(s) { 
                return s && s.url && s.url.startsWith('http'); 
            });
        })
        .catch(function(err) {
            console.error('[FullHD] fetchDetailAndStreams error:', err.message);
            return [];
        });
}

function searchFullHD(title) {
    console.log('[FullHD] Searching:', title);
    
    return fetch(BASE_URL + '/arama/' + encodeURIComponent(title), { headers: HEADERS })
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
            
            console.log('[FullHD] Found', results.length, 'results');
            return results;
        })
        .catch(function(err) {
            console.error('[FullHD] search error:', err.message);
            return [];
        });
}

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'movie') {
            console.log('[FullHD] Only movies supported');
            resolve([]);
            return;
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + 
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[FullHD] Getting streams for tmdbId:', tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.original_title || '';
                console.log('[FullHD] TMDB title:', title);
                
                if (!title) {
                    resolve([]);
                    return null;
                }
                return searchFullHD(title);
            })
            .then(function(results) {
                if (!results || results.length === 0) {
                    console.log('[FullHD] No search results');
                    return [];
                }
                
                console.log('[FullHD] Using first result:', results[0].title);
                return fetchDetailAndStreams(results[0].url);
            })
            .then(function(streams) {
                console.log('[FullHD] Returning', streams.length, 'streams');
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[FullHD] getStreams error:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
