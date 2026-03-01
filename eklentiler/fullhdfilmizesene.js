// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene - Çalışan Arama + Düzeltilmiş Extractor'lar

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Accept-Encoding': 'identity',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
};

// ==================== YARDIMCI FONKSIYONLAR ====================

function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function(char) {
        var code = char.charCodeAt(0);
        var base = code < 97 ? 65 : 97;
        return String.fromCharCode(((code - base + 13) % 26) + base);
    });
}

function atob(str) {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(str, 'base64').toString('binary');
    }
    return window.atob(str);
}

function decodeLink(encoded) {
    try {
        return atob(rot13(encoded));
    } catch (e) {
        console.error('[FullHD] Decode error:', e.message);
        return null;
    }
}

function fixUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    return BASE_URL + (url.startsWith('/') ? '' : '/') + url;
}

// ==================== EXTRACTOR'LAR (Python'dan) ====================

// Hex decode - Python'daki bytes.fromhex() eşdeğeri
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
        if (hexString.length % 2 === 0) {
            var bytes = [];
            for (var j = 0; j < hexString.length; j += 2) {
                var hex = hexString.substring(j, j + 2);
                var val = parseInt(hex, 16);
                if (!isNaN(val)) bytes.push(val);
            }
            return String.fromCharCode.apply(null, bytes);
        }
        return null;
    } catch (e) {
        console.error('[HexDecode] Error:', e.message);
        return null;
    }
}

// rapid2m3u8 - Python'dan birebir
function rapid2m3u8(url, referer) {
    console.log('[rapid2m3u8] Processing:', url);
    
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
            console.log('[rapid2m3u8] Found hex (method 1)');
        } else {
            // Yöntem 2: eval unpack
            var evalMatch = text.match(/eval\(function[\s\S]*?var played\s*=\s*\d+;/);
            if (evalMatch) {
                var unpacked = evalMatch[1];
                var match2 = unpacked.match(/file":"(.*?)"/);
                if (match2) {
                    escapedHex = match2[1].replace(/\\\\x/g, '\\x');
                    console.log('[rapid2m3u8] Found hex (method 2)');
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
        
        console.log('[rapid2m3u8] Decoded:', decoded.substring(0, 80));
        
        // m3u8 kontrolü
        if (!decoded.includes('.m3u8')) {
            console.log('[rapid2m3u8] Not m3u8:', decoded);
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

// trstx2m3u8 - Python'dan
function trstx2m3u8(url, referer) {
    console.log('[trstx2m3u8] Processing:', url);
    var baseUrl = 'https://trstx.org';
    var results = [];
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var match = text.match(/file":"([^"]+)/);
        if (!match) throw new Error('File not found');
        
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
        console.log('[trstx2m3u8] Post data items:', postData.length);
        
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
                    .then(function(res) { return res.text(); })
                    .then(function(videoData) {
                        results.push({
                            url: videoData.trim(),
                            quality: item.title,
                            type: 'M3U8'
                        });
                    })
                    .catch(function() {})
                );
            })(item);
        }
        
        return Promise.all(promises);
    })
    .then(function() {
        console.log('[trstx2m3u8] Results:', results.length);
        return results;
    })
    .catch(function(err) {
        console.error('[trstx2m3u8] Error:', err.message);
        return [];
    });
}

// sobreatsesuyp2m3u8 - Python'dan
function sobreatsesuyp2m3u8(url, referer) {
    console.log('[sobreatsesuyp2m3u8] Processing:', url);
    var baseUrl = 'https://sobreatsesuyp.com';
    var results = [];
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var match = text.match(/file":"([^"]+)/);
        if (!match) throw new Error('File not found');
        
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
        console.log('[sobreatsesuyp2m3u8] Post data items:', postData.length);
        
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
                    .then(function(res) { return res.text(); })
                    .then(function(videoData) {
                        results.push({
                            url: videoData.trim(),
                            quality: item.title,
                            type: 'M3U8'
                        });
                    })
                    .catch(function() {})
                );
            })(item);
        }
        
        return Promise.all(promises);
    })
    .then(function() {
        console.log('[sobreatsesuyp2m3u8] Results:', results.length);
        return results;
    })
    .catch(function(err) {
        console.error('[sobreatsesuyp2m3u8] Error:', err.message);
        return [];
    });
}

