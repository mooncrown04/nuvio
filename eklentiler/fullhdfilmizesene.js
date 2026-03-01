// FullHDFilmizlesene - JavaScript Extractor (Sinewix/DiziPal yapısında)
// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

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

// ==================== YARDIMCI FONKSİYONLAR ====================

function atob(str) {
    try {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(str, 'base64').toString('utf-8');
        }
        return window.atob(str);
    } catch (e) {
        return null;
    }
}

function rot13(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(char) {
        var code = char.charCodeAt(0);
        var base = code < 97 ? 65 : 97;
        return String.fromCharCode(((code - base + 13) % 26) + base);
    });
}

function decodeLink(encoded) {
    try {
        var result = atob(rot13(encoded));
        return (result && result.startsWith('http')) ? result : null;
    } catch (e) {
        return null;
    }
}

function hexDecode(hexString) {
    if (!hexString) return null;
    try {
        var cleaned = hexString.replace(/\\x/g, '');
        var bytes = [];
        for (var i = 0; i < cleaned.length; i += 2) {
            bytes.push(parseInt(cleaned.substr(i, 2), 16));
        }
        return String.fromCharCode.apply(null, bytes);
    } catch (e) {
        return null;
    }
}

// ==================== EXTRACTOR'LAR ====================

function extractRapidVid(url, referer) {
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var links = [];
        
        // Hex encoded video
        var hexMatch = text.match(/file":\s*"(\\x[0-9a-fA-F\\]+)"/) || 
                       text.match(/file":"(\\x[0-9a-fA-F\\]+)"/);
        
        if (hexMatch) {
            var decoded = hexDecode(hexMatch[1]);
            if (decoded && decoded.includes('.m3u8')) {
                links.push({
                    url: decoded,
                    quality: '720p',
                    type: 'M3U8'
                });
            }
        }
        
        // Eval/unpack kontrolü
        if (links.length === 0) {
            var unpackMatch = text.match(/\};\s*(eval\(function[\s\S]*?)var played = \d+;/);
            if (unpackMatch) {
                console.log('[FullHD] RapidVid packed code found');
                // Unpack gerekirse buraya eklenecek
            }
        }
        
        return links;
    })
    .catch(function(err) {
        console.error('[FullHD] RapidVid error:', err.message);
        return [];
    });
}

function extractTRsTX(url, referer) {
    var baseUrl = 'https://trstx.org';
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var fileMatch = text.match(/file":"([^"]+)/);
        if (!fileMatch) throw new Error('File not found');
        
        var postUrl = baseUrl + '/' + fileMatch[1].replace(/\\/g, '');
        return fetch(postUrl, {
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
            var playlistUrl = baseUrl + '/playlist/' + item.file.substring(1) + '.txt';
            return fetch(playlistUrl, {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Referer': referer }),
                body: ''
            })
            .then(function(r) { return r.text(); })
            .then(function(videoUrl) {
                return {
                    url: videoUrl.trim(),
                    quality: item.title || '720p',
                    type: 'M3U8'
                };
            });
        });
        return Promise.all(promises);
    })
    .catch(function(err) {
        console.error('[FullHD] TRsTX error:', err.message);
        return [];
    });
}

function extractSobreatsesuyp(url, referer) {
    var baseUrl = 'https://sobreatsesuyp.com';
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var fileMatch = text.match(/file":"([^"]+)/);
        if (!fileMatch) throw new Error('File not found');
        
        var postUrl = baseUrl + '/' + fileMatch[1].replace(/\\/g, '');
        return fetch(postUrl, {
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
            var playlistUrl = baseUrl + '/playlist/' + item.file.substring(1) + '.txt';
            return fetch(playlistUrl, {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Referer': referer }),
                body: ''
            })
            .then(function(r) { return r.text(); })
            .then(function(videoUrl) {
                return {
                    url: videoUrl.trim(),
                    quality: item.title || '720p',
                    type: 'VIDEO'
                };
            });
        });
        return Promise.all(promises);
    })
    .catch(function(err) {
        console.error('[FullHD] Sobreatsesuyp error:', err.message);
        return [];
    });
}

function extractTurboImgz(url, referer) {
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var match = text.match(/file:\s*"(.*?)"/);
        return match ? match[1] : null;
    })
    .catch(function(err) {
        console.error('[FullHD] TurboImgz error:', err.message);
        return null;
    });
}

