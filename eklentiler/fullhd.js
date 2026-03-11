/**
 * FullHDFilmizlesene - v8.5 (Memory & Sync Fix)
 */

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

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
    final = final.replace(/\\/g, "").trim();
    return final.startsWith("//") ? "https:" + final : final;
  } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType) {
  return new Promise(function(resolve) {
    var tmdbUrl = "https://api.themoviedb.org/3/movie/" + tmdbId + "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96";

    fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
        return fetch(BASE_URL + "/arama/" + encodeURIComponent(data.title || data.original_title));
    }).then(function(res) { return res.text(); }).then(function(html) {
        var filmUrl = cheerio.load(html)("a[href*='/film/']").first().attr("href");
        return fetch(filmUrl.startsWith('http') ? filmUrl : BASE_URL + filmUrl);
    }).then(function(res) { return res.text(); }).then(function(filmHtml) {
        var vidid = filmHtml.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
        return fetch("https://rapidvid.net/e/" + vidid[1]);
    }).then(function(res) { return res.text(); }).then(function(embedHtml) {
        var av = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
        var finalUrl = decodeRapid(av[1]);
        if (finalUrl) {
            resolve([{
                name: "FullHD (Stabil)",
                url: finalUrl,
                quality: "1080p",
                headers: { "User-Agent": "Mozilla/5.0" } // Minimum header
            }]);
        } else { resolve([]); }
    }).catch(function() { resolve([]); });
  });
}

if (typeof module !== "undefined" && module.exports) { module.exports = { getStreams: getStreams }; }
else { global.getStreams = getStreams; }
