// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene JavaScript versiyonu - SineWix/DiziPal yapısı
// Entegre Extractor'lar: RapidVid, VidMoxy, TurboImgz

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'identity',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site'
};

// ==================== EXTRACTOR'LAR ====================

// RapidVid Extractor
var RapidVid = {
    name: 'RapidVid',
    mainUrl: 'https://rapidvid.net',
    
    // av() fonksiyonu - decodeSecret
    decodeSecret: function(encodedString) {
        // Base64 decode helper
        function base64Decode(str) {
            try {
                if (typeof Buffer !== 'undefined') {
                    return Buffer.from(str, 'base64').toString('utf-8');
                }
                return atob(str);
            } catch (e) {
                return '';
            }
        }
        
        // 1. Ters çevir
        var reversed = encodedString.split('').reverse().join('');
        
        // 2. Base64 decode
        var tString = base64Decode(reversed);
        
        // 3. Karakter dönüşümü
        var key = 'K9L';
        var result = '';
        
        for (var i = 0; i < tString.length; i++) {
            var keyChar = key[i % key.length];
            var offset = keyChar.charCodeAt(0) % 5 + 1;
            var transformed = tString.charCodeAt(i) - offset;
            result += String.fromCharCode(transformed);
        }
        
        // 4. Son base64 decode
        return base64Decode(result);
    },
    
    extract: function(html, referer) {
        var links = [];
        var subtitles = [];
        
        // jwSetup.sources ve jwSetup.tracks bul
        var sourcesMatch = html.match(/jwSetup\.sources\s*=\s*([^;]+);/);
        var tracksMatch = html.match(/jwSetup\.tracks\s*=\s*([^;]+);/);
        
        if (sourcesMatch) {
            var avMatch = sourcesMatch[1].match(/av\('([^']+)'\)/);
            if (avMatch) {
                var m3u8Url = this.decodeSecret(avMatch[1]);
                if (m3u8Url) {
                    links.push({
                        url: m3u8Url,
                        type: 'M3U8',
                        name: this.name
                    });
                }
            }
        }
        
        // Altyazıları çıkar
        if (tracksMatch) {
            try {
                var tracks = JSON.parse(tracksMatch[1]);
                tracks.forEach(function(track) {
                    if (track.kind === 'captions' || track.kind === 'subtitles') {
                        var lang = track.label
                            ? track.label.replace(/\\u0131/g, 'ı')
                                         .replace(/\\u0130/g, 'İ')
                                         .replace(/\\u00fc/g, 'ü')
                                         .replace(/\\u00e7/g, 'ç')
                            : 'Unknown';
                        var url = track.file.replace(/\\/g, '');
                        subtitles.push({ lang: lang, url: url });
                    }
                });
            } catch (e) {
                console.log('[RapidVid] Track parse error:', e.message);
            }
        }
        
        return { links: links, subtitles: subtitles };
    }
};

// VidMoxy Extractor
var VidMoxy = {
    name: 'VidMoxy',
    mainUrl: 'https://vidmoxy.com',
    
    // Unpack helper (basit versiyon)
    unpack: function(code) {
        // Eval unpack için basit pattern
        var unpackMatch = code.match(/eval\(function\(p,a,c,k,e,d\)\{[^}]+\}\('([^']+)',(\d+),(\d+),'([^']+)'/);
        if (unpackMatch) {
            // Basit unpack implementasyonu
            return code; // Şimdilik orijinali dön
        }
        return code;
    },
    
    extract: function(html, referer) {
        var links = [];
        var subtitles = [];
        
        // Altyazıları çıkar
        var subRegex = /"captions","file":"([^"]+)","label":"([^"]+)"/g;
        var subMatch;
        var subUrls = new Set();
        
        while ((subMatch = subRegex.exec(html)) !== null) {
            var subUrl = subMatch[1].replace(/\\/g, '');
            var subLang = subMatch[2]
                .replace(/\\u0131/g, 'ı')
                .replace(/\\u0130/g, 'İ')
                .replace(/\\u00fc/g, 'ü')
                .replace(/\\u00e7/g, 'ç');
            
            if (!subUrls.has(subUrl)) {
                subUrls.add(subUrl);
                subtitles.push({ lang: subLang, url: subUrl });
            }
        }
        
        // Video URL'sini çıkar
        var videoUrl = null;
        
        // Yöntem 1: Direkt file pattern
        var fileMatch = html.match(/"file"\s*:\s*"([^"]+)"/);
        if (fileMatch) {
            var hexString = fileMatch[1];
            // Hex decode
            var bytes = hexString.split('\\x').filter(function(x) { return x; }).map(function(x) {
                return parseInt(x, 16);
            });
            videoUrl = String.fromCharCode.apply(null, bytes);
        }
        
        // Yöntem 2: Unpack eval
        if (!videoUrl) {
            var evalMatch = html.match(/\};\s*(eval\(function[\s\S]*?)var played = \d+;/);
            if (evalMatch) {
                var unpacked = this.unpack(evalMatch[1]);
                unpacked = this.unpack(unpacked).replace(/\\\\/g, '\\');
                
                var fileMatch2 = unpacked.match(/"file":"([^"]+)","label"/);
                if (fileMatch2) {
                    var hexStr = fileMatch2[1].replace(/\\\\x/g, '');
                    var bytes2 = hexStr.match(/.{2}/g).map(function(x) {
                        return parseInt(x, 16);
                    });
                    videoUrl = String.fromCharCode.apply(null, bytes2);
                }
            }
        }
        
        if (videoUrl) {
            links.push({
                url: videoUrl,
                type: 'M3U8',
                name: this.name
            });
        }
        
        return { links: links, subtitles: subtitles };
    }
};

