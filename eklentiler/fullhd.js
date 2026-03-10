/**
 * FullHDFilmizlesene - v8.0 (Final API Fix)
 */

console.error("[FullHD] === v8.0 BAŞLADI ===");

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

// Yardımcı fonksiyonlar (Base64/UTF8) v7.9 ile aynı kalsın...
function utf8Decode(bytes) { try { var result = ''; var i = 0; while (i < bytes.length) { var byte1 = bytes[i++]; if (byte1 < 0x80) result += String.fromCharCode(byte1); else if (byte1 < 0xE0) result += String.fromCharCode(((byte1 & 0x1F) << 6) | (bytes[i++] & 0x3F)); else if (byte1 < 0xF0) result += String.fromCharCode(((byte1 & 0x0F) << 12) | ((bytes[i++] & 0x3F) << 6) | (bytes[i++] & 0x3F)); else { var cp = ((byte1 & 0x07) << 18) | ((bytes[i++] & 0x3F) << 12) | ((bytes[i++] & 0x3F) << 6) | (bytes[i++] & 0x3F); result += String.fromCharCode(((cp - 0x10000) >> 10) + 0xD800, ((cp - 0x10000) & 0x3FF) + 0xDC00); } } return result; } catch (e) { return null; } }
function safeBase64Decode(str) { try { var binary = atob(str.replace(/[^A-Za-z0-9+/=]/g, "")); var bytes = new Uint8Array(binary.length); for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return bytes; } catch (e) { return null; } }
function decodeAv(input) { try { var reversed = input.split('').reverse().join(''); var decodedBytes = safeBase64Decode(reversed); if (!decodedBytes) return null; var key = "K9L"; var adjusted = new Uint8Array(decodedBytes.length); for (var i = 0; i < decodedBytes.length; i++) { adjusted[i] = (decodedBytes[i] - ((key.charCodeAt(i % 3) % 5) + 1)) & 0xFF; } var result = utf8Decode(adjusted); if (result && !result.startsWith("http")) { var secondPass = safeBase64Decode(result); if (secondPass) result = utf8Decode(secondPass); } return result; } catch (e) { return null; } }

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function (resolve) {
        if (mediaType === "tv") return resolve([]);

        var tmdbUrl = "https://api.themoviedb.org/3/movie/" + tmdbId + "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96";

        fetch(tmdbUrl)
            .then(function (res) { return res.json(); })
            .then(function (data) {
                var query = data ? (data.title || data.original_title) : "";
                console.error("[FullHD] Film Aranıyor:", query);
                // Arama Header'larını güçlendirdik
                return fetch(BASE_URL + "/arama/" + encodeURIComponent(query), { 
                    headers: { 
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Referer": BASE_URL
                    } 
                });
            })
            .then(function (res) { return res.text(); })
            .then(function (html) {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film bulunamadı");

                var finalUrl = link.startsWith("http") ? link : BASE_URL + link;
                return fetch(finalUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
            })
            .then(function (res) { return res.text(); })
            .then(function (filmHtml) {
                var vidid = filmHtml.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
                if (!vidid) throw new Error("vidid bulunamadı");

                // API İSTEĞİ - KRİTİK NOKTA
                // Format parametresini kaldırdık veya düzelttik
                var apiUrl = BASE_URL + "/player/api.php?id=" + vidid[1] + "&type=t&get=video";
                
                return fetch(apiUrl, { 
                    headers: { 
                        "User-Agent": "Mozilla/5.0",
                        "X-Requested-With": "XMLHttpRequest", // AJAX isteği olduğunu belirtmek şart
                        "Referer": BASE_URL
                    } 
                });
            })
            .then(function (res) {
                // Yanıtın JSON olduğundan emin olalım, değilse manuel parse edelim
                var contentType = res.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    return res.json();
                } else {
                    return res.text().then(t => {
                        // Eğer HTML döndüyse içindeki JSON objesini ayıkla
                        var jsonMatch = t.match(/({.*})/);
                        return jsonMatch ? JSON.parse(jsonMatch[1]) : { html: "" };
                    });
                }
            })
            .then(function (data) {
                if (!data || !data.html) throw new Error("Video verisi alınamadı");
                var embedUrl = data.html.replace(/\\/g, "");
                if (embedUrl.indexOf("//") === 0) embedUrl = "https:" + embedUrl;

                console.error("[FullHD] Embed URL Yakalandı:", embedUrl);

                return fetch(embedUrl, { headers: { "User-Agent": "Mozilla/5.0", "Referer": BASE_URL } })
                    .then(function (res) { return res.text(); })
                    .then(function (html) {
                        var avMatch = html.match(/av\(['"]([^'"]+)['"]\)/);
                        if (avMatch) {
                            var streamUrl = decodeAv(avMatch[1]);
                            if (streamUrl) {
                                if (streamUrl.indexOf("//") === 0) streamUrl = "https:" + streamUrl;
                                return resolve([{
                                    name: "FullHD 1080p",
                                    url: streamUrl,
                                    quality: "1080p",
                                    headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://rapidvid.net/" },
                                    provider: "fullhd"
                                }]);
                            }
                        }
                        resolve([{ name: "FullHD Alternatif", url: embedUrl, quality: "Auto", provider: "fullhd" }]);
                    });
            })
            .catch(function (err) {
                console.error("[FullHD] Hata Mesajı:", err.message);
                resolve([]);
            });
    });
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    globalThis.getStreams = getStreams;
}
