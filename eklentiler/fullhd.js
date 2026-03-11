/**
 * FullHDFilmizlesene Nuvio Scraper - v19.0 (Browser Compatible)
 */

var cheerio = require("cheerio-without-node-native");

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'identity',
    'Origin': 'https://www.fullhdfilmizlesene.live',
    'Referer': 'https://www.fullhdfilmizlesene.live/',
    'DNT': '1'
};

const BASE_URL = "https://www.fullhdfilmizlesene.live";

// ROT13 decode
function rtt(s) {
    return s.split('').map(function(c) {
        var code = c.charCodeAt(0);
        if (code >= 97 && code <= 122) return String.fromCharCode((code - 97 + 13) % 26 + 97);
        if (code >= 65 && code <= 90) return String.fromCharCode((code - 65 + 13) % 26 + 65);
        return c;
    }).join('');
}

// Base64 decode (Browser + Node.js compatible)
function atob(s) {
    try {
        // Node.js Buffer
        if (typeof Buffer !== 'undefined' && Buffer.from) {
            return Buffer.from(s, 'base64').toString('utf8');
        }
        // Browser native atob
        if (typeof window !== 'undefined' && window.atob) {
            return window.atob(s);
        }
        // Global atob (some environments)
        if (typeof global !== 'undefined' && global.atob) {
            return global.atob(s);
        }
        return null;
    } catch(e) {
        console.error("[FullHD Scraper] Base64 decode hata:", e.message, "Input:", s.substring(0, 50));
        return null;
    }
}

// Tüm yöntemlerle scx parse dene
function parseScx(html) {
    var methods = [
        function() {
            var match = html.match(/var scx\s*=\s*(\{[\s\S]*?\});/);
            if (match) return JSON.parse(match[1]);
            return null;
        },
        function() {
            var start = html.indexOf('var scx = ');
            if (start === -1) return null;
            var braceStart = start + 9;
            var braceCount = 0;
            var end = braceStart;
            for (var i = braceStart; i < html.length; i++) {
                if (html[i] === '{') braceCount++;
                if (html[i] === '}') braceCount--;
                if (braceCount === 0 && html[i] === '}') {
                    end = i + 1;
                    break;
                }
            }
            var jsonStr = html.substring(braceStart, end);
            return JSON.parse(jsonStr);
        }
    ];
    
    for (var i = 0; i < methods.length; i++) {
        try {
            var result = methods[i]();
            if (result) {
                console.error("[FullHD Scraper] Yöntem " + (i+1) + " başarılı");
                return result;
            }
        } catch(e) {
            console.error("[FullHD Scraper] Yöntem " + (i+1) + " hata:", e.message);
        }
    }
    return null;
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') {
            console.error("[FullHD Scraper] Dizi tipi desteklenmiyor.");
            return resolve([]);
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
        console.error("[FullHD Scraper] TMDB URL:", tmdbUrl);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                console.error("[FullHD Scraper] TMDB Title:", query);
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                console.error("[FullHD Scraper] Arama sonucu geldi.");
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                console.error("[FullHD Scraper] Bulunan film linki:", link);
                if (!link) throw new Error("Film bulunamadı");
                var filmUrl = link.startsWith('http') ? link : BASE_URL + link;
                console.error("[FullHD Scraper] Film URL:", filmUrl);
                return fetch(filmUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                console.error("[FullHD Scraper] Film sayfası çekildi. HTML uzunluğu:", filmHtml.length);
                
                var scxData = parseScx(filmHtml);
                
                if (scxData) {
                    console.error("[FullHD Scraper] scx parse edildi, anahtarlar:", Object.keys(scxData));
                    var streams = [];
                    var keys = ['atom', 'advid', 'advidprox', 'proton', 'fast', 'fastly', 'tr', 'en'];
                    
                    keys.forEach(function(key) {
                        if (scxData[key] && scxData[key].sx && scxData[key].sx.t) {
                            var t = scxData[key].sx.t;
                            var items = Array.isArray(t) ? t : [t];
                            
                            items.forEach(function(item) {
                                console.error("[FullHD Scraper] İşlenen item (" + key + "):", item);
                                if (typeof item === 'string') {
                                    var rot13 = rtt(item);
                                    console.error("[FullHD Scraper] ROT13 sonucu:", rot13);
                                    var url = atob(rot13);
                                    console.error("[FullHD Scraper] URL:", url);
                                    
                                    if (url && url.startsWith('http')) {
                                        console.error("[FullHD Scraper] Stream eklendi:", url);
                                        streams.push({
                                            name: "FullHD - " + key,
                                            title: key + " Akışı",
                                            url: url,
                                            quality: "1080p",
                                            headers: WORKING_HEADERS,
                                            provider: "fullhd_scraper"
                                        });
                                    }
                                }
                            });
                        }
                    });
                    
                    if (streams.length > 0) {
                        console.error("[FullHD Scraper] Toplam stream:", streams.length);
                        return resolve(streams);
                    }
                }
                
                console.error("[FullHD Scraper] Stream bulunamadı.");
                resolve([]);
            })
            .catch(function(err) {
                console.error('[FullHD Scraper Error]:', err && err.message ? err.message : err);
                resolve([]);
            });
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    globalThis.getStreams = getStreams;
}
