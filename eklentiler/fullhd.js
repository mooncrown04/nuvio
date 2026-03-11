/**
 * FullHDFilmizlesene Nuvio Scraper - v15.0
 * Strateji: CloudStream tabanlı çift katmanlı deşifre (Base64 + Shift + Base64).
 */

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

// CloudStream tabanlı gelişmiş deşifre fonksiyonu
function decodeRapidVidV15(encodedData) {
    try {
        // 1. Adım: Ters çevir ve Base64'ten çöz
        var reversed = encodedData.split('').reverse().join('');
        var binary = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
        
        // 2. Adım: "K9L" anahtarı ile karakter kaydırma (Kotlin portu)
        var key = "K9L";
        var adjusted = "";
        for (var i = 0; i < binary.length; i++) {
            var charCode = binary.charCodeAt(i);
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            adjusted += String.fromCharCode(charCode - shift);
        }
        
        // 3. ADIM (KRİTİK): Çıkan sonucu tekrar Base64'ten çöz (Kotlin'deki secondPass)
        var finalUrl = atob(adjusted);
        
        // Temizlik: Ters slashları ve gereksiz boşlukları sil
        return finalUrl.replace(/\\/g, "").trim();
    } catch (e) { 
        console.error("[FullHD] Decode Hatası: " + e.message);
        return null; 
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                console.error("[FullHD] v15.0 Başlatıldı: " + query);
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
                var dataId = $(".ajax-data").attr("data-id");
                
                if (!dataId) throw new Error("ajax-data bulunamadı");

                // AJAX Paketini basitçe çöz (İlk katman)
                var rev = dataId.split('').reverse().join('');
                var decryptedPackage = atob(rev); 
                
                console.error("[FullHD] Paket Çözüldü, Player Aranıyor...");

                // URL Ayıklama
                var urls = decryptedPackage.match(/https?:\/\/[^"'\s<>\\ ]+/g) || [];
                var validLinks = urls.map(function(u) { return u.replace(/\\/g, ""); })
                                     .filter(function(u) { 
                                         return u.includes("rapid") || u.includes("moly") || u.includes(".m3u8"); 
                                     });

                if (validLinks.length > 0) {
                    var target = validLinks[0];
                    console.error("[FullHD] Player Hedefi: " + target);
                    
                    if (target.includes(".m3u8")) {
                        resolve([{
                            name: "FullHD Direct",
                            url: target,
                            quality: "1080p",
                            headers: { 'Referer': BASE_URL + '/', 'User-Agent': userAgent }
                        }]);
                        return;
                    }

                    return fetch(target, { headers: { 'Referer': BASE_URL + '/', 'User-Agent': userAgent } });
                } else {
                    // Fallback: vidid araması
                    var vidid = (filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i) || [])[1];
                    if (vidid) return fetch("https://rapidvid.net/e/" + vidid, { headers: { 'Referer': BASE_URL + '/', 'User-Agent': userAgent } });
                    throw new Error("Uygun link bulunamadı");
                }
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(embedHtml) {
                if (!embedHtml) return;

                // Kotlin'deki av(...) yakalama mantığı
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var finalUrl = decodeRapidVidV15(avMatch[1]);
                    
                    if (finalUrl) {
                        console.error("[FullHD] BAŞARILI! Stream URL: " + finalUrl);
                        resolve([{
                            name: "FullHD Premium v15.0",
                            url: finalUrl.startsWith("//") ? "https:" + finalUrl : finalUrl,
                            quality: "1080p",
                            headers: { 
                                'Referer': 'https://rapidvid.net/', 
                                'User-Agent': userAgent,
                                'Origin': 'https://rapidvid.net'
                            },
                            provider: "fullhd_scraper"
                        }]);
                        return;
                    }
                }
                resolve([]);
            })
            .catch(function(err) {
                console.error("[FullHD] HATA: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = global.getStreams || getStreams;
}
