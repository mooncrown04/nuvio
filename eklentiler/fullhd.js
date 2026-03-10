/**
 * FullHDFilmizlesene - v7.8 (Film/Dizi Ayrımı & Hata Kontrolü)
 */

console.error("[FullHD] === v7.8 BAŞLADI ===");

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return new Promise(function(resolve) {
    // 1. ÖNEMLİ: Eğer istek bir "TV" (Dizi) ise, bu site desteklemiyor.
    if (mediaType === "tv") {
      console.error("[FullHD] Bu kaynak dizi desteklemiyor, atlanıyor.");
      return resolve([]); 
    }

    var tmdbUrl = "https://api.themoviedb.org/3/movie/" + tmdbId + "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96";
    
    fetch(tmdbUrl)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var query = data ? (data.title || data.original_title) : "";
        console.error("[FullHD] Film Aranıyor:", query);
        return fetch(BASE_URL + "/arama/" + encodeURIComponent(query), { 
          headers: { "User-Agent": "Mozilla/5.0", "Referer": BASE_URL } 
        });
      })
      .then(function(res) {
        // Eğer site bizi direkt film sayfasına yönlendirdiyse (Redirect)
        if (res.url && res.url.includes("/film/")) {
            return res.text().then(html => ({ html: html, isDirect: true, url: res.url }));
        }
        return res.text().then(html => ({ html: html, isDirect: false }));
      })
      .then(function(result) {
        var filmHtml = result.html;
        var finalFilmUrl = "";

        if (result.isDirect) {
            finalFilmUrl = result.url;
        } else {
            var $ = cheerio.load(filmHtml);
            var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
            if (!link) throw new Error("Film bulunamadı.");
            finalFilmUrl = link.startsWith("http") ? link : BASE_URL + link;
        }

        console.error("[FullHD] Film Sayfası:", finalFilmUrl);
        return fetch(finalFilmUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      })
      .then(function(res) { return res.text(); })
      .then(function(html) {
        // ... (Buradan sonrası v7.7'deki deşifre işlemleriyle aynı)
        // vidid bulma, api'ye gitme ve decodeAv işlemleri...
        // (Kod kalabalığı olmaması için deşifre kısmını v7.7'den aynen alabilirsin)
        
        // Örnek kısa dönüş:
        var vididMatch = html.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
        if (vididMatch) {
             console.error("[FullHD] VidID bulundu, işlemler devam ediyor...");
             // API ve Deşifre adımları buraya gelecek...
        }
        resolve([]); // Şimdilik boş dönelim, mantığı anlaman için.
      })
      .catch(function(err) {
        console.error("[FullHD] Hata:", err.message);
        resolve([]);
      });
  });
}
