/**
 * FullHDFilmizlesene - v7.4 (Base64/UTF-8 Mantık Hatası Giderildi)
 */

console.error("[FullHD] === v7.4 BAŞLADI ===");

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://www.fullhdfilmizlesene.live";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Referer": BASE_URL + "/"
};

// UTF-8 decode - Byte dizisini temiz stringe çevirir
function utf8Decode(bytes) {
  try {
    var result = '';
    var i = 0;
    while (i < bytes.length) {
      var byte1 = bytes[i++];
      if (byte1 < 0x80) {
        result += String.fromCharCode(byte1);
      } else if (byte1 < 0xE0) {
        var byte2 = bytes[i++] & 0x3F;
        result += String.fromCharCode(((byte1 & 0x1F) << 6) | byte2);
      } else if (byte1 < 0xF0) {
        var byte2 = bytes[i++] & 0x3F;
        var byte3 = bytes[i++] & 0x3F;
        result += String.fromCharCode(((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3);
      } else {
        var byte2 = bytes[i++] & 0x3F;
        var byte3 = bytes[i++] & 0x3F;
        var byte4 = bytes[i++] & 0x3F;
        var codepoint = ((byte1 & 0x07) << 18) | (byte2 << 12) | (byte3 << 6) | byte4;
        if (codepoint <= 0xFFFF) {
          result += String.fromCharCode(codepoint);
        } else {
          result += String.fromCharCode(((codepoint - 0x10000) >> 10) + 0xD800, ((codepoint - 0x10000) & 0x3FF) + 0xDC00);
        }
      }
    }
    return result;
  } catch(e) {
    console.error("[FullHD] UTF8 decode hata:", e.message);
    return null;
  }
}

// Base64 stringini Uint8Array'e çevirir
function safeBase64Decode(str) {
  try {
    if (typeof atob !== 'undefined') {
      var binary = atob(str);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    // Buffer fallback (Node.js ortamı için)
    if (typeof Buffer !== 'undefined') {
      var buf = Buffer.from(str, 'base64');
      return new Uint8Array(buf);
    }
    return null;
  } catch(e) {
    console.error("[FullHD] Base64 hata:", e.message);
    return null;
  }
}

// K9L Algoritması - ÇÖZÜM BURADA
function decodeAv(input) {
  try {
    // 1. Ters çevir
    var reversed = input.split('').reverse().join('');
    
    // 2. İlk Base64 Decode
    var decodedBytes = safeBase64Decode(reversed);
    if (!decodedBytes) return null;
    
    // 3. K9L Key Subtract İşlemi
    var key = "K9L";
    var adjusted = new Uint8Array(decodedBytes.length);
    for (var i = 0; i < decodedBytes.length; i++) {
      var byteVal = decodedBytes[i] & 0xFF;
      var keyVal = (key.charCodeAt(i % 3) % 5) + 1;
      adjusted[i] = (byteVal - keyVal) & 0xFF;
    }
    
    // 4. Direkt UTF-8 Decode (Tekrar Base64'e sokma!)
    var result = utf8Decode(adjusted);
    
    // 5. Eğer sonuç hala Base64 ise (çift şifreleme durumu), bir kez daha çöz
    if (result && !result.startsWith("http") && result.length > 20) {
        var secondPassBytes = safeBase64Decode(result);
        if (secondPassBytes) result = utf8Decode(secondPassBytes);
    }

    return result;
  } catch(e) {
    console.error("[FullHD] decodeAv HATA:", e.message);
    return null;
  }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  var embedUrl = null;
  
  return new Promise(function(resolve) {
    var tmdbType = (mediaType === "movie") ? "movie" : "tv";
    var tmdbUrl = "https://api.themoviedb.org/3/" + tmdbType + "/" + tmdbId +
      "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96";
    
    fetch(tmdbUrl)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var query = data ? (data.title || data.name || data.original_title) : "";
        if (!query) throw new Error("İsim yok");
        return fetch(BASE_URL + "/arama/" + encodeURIComponent(query), { headers: HEADERS });
      })
      .then(function(res) { return res.text(); })
      .then(function(html) {
        var $ = cheerio.load(html);
        var firstResult = $("a[href*=\"/film/\"]").first().attr("href");
        if (!firstResult) throw new Error("Film linki yok");
        
        return fetch(firstResult, { headers: HEADERS });
      })
      .then(function(res) { return res.text(); })
      .then(function(filmHtml) {
        var vididMatch = filmHtml.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
        if (!vididMatch) throw new Error("vidid yok");
        
        var apiUrl = BASE_URL + "/player/api.php?id=" + vididMatch[1] + "&type=t&name=atom&get=video&format=json";
        return fetch(apiUrl, { headers: HEADERS });
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (!data || !data.html) return resolve([]);
        
        embedUrl = data.html.replace(/\\/g, "");
        if (embedUrl.indexOf("rapidvid") === -1) {
            return resolve([{ name: "FullHD Embed", url: embedUrl, quality: "Auto", provider: "fullhd" }]);
        }
        
        return fetch(embedUrl, { headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }});
      })
      .then(function(res) { return res ? res.text() : null; })
      .then(function(html) {
        if (!html) return resolve([]);
        
        var avMatch = html.match(/av\(['"]([^'"]+)['"]\)/);
        if (avMatch && avMatch[1]) {
          var decoded = decodeAv(avMatch[1]);
          if (decoded) {
            if (decoded.indexOf("//") === 0) decoded = "https:" + decoded;
            return resolve([{
              name: "FullHD RapidVid",
              url: decoded,
              quality: "1080p",
              headers: { "User-Agent": HEADERS["User-Agent"], "Referer": embedUrl },
              provider: "fullhd"
            }]);
          }
        }
        
        // Fallback pattern (m3u8 arama)
        var m3u8Match = html.match(/file["']?\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i);
        if (m3u8Match) {
            resolve([{ name: "FullHD M3U8", url: m3u8Match[1], quality: "Auto", provider: "fullhd" }]);
        } else {
            resolve([]);
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