// turboimgz2m3u8 - Python'dan
function turboimgz2m3u8(url, referer) {
    console.log('[turboimgz2m3u8] Processing:', url);
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var match = text.match(/file:\s*"(.*?)"/);
        if (!match) {
            console.log('[turboimgz2m3u8] No file found');
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

// Extractor dispatcher
function extractVideoUrl(url, sourceKey, referer) {
    console.log('[extractVideoUrl] Source:', sourceKey, 'URL:', url.substring(0, 60));
    
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
    var directKeys = ['proton', 'fast', 'tr', 'en'];
    var isDirect = directKeys.some(function(k) { 
        return sourceKey.toLowerCase().includes(k); 
    });
    
    if (isDirect || url.match(/\.(m3u8|mp4)($|\?)/i)) {
        console.log('[extractVideoUrl] Direct link');
        return Promise.resolve([{
            url: url,
            quality: '720p',
            type: url.includes('.m3u8') ? 'M3U8' : 'VIDEO'
        }]);
    }
    
    console.log('[extractVideoUrl] Unknown source');
    return Promise.resolve([]);
}

// ==================== ANA FONKSIYONLAR (Önceki Kodun Aynısı) ====================

function fetchDetailAndStreams(filmUrl, mediaType, seasonNum, episodeNum) {
    console.log('[FullHD] Detail URL:', filmUrl);

    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // Başlık
            var titleMatch = html.match(/<div[^>]*class=["']izle-titles["'][^>]*>([\s\S]*?)<\/div>/i) ||
                            html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                            html.match(/<title>([^<]+)<\/title>/i);
            var title = titleMatch ? 
                (titleMatch[1] || titleMatch[0]).replace(/<[^>]+>/g, '').trim() : 
                'FullHDFilmizlesene';
            
            // Yıl
            var yearMatch = html.match(/<div[^>]*class=["']dd["'][^>]*>[\s\S]*?<a[^>]*class=["']category["'][^>]*>(\d{4})/i) ||
                           html.match(/(\d{4})/);
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
            var keys = ['atom', 'advid', 'advidprox', 'proton', 'fast', 'fastly', 'tr', 'en'];
            
            keys.forEach(function(key) {
                var sourceData = scxData[key];
                if (!sourceData || !sourceData.sx || !sourceData.sx.t) return;
                
                var t = sourceData.sx.t;
                var sourceName = key.toUpperCase();
                
                // Linkleri topla
                var links = [];
                
                if (Array.isArray(t)) {
                    t.forEach(function(encoded, index) {
                        var decoded = decodeLink(encoded);
                        if (decoded) {
                            links.push({
                                sourceKey: key,
                                quality: sourceName + (t.length > 1 ? ' #' + (index + 1) : ''),
                                url: decoded
                            });
                        }
                    });
                } else if (typeof t === 'object' && t !== null) {
                    Object.keys(t).forEach(function(qualityKey) {
                        var encoded = t[qualityKey];
                        if (typeof encoded === 'string') {
                            var decoded = decodeLink(encoded);
                            if (decoded) {
                                var quality = '720p';
                                var qk = qualityKey.toLowerCase();
                                if (qk.includes('1080') || qk.includes('fhd')) quality = '1080p';
                                else if (qk.includes('720') || qk.includes('hd')) quality = '720p';
                                else if (qk.includes('480')) quality = '480p';
                                else if (qk.includes('360')) quality = '360p';
                                
                                links.push({
                                    sourceKey: key,
                                    quality: sourceName + ' | ' + qualityKey,
                                    url: decoded,
                                    qualityLabel: quality
                                });
                            }
                        }
                    });
                }
                
                console.log('[FullHD] Key', key, 'has', links.length, 'links');
                
                // Her link için extractor çalıştır
                links.forEach(function(link) {
                    var promise = extractVideoUrl(link.url, link.sourceKey, filmUrl)
                        .then(function(results) {
                            return results.map(function(r) {
                                return {
                                    name: link.quality,
                                    url: r.url,
                                    quality: r.quality || link.qualityLabel || '720p',
                                    type: r.type,
                                    referer: filmUrl
                                };
                            });
                        });
                    allPromises.push(promise);
                });
            });
            
            return Promise.all(allPromises);
        })
        .then(function(results) {
            // Flatten
            var videoLinks = [];
            results.forEach(function(r) {
                if (r && r.length) {
                    videoLinks = videoLinks.concat(r);
                }
            });
            
            console.log('[FullHD] Total video links:', videoLinks.length);
            
            if (videoLinks.length === 0) {
                return [];
            }
            
            // Stream objelerini oluştur
            var streams = [];
            videoLinks.forEach(function(link) {
                streams.push({
                    name: '⌜ FullHD ⌟ | ' + link.name,
                    title: title + (year ? ' (' + year + ')' : '') + ' · ' + link.quality,
                    url: link.url,
                    quality: link.quality,
                    headers: Object.assign({}, STREAM_HEADERS, {
                        'Referer': link.referer || filmUrl
                    }),
                    type: link.type,
                    provider: 'fullhdfilmizlesene'
                });
            });
            
            return streams;
        })
        .catch(function(err) {
            console.error('[FullHD] Error:', err.message);
            return [];
        });
}

// Önceki kodun aynısı - ARAMA FONKSIYONU
function searchFullHD(title) {
    var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(title);
    console.log('[FullHD] Search URL:', searchUrl);

    return fetch(searchUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            
            // li.film patterni - Önceki kodun aynısı
            var filmRegex = /<li[^>]*class=["']film["'][^>]*>([\s\S]*?)<\/li>/gi;
            var match;
            
            while ((match = filmRegex.exec(html)) !== null) {
                var filmHtml = match[1];
                
                // Başlık
                var titleMatch = filmHtml.match(/<span[^>]*class=["']film-title["'][^>]*>([^<]+)<\/span>/i);
                var filmTitle = titleMatch ? titleMatch[1].trim() : null;
                if (!filmTitle) continue;
                
                // URL
                var hrefMatch = filmHtml.match(/<a[^>]+href=["']([^"']+)["']/i);
                var href = hrefMatch ? hrefMatch[1] : null;
                if (!href) continue;
                if (!href.startsWith('http')) href = BASE_URL + href;
                
                // Poster
                var posterMatch = filmHtml.match(/<img[^>]+data-src=["']([^"']+)["']/i) ||
                                 filmHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
                var poster = posterMatch ? posterMatch[1] : null;
                if (poster && !poster.startsWith('http')) poster = BASE_URL + poster;
                
                // Duplicate kontrolü
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

// Önceki kodun aynısı
function findBestMatch(results, query) {
    if (!results || results.length === 0) return null;

    var queryLower = query.toLowerCase();

    // Tam eşleşme
    for (var i = 0; i < results.length; i++) {
        if (results[i].title.toLowerCase() === queryLower) return results[i];
    }

    // İçeriyor
    for (var j = 0; j < results.length; j++) {
        if (results[j].title.toLowerCase().includes(queryLower)) return results[j];
    }

    return results[0];
}

// Önceki kodun aynısı
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

// Önceki kodun aynısı
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // FullHDFilmizlesene sadece film destekler
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

// Export - Önceki kodun aynısı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
