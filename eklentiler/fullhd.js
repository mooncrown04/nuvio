/**
 * FullHDFilmizlesene Nuvio Scraper - v24.0
 * Donanım Uyumluluğu + RapidVid Final Bypass
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

// Loglardaki donanım hatalarını önlemek için optimize edilmiş headerlar
const FINAL_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Connection': 'keep-alive'
};

function decodeFinal(input) {
    try {
        // 1. Ters çevir ve temizle
        var cleanInput = input.split('').reverse().join('').replace(/[^A-Za-z0-9+/=]/g, "");
        var step1 = atob(cleanInput);
        
        // 2. K9L Kaydırma
        var key = "K9L";
        var step2 = "";
        for (var i = 0; i < step1.length; i++) {
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            step2 += String.fromCharCode(step1.charCodeAt(i) - shift);
        }
        
        // 3. Çift Katman Kontrolü (Loglarda çıkan ==Qe... durumu için)
        var finalUrl = "";
        if (step2.includes("http") || step2.startsWith("//")) {
            finalUrl = step2;
        } else {
            // Eğer hala şifreliyse bir kez daha çöz
            finalUrl = atob(step2.replace(/[^A-Za-z0-9+/=]/g, ""));
        }
        
        var result = finalUrl.replace(/\\/g, "").trim();
        return result.startsWith("//") ? "https:" + result : result;
    } catch (e) { 
        return null; 
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        // TMDB üzerinden film adını çek
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: FINAL_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film Bulunamadı");
                
                return fetch(link.startsWith('http') ? link : BASE_URL + link, { headers: FINAL_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                var vidId = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vidId) throw new Error("vidid yok");

                return fetch("https://rapidvid.net/e/" + vidId[1], { 
                    headers: { 'Referer': BASE_URL + '/', 'User-Agent': FINAL_HEADERS['User-Agent'] } 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var stream = decodeFinal(avMatch[1]);
                    if (stream && stream.includes("http")) {
                        console.error("[FullHD] BAŞARILI: " + stream);
                        resolve([{
                            name: "FullHD - v24.0",
                            url: stream,
                            quality: "1080p",
                            headers: { 'Referer': 'https://rapidvid.net/', 'User-Agent': FINAL_HEADERS['User-Agent'] },
                            provider: "fullhd_scraper"
                        }]);
                    } else {
                        resolve([]);
                    }
                } else {
                    resolve([]);
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
