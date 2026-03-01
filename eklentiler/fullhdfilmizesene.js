// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene JavaScript - Çalışan Extractor'lar Entegre

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// ==================== EXTRACTOR'LAR ====================

// Hex decode helper
function hexDecode(hexString) {
    try {
        if (hexString.includes('\\x')) {
            var parts = hexString.split('\\x').filter(function(x) { return x; });
            var bytes = parts.map(function(x) { return parseInt(x, 16); });
            return String.fromCharCode.apply(null, bytes);
        }
        var bytes = hexString.match(/.{2}/g).map(function(x) { return parseInt(x, 16); });
        return String.fromCharCode.apply(null, bytes);
    } catch (e) {
        return null;
    }
}

// RapidVid/VidMoxy Extractor
function extractRapidVid(url, referer) {
    console.log('[RapidVid] Extracting:', url);
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var escapedHex = null;
        
        // Yöntem 1: Direkt file pattern
        var fileMatch = text.match(/file": "(.*)",/);
        if (fileMatch) {
            escapedHex = fileMatch[1];
        } else {
            // Yöntem 2: Eval unpack (basit)
            var evalMatch = text.match(/eval\(function[\s\S]*?var played = \d+;/);
            if (evalMatch) {
                // Basit unpack - gerçek implementasyon daha karmaşık olabilir
                var unpacked = evalMatch[1];
                var fileMatch2 = unpacked.match(/file":"(.*)","label/);
                if (fileMatch2) {
                    escapedHex = fileMatch2[1].replace(/\\\\x/g, '\\x');
                }
            }
        }
        
        if (escapedHex) {
            var decoded = hexDecode(escapedHex);
            if (decoded) {
                console.log('[RapidVid] Found m3u8:', decoded.substring(0, 100));
                return [{
                    url: decoded,
                    quality: '720p',
                    type: 'M3U8'
                }];
            }
        }
        
        return [];
    })
    .catch(function(err) {
        console.error('[RapidVid] Error:', err.message);
        return [];
    });
}

// TurboImgz Extractor
function extractTurboImgz(url, referer) {
    console.log('[TurboImgz] Extracting:', url);
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var fileMatch = text.match(/file: "(.*)",/);
        if (fileMatch) {
            console.log('[TurboImgz] Found m3u8:', fileMatch[1]);
            return [{
                url: fileMatch[1],
                quality: '720p',
                type: 'M3U8'
            }];
        }
        return [];
    })
    .catch(function(err) {
        console.error('[TurboImgz] Error:', err.message);
        return [];
    });
}