// TurboImgz Extractor
var TurboImgz = {
    name: 'TurboImgz',
    mainUrl: 'https://turbo.imgz.me',
    
    extract: function(url, sourceName, referer) {
        // url formatı: "SOURCENAME||https://turbo.imgz.me/..."
        var actualUrl = url.includes('||') ? url.split('||')[1] : url;
        var name = url.includes('||') ? url.split('||')[0] : sourceName;
        
        return fetch(actualUrl, {
            headers: Object.assign({}, HEADERS, {
                'Referer': referer || BASE_URL + '/'
            })
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var fileMatch = html.match(/file\s*:\s*"([^"]+)"/);
            if (fileMatch) {
                return {
                    links: [{
                        url: fileMatch[1],
                        type: 'M3U8',
                        name: name.toUpperCase() + ' - ' + this.name
                    }],
                    subtitles: []
                };
            }
            return { links: [], subtitles: [] };
        }.bind(this))
        .catch(function() {
            return { links: [], subtitles: [] };
        });
    }
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
    try {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(str, 'base64').toString('utf-8');
        }
        return window.atob(str);
    } catch (e) {
        return null;
    }
}

function decodeLink(encoded) {
    if (!encoded || typeof encoded !== 'string') return null;
    try {
        return atob(rot13(encoded));
    } catch (e) {
        return null;
    }
}

function fixUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return BASE_URL + url;
    return BASE_URL + '/' + url;
}

// ==================== ANA FONKSIYONLAR ====================

function extractVideoLinks(html) {
    var links = [];
    
    var scxMatch = html.match(/var\s+scx\s*=\s*(\{[\s\S]*?\});/) ||
                   html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
    
    if (!scxMatch) {
        console.log('[FullHD] scx data not found');
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
                t.forEach(function(encodedLink, index) {
                    if (typeof encodedLink !== 'string') return;
                    var decoded = decodeLink(encodedLink);
                    if (decoded) {
                        links.push({
                            name: sourceName + (t.length > 1 ? ' #' + (index + 1) : ''),
                            url: decoded,
                            quality: '720p',
                            source: key,
                            extractor: null // Otomatik belirlenecek
                        });
                    }
                });
            } else if (typeof t === 'object' && t !== null) {
                Object.keys(t).forEach(function(qualityKey) {
                    var encodedLink = t[qualityKey];
                    if (typeof encodedLink !== 'string') return;
                    
                    var decoded = decodeLink(encodedLink);
                    if (decoded) {
                        var quality = '720p';
                        var qLower = qualityKey.toLowerCase();
                        if (qLower.includes('1080') || qLower.includes('fhd')) quality = '1080p';
                        else if (qLower.includes('720') || qLower.includes('hd')) quality = '720p';
                        else if (qLower.includes('480')) quality = '480p';
                        else if (qLower.includes('360')) quality = '360p';
                        
                        links.push({
                            name: sourceName + ' | ' + qualityKey,
                            url: decoded,
                            quality: quality,
                            source: key,
                            extractor: null
                        });
                    }
                });
            }
        });
    } catch (e) {
        console.error('[FullHD] Parse error:', e.message);
    }
    
    return links;
}

