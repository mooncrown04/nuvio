// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene - Kritik Düzeltmeler

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// ==================== KRITIK DÜZELTMELER ====================

// Buffer 'binary' yerine 'utf-8' kullan - BU ÇOK ÖNEMLI
function atobFixed(str) {
    try {
        if (typeof Buffer !== 'undefined') {
            // ÖNEMLI: 'utf-8' kullan, 'binary' değil
            return Buffer.from(str, 'base64').toString('utf-8');
        }
        return window.atob(str);
    } catch (e) {
        console.error('[atob] Error:', e.message, 'Input:', str.substring(0, 50));
        return null;
    }
}

// Daha sağlam ROT13
function rot13Fixed(str) {
    if (!str || typeof str !== 'string') return null;
    return str.replace(/[a-zA-Z]/g, function(char) {
        var code = char.charCodeAt(0);
        var base = code < 97 ? 65 : 97;
        return String.fromCharCode(((code - base + 13) % 26) + base);
    });
}

// Düzeltilmiş decode
function decodeLinkFixed(encoded) {
    if (!encoded || typeof encoded !== 'string') {
        console.log('[decodeLink] Invalid input:', encoded);
        return null;
    }
    try {
        var rot13Decoded = rot13Fixed(encoded);
        if (!rot13Decoded) {
            console.log('[decodeLink] ROT13 failed');
            return null;
        }
        var result = atobFixed(rot13Decoded);
        if (!result) {
            console.log('[decodeLink] Base64 failed');
            return null;
        }
        // URL olup olmadığını kontrol et
        if (!result.includes('http')) {
            console.log('[decodeLink] Not a URL:', result.substring(0, 50));
            return null;
        }
        return result;
    } catch (e) {
        console.error('[decodeLink] Error:', e.message);
        return null;
    }
}

// Düzeltilmiş Hex Decode - Python bytes.fromhex() tam eşdeğeri
function hexDecodeFixed(hexString) {
    if (!hexString || typeof hexString !== 'string') {
        console.log('[hexDecode] Invalid input');
        return null;
    }
    
    try {
        var cleanHex = hexString;
        
        // \xHH formatını temizle
        if (hexString.includes('\\x')) {
            // \x ile başlayanları ayıkla
            var parts = hexString.split('\\x');
            var bytes = [];
            for (var i = 0; i < parts.length; i++) {
                var part = parts[i];
                if (!part || part.length < 2) continue;
                
                // İlk iki karakteri hex olarak al
                var hex = part.substring(0, 2);
                var val = parseInt(hex, 16);
                
                if (!isNaN(val) && val >= 0 && val <= 255) {
                    bytes.push(val);
                }
            }
            return String.fromCharCode.apply(null, bytes);
        }
        
        // Direkt hex (çift sayıda karakter)
        if (cleanHex.length % 2 === 0) {
            var bytes = [];
            for (var j = 0; j < cleanHex.length; j += 2) {
                var hex = cleanHex.substring(j, j + 2);
                var val = parseInt(hex, 16);
                if (!isNaN(val) && val >= 0 && val <= 255) {
                    bytes.push(val);
                }
            }
            return String.fromCharCode.apply(null, bytes);
        }
        
        return null;
    } catch (e) {
        console.error('[hexDecode] Error:', e.message, 'Input:', hexString.substring(0, 50));
        return null;
    }
}

// ==================== DÜZELTILMIŞ EXTRACTOR'LAR ====================

