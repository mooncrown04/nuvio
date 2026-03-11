/**
 * FullHDFilmizlesene Nuvio Scraper - v15.6
 * Strateji: Bozuk ajax-data paketini bypass et, doğrudan script ve iframe avla.
 */

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

// CloudStream tabanlı RapidVid Çözücü
function decodeRapidVid(encodedData) {
    try {
        var reversed = encodedData.split('').reverse().join('');
        var binary = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
        var key = "K9L";
        var adjusted = "";
        for (var i = 0; i < binary.length; i++) {
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            adjusted += String.fromCharCode(binary.charCodeAt(i) - shift);
        }
        return atob(adjusted).replace(/\\/g, "").trim();
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

        // 1. TMDB'den film bilgisini al
        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR')
            .then(res => res.json())
            .then(data => {
                var query = data.title || data.original_title;
                console.error("[FullHD] v15.6 Başlatıldı: " + query);
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
                var foundLinks = [];

                // YÖNTEM A: Sayfa içindeki tüm iframe'leri tara
                $("iframe").each(function() {
                    var src = $(this).attr("src") || $(this).attr("data-src");
                    if (src && (src.includes("rapid") || src.includes("moly"))) foundLinks.push(src);
                });

                // YÖNTEM B: Sayfa içindeki scriptlerde "vidid" veya "video" araması
                var vidIdMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i) || filmHtml.match(/video_id\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (vidIdMatch) {
                    foundLinks.push("https://rapidvid.net/e/" + vidIdMatch[1]);
                }

                // YÖNTEM C: Player listesindeki butonları tara
                $(".player-listesi li, .kaynak-listesi li").each(function() {
                    var dataId = $(this).attr("data-id");
                    if (dataId && dataId.length > 5 && !dataId.includes("]")) { // Bozuk paketleri filtrele
                         foundLinks.push("https://rapidvid.net/e/" + dataId);
                    }
                });

                if (foundLinks.length > 0) {
                    var target = foundLinks[0].startsWith("//") ? "https:" + foundLinks[0] : foundLinks[0];
                    console.error("[FullHD] Hedef Player Bulundu: " + target);
                    return fetch(target, { headers: { 'User-Agent': userAgent, 'Referer': BASE_URL + '/' } });
                }
                
                throw new Error("Hiçbir player linki yakalanamadı.");
            })
            .then(res => res ? res.text() : null)
            .then(embedHtml => {
                if (!embedHtml) return resolve([]);

                // RapidVid av() deşifresi
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var streamUrl = decodeRapidVid(avMatch[1]);
                    if (streamUrl) {
                        console.error("[FullHD] Başarılı! Link: " + streamUrl);
                        return resolve([{
                            name: "FullHD Premium v15.6",
                            url: streamUrl.startsWith("//") ? "https:" + streamUrl : streamUrl,
                            quality: "1080p",
                            headers: { 'Referer': 'https://rapidvid.net/', 'User-Agent': userAgent }
                        }]);
                    }
                }

                // Fallback: Ham m3u8 araması
                var directM3u8 = embedHtml.match(/file["']?\s*[:=]\s*["']([^"']+\.m3u8[^"']*)["']/i);
                if (directM3u8) {
                    return resolve([{
                        name: "FullHD Fallback v15.6",
                        url: directM3u8[1].replace(/\\/g, ""),
                        quality: "1080p",
                        headers: { 'Referer': 'https://rapidvid.net/', 'User-Agent': userAgent }
                    }]);
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
