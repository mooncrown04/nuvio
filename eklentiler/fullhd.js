/**
 * FullHDFilmizlesene - v8.9 (Export Fix & Timing Experiment)
 */

console.error("[FullHD] === v8.9 BAŞLADI - HEDEF: BYPASS & EXPORT FIX ===");

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

function decodeContentX(encodedData) {
    try {
        var reversed = encodedData.split('').reverse().join('');
        var binary = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
        var key = "K9L";
        var result = "";
        for (var i = 0; i < binary.length; i++) {
            var charCode = binary.charCodeAt(i);
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            result += String.fromCharCode(charCode - shift);
        }
        return result;
    } catch (e) { return null; }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        if (mediaType === "tv") return [];

        var tmdbUrl = "https://api.themoviedb.org/3/movie/" + tmdbId + "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96";
        var userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        var tmdbRes = await fetch(tmdbUrl);
        var tmdbData = await tmdbRes.json();
        var query = tmdbData ? (tmdbData.title || tmdbData.original_title) : "";
        console.error("[FullHD] Aranıyor: " + query);

        var searchRes = await fetch(BASE_URL + "/arama/" + encodeURIComponent(query), { 
            headers: { "User-Agent": userAgent } 
        });
        var searchHtml = await searchRes.text();
        
        var $ = cheerio.load(searchHtml);
        var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
        if (!link) throw new Error("Film Bulunamadı");

        var filmUrl = link.startsWith("http") ? link : BASE_URL + link;
        console.error("[FullHD] Sayfa: " + filmUrl);

        var filmPageRes = await fetch(filmUrl, { headers: { "User-Agent": userAgent } });
        var cookies = filmPageRes.headers.get('set-cookie') || "";
        var filmHtml = await filmPageRes.text();

        var vididMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
        if (!vididMatch) throw new Error("vidid bulunamadı");
        var vidid = vididMatch[1];

        // DENEY: 1.5 saniye bekle (Bot olmadığımızı kanıtlamak için)
        console.error("[FullHD] Bekleniyor (1.5s)...");
        await new Promise(r => setTimeout(r, 1500));

        var apiUrl = BASE_URL + "/player/api.php";
        var body = "id=" + vidid + "&type=t&get=video";

        console.error("[FullHD] API'ye gidiliyor: " + vidid);

        var apiRes = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": filmUrl, // Tam film linkini referer yapıyoruz
                "Origin": BASE_URL,
                "Cookie": cookies,
                "User-Agent": userAgent
            },
            body: body
        });

        var apiText = await apiRes.text();
        console.error("[FullHD] API Yanıtı: " + apiText.substring(0, 40));

        if (apiText.includes("security_error")) throw new Error("Yine security_error!");

        var urls = apiText.match(/https?:\/\/[^"'\s<>\\ ]+/g) || [];
        var embedUrl = urls.find(u => u.includes("rapid") || u.includes("moly") || u.includes("player")) || urls[0];
        
        if (!embedUrl) throw new Error("Embed yok");
        embedUrl = embedUrl.replace(/\\/g, "");

        var embedRes = await fetch(embedUrl, { headers: { "Referer": BASE_URL + "/" } });
        var embedHtml = await embedRes.text();

        var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
        if (avMatch) {
            var finalUrl = decodeContentX(avMatch[1]);
            return [{
                name: "FullHD Premium v8.9",
                url: finalUrl.startsWith("//") ? "https:" + finalUrl : finalUrl,
                quality: "1080p",
                headers: { "Referer": "https://rapidvid.net/", "User-Agent": userAgent },
                provider: "fullhd"
            }];
        }
        
        return [];
    } catch (e) {
        console.error("[FullHD] Hata: " + e.message);
        return [];
    }
}

// DIŞA AKTARMA (Export) - Kesin çözüm
if (typeof module !== "undefined" && module.exports) {
    module.exports = { getStreams: getStreams };
}
if (typeof globalThis !== "undefined") {
    globalThis.getStreams = getStreams;
}
