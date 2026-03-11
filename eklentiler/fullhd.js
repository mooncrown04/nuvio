/**
 * FullHDFilmizlesene Nuvio Scraper - v22.0 (Promise Fix)
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

// Eski RapidVid decode (yedek)
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

// API'den stream al - DÜZELTİLDİ
function getStreamsFromAPI(vidid) {
    return new Promise(function(resolve) {
        var streams = [];
        var completedRequests = 0;
        var totalRequests = 2;
        
        function checkComplete() {
            completedRequests++;
            console.error("[FullHD] Tamamlanan istekler:", completedRequests + "/" + totalRequests);
            if (completedRequests >= totalRequests) {
                console.error("[FullHD] Toplam stream bulunan:", streams.length);
                resolve(streams);
            }
        }
        
        // Atom API
        var atomUrl = API_BASE + '?id=' + vidid + '&type=t&name=atom&get=video&format=json';
        console.error("[FullHD] Atom API çağrılıyor:", atomUrl);
        
        fetch(atomUrl, { headers: WORKING_HEADERS })
            .then(function(res) { 
                console.error("[FullHD] Atom API yanıt status:", res.status);
                return res.text(); 
            })
            .then(function(data) {
                console.error("[FullHD] Atom yanıt:", data.substring(0, 300));
                var clean = data.replace(/\\/g, '');
                var htmlMatch = clean.match(/"html":"(.*?)"/);
                
                if (htmlMatch) {
                    var playerUrl = htmlMatch[1];
                    console.error("[FullHD] Atom player URL:", playerUrl);
                    
                    return fetch(playerUrl, { headers: WORKING_HEADERS });
                } else {
                    console.error("[FullHD] Atom html match bulunamadı");
                    throw new Error("Atom html bulunamadı");
                }
            })
            .then(function(res) { 
                if (!res) return null;
                return res.text(); 
            })
            .then(function(playerHtml) {
                if (!playerHtml) return;
                
                console.error("[FullHD] Atom player HTML:", playerHtml.substring(0, 400));
                
                // Eski yöntem: av()
                var avMatch = playerHtml.match(/"file":\s*av\(['"]([^'"]+)['"]\)/) ||
                             playerHtml.match(/av\(['"]([^'"]+)['"]\)/);
                
                if (avMatch) {
                    console.error("[FullHD] Atom av() bulundu:", avMatch[1].substring(0, 50));
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
                } else {
                    console.error("[FullHD] Atom av() bulunamadı");
                }
                
                // Yeni yöntem: direkt file
                var fileMatch = playerHtml.match(/"file":\s*"(.*?)"/) ||
                               playerHtml.match(/file:\s*"(.*?)"/);
                if (fileMatch && !avMatch) {
                    console.error("[FullHD] Atom direkt file bulundu:", fileMatch[1]);
                    if (fileMatch[1].startsWith('http')) {
                        streams.push({
                            name: "FullHD - Atom",
                            title: "Atom Akışı",
                            url: fileMatch[1],
                            quality: "1080p",
                            headers: WORKING_HEADERS,
                            provider: "fullhd_scraper"
                        });
                    }
                }
            })
            .catch(function(err) {
                console.error("[FullHD] Atom hata:", err.message);
            })
            .finally(function() {
                checkComplete();
            });
        
        // Turbo API
        var turboUrl = API_BASE + '?id=' + vidid + '&type=t&name=advid&get=video&pno=tr&format=json';
        console.error("[FullHD] Turbo API çağrılıyor:", turboUrl);
        
        fetch(turboUrl, { headers: WORKING_HEADERS })
            .then(function(res) {
                console.error("[FullHD] Turbo API yanıt status:", res.status);
                return res.text();
            })
            .then(function(data) {
                console.error("[FullHD] Turbo yanıt:", data.substring(0, 300));
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
                    });
                } else {
                    console.error("[FullHD] Turbo watch match bulunamadı");
                    throw new Error("Turbo watch bulunamadı");
                }
            })
            .then(function(res) {
                if (!res) return null;
                return res.text();
            })
            .then(function(playHtml) {
                if (!playHtml) return;
                
                console.error("[FullHD] Turbo play HTML:", playHtml.substring(0, 400));
                
                var m3u8Match = playHtml.match(/file:\s*"(.*?)"/) ||
                               playHtml.match(/"file":\s*"(.*?)"/) ||
                               playHtml.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
                
                if (m3u8Match) {
                    var m3u8Url = m3u8Match[1];
                    console.error("[FullHD] Turbo M3U8 bulundu:", m3u8Url);
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
                } else {
                    console.error("[FullHD] Turbo M3U8 bulunamadı");
                }
            })
            .catch(function(err) {
                console.error("[FullHD] Turbo hata:", err.message);
            })
            .finally(function() {
                checkComplete();
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
                
                // Film sayfasına git
                var filmUrl = BASE_URL + '/film/' + encodeURIComponent(query) + '/';
                console.error("[FullHD Scraper] Film URL:", filmUrl);
                
                return fetch(filmUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                console.error("[FullHD Scraper] Film sayfası çekildi. HTML uzunluğu:", filmHtml.length);
                
                // Yöntem 1: vidid bul
                var vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/) ||
                              filmHtml.match(/data-vid\s*=\s*['"](\d+)['"]/);
                
                if (vidMatch) {
                    var vidid = vidMatch[1];
                    console.error("[FullHD Scraper] vidid bulundu:", vidid);
                    return getStreamsFromAPI(vidid);
                }
                
                // Yöntem 2: scx kullan
                console.error("[FullHD Scraper] vidid bulunamadı, scx deneniyor...");
                var scxMatch = filmHtml.match(/var scx = (\{.*?\});/);
                if (scxMatch) {
                    try {
                        var scxData = JSON.parse(scxMatch[1]);
                        console.error("[FullHD Scraper] scx bulundu, anahtarlar:", Object.keys(scxData));
                        // scx parse kodu buraya...
                        return [];
                    } catch(e) {
                        console.error("[FullHD Scraper] scx parse hatası:", e.message);
                    }
                }
                
                console.error("[FullHD Scraper] Hiçbir yöntem çalışmadı");
                return [];
            })
            .then(function(streams) {
                console.error("[FullHD Scraper] Döndürülen stream sayısı:", streams.length);
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
