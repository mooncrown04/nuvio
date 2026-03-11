/**
 * FullHDFilmizlesene Nuvio Scraper - v24.0 (Enhanced Fix)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";
const API_BASE = "https://www.fullhdfilmizlesene.live/player/api.php";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'Connection': 'keep-alive'
};

// Geliştirilmiş RapidVid Decode
function decodeRapidVid(encodedData) {
    try {
        if (!encodedData) return null;
        // Veriyi ters çevir
        var reversed = encodedData.split('').reverse().join('');
        // Base64 temizle ve çöz
        var binary = Buffer.from(reversed.replace(/[^A-Za-z0-9+/=]/g, ""), 'base64').toString('binary');
        
        var key = "K9L";
        var adjusted = "";
        for (var i = 0; i < binary.length; i++) {
            var charCode = binary.charCodeAt(i);
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            adjusted += String.fromCharCode(charCode - shift);
        }
        
        var finalUrl = Buffer.from(adjusted, 'base64').toString('utf8').replace(/\\/g, "").trim();
        return finalUrl.startsWith('http') ? finalUrl : null;
    } catch (e) {
        console.error("[FullHD] Decode Hatası:", e.message);
        return null;
    }
}

// API'den stream al
function getStreamsFromAPI(vidid) {
    return new Promise(function(resolve) {
        var streams = [];
        var completedRequests = 0;
        var totalRequests = 2;
        
        function checkComplete() {
            completedRequests++;
            if (completedRequests >= totalRequests) {
                console.error("[FullHD] Toplam stream bulundu:", streams.length);
                resolve(streams);
            }
        }
        
        // Atom API
        var atomUrl = API_BASE + '?id=' + vidid + '&type=t&name=atom&get=video&format=json';
        fetch(atomUrl, { headers: WORKING_HEADERS })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data && data.html) {
                    var playerUrl = data.html.replace(/\\/g, '');
                    console.error("[FullHD] Atom Player URL:", playerUrl);
                    return fetch(playerUrl, { headers: WORKING_HEADERS });
                }
                throw new Error("Atom HTML yok");
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(playerHtml) {
                if (!playerHtml) return;
                
                // av('...') içindeki şifreli datayı bul
                var avMatch = playerHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var decoded = decodeRapidVid(avMatch[1]);
                    if (decoded) {
                        streams.push({
                            name: "FullHD - Atom",
                            title: "Atom (1080p)",
                            url: decoded,
                            quality: "1080p",
                            headers: WORKING_HEADERS,
                            provider: "fullhd_scraper"
                        });
                    }
                }
            })
            .catch(function(err) { console.error("[FullHD] Atom Hatası:", err.message); })
            .finally(function() { checkComplete(); });
        
        // Turbo API
        var turboUrl = API_BASE + '?id=' + vidid + '&type=t&name=advid&get=video&pno=tr&format=json';
        fetch(turboUrl, { headers: WORKING_HEADERS })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data && data.html && data.html.includes('/watch/')) {
                    var watchId = data.html.match(/\/watch\/(.*?)"/)[1];
                    var playUrl = 'https://turbo.imgz.me/play/' + watchId + '?autoplay=true';
                    return fetch(playUrl, { 
                        headers: Object.assign({}, WORKING_HEADERS, { 'Referer': BASE_URL }) 
                    });
                }
                throw new Error("Turbo Watch Linki Yok");
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(playHtml) {
                if (!playHtml) return;
                var m3u8Match = playHtml.match(/file:\s*"(.*?\.m3u8.*?)"/i);
                if (m3u8Match) {
                    streams.push({
                        name: "FullHD - Turbo",
                        title: "Turbo (HLS)",
                        url: m3u8Match[1],
                        quality: "1080p",
                        headers: Object.assign({}, WORKING_HEADERS, { 'Referer': 'https://turbo.imgz.me/' }),
                        provider: "fullhd_scraper"
                    });
                }
            })
            .catch(function(err) { console.error("[FullHD] Turbo Hatası:", err.message); })
            .finally(function() { checkComplete(); });
    });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
        
        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var $ = cheerio.load(searchHtml);
                var filmLink = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!filmLink) throw new Error("Film bulunamadı");
                
                var filmUrl = filmLink.startsWith('http') ? filmLink : BASE_URL + filmLink;
                return fetch(filmUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                // 1. Yöntem: vidid üzerinden API
                var vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                if (vidMatch) {
                    return getStreamsFromAPI(vidMatch[1]);
                }
                
                // 2. Yöntem: scx JSON objesi (Yeni sistem)
                var scxMatch = filmHtml.match(/var scx = (\{.*?\});/);
                if (scxMatch) {
                    var scxData = JSON.parse(scxMatch[1]);
                    if (scxData.sources && scxData.sources.length > 0) {
                        return scxData.sources.map(s => ({
                            name: "FullHD - " + (s.label || "Kaynak"),
                            url: s.file,
                            quality: s.label || "720p",
                            headers: WORKING_HEADERS,
                            provider: "fullhd_scraper"
                        }));
                    }
                }
                return [];
            })
            .then(function(streams) { resolve(streams); })
            .catch(function(err) {
                console.error('[FullHD Scraper Error]:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    globalThis.getStreams = getStreams;
}
