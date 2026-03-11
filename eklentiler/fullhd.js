/**
 * FullHDFilmizlesene Nuvio Scraper - v7.5
 * Güncellenmiş RapidVid K9L Çözücü
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

// En stabil header seti
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': BASE_URL + '/'
};

/**
 * Yeni RapidVid Şifre Çözücü (K9L Algorithm)
 */
function rapidDecode(input) {
    try {
        // 1. Gelen veriyi ters çevir ve Base64'ten çıkar
        var reversed = input.split('').reverse().join('');
        var step1 = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
        
        // 2. K9L Anahtarı ile karakter kaydırmayı geri al
        var key = "K9L";
        var step2 = "";
        for (var i = 0; i < step1.length; i++) {
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            step2 += String.fromCharCode(step1.charCodeAt(i) - shift);
        }
        
        // 3. İkinci katman Base64 çözümleme
        var finalUrl = "";
        if (step2.startsWith("http") || step2.startsWith("//")) {
            finalUrl = step2;
        } else {
            // Eğer hala şifreliyse bir tur daha Base64 çöz
            finalUrl = atob(step2.replace(/[^A-Za-z0-9+/=]/g, ""));
        }
        
        // URL temizliği
        finalUrl = finalUrl.replace(/\\/g, "").trim();
        return finalUrl.startsWith("//") ? "https:" + finalUrl : finalUrl;
    } catch (e) {
        console.error("[FullHD] Çözme Hatası:", e.message);
        return null;
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        // TMDB üzerinden film bilgilerini al
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var filmPath = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                
                if (!filmPath) throw new Error("Film bulunamadı");
                return fetch(filmPath.startsWith('http') ? filmPath : BASE_URL + filmPath, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmPageHtml) {
                // Video ID'sini bul
                var vidIdMatch = filmPageHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vidIdMatch) throw new Error("Video ID bulunamadı");

                // RapidVid embed sayfasını çek
                return fetch("https://rapidvid.net/e/" + vidIdMatch[1], { 
                    headers: { 'Referer': BASE_URL + '/', 'User-Agent': HEADERS['User-Agent'] } 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                // Şifreli 'av' parametresini bul
                var avPattern = /av\(['"]([^'"]+)['"]\)/;
                var match = embedHtml.match(avPattern);
                
                if (match && match[1]) {
                    var streamUrl = rapidDecode(match[1]);
                    
                    if (streamUrl && streamUrl.includes("http")) {
                        resolve([{
                            name: "FullHD - Rapid (v7.5 Fixed)",
                            url: streamUrl,
                            quality: "1080p",
                            headers: { 
                                'Referer': 'https://rapidvid.net/', 
                                'User-Agent': HEADERS['User-Agent'] 
                            },
                            provider: "fullhd_scraper"
                        }]);
                    } else { resolve([]); }
                } else {
                    // Eğer şifreli değilse m3u8 ara
                    var m3u8Match = embedHtml.match(/file["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
                    if (m3u8Match) {
                        resolve([{
                            name: "FullHD - M3U8",
                            url: m3u8Match[1],
                            quality: "Auto",
                            headers: { 'Referer': 'https://rapidvid.net/' },
                            provider: "fullhd_scraper"
                        }]);
                    } else { resolve([]); }
                }
            })
            .catch(function(err) {
                console.error('[FullHD] Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