// Trstx Extractor
function extractTrstx(url, referer) {
    console.log('[Trstx] Extracting:', url);
    var baseUrl = 'https://trstx.org';
    var results = [];
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var fileMatch = text.match(/file":"([^"]+)/);
        if (!fileMatch) throw new Error('File not found');
        
        var postLink = fileMatch[1].replace(/\\/g, '');
        console.log('[Trstx] Post link:', postLink);
        
        return fetch(baseUrl + '/' + postLink, {
            method: 'POST',
            headers: Object.assign({}, HEADERS, { 
                'Referer': referer,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
        });
    })
    .then(function(res) { return res.json(); })
    .then(function(postData) {
        console.log('[Trstx] Post data items:', postData.length);
        
        var promises = [];
        
        for (var i = 1; i < postData.length; i++) {
            (function(item) {
                if (!item.file || !item.title) return;
                
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
            })(postData[i]);
        }
        
        return Promise.all(promises).then(function() {
            return results;
        });
    })
    .catch(function(err) {
        console.error('[Trstx] Error:', err.message);
        return [];
    });
}

// Sobreatsesuyp Extractor
function extractSobreatsesuyp(url, referer) {
    console.log('[Sobreatsesuyp] Extracting:', url);
    var baseUrl = 'https://sobreatsesuyp.com';
    var results = [];
    
    return fetch(url, {
        headers: Object.assign({}, HEADERS, { 'Referer': referer })
    })
    .then(function(res) { return res.text(); })
    .then(function(text) {
        var fileMatch = text.match(/file":"([^"]+)/);
        if (!fileMatch) throw new Error('File not found');
        
        var postLink = fileMatch[1].replace(/\\/g, '');
        
        return fetch(baseUrl + '/' + postLink, {
            method: 'POST',
            headers: Object.assign({}, HEADERS, { 
                'Referer': referer,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
        });
    })
    .then(function(res) { return res.json(); })
    .then(function(postData) {
        var promises = [];
        
        for (var i = 1; i < postData.length; i++) {
            (function(item) {
                if (!item.file || !item.title) return;
                
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
            })(postData[i]);
        }
        
        return Promise.all(promises).then(function() {
            return results;
        });
    })
    .catch(function(err) {
        console.error('[Sobreatsesuyp] Error:', err.message);
        return [];
    });
}

// URL'ye göre extractor seç
function resolveVideoUrl(url, referer) {
    console.log('[FullHD] Resolving:', url.substring(0, 100));
    
    if (url.includes('rapidvid.net') || url.includes('vidmoxy.com')) {
        return extractRapidVid(url, referer);
    }
    if (url.includes('turbo.imgz.me')) {
        return extractTurboImgz(url, referer);
    }
    if (url.includes('trstx.org')) {
        return extractTrstx(url, referer);
    }
    if (url.includes('sobreatsesuyp.com')) {
        return extractSobreatsesuyp(url, referer);
    }
    if (url.includes('proton') || url.includes('fast') || url.includes('tr') || url.includes('en')) {
        // Direkt linkler
        if (url.match(/\.(m3u8|mp4)($|\?)/i)) {
            return Promise.resolve([{
                url: url,
                quality: '720p',
                type: url.includes('.m3u8') ? 'M3U8' : 'VIDEO'
            }]);
        }
    }
    
    // Bilinmeyen - direkt dene
    return Promise.resolve([{
        url: url,
        quality: '720p',
        type: 'VIDEO'
    }]);
}

// ==================== ORIJINAL KOD (Değişmedi) ====================

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

function buildStreams(videoLinks, title, year, subtitles) {
    var streams = [];
    
    videoLinks.forEach(function(stream) {
        var streamHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
            'Accept-Language': 'tr-TR,tr;q=0.9',
            'Accept-Encoding': 'identity',
            'Referer': stream.referer || BASE_URL + '/',
            'Origin': BASE_URL,
            'Sec-Fetch-Dest': 'video',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site'
        };
        
        // Kalite belirleme
        var quality = stream.quality || '720p';
        
        // Stream tipi belirleme
        var type = stream.type || 'VIDEO';
        if (stream.url.includes('.m3u8')) type = 'M3U8';
        
        streams.push({
            name: '⌜ FullHD ⌟ | ' + stream.name,
            title: title + (year ? ' (' + year + ')' : '') + ' · ' + quality,
            url: stream.url,
            quality: quality,
            size: 'Unknown',
            headers: streamHeaders,
            subtitles: subtitles || [],
            provider: 'fullhdfilmizlesene',
            type: type
        });
    });
    
    return Promise.resolve(streams);
}

// ==================== GÜNCELLENMIŞ fetchDetailAndStreams ====================

function fetchDetailAndStreams(filmUrl, mediaType, seasonNum, episodeNum) {
    console.log('[FullHD] Detail URL:', filmUrl);

    return fetch(filmUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // Başlık çıkar
            var titleMatch = html.match(/<div[^>]*class=["']izle-titles["'][^>]*>([\s\S]*?)<\/div>/i) ||
                            html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                            html.match(/<title>([^<]+)<\/title>/i);
            var title = titleMatch ? 
                (titleMatch[1] || titleMatch[0]).replace(/<[^>]+>/g, '').trim() : 
                'FullHDFilmizlesene';
            
            // Yıl çıkar
            var yearMatch = html.match(/<div[^>]*class=["']dd["'][^>]*>[\s\S]*?<a[^>]*class=["']category["'][^>]*>(\d{4})/i) ||
                           html.match(/(\d{4})/);
            var year = yearMatch ? yearMatch[1] : null;
            
            // SCX verisini çıkar
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
                
                var processLink = function(encoded, qualityKey) {
                    var decoded = decodeLink(encoded);
                    if (!decoded) return;
                    
                    var quality = '720p';
                    if (qualityKey) {
                        var qk = qualityKey.toLowerCase();
                        if (qk.includes('1080') || qk.includes('fhd')) quality = '1080p';
                        else if (qk.includes('720') || qk.includes('hd')) quality = '720p';
                        else if (qk.includes('480')) quality = '480p';
                        else if (qk.includes('360')) quality = '360p';
                    }
                    
                    // Extractor'u çalıştır
                    var promise = resolveVideoUrl(decoded, filmUrl).then(function(extracted) {
                        return extracted.map(function(stream) {
                            return {
                                name: sourceName + (qualityKey ? ' | ' + qualityKey : ''),
                                url: stream.url,
                                quality: stream.quality || quality,
                                type: stream.type,
                                referer: filmUrl
                            };
                        });
                    });
                    
                    allPromises.push(promise);
                };
                
                if (Array.isArray(t)) {
                    t.forEach(function(encoded, idx) {
                        processLink(encoded, t.length > 1 ? '#' + (idx + 1) : null);
                    });
                } else if (typeof t === 'object' && t !== null) {
                    Object.keys(t).forEach(function(qualityKey) {
                        processLink(t[qualityKey], qualityKey);
                    });
                }
            });
            
            return Promise.all(allPromises).then(function(results) {
                // Flatten array
                var videoLinks = [];
                results.forEach(function(r) {
                    videoLinks = videoLinks.concat(r);
                });
                
                console.log('[FullHD] Total resolved links:', videoLinks.length);
                
                if (videoLinks.length === 0) {
                    return [];
                }
                
                return buildStreams(videoLinks, title, year, []);
            });
        });
}

// ==================== Geri kalan kod aynı (searchFullHD, findBestMatch, searchAndFetch, getStreams) ====================

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
