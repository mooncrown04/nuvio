/**
 * FullHDFilmizlesene - v7.6 (Enhanced Header & Debug)
 */

console.error("[FullHD] === v7.6 BAŞLADI ===");

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://www.fullhdfilmizlesene.live";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
};

function utf8Decode(bytes) {
  try {
    var result = '';
    var i = 0;
    while (i < bytes.length) {
      var byte1 = bytes[i++];
      if (byte1 < 0x80) result += String.fromCharCode(byte1);
      else if (byte1 < 0xE0) result += String.fromCharCode(((byte1 & 0x1F) << 6) | (bytes[i++] & 0x3F));
      else if (byte1 < 0xF0) result += String.fromCharCode(((byte1 & 0x0F) << 12) | ((bytes[i++] & 0x3F) << 6) | (bytes[i++] & 0x3F));
      else {
        var cp = ((byte1 & 0x07) << 18) | ((bytes[i++] & 0x3F) << 12) | ((bytes[i++] & 0x3F) << 6) | (bytes[i++] & 0x3F);
        result += String.fromCharCode(((cp - 0x10000) >> 10) + 0xD800, ((cp - 0x10000) & 0x3FF) + 0xDC00);
      }
    }
    return result;
  } catch(e) { return null; }
}

function safeBase64Decode(str) {
  try {
    if (typeof atob !== 'undefined') {
      var binary = atob(str.replace(/[^A-Za-z0-9+/=]/g, ""));
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    return null;
  } catch(e) { return null; }
}

function decodeAv(input) {
  try {
    var reversed = input.split('').reverse().join('');
    var decodedBytes = safeBase64Decode(reversed);
    if (!decodedBytes) return null;
    
    var key = "K9L";
    var adjusted = new Uint8Array(decodedBytes.length);
    for (var i = 0; i < decodedBytes.length; i++) {
      adjusted[i] = (decodedBytes[i] - ((key.charCodeAt(i % 3) % 5) + 1)) & 0xFF;
    }
    
    var result = utf8Decode(adjusted);
    // Double Base64 check (Link hala şifreliyse)
    if (result && !result.startsWith("http") && result.length > 10) {
        var secondPass = safeBase64Decode(result);
        if (secondPass) result = utf8Decode(secondPass);
    }
    return result;
  } catch(e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return new Promise(function(resolve) {
    var tmdbType = (mediaType === "movie") ? "movie" : "tv";
    var tmdbUrl = "https://api.themoviedb.org/3/" + tmdbType + "/" + tmdbId + "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96";
    
    fetch(tmdbUrl)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var query = data ? (data.title || data.name || data.original_title) : "";
        console.error("[FullHD] Aranan:", query);
        return fetch(BASE_URL + "/arama/" + encodeURIComponent(query), { headers: HEADERS });
      })
      .then(function(res) { return res.text(); })
      .then(function(html) {
        var $ = cheerio.load(html);
        var link = $("a[href*=\"/film/\"]").first().attr("href");
        if (!link) throw new Error("Film bulunamadı");
        return fetch(link, { headers: HEADERS });
      })
      .then(function(res) { return res.text(); })
      .then(function(filmHtml) {
        var vidid = filmHtml.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
        if (!vidid) throw new Error("vidid bulunamadı");
        
        var apiUrl = BASE_URL + "/player/api.php?id=" + vidid[1] + "&type=t&get=video&format=json";
        return fetch(apiUrl, { headers: HEADERS });
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (!data || !data.html) return resolve([]);
        var embedUrl = data.html.replace(/\\/g, "");
        console.error("[FullHD] Embed URL:", embedUrl);
        
        return fetch(embedUrl, { headers: HEADERS })
          .then(function(res) { return res.text(); })
          .then(function(html) {
            var avMatch = html.match(/av\(['"]([^'"]+)['"]\)/);
            if (avMatch) {
              var finalUrl = decodeAv(avMatch[1]);
              if (finalUrl) {
                if (finalUrl.indexOf("//") === 0) finalUrl = "https:" + finalUrl;
                
                console.error("[FullHD] Çözülen Link:", finalUrl.substring(0, 50) + "...");
                
                return resolve([{
                  name: "FullHD Premium",
                  url: finalUrl,
                  quality: "1080p",
                  headers: { 
                    "User-Agent": HEADERS["User-Agent"],
                    "Referer": "https://rapidvid.net/",
                    "Origin": "https://rapidvid.net"
                  },
                  provider: "fullhd"
                }]);
              }
            }
            
            // Alternatif m3u8 arama
            var m3u8Match = html.match(/file["']?\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i);
            if (m3u8Match) {
                return resolve([{ name: "FullHD Auto", url: m3u8Match[1], quality: "Auto", provider: "fullhd" }]);
            }

            resolve([{ name: "FullHD Player", url: embedUrl, quality: "Auto", provider: "fullhd" }]);
          });
      })
      .catch(function(err) {
        console.error("[FullHD] HATA:", err.message);
        resolve([]);
      });
  });
}

if (typeof module !== "undefined" && module.exports) module.exports = { getStreams: getStreams };
else global.getStreams = getStreams;