function extractVidMoxy(url, referer) {
    // VidMoxy RapidVid ile aynı mantıkta çalışır
    return extractRapidVid(url, referer);
}

// ==================== ANA MANTIK ====================

function getVideoLinks(html) {
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
    var links = [];

    keys.forEach(function(key) {
        var sourceData = scxData[key];
        if (!sourceData || !sourceData.sx || !sourceData.sx.t) return;
        
        var t = sourceData.sx.t;
        
        if (Array.isArray(t)) {
            t.forEach(function(encoded, index) {
                var decoded = decodeLink(encoded);
                if (decoded) {
                    links.push({
                        source: key.toUpperCase() + ' #' + (index + 1),
                        url: decoded,
                        type: key
                    });
                }
            });
        } else if (typeof t === 'object') {
            Object.keys(t).forEach(function(k) {
                var decoded = decodeLink(t[k]);
                if (decoded) {
                    links.push({
                        source: key.toUpperCase() + ' ' + k,
                        url: decoded,
                        type: key
                    });
                }
            });
        }
    });

    return links;
}

function fetchDetailAndStreams(filmUrl) {
    console.log('[FullHD] Fetching:', filmUrl);
    
    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // Title ve year çıkar
            var titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            var title = titleMatch ? titleMatch[1].trim() : 'FullHD Film';
            
            var yearMatch = html.match(/(\d{4})/);
            var year = yearMatch ? yearMatch[1] : null;

            var videoLinks = getVideoLinks(html);
            console.log('[FullHD] Found', videoLinks.length, 'encoded links');

            if (videoLinks.length === 0) return [];

            // Her link için extractor çalıştır
            var promises = videoLinks.map(function(linkInfo) {
                var url = linkInfo.url;
                var sourceName = linkInfo.source;
                
                if (url.includes('rapidvid.net')) {
                    return extractRapidVid(url, filmUrl).then(function(results) {
                        return results.map(function(r) {
                            return {
                                name: '⌜ FullHD ⌟ | ' + sourceName,
                                title: title + (year ? ' (' + year + ')' : '') + ' · ' + r.quality,
                                url: r.url,
                                quality: r.quality,
                                headers: STREAM_HEADERS,
                                type: r.type,
                                provider: 'fullhdfilmizlesene'
                            };
                        });
                    });
                }
                
                if (url.includes('trstx.org')) {
                    return extractTRsTX(url, filmUrl).then(function(results) {
                        return results.map(function(r) {
                            return {
                                name: '⌜ FullHD ⌟ | ' + sourceName + ' | ' + r.quality,
                                title: title + (year ? ' (' + year + ')' : '') + ' · ' + r.quality,
                                url: r.url,
                                quality: r.quality,
                                headers: STREAM_HEADERS,
                                type: r.type,
                                provider: 'fullhdfilmizlesene'
                            };
                        });
                    });
                }
                
                if (url.includes('sobreatsesuyp.com')) {
                    return extractSobreatsesuyp(url, filmUrl).then(function(results) {
                        return results.map(function(r) {
                            return {
                                name: '⌜ FullHD ⌟ | ' + sourceName + ' | ' + r.quality,
                                title: title + (year ? ' (' + year + ')' : '') + ' · ' + r.quality,
                                url: r.url,
                                quality: r.quality,
                                headers: STREAM_HEADERS,
                                type: r.type,
                                provider: 'fullhdfilmizlesene'
                            };
                        });
                    });
                }
                
                if (url.includes('turbo.imgz.me')) {
                    return extractTurboImgz(url, filmUrl).then(function(videoUrl) {
                        if (!videoUrl) return [];
                        return [{
                            name: '⌜ FullHD ⌟ | ' + sourceName,
                            title: title + (year ? ' (' + year + ')' : ''),
                            url: videoUrl,
                            quality: '720p',
                            headers: STREAM_HEADERS,
                            type: 'M3U8',
                            provider: 'fullhdfilmizlesene'
                        }];
                    });
                }
                
                if (url.includes('vidmoxy.com')) {
                    return extractVidMoxy(url, filmUrl).then(function(results) {
                        return results.map(function(r) {
                            return {
                                name: '⌜ FullHD ⌟ | ' + sourceName,
                                title: title + (year ? ' (' + year + ')' : '') + ' · ' + r.quality,
                                url: r.url,
                                quality: r.quality,
                                headers: STREAM_HEADERS,
                                type: r.type,
                                provider: 'fullhdfilmizlesene'
                            };
                        });
                    });
                }
                
                // Direkt linkler (proton, fast, tr, en)
                if (url.match(/\.(m3u8|mp4)$/i) || 
                    ['proton', 'fast', 'tr', 'en'].some(function(k) { 
                        return linkInfo.type.toLowerCase().includes(k); 
                    })) {
                    var isM3u8 = url.includes('.m3u8');
                    return Promise.resolve([{
                        name: '⌜ FullHD ⌟ | ' + sourceName,
                        title: title + (year ? ' (' + year + ')' : ''),
                        url: url,
                        quality: '720p',
                        headers: STREAM_HEADERS,
                        type: isM3u8 ? 'M3U8' : 'VIDEO',
                        provider: 'fullhdfilmizlesene'
                    }]);
                }
                
                return Promise.resolve([]);
            });

            return Promise.all(promises);
        })
        .then(function(results) {
            // Flatten array
            var streams = [];
            results.forEach(function(r) {
                if (Array.isArray(r)) streams = streams.concat(r);
            });
            return streams.filter(function(s) { return s && s.url; });
        });
}