// rapid2m3u8 - Python'dan birebir
function rapid2m3u8(url, referer) {
    console.log('[rapid2m3u8] URL:', url);
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { 
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text(); 
    })
    .then(function(text) {
        var escapedHex = null;
        
        // Yöntem 1: file": "..."
        var match1 = text.match(/file":\s*"(.*?)"/);
        if (match1) {
            escapedHex = match1[1];
            console.log('[rapid2m3u8] Method 1, hex:', escapedHex.substring(0, 30));
        } else {
            // Yöntem 2: eval unpack
            var evalMatch = text.match(/eval\(function[\s\S]*?var played\s*=\s*\d+;/);
            if (evalMatch) {
                var unpacked = evalMatch[1];
                var match2 = unpacked.match(/file":"(.*?)"/);
                if (match2) {
                    escapedHex = match2[1].replace(/\\\\x/g, '\\x');
                    console.log('[rapid2m3u8] Method 2, hex:', escapedHex.substring(0, 30));
                }
            }
        }
        
        if (!escapedHex) {
            console.log('[rapid2m3u8] No hex found');
            return [];
        }
        
        var decoded = hexDecodeFixed(escapedHex);
        if (!decoded) {
            console.log('[rapid2m3u8] Hex decode failed');
            return [];
        }
        
        console.log('[rapid2m3u8] Decoded:', decoded);
        
        // URL'nin geçerli olduğunu kontrol et
        if (!decoded.startsWith('http')) {
            console.log('[rapid2m3u8] Invalid URL:', decoded);
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

// trstx2m3u8 - Düzeltilmiş POST istekleri
function trstx2m3u8(url, referer) {
    console.log('[trstx2m3u8] URL:', url);
    var baseUrl = 'https://trstx.org';
    var results = [];
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { 
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text(); 
    })
    .then(function(text) {
        var match = text.match(/file":"([^"]+)/);
        if (!match) throw new Error('File pattern not found');
        
        var postLink = match[1].replace(/\\/g, '');
        console.log('[trstx2m3u8] Post link:', postLink);
        
        // POST isteği - body gerekli olabilir
        return fetch(baseUrl + '/' + postLink, {
            method: 'POST',
            headers: Object.assign({}, HEADERS, { 
                'Referer': referer,
                'Content-Type': 'application/x-www-form-urlencoded'
            }),
            body: '' // Boş body gönder
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
        
        var promises = [];
        
        for (var i = 1; i < postData.length; i++) {
            var item = postData[i];
            if (!item || !item.file || !item.title) continue;
            
            (function(item) {
                var vidUrl = baseUrl + '/playlist/' + item.file.substring(1) + '.txt';
                console.log('[trstx2m3u8] Fetching:', item.title);
                
                promises.push(
                    fetch(vidUrl, {
                        method: 'POST',
                        headers: Object.assign({}, HEADERS, { 'Referer': referer }),
                        body: '' // Boş body
                    })
                    .then(function(res) { 
                        if (!res.ok) throw new Error('Playlist HTTP ' + res.status);
                        return res.text(); 
                    })
                    .then(function(videoData) {
                        var cleanUrl = videoData.trim();
                        console.log('[trstx2m3u8] Got URL:', cleanUrl.substring(0, 80));
                        results.push({
                            url: cleanUrl,
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

// sobreatsesuyp2m3u8 - Düzeltilmiş
function sobreatsesuyp2m3u8(url, referer) {
    console.log('[sobreatsesuyp2m3u8] URL:', url);
    var baseUrl = 'https://sobreatsesuyp.com';
    var results = [];
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { 
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text(); 
    })
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
            }),
            body: ''
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
                        headers: Object.assign({}, HEADERS, { 'Referer': referer }),
                        body: ''
                    })
                    .then(function(res) { 
                        if (!res.ok) throw new Error('Playlist HTTP ' + res.status);
                        return res.text(); 
                    })
                    .then(function(videoData) {
                        var cleanUrl = videoData.trim();
                        console.log('[sobreatsesuyp2m3u8] Got URL:', cleanUrl.substring(0, 80));
                        results.push({
                            url: cleanUrl,
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

// turboimgz2m3u8 - Düzeltilmiş
function turboimgz2m3u8(url, referer) {
    console.log('[turboimgz2m3u8] URL:', url);
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { 
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text(); 
    })
    .then(function(text) {
        // Farklı patternler dene
        var match = text.match(/file:\s*"(.*?)"/) || 
                   text.match(/src:\s*"(.*?)"/) ||
                   text.match(/url:\s*"(.*?)"/);
                   
        if (!match) {
            console.log('[turboimgz2m3u8] No file pattern found');
            return [];
        }
        
        var videoUrl = match[1];
        console.log('[turboimgz2m3u8] Found:', videoUrl);
        
        if (!videoUrl.startsWith('http')) {
            console.log('[turboimgz2m3u8] Invalid URL');
            return [];
        }
        
        return [{
            url: videoUrl,
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
    console.log('[extractVideoUrl] Source:', sourceKey);
    console.log('[extractVideoUrl] URL:', url);
    
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
    
    console.log('[extractVideoUrl] Unknown source type');
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
                        var decoded = decodeLinkFixed(encoded);
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
                            var decoded = decodeLinkFixed(encoded);
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
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': '*/*',
                        'Accept-Language': 'tr-TR,tr;q=0.9',
                        'Referer': link.referer || filmUrl,
                        'Origin': BASE_URL
                    },
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

// Önceki kodun aynısı
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
                
                var posterMatch = filmHtml.match(/<img[^>]+data-src=["']([^"']+)["']/i) ||
                                 filmHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
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