// URL'ye göre uygun extractor'ı belirle ve çalıştır
function resolveWithExtractor(linkData, referer) {
    var url = linkData.url;
    
    return new Promise(function(resolve) {
        // TurboImgz kontrolü
        if (url.includes('turbo.imgz.me')) {
            TurboImgz.extract(url, linkData.source, referer)
                .then(function(result) {
                    resolve(result);
                });
            return;
        }
        
        // RapidVid kontrolü
        if (url.includes('rapidvid.net')) {
            fetch(url, {
                headers: Object.assign({}, HEADERS, { 'Referer': referer })
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                resolve(RapidVid.extract(html, referer));
            })
            .catch(function() {
                resolve({ links: [], subtitles: [] });
            });
            return;
        }
        
        // VidMoxy kontrolü
        if (url.includes('vidmoxy.com')) {
            fetch(url, {
                headers: Object.assign({}, HEADERS, { 'Referer': referer })
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                resolve(VidMoxy.extract(html, referer));
            })
            .catch(function() {
                resolve({ links: [], subtitles: [] });
            });
            return;
        }
        
        // Direkt video URL'leri
        if (url.match(/\.(m3u8|mp4|mkv)($|\?)/i)) {
            resolve({
                links: [{
                    url: url,
                    type: url.includes('.m3u8') ? 'M3U8' : 'VIDEO',
                    name: linkData.name
                }],
                subtitles: []
            });
            return;
        }
        
        // Embed/player sayfaları
        fetch(url, {
            headers: Object.assign({}, HEADERS, { 'Referer': referer }),
            redirect: 'follow'
        })
        .then(function(res) { return res.text(); })
        .then(function(embedHtml) {
            // İçeride RapidVid mi?
            if (embedHtml.includes('rapidvid.net')) {
                var rvMatch = embedHtml.match(/https:\/\/rapidvid\.net[^"']+/);
                if (rvMatch) {
                    return fetch(rvMatch[0], {
                        headers: Object.assign({}, HEADERS, { 'Referer': url })
                    })
                    .then(function(res) { return res.text(); })
                    .then(function(html) {
                        resolve(RapidVid.extract(html, url));
                    });
                }
            }
            
            // İçeride VidMoxy mi?
            if (embedHtml.includes('vidmoxy.com')) {
                var vmMatch = embedHtml.match(/https:\/\/vidmoxy\.com[^"']+/);
                if (vmMatch) {
                    return fetch(vmMatch[0], {
                        headers: Object.assign({}, HEADERS, { 'Referer': url })
                    })
                    .then(function(res) { return res.text(); })
                    .then(function(html) {
                        resolve(VidMoxy.extract(html, url));
                    });
                }
            }
            
            // Direkt video ara
            var videoMatch = embedHtml.match(/src\s*=\s*["']([^"']*\.(?:m3u8|mp4)[^"']*)["']/i) ||
                            embedHtml.match(/file\s*:\s*["']([^"']*\.(?:m3u8|mp4)[^"']*)["']/i);
            
            if (videoMatch) {
                resolve({
                    links: [{
                        url: fixUrl(videoMatch[1]),
                        type: 'M3U8',
                        name: linkData.name
                    }],
                    subtitles: []
                });
            } else {
                resolve({ links: [], subtitles: [] });
            }
        })
        .catch(function(err) {
            console.error('[FullHD] Embed error:', err.message);
            resolve({ links: [], subtitles: [] });
        });
    });
}

function buildStreams(videoLinks, title, year, referer) {
    var allStreams = [];
    var allSubtitles = [];
    
    var extractPromises = videoLinks.map(function(link) {
        return resolveWithExtractor(link, referer).then(function(result) {
            result.links.forEach(function(stream) {
                allStreams.push({
                    name: '⌜ FullHD ⌟ | ' + stream.name,
                    title: title + (year ? ' (' + year + ')' : '') + ' · ' + link.quality,
                    url: stream.url,
                    quality: link.quality,
                    headers: Object.assign({}, STREAM_HEADERS, {
                        'Referer': referer
                    }),
                    type: stream.type,
                    provider: 'fullhdfilmizlesene'
                });
            });
            
            result.subtitles.forEach(function(sub) {
                allSubtitles.push(sub);
            });
        });
    });
    
    return Promise.all(extractPromises).then(function() {
        return { streams: allStreams, subtitles: allSubtitles };
    });
}

function fetchDetailAndStreams(filmUrl, mediaType, seasonNum, episodeNum) {
    console.log('[FullHD] Detail URL:', filmUrl);

    return fetch(filmUrl, { 
        headers: HEADERS,
        redirect: 'follow'
    })
    .then(function(res) { return res.text(); })
    .then(function(html) {
        var titleMatch = html.match(/<div[^>]*class=["']izle-titles["'][^>]*>([\s\S]*?)<\/div>/i) ||
                        html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                        html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"]+)["']/i);
        
        var title = 'FullHDFilmizlesene';
        if (titleMatch) {
            title = (titleMatch[1] || titleMatch[0])
                .replace(/<[^>]+>/g, '')
                .replace(/\[.*?\]/g, '')
                .trim();
        }
        
        var yearMatch = html.match(/<div[^>]*class=["']dd["'][^>]*>[\s\S]*?<a[^>]*class=["']category["'][^>]*>(\d{4})/i) ||
                       html.match(/(\d{4})/);
        var year = yearMatch ? yearMatch[1] : null;
        
        var videoLinks = extractVideoLinks(html);
        console.log('[FullHD] Found', videoLinks.length, 'encoded links');
        
        if (videoLinks.length === 0) {
            return { streams: [], subtitles: [] };
        }
        
        return buildStreams(videoLinks, title, year, filmUrl);
    });
}

function searchFullHD(title) {
    var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(title);
    
    return fetch(searchUrl, { 
        headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' })
    })
    .then(function(res) { return res.text(); })
    .then(function(html) {
        var results = [];
        var filmRegex = /<li[^>]*class=["'][^"']*film[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
        var match;
        
        while ((match = filmRegex.exec(html)) !== null) {
            var filmHtml = match[1];
            
            var titleMatch = filmHtml.match(/<span[^>]*class=["'][^"']*film-title[^"']*["'][^>]*>([^<]+)<\/span>/i) ||
                            filmHtml.match(/<a[^>]*title=["']([^"']+)["']/i);
            var filmTitle = titleMatch ? titleMatch[1].trim() : null;
            if (!filmTitle) continue;
            
            var hrefMatch = filmHtml.match(/<a[^>]+href\s*=\s*["']([^"']+)["']/i);
            var href = hrefMatch ? fixUrl(hrefMatch[1]) : null;
            if (!href) continue;
            
            var posterMatch = filmHtml.match(/<img[^>]+data-src\s*=\s*["']([^"']+)["']/i) ||
                             filmHtml.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
            var poster = fixUrl(posterMatch ? posterMatch[1] : null);
            
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
        
        return results;
    });
}

function findBestMatch(results, query) {
    if (!results || results.length === 0) return null;
    var queryLower = query.toLowerCase().trim();
    
    for (var i = 0; i < results.length; i++) {
        if (results[i].title.toLowerCase().trim() === queryLower) return results[i];
    }
    
    var queryWords = queryLower.split(/\s+/);
    for (var j = 0; j < results.length; j++) {
        var resultTitle = results[j].title.toLowerCase();
        var allMatch = queryWords.every(function(w) { return resultTitle.includes(w); });
        if (allMatch) return results[j];
    }
    
    for (var k = 0; k < results.length; k++) {
        if (results[k].title.toLowerCase().includes(queryLower)) return results[k];
    }
    
    return results[0];
}

function searchAndFetch(title, mediaType, seasonNum, episodeNum) {
    return searchFullHD(title)
        .then(function(results) {
            var best = findBestMatch(results, title);
            if (!best) {
                console.log('[FullHD] No match for:', title);
                return [];
            }
            
            return fetchDetailAndStreams(best.url, mediaType, seasonNum, episodeNum);
        })
        .then(function(result) {
            return result.streams || [];
        });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
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
                var year = (data.release_date || '').substring(0, 4);
                
                if (!title) {
                    resolve([]);
                    return;
                }
                
                return searchAndFetch(title, mediaType, seasonNum, episodeNum)
                    .then(function(streams) {
                        if ((!streams || streams.length === 0) && data.original_title && data.original_title !== title) {
                            return searchAndFetch(data.original_title, mediaType, seasonNum, episodeNum);
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