function searchFullHD(title) {
    var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(title);
    console.log('[FullHD] Search URL:', searchUrl);
    
    return fetch(searchUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            // film listesi regex
            var regex = /<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][\s\S]*?<span[^>]+class=["']film-title["'][^>]*>([^<]+)<\/span>/gi;
            var match;
            
            while ((match = regex.exec(html)) !== null) {
                results.push({
                    url: match[1].startsWith('http') ? match[1] : BASE_URL + match[1],
                    title: match[2].trim()
                });
            }
            
            console.log('[FullHD] Search results:', results.length);
            return results;
        });
}

function findBestMatch(results, query) {
    if (!results || results.length === 0) return null;
    
    var queryLower = query.toLowerCase();
    
    // Tam eşleşme
    for (var i = 0; i < results.length; i++) {
        if (results[i].title.toLowerCase() === queryLower) return results[i];
    }
    
    // İçeren eşleşme
    for (var j = 0; j < results.length; j++) {
        if (results[j].title.toLowerCase().includes(queryLower)) return results[j];
    }
    
    // İlk sonuç
    return results[0];
}

// ==================== TMDB ENTEGRASYONU ====================

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
                    return Promise.resolve(null);
                }
                
                return searchFullHD(title);
            })
            .then(function(results) {
                if (!results || results.length === 0) {
                    console.log('[FullHD] No search results');
                    return [];
                }
                
                var best = findBestMatch(results, title);
                if (!best) {
                    console.log('[FullHD] No match found');
                    return [];
                }
                
                console.log('[FullHD] Best match:', best.title, best.url);
                return fetchDetailAndStreams(best.url);
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[FullHD] Error:', err.message);
                resolve([]);
            });
    });
}

// ==================== EXPORT ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
