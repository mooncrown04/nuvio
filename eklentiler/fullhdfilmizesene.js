// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene JavaScript versiyonu - SineWix/DiziPal yapısı

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Accept-Encoding': 'identity',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};

// ROT13 şifre çözme
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function(char) {
        var code = char.charCodeAt(0);
        var base = code < 97 ? 65 : 97;
        return String.fromCharCode(((code - base + 13) % 26) + base);
    });
}

// Base64 decode (atob polyfill for Node.js)
function atob(str) {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(str, 'base64').toString('binary');
    }
    return window.atob(str);
}

// Link çözme: ROT13 + Base64
function decodeLink(encoded) {
    try {
        return atob(rot13(encoded));
    } catch (e) {
        console.error('[FullHDFilmizlesene] Decode error:', e.message);
        return null;
    }
}

function getApiPaths(mediaType) {
    // FullHDFilmizlesene sadece film
    return { genre: 'movie', endpoint: 'movie' };
}

function resolveMediaFireLink(link) {
    // FullHDFilmizlesene'de MediaFire yok
    return Promise.resolve(link);
}

function buildStreams(videoLinks, title, year, subtitles) {
    var streams = [];
    
    videoLinks.forEach(function(stream) {
        var streamHeaders = Object.assign({}, STREAM_HEADERS, stream.headers || {});
        
        // Kalite belirleme
        var quality = stream.quality || '720p';
        
        // Stream tipi belirleme
        var type = 'VIDEO';
        if (stream.url.includes('.m3u8')) type = 'M3U8';
        else if (stream.url.includes('.mpd')) type = 'DASH';
        
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

// SCX veri yapısından linkleri çıkar
function extractVideoLinks(html) {
    var links = [];
    
    // scx = {...}; patternini bul
    var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
    if (!scxMatch) {
        console.log('[FullHDFilmizlesene] scx data not found');
        return links;
    }
    
    try {
        var scxData = JSON.parse(scxMatch[1]);
        var keys = ['atom', 'advid', 'advidprox', 'proton', 'fast', 'fastly', 'tr', 'en'];
        
        keys.forEach(function(key) {
            var sourceData = scxData[key];
            if (!sourceData || !sourceData.sx || !sourceData.sx.t) return;
            
            var t = sourceData.sx.t;
            var sourceName = key.toUpperCase();
            
            if (Array.isArray(t)) {
                // Array formatı
                t.forEach(function(encodedLink, index) {
                    var decoded = decodeLink(encodedLink);
                    if (decoded) {
                        links.push({
                            name: sourceName + (t.length > 1 ? ' #' + (index + 1) : ''),
                            url: decoded,
                            quality: '720p'
                        });
                    }
                });
            } else if (typeof t === 'object' && t !== null) {
                // Object formatı (kalite anahtarları ile)
                Object.keys(t).forEach(function(qualityKey) {
                    var encodedLink = t[qualityKey];
                    if (typeof encodedLink === 'string') {
                        var decoded = decodeLink(encodedLink);
                        if (decoded) {
                            links.push({
                                name: sourceName + ' | ' + qualityKey,
                                url: decoded,
                                quality: qualityKey.includes('1080') ? '1080p' : 
                                        (qualityKey.includes('720') ? '720p' : 
                                         (qualityKey.includes('480') ? '480p' : '720p'))
                            });
                        }
                    }
                });
            }
        });
    } catch (e) {
        console.error('[FullHDFilmizlesene] Parse error:', e.message);
    }
    
    return links;
}

function fetchDetailAndStreams(filmUrl, mediaType, seasonNum, episodeNum) {
    // Film olduğu için season/episode yok
    console.log('[FullHDFilmizlesene] Detail URL:', filmUrl);

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
            
            // Video linklerini çıkar
            var videoLinks = extractVideoLinks(html);
            
            if (videoLinks.length === 0) {
                console.log('[FullHDFilmizlesene] No video links found');
                return [];
            }
            
            console.log('[FullHDFilmizlesene] Found', videoLinks.length, 'links');
            return buildStreams(videoLinks, title, year, []);
        });
}

function searchFullHD(title) {
    var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(title);
    console.log('[FullHDFilmizlesene] Search URL:', searchUrl);

    return fetch(searchUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            
            // li.film patterni
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
            
            console.log('[FullHDFilmizlesene] Search results:', results.length);
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

    // İçeriyor
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
                console.log('[FullHDFilmizlesene] No match found for:', title);
                return [];
            }
            
            console.log('[FullHDFilmizlesene] Best match:', best.title, best.url);
            return fetchDetailAndStreams(best.url, mediaType, seasonNum, episodeNum);
        });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // FullHDFilmizlesene sadece film destekler
        if (mediaType !== 'movie') {
            console.log('[FullHDFilmizlesene] Only movies supported');
            resolve([]);
            return;
        }
        
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId +
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[FullHDFilmizlesene] Starting for tmdbId:', tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.original_title || '';
                var year = (data.release_date || '').substring(0, 4);
                
                console.log('[FullHDFilmizlesene] TMDB title:', title, 'year:', year);

                if (!title) {
                    resolve([]);
                    return;
                }

                var originalTitle = data.original_title || '';

                return searchAndFetch(title, mediaType, seasonNum, episodeNum)
                    .then(function(streams) {
                        if ((!streams || streams.length === 0) && originalTitle && originalTitle !== title) {
                            console.log('[FullHDFilmizlesene] Trying original title:', originalTitle);
                            return searchAndFetch(originalTitle, mediaType, seasonNum, episodeNum);
                        }
                        return streams;
                    });
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[FullHDFilmizlesene] Error:', err.message);
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
