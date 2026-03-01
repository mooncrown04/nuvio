// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene - Düzeltilmiş Extractor'lar

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// ==================== YARDIMCI FONKSIYONLAR ====================

function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function(char) {
        var code = char.charCodeAt(0);
        var base = code < 97 ? 65 : 97;
        return String.fromCharCode(((code - base + 13) % 26) + base);
    });
}

function base64Decode(str) {
    try {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(str, 'base64').toString('utf-8');
        }
        return atob(str);
    } catch (e) {
        return null;
    }
}

function decodeString(encoded) {
    try {
        return base64Decode(rot13(encoded));
    } catch (e) {
        return null;
    }
}

// Hex decode - Python'daki gibi
function hexDecode(hexString) {
    try {
        // \xHH formatı
        if (hexString.includes('\\x')) {
            var parts = hexString.split('\\x').filter(function(x) { return x && x.length >= 2; });
            var bytes = [];
            for (var i = 0; i < parts.length; i++) {
                var hex = parts[i].substring(0, 2);
                var val = parseInt(hex, 16);
                if (!isNaN(val)) bytes.push(val);
            }
            return String.fromCharCode.apply(null, bytes);
        }
        // Direkt hex
        var bytes = [];
        for (var j = 0; j < hexString.length; j += 2) {
            var hex = hexString.substring(j, j + 2);
            var val = parseInt(hex, 16);
            if (!isNaN(val)) bytes.push(val);
        }
        return String.fromCharCode.apply(null, bytes);
    } catch (e) {
        console.error('[HexDecode] Error:', e.message);
        return null;
    }
}

function fixUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    return BASE_URL + (url.startsWith('/') ? '' : '/') + url;
}

// ==================== EXTRACTOR'LAR ====================

