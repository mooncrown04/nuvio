/**
 * FullHDFilmizlesene - v7.2 (Debug modu)
 */

console.error("[FullHD] === v7.2 BAŞLADI ===");

// Test 1: Buffer var mı?
console.error("[FullHD] Buffer var mı:", typeof Buffer !== 'undefined');

// Test 2: Cheerio var mı?
try {
  var cheerio = require("cheerio-without-node-native");
  console.error("[FullHD] Cheerio yüklendi");
} catch(e) {
  console.error("[FullHD] Cheerio HATA:", e.message);
}

var BASE_URL = "https://www.fullhdfilmizlesene.live";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Referer": BASE_URL + "/"
};

// Platform bağımsız Base64
function safeBase64Decode(str) {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'base64');
    } else if (typeof atob !== 'undefined') {
      var binary = atob(str);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    throw new Error("Base64 yok");
  } catch(e) {
    console.error("[FullHD] Base64 hata:", e.message);
    return null;
  }
}

// K9L decode
function decodeAv(input) {
  try {
    console.error("[FullHD] decodeAv başladı, uzunluk:", input.length);
    
    // 1. Ters çevir
    var reversed = input.split('').reverse().join('');
    
    // 2. İlk Base64
    var firstPass = safeBase64Decode(reversed);
    if (!firstPass) {
      console.error("[FullHD] İlk Base64 başarısız");
      return null;
    }
    
    // 3. K9L anahtarı
    var key = "K9L";
    var adjusted;
    if (typeof Buffer !== 'undefined') {
      adjusted = Buffer.alloc(firstPass.length);
      for (var i = 0; i < firstPass.length; i++) {
        var byteVal = firstPass[i] & 0xFF;
        var keyVal = (key.charCodeAt(i % 3) % 5) + 1;
        adjusted[i] = (byteVal - keyVal) & 0xFF;
      }
    } else {
      adjusted = new Uint8Array(firstPass.length);
      for (var i = 0; i < firstPass.length; i++) {
        var byteVal = firstPass[i] & 0xFF;
        var keyVal = (key.charCodeAt(i % 3) % 5) + 1;
        adjusted[i] = (byteVal - keyVal) & 0xFF;
      }
    }
    
    // 4. Binary string
    var binaryStr = '';
    for (var i = 0; i < adjusted.length; i++) {
      binaryStr += String.fromCharCode(adjusted[i] & 0xFF);
    }
    
    // 5. İkinci Base64
    var secondPass = safeBase64Decode(binaryStr);
    if (!secondPass) {
      console.error("[FullHD] İkinci Base64 başarısız");
      return null;
    }
    
    // 6. UTF-8
    var result;
    if (typeof Buffer !== 'undefined' && secondPass instanceof Buffer) {
      result = secondPass.toString('utf8');
    } else {
      result = new TextDecoder('utf-8').decode(secondPass);
    }
    
    console.error("[FullHD] decodeAv BAŞARILI:", result.substring(0, 60));
    return result;
    
  } catch(e) {
    console.error("[FullHD] decodeAv HATA:", e.message);
    return null;
  }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  console.error("[FullHD] getStreams:", tmdbId, mediaType);
  
  return new Promise(function(resolve) {
    // Test TMDB API
    var tmdbType = mediaType === "movie" ? "movie" : "tv";
    var tmdbUrl = "https://api.themoviedb.org/3/" + tmdbType + "/" + tmdbId +
      "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96";
    
    console.error("[FullHD] TMDB:", tmdbUrl);
    
    fetch(tmdbUrl)
      .then(function(res) {
        console.error("[FullHD] TMDB status:", res.status);
        if (!res.ok) throw new Error("TMDB " + res.status);
        return res.json();
      })
      .then(function(data) {
        var query = data ? (data.title || data.name || data.original_title || data.original_name) : "";
        console.error("[FullHD] Film adı:", query);
        if (!query) throw new Error("İsim yok");
        
        var searchUrl = BASE_URL + "/arama/" + encodeURIComponent(query);
        console.error("[FullHD] Arama:", searchUrl);
        
        return fetch(searchUrl, { headers: HEADERS });
      })
      .then(function(res) {
        console.error("[FullHD] Arama status:", res.status);
        if (!res.ok) throw new Error("Arama " + res.status);
        return res.text();
      })
      .then(function(html) {
        console.error("[FullHD] Arama HTML:", html.length);
        
        var cheerio = require("cheerio-without-node-native");
        var $ = cheerio.load(html);
        var firstResult = $("a[href*=\"/film/\"]").first().attr("href");
        
        console.error("[FullHD] İlk sonuç:", firstResult);
        if (!firstResult) throw new Error("Film linki yok");
        
        var parts = firstResult.split("/");
        var filmSlug = parts[parts.length - 1] || parts[parts.length - 2];
        filmSlug = filmSlug.replace(/\/$/, "");
        
        var filmUrl = BASE_URL + "/film/" + filmSlug + "/";
        console.error("[FullHD] Film URL:", filmUrl);
        
        return fetch(filmUrl, { headers: HEADERS });
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Film " + res.status);
        return res.text();
      })
      .then(function(filmHtml) {
        console.error("[FullHD] Film HTML:", filmHtml.length);
        
        var vididMatch = filmHtml.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
        console.error("[FullHD] vidid match:", vididMatch ? vididMatch[1] : "YOK");
        
        if (!vididMatch) throw new Error("vidid yok");
        
        var vidid = vididMatch[1];
        var apiUrl = BASE_URL + "/player/api.php?id=" + vidid +
          "&type=t&name=atom&get=video&format=json";
        
        console.error("[FullHD] API:", apiUrl);
        return fetch(apiUrl, { headers: HEADERS });
      })
      .then(function(res) {
        if (!res.ok) throw new Error("API " + res.status);
        return res.text();
      })
      .then(function(apiResponse) {
        console.error("[FullHD] API yanıt:", apiResponse.substring(0, 200));
        
        var data;
        try {
          data = JSON.parse(apiResponse);
        } catch(e) {
          throw new Error("JSON hata: " + e.message);
        }
        
        if (!data || !data.html || data.html === "") {
          console.error("[FullHD] API boş");
          return resolve([]);
        }
        
        var embedUrl = data.html.replace(/\\/g, "");
        console.error("[FullHD] Embed URL:", embedUrl);
        
        // RapidVid mi?
        if (embedUrl.indexOf("rapidvid") === -1) {
          console.error("[FullHD] RapidVid değil, direkt dönüyorum");
          return resolve([{
            name: "FullHD Embed",
            title: "FullHD",
            url: embedUrl,
            quality: "Auto",
            headers: HEADERS,
            provider: "fullhd"
          }]);
        }
        
        console.error("[FullHD] RapidVid çözülüyor...");
        return fetch(embedUrl, { headers: { 
          "User-Agent": HEADERS["User-Agent"],
          "Referer": BASE_URL + "/"
        }});
      })
      .then(function(res) {
        if (!res || !res.ok) return null;
        return res.text();
      })
      .then(function(html) {
        if (!html) return resolve([]);
        
        console.error("[FullHD] RapidVid HTML:", html.length);
        
        // av() pattern ara
        var avMatch = html.match(/file["']?\s*:\s*av\(['"]([^'"]+)['"]\)/) ||
                      html.match(/av\(['"]([^'"]+)['"]\)/);
        
        console.error("[FullHD] av() bulundu mu:", avMatch ? "EVET" : "HAYIR");
        
        if (avMatch && avMatch[1]) {
          console.error("[FullHD] av() içerik:", avMatch[1].substring(0, 30));
          var decoded = decodeAv(avMatch[1]);
          
          if (decoded) {
            if (decoded.indexOf("//") === 0) decoded = "https:" + decoded;
            console.error("[FullHD] Son URL:", decoded.substring(0, 80));
            
            return resolve([{
              name: "FullHD RapidVid",
              title: "FullHD",
              url: decoded,
              quality: "Auto",
              headers: {
                "User-Agent": HEADERS["User-Agent"],
                "Referer": embedUrl
              },
              provider: "fullhd"
            }]);
          }
        }
        
        // Diğer patternler...
        var patterns = [
          /file["']?\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i,
          /file["']?\s*:\s*["'](https?:\/\/[^"']+\.mp4[^"']*)["']/i,
          /src["']?\s*=\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i
        ];
        
        for (var i = 0; i < patterns.length; i++) {
          var match = html.match(patterns[i]);
          if (match && match[1]) {
            console.error("[FullHD] Pattern bulundu:", match[1].substring(0, 60));
            return resolve([{
              name: "FullHD RapidVid",
              title: "FullHD",
              url: match[1],
              quality: "Auto",
              headers: {
                "User-Agent": HEADERS["User-Agent"],
                "Referer": embedUrl
              },
              provider: "fullhd"
            }]);
          }
        }
        
        console.error("[FullHD] Hiçbir pattern bulunamadı!");
        console.error("[FullHD] HTML preview:", html.substring(0, 500));
        
        // Fallback
        resolve([{
          name: "FullHD Embed",
          title: "FullHD",
          url: embedUrl,
          quality: "Auto",
          headers: HEADERS,
          provider: "fullhd"
        }]);
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

console.error("[FullHD] === v7.2 YÜKLENDİ ===");
