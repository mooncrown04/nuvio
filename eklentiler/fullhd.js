/**
 * FullHDFilmizlesene Nuvio Scraper - v15.5 (Debug Mode)
 * Amacı: Deşifre edilen paketi loglara basıp yapıyı anlamak.
 */

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

function decodeRapidVidV15(encodedData) {
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

        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                console.error("[FullHD] v15.5 Debug Başlatıldı: " + query);
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: { 'User-Agent': userAgent } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film Bulunamadı");
                return fetch(link.startsWith('http') ? link : BASE_URL + link, { headers: { 'User-Agent': userAgent } });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                var $ = cheerio.load(filmHtml);
                var dataId = $(".ajax-data").attr("data-id");
                
                if (!dataId) throw new Error("ajax-data yok");

                // --- DEBUG BÖLÜMÜ ---
                var decryptedPackage = atob(dataId.split('').reverse().join('')); 
                
                // Paketi logda net görebilmek için temizleyip yazdırıyoruz
                console.error("----- [DEBUG] PAKET İÇERİĞİ BAŞLANGIÇ -----");
                console.error(decryptedPackage); 
                console.error("----- [DEBUG] PAKET İÇERİĞİ BİTİŞ -----");
                // --------------------

                var cleanPackage = decryptedPackage.replace(/\\/g, "").replace(/u0026/g, "&");
                var urls = cleanPackage.match(/https?:\/\/[^"'\s<> ]+/g) || [];
                
                var target = urls.find(u => 
                    u.includes("rapid") || 
                    u.includes("moly") || 
                    u.includes("watch") || 
                    u.includes("player")
                );

                if (target) {
                    console.error("[FullHD] Hedef Bulundu: " + target);
                    return fetch(target, { headers: { 'User-Agent': userAgent, 'Referer': BASE_URL + '/' } });
                }
                
                throw new Error("Hedef player bulunamadı. Lütfen logdaki paket içeriğini kontrol edin.");
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(embedHtml) {
                if (!embedHtml) return;

                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var result = decodeRapidVidV15(avMatch[1]);
                    if (result) {
                        resolve([{
                            name: "FullHD Premium v15.5",
                            url: result.startsWith("//") ? "https:" + result : result,
                            quality: "1080p",
                            headers: { 'Referer': 'https://rapidvid.net/', 'User-Agent': userAgent }
                        }]);
                        return;
                    }
                }
                resolve([]);
            })
            .catch(function(err) {
                console.error("[FullHD] Hata: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams: getStreams };
