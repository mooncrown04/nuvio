/**
 * FullHDFilmizlesene - v6.4 (Promise Zincir Düzeltmesi)
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://www.fullhdfilmizlesene.live";

var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9",
  "Referer": BASE_URL + "/"
};

function log(msg) {
  console.error("[FullHD] " + msg);
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  log("getStreams: " + tmdbId);

  return new Promise(function(resolve) {
    var tmdbType = mediaType === "movie" ? "movie" : "tv";
    var tmdbUrl = "https://api.themoviedb.org/3/" + tmdbType + "/" + tmdbId +
      "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96";

    fetch(tmdbUrl)
      .then(function(res) {
        if (!res.ok) throw new Error("TMDB: " + res.status);
        return res.json();
      })
      .then(function(data) {
        var query = data ? (data.title || data.name || data.original_title || data.original_name) : "";
        if (!query) throw new Error("Isim bulunamadi");

        log("Aranacak: " + query);
        var searchUrl = BASE_URL + "/arama/" + encodeURIComponent(query);
        log("Search: " + searchUrl);

        return fetch(searchUrl, { headers: HEADERS });
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Arama: " + res.status);
        return res.text();
      })
      .then(function(html) {
        log("HTML: " + html.length);
        var $ = cheerio.load(html);
        var firstResult = $("a[href*=\"/film/\"]").first().attr("href");

        log("Link: " + firstResult);
        if (!firstResult) return resolve([]);

        var parts = firstResult.split("/");
        var filmSlug = parts[parts.length - 1] || parts[parts.length - 2];
        filmSlug = filmSlug.replace(/\/$/, "");

        var filmUrl = BASE_URL + "/film/" + filmSlug + "/";
        log("Film: " + filmUrl);

        return fetch(filmUrl, { headers: HEADERS });
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Film: " + res.status);
        return res.text();
      })
      .then(function(filmHtml) {
        var vididMatch = filmHtml.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
        if (!vididMatch) {
          log("vidid yok");
          return resolve([]);
        }

        var vidid = vididMatch[1];
        log("vidid: " + vidid);

        var apiUrl = BASE_URL + "/player/api.php?id=" + vidid +
          "&type=t&name=atom&get=video&format=json";

        log("API: " + apiUrl);
        return fetch(apiUrl, { headers: HEADERS });
      })
      .then(function(res) {
        if (!res.ok) throw new Error("API: " + res.status);
        return res.text();
      })
      .then(function(apiResponse) {
        log("API RAW: " + apiResponse.substring(0, 200));

        var data;
        try {
          data = JSON.parse(apiResponse);
        } catch(e) {
          log("JSON HATASI: " + e.message);
          return resolve([]);
        }

        if (!data || !data.html || data.html === "") {
          log("Bos API yanıtı");
          return resolve([]);
        }

        var embedUrl = data.html.replace(/\\/g, "");
        log("Embed URL: " + embedUrl);

        // RapidVid embed sayfasını çözümle
        if (embedUrl.indexOf("rapidvid.net") !== -1) {
          return resolveRapidVid(embedUrl);
        }

        // Diğer embed URL'leri için direkt dön
        return Promise.resolve([{
          name: "FullHD Embed",
          title: "FullHD",
          url: embedUrl,
          quality: "Auto",
          headers: HEADERS,
          provider: "fullhd"
        }]);
      })
      .then(function(streams) {
        // streams array veya undefined olabilir, kontrol et
        if (!streams) streams = [];
        log("Toplam: " + streams.length);
        resolve(streams);
      })
      .catch(function(err) {
        log("HATA: " + err.message);
        resolve([]);
      });
  });
}

// RapidVid embed sayfasından direkt video URL'si çek
function resolveRapidVid(embedUrl) {
  return new Promise(function(resolve) {
    log("RapidVid cozumleniyor: " + embedUrl);

    fetch(embedUrl, {
      headers: {
        "User-Agent": HEADERS["User-Agent"],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": BASE_URL + "/"
      }
    })
    .then(function(res) {
      if (!res.ok) throw new Error("RapidVid HTTP: " + res.status);
      return res.text();
    })
    .then(function(html) {
      log("RapidVid HTML: " + html.length);

      // Pattern 1: file:"..." veya file:'...'
      var fileMatch = html.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) ||
                      html.match(/file\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);

      // Pattern 2: src="..." m3u8 veya mp4
      var srcMatch = html.match(/src\s*=\s*["']([^"']+\.m3u8[^"']*)["']/i) ||
                     html.match(/src\s*=\s*["']([^"']+\.mp4[^"']*)["']/i);

      // Pattern 3: data-url="..."
      var dataMatch = html.match(/data-url\s*=\s*["']([^"']+)["']/i);

      // Pattern 4: var url = '...'
      var varMatch = html.match(/var\s+url\s*=\s*["']([^"']+)["']/i);

      var videoUrl = (fileMatch && fileMatch[1]) ||
                     (srcMatch && srcMatch[1]) ||
                     (dataMatch && dataMatch[1]) ||
                     (varMatch && varMatch[1]);

      if (videoUrl) {
        log("Video URL bulundu: " + videoUrl.substring(0, 80));

        // URL'i düzelt
        if (videoUrl.indexOf("//") === 0) {
          videoUrl = "https:" + videoUrl;
        } else if (videoUrl.indexOf("http") !== 0) {
          videoUrl = "https://" + videoUrl;
        }

        resolve([{
          name: "FullHD RapidVid",
          title: "FullHD",
          url: videoUrl,
          quality: "Auto",
          headers: {
            "User-Agent": HEADERS["User-Agent"],
            "Referer": embedUrl
          },
          provider: "fullhd"
        }]);
      } else {
        log("Video URL bulunamadi, embed donduruluyor");
        resolve([{
          name: "FullHD Embed",
          title: "FullHD",
          url: embedUrl,
          quality: "Auto",
          headers: HEADERS,
          provider: "fullhd"
        }]);
      }
    })
    .catch(function(err) {
      log("RapidVid HATASI: " + err.message);
      resolve([{
        name: "FullHD Embed",
        title: "FullHD",
        url: embedUrl,
        quality: "Auto",
        headers: HEADERS,
        provider: "fullhd"
      }]);
    });
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}

log("v6.4 yuklendi");
