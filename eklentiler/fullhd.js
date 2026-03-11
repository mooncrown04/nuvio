/**
 * FullHDFilmizlesene Nuvio Scraper - v25.0
 * SSL & Saat Senkronizasyonu Hata Düzeltmeleri
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

// Firestick'in SSL kontrolünü yumuşatmak için minimalist header seti
const LIGHT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Connection': 'keep-alive'
};

function rapidBypass(data) {
    try {
        // 1. Ters Çevir ve Base64'ten Çıkar
        var step1 = atob(data.split('').reverse().join('').replace(/[^A-Za-z0-9+/=]/g, ""));
        
        // 2. K9L Karakter Kaydırma (Shift) Algoritması
        var key = "K9L";
        var step2 = "";
        for (var i = 0; i < step1.length; i++) {
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            step2 += String.fromCharCode(step1.charCodeAt(i) - shift);
        }
        
        // 3. Çift Katman Kontrolü (Loglardaki ==Qe... durumu)
        var finalUrl = "";
        if (step2.startsWith("http") || step2.startsWith("//")) {
            finalUrl = step2;
        } else {
            finalUrl = atob(step2.replace(/[^A-Za-z0-9+/=]/g, ""));
        }
        
        finalUrl = finalUrl.replace(/\\/g, "").trim();
        return finalUrl.startsWith("//") ? "https:" + finalUrl : finalUrl;
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: LIGHT_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film bulunamadı");
                
                return fetch(link.startsWith('http') ? link : BASE_URL + link, { headers: LIGHT_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                var vidIdMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vidIdMatch) throw new Error("ID yok");

                return fetch("https://rapidvid.net/e/" + vidIdMatch[1], { 
                    headers: { 'Referer': BASE_URL + '/', 'User-Agent': LIGHT_HEADERS['User-Agent'] } 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var streamUrl = rapidBypass(avMatch[1]);
                    if (streamUrl && streamUrl.includes("http")) {
                        // Nuvio'nun beklediği sonuç dizisi
                        resolve([{
                            name: "FullHD - v25.0 (SSL Fix)",
                            url: streamUrl,
                            quality: "1080p",
                            headers: { 'Referer': 'https://rapidvid.net/', 'User-Agent': LIGHT_HEADERS['User-Agent'] },
                            provider: "fullhd_scraper"
                        }]);
                    } else { resolve([]); }
                } else { resolve([]); }
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
