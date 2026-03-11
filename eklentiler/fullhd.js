/**
 * FullHDFilmizlesene Nuvio Scraper - v15.8
 * Durum: Player yakalama başarılı. Akış ve SSL stabilizasyonu eklendi.
 */

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

function decodeRapidVid(encodedData) {
    try {
        var reversed = encodedData.split('').reverse().join('');
        var binary = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
        var key = "K9L";
        var adjusted = "";
        for (var i = 0; i < binary.length; i++) {
            var charCode = binary.charCodeAt(i);
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            adjusted += String.fromCharCode(charCode - shift);
        }
        var finalUrl = atob(adjusted);
        return finalUrl.replace(/\\/g, "").trim();
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

        // 1. Film Arama
        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR')
            .then(res => res.json())
            .then(data => {
                var query = data.title || data.original_title;
                console.error("[FullHD] v15.8 Başlatıldı: " + query);
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: { 'User-Agent': userAgent } });
            })
            .then(res => res.text())
            .then(html => {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film Bulunamadı");
                return fetch(link.startsWith('http') ? link : BASE_URL + link, { headers: { 'User-Agent': userAgent } });
            })
            .then(res => res.text())
            .then(filmHtml => {
                var $ = cheerio.load(filmHtml);
                var vidIdMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                
                if (vidIdMatch) {
                    var target = "https://rapidvid.net/e/" + vidIdMatch[1];
                    console.error("[FullHD] Player Yakalandı: " + target);
                    
                    // ÖNEMLİ: Cihazın sertifika hatasına takılmaması için doğrudan embed sayfasına gidiyoruz
                    return fetch(target, { 
                        headers: { 
                            'User-Agent': userAgent, 
                            'Referer': BASE_URL + '/',
                            'Accept': 'text/html,application/xhtml+xml'
                        } 
                    });
                }
                throw new Error("ID bulunamadı.");
            })
            .then(res => res ? res.text() : null)
            .then(embedHtml => {
                if (!embedHtml) return resolve([]);

                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var streamUrl = decodeRapidVid(avMatch[1]);
                    if (streamUrl) {
                        var finalUrl = streamUrl.startsWith("//") ? "https:" + streamUrl : streamUrl;
                        console.error("[FullHD] AKIŞ HAZIR!");
                        
                        return resolve([{
                            name: "FullHD Premium",
                            url: finalUrl,
                            quality: "1080p",
                            headers: { 
                                'Referer': 'https://rapidvid.net/', 
                                'User-Agent': userAgent,
                                'Connection': 'keep-alive' 
                            }
                        }]);
                    }
                }
                resolve([]);
            })
            .catch(err => {
                console.error("[FullHD] Hata: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams: getStreams };
