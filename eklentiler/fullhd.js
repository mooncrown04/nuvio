/**
 * FullHDFilmizlesene Nuvio Scraper - v14.1
 * Strateji: ajax-data bloğunu derinlemesine deşifre eder ve JSON kaynaklarını ayıklar.
 */

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

// Senin paylaştığın o devasa bloğu (gCHpVXb...) deşifre eden özel motor
function deepDecrypt(dataId) {
    try {
        // 1. Ters Çevir
        var rev = dataId.split('').reverse().join('');
        // 2. Base64'ten Çıkar
        var raw = atob(rev);
        // 3. Karakter Kaydırma (Bitwise XOR veya Shift simülasyonu)
        // Site genellikle 'char - 1' veya 'char ^ key' kullanır
        var decoded = "";
        for (var i = 0; i < raw.length; i++) {
            decoded += String.fromCharCode(raw.charCodeAt(i) - 1);
        }
        
        // Eğer sonuç anlamlı bir link veya JSON yapısı içermiyorsa shift'siz dene
        if (decoded.indexOf("http") === -1) {
            return atob(rev); // Ham base64 hali
        }
        return decoded;
    } catch (e) {
        return null;
    }
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
                console.error("[FullHD] v14.1 Çözücü Başladı: " + query);
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
                
                if (!dataId) {
                    // Eğer ajax-data gelmiyorsa site botu sezmiştir, vidid ile şansımızı deneriz
                    var vidid = (filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i) || [])[1];
                    if (vidid) return fetch("https://rapidvid.net/e/" + vidid, { headers: { 'Referer': BASE_URL + '/', 'User-Agent': userAgent } });
                    throw new Error("Veri paketine ulaşılamadı");
                }

                console.error("[FullHD] Paket Çözülüyor...");
                var decrypted = deepDecrypt(dataId);
                
                // İçinden URL yakala
                var streamLinks = decrypted ? (decrypted.match(/https?:\/\/[^"'\s<>\\ ]+/g) || []) : [];
                
                if (streamLinks.length > 0) {
                    var finalUrl = streamLinks.find(function(u) { return u.indexOf("rapid") > -1 || u.indexOf("moly") > -1; }) || streamLinks[0];
                    console.error("[FullHD] Link Bulundu: " + finalUrl);
                    
                    // Linki bulduk, şimdi içindeki video stream'ini alalım
                    return fetch(finalUrl.replace(/\\/g, ""), { headers: { 'Referer': BASE_URL + '/', 'User-Agent': userAgent } });
                } else {
                    // Hiç link çıkmazsa vidid üzerinden Rapid'e zorla
                    var fallbackId = (filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i) || [])[1];
                    return fetch("https://rapidvid.net/e/" + fallbackId, { headers: { 'Referer': BASE_URL + '/', 'User-Agent': userAgent } });
                }
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(embedHtml) {
                if (!embedHtml) return resolve([]);

                // Klasik av(...) çözücü
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
                        resolve([{
                            name: "FullHD Premium v14.1",
                            url: result.indexOf("//") === 0 ? "https:" + result : result,
                            quality: "1080p",
                            headers: { 'Referer': 'https://rapidvid.net/', 'User-Agent': userAgent },
                            provider: "fullhd_scraper"
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = global.getStreams || getStreams;
}