// RapidVid/VidMoxy - Python'dan birebir
function rapid2m3u8(url, referer) {
    console.log('[rapid2m3u8] URL:', url);
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var escapedHex = null;
        
        // Yöntem 1: file": "..."
        var match1 = text.match(/file":\s*"(.*?)"/);
        if (match1) {
            escapedHex = match1[1];
            console.log('[rapid2m3u8] Found hex (method 1):', escapedHex.substring(0, 50));
        } else {
            // Yöntem 2: eval unpack
            var evalMatch = text.match(/eval\(function[\s\S]*?var played\s*=\s*\d+;/);
            if (evalMatch) {
                // Basit unpack deneme
                var unpacked = evalMatch[1];
                // İkinci seviye unpack (basit)
                var match2 = unpacked.match(/file":"(.*?)"/);
                if (match2) {
                    escapedHex = match2[1].replace(/\\\\x/g, '\\x');
                    console.log('[rapid2m3u8] Found hex (method 2):', escapedHex.substring(0, 50));
                }
            }
        }
        
        if (!escapedHex) {
            console.log('[rapid2m3u8] No hex found');
            return [];
        }
        
        var decoded = hexDecode(escapedHex);
        if (!decoded) {
            console.log('[rapid2m3u8] Hex decode failed');
            return [];
        }
        
        console.log('[rapid2m3u8] Decoded:', decoded.substring(0, 100));
        
        // Sonucun m3u8 olduğundan emin ol
        if (!decoded.includes('.m3u8') && !decoded.includes('http')) {
            console.log('[rapid2m3u8] Invalid result:', decoded);
            return [];
        }
        
        return [{
            url: decoded,
            quality: '720p',
            type: 'M3U8'
        }];
    })
    .catch(function(err) {
        console.error('[rapid2m3u8] Error:', err.message);
        return [];
    });
}

// Trstx - Python'dan birebir
function trstx2m3u8(url, referer) {
    console.log('[trstx2m3u8] URL:', url);
    var baseUrl = 'https://trstx.org';
    var results = [];
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var match = text.match(/file":"([^"]+)/);
        if (!match) throw new Error('File pattern not found');
        
        var postLink = match[1].replace(/\\/g, '');
        console.log('[trstx2m3u8] Post link:', postLink);
        
        return fetch(baseUrl + '/' + postLink, {
            method: 'POST',
            headers: Object.assign({}, HEADERS, { 
                'Referer': referer,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
        });
    })
    .then(function(res) { 
        if (!res.ok) throw new Error('POST failed: ' + res.status);
        return res.json(); 
    })
    .then(function(postData) {
        console.log('[trstx2m3u8] Post data length:', postData.length);
        
        if (!Array.isArray(postData) || postData.length < 2) {
            throw new Error('Invalid post data');
        }
        
        // İlk elemanı atla, gerisini işle
        var promises = [];
        
        for (var i = 1; i < postData.length; i++) {
            var item = postData[i];
            if (!item || !item.file || !item.title) continue;
            
            (function(item) {
                var vidUrl = baseUrl + '/playlist/' + item.file.substring(1) + '.txt';
                
                promises.push(
                    fetch(vidUrl, {
                        method: 'POST',
                        headers: Object.assign({}, HEADERS, { 'Referer': referer })
                    })
                    .then(function(res) {
                        if (!res.ok) throw new Error('Playlist fetch failed');
                        return res.text();
                    })
                    .then(function(videoData) {
                        console.log('[trstx2m3u8] Got video for', item.title, ':', videoData.substring(0, 50));
                        results.push({
                            url: videoData.trim(),
                            quality: item.title,
                            type: 'M3U8'
                        });
                    })
                    .catch(function(err) {
                        console.error('[trstx2m3u8] Item error:', err.message);
                    })
                );
            })(item);
        }
        
        return Promise.all(promises);
    })
    .then(function() {
        console.log('[trstx2m3u8] Total results:', results.length);
        return results;
    })
    .catch(function(err) {
        console.error('[trstx2m3u8] Error:', err.message);
        return [];
    });
}

// Sobreatsesuyp - Python'dan birebir
function sobreatsesuyp2m3u8(url, referer) {
    console.log('[sobreatsesuyp2m3u8] URL:', url);
    var baseUrl = 'https://sobreatsesuyp.com';
    var results = [];
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var match = text.match(/file":"([^"]+)/);
        if (!match) throw new Error('File pattern not found');
        
        var postLink = match[1].replace(/\\/g, '');
        console.log('[sobreatsesuyp2m3u8] Post link:', postLink);
        
        return fetch(baseUrl + '/' + postLink, {
            method: 'POST',
            headers: Object.assign({}, HEADERS, { 
                'Referer': referer,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
        });
    })
    .then(function(res) { 
        if (!res.ok) throw new Error('POST failed: ' + res.status);
        return res.json(); 
    })
    .then(function(postData) {
        console.log('[sobreatsesuyp2m3u8] Post data length:', postData.length);
        
        if (!Array.isArray(postData) || postData.length < 2) {
            throw new Error('Invalid post data');
        }
        
        var promises = [];
        
        for (var i = 1; i < postData.length; i++) {
            var item = postData[i];
            if (!item || !item.file || !item.title) continue;
            
            (function(item) {
                var vidUrl = baseUrl + '/playlist/' + item.file.substring(1) + '.txt';
                
                promises.push(
                    fetch(vidUrl, {
                        method: 'POST',
                        headers: Object.assign({}, HEADERS, { 'Referer': referer })
                    })
                    .then(function(res) {
                        if (!res.ok) throw new Error('Playlist fetch failed');
                        return res.text();
                    })
                    .then(function(videoData) {
                        console.log('[sobreatsesuyp2m3u8] Got video for', item.title, ':', videoData.substring(0, 50));
                        results.push({
                            url: videoData.trim(),
                            quality: item.title,
                            type: 'M3U8'
                        });
                    })
                    .catch(function(err) {
                        console.error('[sobreatsesuyp2m3u8] Item error:', err.message);
                    })
                );
            })(item);
        }
        
        return Promise.all(promises);
    })
    .then(function() {
        console.log('[sobreatsesuyp2m3u8] Total results:', results.length);
        return results;
    })
    .catch(function(err) {
        console.error('[sobreatsesuyp2m3u8] Error:', err.message);
        return [];
    });
}

// TurboImgz - Python'dan birebir
function turboimgz2m3u8(url, referer) {
    console.log('[turboimgz2m3u8] URL:', url);
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var match = text.match(/file:\s*"(.*?)"/);
        if (!match) {
            console.log('[turboimgz2m3u8] No file pattern found');
            return [];
        }
        
        console.log('[turboimgz2m3u8] Found:', match[1]);
        
        return [{
            url: match[1],
            quality: '720p',
            type: 'M3U8'
        }];
    })
    .catch(function(err) {
        console.error('[turboimgz2m3u8] Error:', err.message);
        return [];
    });
}

// Ana extractor dispatcher
function extractVideoUrl(url, sourceKey, referer) {
    console.log('[extractVideoUrl] Source:', sourceKey, 'URL:', url.substring(0, 80));
    
    // Domain bazlı seçim
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
    
    // Direkt linkler (proton, fast, tr, en)
    var directKeys = ['proton', 'fast', 'tr', 'en'];
    var isDirect = directKeys.some(function(k) { 
        return sourceKey.toLowerCase().includes(k); 
    });
    
    if (isDirect || url.match(/\.(m3u8|mp4)($|\?)/i)) {
        console.log('[extractVideoUrl] Direct link:', url.substring(0, 80));
        return Promise.resolve([{
            url: url,
            quality: '720p',
            type: url.includes('.m3u8') ? 'M3U8' : 'VIDEO'
        }]);
    }
    
    console.log('[extractVideoUrl] Unknown source type:', sourceKey);
    return Promise.resolve([]);
}

// ==================== ANA FONKSIYONLAR ====================

function fetchDetailAndStreams(filmUrl, mediaType, seasonNum, episodeNum) {
    console.log('[FullHD] Detail URL:', filmUrl);

    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // Başlık
            var titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                            html.match(/<div[^>]*class=["']izle-titles["'][^>]*>([^<]+)<\/div>/i) ||
                            html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"]+)["']/i);
            var title = titleMatch ? 
                titleMatch[1].replace(/<[^>]+>/g, '').trim() : 
                'Unknown';
            
            // Yıl
            var yearMatch = html.match(/(\d{4})/);
            var year = yearMatch ? yearMatch[1] : null;
            
            console.log('[FullHD] Movie:', title, year ? '(' + year + ')' : '');
            
            // SCX verisi
            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) {
                console.log('[FullHD] No SCX data found');
                return [];
            }
            
            var scxData;
            try {
                scxData = JSON.parse(scxMatch[1]);
            } catch (e) {
                console.error('[FullHD] SCX parse error:', e.message);
                return [];
            }
            
            var allPromises = [];
            var scxKeys = Object.keys(scxData);
            
            console.log('[FullHD] SCX keys:', scxKeys.join(', '));
            
            // Her key için
            for (var i = 0; i < scxKeys.length; i++) {
                var key = scxKeys[i];
                var sourceData = scxData[key];
                
                if (!sourceData || !sourceData.sx || !sourceData.sx.t) continue;
                
                var t = sourceData.sx.t;
                
                // Linkleri decode et
                var links = [];
                
                if (Array.isArray(t)) {
                    for (var j = 0; j < t.length; j++) {
                        var decoded = decodeString(t[j]);
                        if (decoded) {
                            links.push({
                                sourceKey: key,
                                quality: key + (t.length > 1 ? ' #' + (j + 1) : ''),
                                url: decoded
                            });
                        }
                    }
                } else if (typeof t === 'object' && t !== null) {
                    var qualKeys = Object.keys(t);
                    for (var k = 0; k < qualKeys.length; k++) {
                        var qual = qualKeys[k];
                        var decoded = decodeString(t[qual]);
                        if (decoded) {
                            links.push({
                                sourceKey: key,
                                quality: key + ' | ' + qual,
                                url: decoded
                            });
                        }
                    }
                }
                
                console.log('[FullHD] Key', key, 'has', links.length, 'links');
                
                // Her link için extractor çalıştır
                for (var l = 0; l < links.length; l++) {
                    (function(link) {
                        var promise = extractVideoUrl(link.url, link.sourceKey, filmUrl)
                            .then(function(results) {
                                return results.map(function(r) {
                                    return {
                                        name: link.quality,
                                        url: r.url,
                                        quality: r.quality,
                                        type: r.type,
                                        referer: filmUrl
                                    };
                                });
                            });
                        allPromises.push(promise);
                    })(links[l]);
                }
            }
            
            return Promise.all(allPromises);
        })
        .then(function(results) {
            // Flatten
            var videoLinks = [];
            for (var i = 0; i < results.length; i++) {
                if (results[i] && results[i].length) {
                    videoLinks = videoLinks.concat(results[i]);
                }
            }
            
            console.log('[FullHD] Total video links:', videoLinks.length);
            
            if (videoLinks.length === 0) {
                return [];
            }
            
            // Stream objelerini oluştur
            var streams = [];
            for (var j = 0; j < videoLinks.length; j++) {
                var link = videoLinks[j];
                streams.push({
                    name: '⌜ FullHD ⌟ | ' + link.name,
                    title: title + (year ? ' (' + year + ')' : '') + ' · ' + link.quality,
                    url: link.url,
                    quality: link.quality,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': '*/*',
                        'Referer': link.referer || filmUrl,
                        'Origin': BASE_URL
                    },
                    type: link.type,
                    provider: 'fullhdfilmizlesene'
                });
            }
            
            return streams;
        })
        .catch(function(err) {
            console.error('[FullHD] fetchDetailAndStreams error:', err.message);
            return [];
        });
}

// ==================== ARAMA VE DIĞER FONKSIYONLAR (Aynı) ====================

function searchFullHD(title) {
    var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(title);
    console.log('[FullHD] Search URL:', searchUrl);

    return fetch(searchUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            
            var filmRegex = /<li[^>]*class=["']film["'][^>]*>([\s\S]*?)<\/li>/gi;
            var match;
            
            while ((match = filmRegex.exec(html)) !== null) {
                var filmHtml = match[1];
                
                var titleMatch = filmHtml.match(/<span[^>]*class=["']film-title["'][^>]*>([^<]+)<\/span>/i);
                var filmTitle = titleMatch ? titleMatch[1].trim() : null;
                if (!filmTitle) continue;
                
                var hrefMatch = filmHtml.match(/<a[^>]+href=["']([^"']+)["']/i);
                var href = hrefMatch ? hrefMatch[1] : null;
                if (!href) continue;
                if (!href.startsWith('http')) href = BASE_URL + href;
                
                var posterMatch = filmHtml.match(/<img[^>]+data-src=["']([^"']+)["']/i);
                var poster = posterMatch ? posterMatch[1] : null;
                if (poster && !poster.startsWith('http')) poster = BASE_URL + poster;
                
                var duplicate = results.some(function(r) { return r.url === href; });
                if (!duplicate) {
                    results.push({
                        title: filmTitle,
                        url: href,
                        posterUrl: poster,
                        type: 'movie'
                    });
                }
            }
            
            console.log('[FullHD] Search results:', results.length);
            return results;
        });
}

function findBestMatch(results, query) {
    if (!results || results.length === 0) return null;

    var queryLower = query.toLowerCase();

    for (var i = 0; i < results.length; i++) {
        if (results[i].title.toLowerCase() === queryLower) return results[i];
    }

    for (var j = 0; j < results.length; j++) {
        if (results[j].title.toLowerCase().includes(queryLower)) return results[j];
    }

    return results[0];
}

function searchAndFetch(title, mediaType, seasonNum, episodeNum) {
    return searchFullHD(title)
        .then(function(results) {
            var best = findBestMatch(results, title);
            if (!best) {
                console.log('[FullHD] No match found for:', title);
                return [];
            }
            
            console.log('[FullHD] Best match:', best.title, best.url);
            return fetchDetailAndStreams(best.url, mediaType, seasonNum, episodeNum);
        });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
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
                var year = (data.release_date || '').substring(0, 4);
                
                console.log('[FullHD] TMDB title:', title, 'year:', year);

                if (!title) {
                    resolve([]);
                    return;
                }

                var originalTitle = data.original_title || '';

                return searchAndFetch(title, mediaType, seasonNum, episodeNum)
                    .then(function(streams) {
                        if ((!streams || streams.length === 0) && originalTitle && originalTitle !== title) {
                            console.log('[FullHD] Trying original title:', originalTitle);
                            return searchAndFetch(originalTitle, mediaType, seasonNum, episodeNum);
                        }
                        return streams;
                    });
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

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
