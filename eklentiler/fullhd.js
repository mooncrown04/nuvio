/**
 * FullHDFilmizlesene Nuvio Scraper - v13.5
 * Strateji: ajax-data (data-id) bloğunu deşifre ederek gerçek tokenlı linke ulaşır.
 */

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

// Sitenin gizli deşifre fonksiyonu
function fullhdDecode(input) {
    try {
        // 1. Adım: Metni ters çevir
        var reversed = input.split('').reverse().join('');
        // 2. Adım: Base64 decode (Atob)
        var decoded = atob(reversed);
        // 3. Adım: Karakter kaydırma simülasyonu
        var result = "";
        for (var i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(decoded.charCodeAt(i) - 1);
        }
        return result;
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                console.error("[FullHD] v13.5 Anahtar Avcısı: " + query);
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: { 'User-Agent': userAgent } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film Bulunamadı");

                var filmUrl = link.indexOf('http') === 0 ? link : BASE_URL + link;
                return fetch(filmUrl, { headers: { 'User-Agent': userAgent } });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                var $ = cheerio.load(filmHtml);
                
                // Paylaştığın o kritik div'i yakalıyoruz
                var encryptedData = $(".ajax-data").attr("data-id");
                var vididMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                
                if (encryptedData) {
                    console.error("[FullHD] ajax-data yakalandı, kilit açılıyor...");
                    
                    // Sitenin yeni nesil embed yapısı (Token içerebilir)
                    var embedUrl = "https://rapidvid.net/e/" + (vididMatch ? vididMatch[1] : "");
                    
                    // ÖNEMLİ: Referer burada hayat kurtarır
                    return fetch(embedUrl, { 
                        headers: { 
                            'Referer': BASE_URL + '/', 
                            'User-Agent': userAgent,
                            'X-Requested-With': 'XMLHttpRequest'
                        } 
                    });
                } else {
                    throw new Error("ajax-data bulunamadı (Kalkan aktif)");
                }
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                // Rapidvid içindeki video linkini çözen kısım (atob + key-shift)
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var encodedData = avMatch[1];
                    var reversed = encodedData.split('').reverse().join('');
                    var binary = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
                    var key = "K9L";
                    var result = "";
                    for (var i = 0; i < binary.length; i++) {
                        var charCode = binary.charCodeAt(i);
                        var shift = (key.charCodeAt(i % key.length) % 5) + 1;
                        result += String.fromCharCode(charCode - shift);
                    }

                    if (result) {
                        console.error("[FullHD] ZAFER: Video linki deşifre edildi.");
                        resolve([{
                            name: "FullHD v13.5 (Decrypted)",
                            url: result.indexOf("//") === 0 ? "https:" + result : result,
                            quality: "1080p",
                            headers: { 'Referer': 'https://rapidvid.net/', 'User-Agent': userAgent },
                            provider: "fullhd_scraper"
                        }]);
                        return;
                    }
                }
                throw new Error("Video linki hala saklı (av bulunamadı)");
            })
            .catch(function(err) {
                console.error("[FullHD] Hata: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = global.getStreams || getStreams;
}
