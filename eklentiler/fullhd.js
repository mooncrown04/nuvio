/**
 * FullHDFilmizlesene - v8.0 (Nuvio Player Connection Fix)
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://www.fullhdfilmizlesene.live";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Referer": BASE_URL + "/"
};

// Yeni Rapid şifre çözücü (K9L) - v7.3'teki karmaşadan arındırıldı
function decodeRapid(input) {
  try {
    // 1. Ters çevir ve Base64 çöz
    var s1 = atob(input.split('').reverse().join('').replace(/[^A-Za-z0-9+/=]/g, ""));
    // 2. K9L Shift (K=75, 9=57, L=76)
    var s2 = "";
    var key = "K9L";
    for (var i = 0; i < s1.length; i++) {
      var shift = (key.charCodeAt(i % 3) % 5) + 1;
      s2 += String.fromCharCode(s1.charCodeAt(i) - shift);
    }
    // 3. Varsa ikinci Base64 katmanı
    var final = s2.includes("http") ? s2 : atob(s2.replace(/[^A-Za-z0-9+/=]/g, ""));
    final = final.replace(/\\/g, "").trim();
    return final.startsWith("//") ? "https:" + final : final;
  } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return new Promise(function(resolve) {
    var tmdbType = (mediaType === "movie") ? "movie" : "tv";
    var tmdbUrl = "https://api.themoviedb.org/3/" + tmdbType + "/" + tmdbId + "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96";

    fetch(tmdbUrl)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var query = data.title || data.name || data.original_title;
        return fetch(BASE_URL + "/arama/" + encodeURIComponent(query), { headers: HEADERS });
      })
      .then(function(res) { return res.text(); })
      .then(function(html) {
        var $ = cheerio.load(html);
        var filmUrl = $("a[href*='/film/']").first().attr("href");
        if (!filmUrl) throw new Error("Film bulunamadı");
        
        // Göreceli yolu tam yola çevir
        var targetUrl = filmUrl.startsWith('http') ? filmUrl : BASE_URL + filmUrl;
        return fetch(targetUrl, { headers: HEADERS });
      })
      .then(function(res) { return res.text(); })
      .then(function(filmHtml) {
        var vididMatch = filmHtml.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
        if (!vididMatch) throw new Error("vidid yok");

        // RapidVid embed sayfasına git
        return fetch("https://rapidvid.net/e/" + vididMatch[1], { 
          headers: { "Referer": BASE_URL + "/", "User-Agent": HEADERS["User-Agent"] } 
        });
      })
      .then(function(res) { return res.text(); })
      .then(function(embedHtml) {
        var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
        if (avMatch && avMatch[1]) {
          var decryptedUrl = decodeRapid(avMatch[1]);
          
          if (decryptedUrl && decryptedUrl.startsWith("http")) {
            // Nuvio'nun (v7.3'te çalışan) beklediği tam obje yapısı
            resolve([{
              name: "FullHD RapidVid (Fixed)",
              url: decryptedUrl,
              quality: "1080p",
              headers: {
                "User-Agent": HEADERS["User-Agent"],
                "Referer": "https://rapidvid.net/"
              },
              provider: "fullhd"
            }]);
          } else { resolve([]); }
        } else {
          // Fallback: m3u8 ara
          var m3uMatch = embedHtml.match(/file["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
          if (m3uMatch) {
            resolve([{
              name: "FullHD M3U8",
              url: m3uMatch[1],
              quality: "Auto",
              headers: { "Referer": "https://rapidvid.net/" },
              provider: "fullhd"
            }]);
          } else { resolve([]); }
        }
      })
      .catch(function(err) {
        console.error("[FullHD] HATA:", err.message);
        resolve([]);
      });
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}
