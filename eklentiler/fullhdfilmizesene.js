// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene - DÜZELTİLMİŞ VERSİYON (3003/1004 Hata Çözümü)

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/',
    'Connection': 'keep-alive'
};

// ==================== STREAM HEADERS (KRİTİK DÜZELTME) ====================
// Player'ın kullanacağı headers - M3U8 için özel

function getStreamHeaders(refererUrl) {
    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
        'Origin': BASE_URL,
        'Referer': refererUrl || BASE_URL + '/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'Connection': 'keep-alive'
    };
}

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

// ==================== EXTRACTOR'LAR (DÜZELTİLMİŞ) ====================

function rapid2m3u8(url, referer) {
    return fetch(url, { 
        headers: Object.assign({}, HEADERS, { 'Referer': referer }) 
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        console.log('[FullHD] RapidVid response length:', text.length);
        
        // 1. Hex encoded kontrolü
        var hexMatch = text.match(/file":\s*"(\\x[0-9a-fA-F\\]+)"/) || 
                       text.match(/file":"(\\x[0-9a-fA-F\\]+)"/);
        
        if (hexMatch) {
            var decoded = hexDecodeFixed(hexMatch[1]);
            console.log('[FullHD] RapidVid decoded:', decoded ? 'success' : 'failed');
            
            if (decoded && (decoded.includes('.m3u8') || decoded.includes('http'))) {
                return [{ 
                    url: decoded, 
                    quality: '720p', 
                    type: 'M3U8',
                    headers: getStreamHeaders(referer)
                }];
            }
        }

        // 2. Eval/unpack kontrolü (vidmoxy için)
        var unpackMatch = text.match(/}\s*;\s*(eval\(function[\s\S]*?)var played/);
        if (unpackMatch) {
            console.log('[FullHD] Packed code found, attempting unpack...');
            // Unpack gerekirse buraya eklenecek
            // Şimdilik alternatif arama
            var altMatch = text.match(/sources:\s*\[\s*{\s*file:\s*"([^"]+)"/);
            if (altMatch) {
                return [{ 
                    url: altMatch[1], 
                    quality: '720p', 
                    type: 'M3U8',
                    headers: getStreamHeaders(referer)
                }];
            }
        }

        return [];
    })
    .catch(function(err) { 
        console.error('[FullHD] RapidVid error:', err.message);
        return []; 
    });
}

function trstx2m3u8(url, referer) {
    var baseUrl = 'https://trstx.org';
    
    return fetch(url, { 
        headers: Object.assign({}, HEADERS, { 'Referer': referer }) 
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var match = text.match(/file":"([^"]+)/);
        if (!match) {
            console.log('[FullHD] TRsTX: file not found in response');
            return [];
        }
        
        var postUrl = baseUrl + '/' + match[1].replace(/\\/g, '');
        console.log('[FullHD] TRsTX post URL:', postUrl);
        
        return fetch(postUrl, {
            method: 'POST',
            headers: {
                'User-Agent': HEADERS['User-Agent'],
                'Referer': referer,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: ''
        });
    })
    .then(function(res) { 
        if (!res) return [];
        return res.json(); 
    })
    .then(function(postData) {
        if (!Array.isArray(postData) || postData.length < 2) {
            console.log('[FullHD] TRsTX: Invalid post data');
            return [];
        }

        var promises = postData.slice(1).map(function(item) {
            if (!item.file) return null;
            
            var playlistUrl = baseUrl + '/playlist/' + item.file.substring(1) + '.txt';
            console.log('[FullHD] TRsTX playlist:', playlistUrl);
            
            return fetch(playlistUrl, {
                method: 'POST',
                headers: {
                    'User-Agent': HEADERS['User-Agent'],
                    'Referer': referer,
                    'Accept': 'text/plain,*/*'
                },
                body: ''
            })
            .then(function(r) { return r.text(); })
            .then(function(videoUrl) {
                videoUrl = videoUrl.trim();
                console.log('[FullHD] TRsTX video URL:', videoUrl.substring(0, 50) + '...');
                
                if (!videoUrl.startsWith('http')) return null;
                
                return { 
                    url: videoUrl, 
                    quality: item.title || '720p',
                    type: 'M3U8',
                    headers: getStreamHeaders(referer)
                };
            })
            .catch(function() { return null; });
        });
        
        return Promise.all(promises).then(function(results) {
            return results.filter(function(r) { return r !== null; });
        });
    })
    .catch(function(err) { 
        console.error('[FullHD] TRsTX error:', err.message);
        return []; 
    });
}

function sobreatsesuyp2m3u8(url, referer) {
    var baseUrl = 'https://sobreatsesuyp.com';
    
    return fetch(url, { 
        headers: Object.assign({}, HEADERS, { 'Referer': referer }) 
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var match = text.match(/file":"([^"]+)/);
        if (!match) return [];
        
        var postUrl = baseUrl + '/' + match[1].replace(/\\/g, '');
        
        return fetch(postUrl, {
            method: 'POST',
            headers: {
                'User-Agent': HEADERS['User-Agent'],
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
                    'User-Agent': HEADERS['User-Agent'],
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
                    type: 'M3U8',
                    headers: getStreamHeaders(referer)
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
    return fetch(url, { 
        headers: Object.assign({}, HEADERS, { 'Referer': referer }) 
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var match = text.match(/file:\s*"(.*?)"/);
        if (!match) return null;
        
        return { 
            url: match[1], 
            quality: '720p',
            type: 'M3U8',
            headers: getStreamHeaders(referer)
        };
    })
    .catch(function() { return null; });
}

function extractVideoUrl(url, sourceKey, referer) {
    console.log('[FullHD] Extracting:', sourceKey, url.substring(0, 50));
    
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
        return Promise.resolve([turboimgz2m3u8(url, referer)].filter(Boolean));
    }
    
    // Direkt Linkler
    var isDirect = ['proton', 'fast', 'tr', 'en'].some(function(k) { 
        return sourceKey.toLowerCase().includes(k); 
    });
    
    if (isDirect || url.match(/\.(m3u8|mp4|mkv)/i)) {
        var isM3u8 = url.includes('.m3u8');
        return Promise.resolve([{ 
            url: url, 
            quality: '720p', 
            type: isM3u8 ? 'M3U8' : 'VIDEO',
            headers: getStreamHeaders(referer)
        }]);
    }
    
    return Promise.resolve([]);
}

// ==================== ANA MANTIK ====================

function fetchDetailAndStreams(filmUrl) {
    console.log('[FullHD] Fetching detail:', filmUrl);
    
    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            var title = titleMatch ? titleMatch[1].trim() : 'FullHD Film';
            var yearMatch = html.match(/(\d{4})/);
            var year = yearMatch ? yearMatch[1] : null;

            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) {
                console.log('[FullHD] scx data not found');
                return [];
            }

            var scxData;
            try {
                scxData = JSON.parse(scxMatch[1]);
            } catch (e) {
                console.error('[FullHD] JSON parse error:', e.message);
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
                        return results.filter(Boolean).map(function(r) {
                            // KRİTİK: Her stream için headers kopyala
                            var streamHeaders = Object.assign({}, r.headers || getStreamHeaders(filmUrl));
                            
                            return {
                                name: '⌜ FullHD ⌟ | ' + item.label,
                                title: title + (year ? ' (' + year + ')' : '') + ' · ' + r.quality,
                                url: r.url,
                                quality: r.quality,
                                headers: streamHeaders,
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
            console.log('[FullHD] Total streams found:', streams.length);
            return streams.filter(function(s) { 
                return s && s.url && s.url.startsWith('http'); 
            });
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
            
            console.log('[FullHD] Search results:', results.length);
            return results;
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

        console.log('[FullHD] Starting for tmdbId:', tmdbId);

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
                
                // İlk sonucu kullan (daha iyi eşleştirme eklenebilir)
                var best = results[0];
                console.log('[FullHD] Using:', best.title);
                
                return fetchDetailAndStreams(best.url);
            })
            .then(function(streams) {
                console.log('[FullHD] Returning', streams.length, 'streams');
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[FullHD] Error:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
