/**
 * FullHDFilmizlesene Nuvio Scraper - v17.0 (scx Support)
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

// Base64 decode
function atob(s) {
    try {
        return Buffer.from(s, 'base64').toString('utf8');
    } catch(e) {
        return null;
    }
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
                console.error("[FullHD Scraper] Film sayfası çekildi.");
                
                // YENİ YÖNTEM: scx değişkenini bul
                var scxMatch = filmHtml.match(/var scx = (\{.*?\});/);
                if (scxMatch) {
                    try {
                        var scxData = JSON.parse(scxMatch[1]);
                        var streams = [];
                        var keys = ['atom', 'advid', 'advidprox', 'proton', 'fast', 'fastly', 'tr', 'en'];
                        
                        keys.forEach(function(key) {
                            if (scxData[key] && scxData[key].sx && scxData[key].sx.t) {
                                var t = scxData[key].sx.t;
                                var items = Array.isArray(t) ? t : [t];
                                
                                items.forEach(function(item) {
                                    if (typeof item === 'string') {
                                        var rot13 = rtt(item);
                                        var url = atob(rot13);
                                        
                                        if (url && url.startsWith('http')) {
                                            console.error("[FullHD Scraper] Bulunan URL (" + key + "):", url);
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
                            return resolve(streams);
                        }
                    } catch(e) {
                        console.error("[FullHD Scraper] scx parse hatası:", e.message);
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

// KRİTİK: Export et
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    globalThis.getStreams = getStreams;
}
