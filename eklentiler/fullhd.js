/**
 * FullHDFilmizlesene - v8.1 (Donanım/Sertifika Hataları İçin Optimize Edildi)
 */

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

// En az dikkat çeken standart header
var HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/110.0.0.0" };

function decodeRapid(input) {
  try {
    var s1 = atob(input.split('').reverse().join('').replace(/[^A-Za-z0-9+/=]/g, ""));
    var s2 = "";
    var key = "K9L";
    for (var i = 0; i < s1.length; i++) {
      var shift = (key.charCodeAt(i % 3) % 5) + 1;
      s2 += String.fromCharCode(s1.charCodeAt(i) - shift);
    }
    var final = s2.includes("http") ? s2 : atob(s2.replace(/[^A-Za-z0-9+/=]/g, ""));
    return final.replace(/\\/g, "").trim().startsWith("//") ? "https:" + final.replace(/\\/g, "").trim() : final.replace(/\\/g, "").trim();
  } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType) {
  return new Promise(function(resolve) {
    var tmdbUrl = "https://api.themoviedb.org/3/movie/" + tmdbId + "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96";

    fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
        var query = data.title || data.original_title;
        return fetch(BASE_URL + "/arama/" + encodeURIComponent(query), { headers: HEADERS });
    }).then(function(res) { return res.text(); }).then(function(html) {
        var $ = cheerio.load(html);
        var filmUrl = $("a[href*='/film/']").first().attr("href");
        if (!filmUrl) throw new Error("404");
        return fetch(filmUrl.startsWith('http') ? filmUrl : BASE_URL + filmUrl, { headers: HEADERS });
    }).then(function(res) { return res.text(); }).then(function(filmHtml) {
        var vidid = filmHtml.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
        // RapidVid'in kendi API'sini kullanmak yerine direkt embed'e gidiyoruz (Sertifika hatası almamak için)
        return fetch("https://rapidvid.net/e/" + vidid[1], { headers: HEADERS });
    }).then(function(res) { return res.text(); }).then(function(embedHtml) {
        var av = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
        if (av && av[1]) {
            var finalUrl = decodeRapid(av[1]);
            if (finalUrl) {
                // Sadece Nuvio'nun zorunlu kıldığı alanlar
                resolve([{
                    name: "FullHD (v8.1)",
                    url: finalUrl,
                    quality: "1080p",
                    headers: { "Referer": "https://rapidvid.net/" } 
                }]);
            } else { resolve([]); }
        } else { resolve([]); }
    }).catch(function() { resolve([]); });
  });
}

if (typeof module !== "undefined" && module.exports) { module.exports = { getStreams: getStreams }; }
else { global.getStreams = getStreams; }
