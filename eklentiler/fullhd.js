/**
 * FullHDFilmizlesene Nuvio Scraper - v21.0 (API Endpoint)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";
const API_BASE = "https://www.fullhdfilmizlesene.live/player/api.php";

const WORKING_HEADERS = {
    'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; ASUS_I005DA Build/PI)',
    'Accept': 'application/json, text/html',
    'Accept-Encoding': 'gzip',
    'Connection': 'Keep-Alive'
};

// Eski RapidVid decode fonksiyonu (yedek)
function decodeRapidVid(encodedData) {
    try {
        var reversed = encodedData.split('').reverse().join('');
        var binary = Buffer.from(reversed.replace(/[^A-Za-z0-9+/=]/g, ""), 'base64').toString('binary');
        var key = "K9L";
        var adjusted = "";
        for (var i = 0; i < binary.length; i++) {
            var charCode = binary.charCodeAt(i);
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            adjusted += String.fromCharCode(charCode - shift);
        }
        return Buffer.from(adjusted, 'base64').toString('utf8').replace(/\\/g, "").trim();
    } catch (e) {
        return null;
    }
}

// Yeni API'den stream al
function getStreamsFromAPI(vidid) {
    return new Promise(function(resolve) {
        var streams = [];
        
        // Atom API
        var atomUrl = API_BASE + '?id=' + vidid + '&type=t&name=atom&get=video&format=json';
        // Turbo/Advid API  
        var turboUrl = API_BASE + '?id=' + vidid + '&type=t&name=advid&get=video&pno=tr&format=json';
        
        console.error("[FullHD] Atom API:", atomUrl);
        console.error("[FullHD] Turbo API:", turboUrl);
        
        // Atom isteği
        var atomPromise = fetch(atomUrl, { headers: WORKING_HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(data) {
                console.error("[FullHD] Atom yanıt:", data.substring(0, 200));
                var clean = data.replace(/\\/g, '');
                var htmlMatch = clean.match(/"html":"(.*?)"/);
                
                if (htmlMatch) {
                    var playerUrl = htmlMatch[1];
                    console.error("[FullHD] Atom player URL:", playerUrl);
                    
                    // Player'dan gerçek linki al
                    return fetch(playerUrl, { headers: WORKING_HEADERS })
                        .then(function(res) { return res.text(); })
                        .then(function(playerHtml) {
                            console.error("[FullHD] Atom player HTML:", playerHtml.substring(0, 300));
                            
                            // Eski yöntem: av() fonksiyonu
                            var avMatch = playerHtml.match(/"file":\s*av\(['"]([^'"]+)['"]\)/) ||
                                         playerHtml.match(/av\(['"]([^'"]+)['"]\)/);
                            
                            if (avMatch) {
                                var decoded = decodeRapidVid(avMatch[1]);
                                console.error("[FullHD] Atom decoded:", decoded);
                                if (decoded && decoded.startsWith('http')) {
                                    streams.push({
                                        name: "FullHD - Atom",
                                        title: "Atom Akışı",
                                        url: decoded,
                                        quality: "1080p",
                                        headers: WORKING_HEADERS,
                                        provider: "fullhd_scraper"
                                    });
                                }
                            }
                            
                            // Yeni yöntem: direkt file
                            var fileMatch = playerHtml.match(/"file":\s*"(.*?)"/) ||
                                           playerHtml.match(/file:\s*"(.*?)"/);
                            if (fileMatch && !avMatch) {
                                var url = fileMatch[1];
                                if (url.startsWith('http')) {
                                    streams.push({
                                        name: "FullHD - Atom",
                                        title: "Atom Akışı",
                                        url: url,
                                        quality: "1080p",
                                        headers: WORKING_HEADERS,
                                        provider: "fullhd_scraper"
                                    });
                                }
                            }
                        });
                }
            })
            .catch(function(err) {
                console.error("[FullHD] Atom hata:", err.message);
            });
        
        // Turbo isteği
        var turboPromise = fetch(turboUrl, { headers: WORKING_HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(data) {
                console.error("[FullHD] Turbo yanıt:", data.substring(0, 200));
                var clean = data.replace(/\\/g, '');
                var watchMatch = clean.match(/\/watch\/(.*?)"/);
                
                if (watchMatch) {
                    var turboId = watchMatch[1];
                    var playUrl = 'https://turbo.imgz.me/play/' + turboId + '?autoplay=true';
                    console.error("[FullHD] Turbo play URL:", playUrl);
                    
                    return fetch(playUrl, { 
                        headers: Object.assign({}, WORKING_HEADERS, {
                            'Referer': 'https://www.fullhdfilmizlesene.live/'
                        })
                    })
                    .then(function(res) { return res.text(); })
                    .then(function(playHtml) {
                        console.error("[FullHD] Turbo play HTML:", playHtml.substring(0, 300));
                        
                        var m3u8Match = playHtml.match(/file:\s*"(.*?)"/) ||
                                       playHtml.match(/"file":\s*"(.*?)"/) ||
                                       playHtml.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
                        
                        if (m3u8Match) {
                            var m3u8Url = m3u8Match[1];
                            console.error("[FullHD] Turbo M3U8:", m3u8Url);
                            if (m3u8Url.startsWith('http')) {
                                streams.push({
                                    name: "FullHD - Turbo",
                                    title: "Turbo M3U8",
                                    url: m3u8Url,
                                    quality: "1080p",
                                    headers: Object.assign({}, WORKING_HEADERS, {
                                        'Referer': 'https://turbo.imgz.me/'
                                    }),
                                    provider: "fullhd_scraper"
                                });
                            }
                        }
                    });
                }
            })
            .catch(function(err) {
                console.error("[FullHD] Turbo hata:", err.message);
            });
        
        // Her iki isteği bekle
        Promise.all([atomPromise, turboPromise])
            .then(function() {
                console.error("[FullHD] Toplam stream:", streams.length);
                resolve(streams);
            })
            .catch(function() {
                resolve(streams);
            });
    });
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
                return fetch(BASE_URL + '/film/' + encodeURIComponent(query) + '/', { 
                    headers: WORKING_HEADERS 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                console.error("[FullHD Scraper] Film sayfası çekildi.");
                
                // Yeni yöntem: vidid bul
                var vidMatch = html.match(/vidid\s*=\s*['"](\d+)['"]/) ||
                              html.match(/data-vid\s*=\s*['"](\d+)['"]/);
                
                if (vidMatch) {
                    var vidid = vidMatch[1];
                    console.error("[FullHD Scraper] vidid bulundu:", vidid);
                    return getStreamsFromAPI(vidid);
                }
                
                // Yedek: scx kullan
                var scxMatch = html.match(/var scx = (\{.*?\});/);
                if (scxMatch) {
                    // ... scx parse kodu (önceki versiyon) ...
                }
                
                return [];
            })
            .then(function(streams) {
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[FullHD Scraper Error]:', err.message);
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
