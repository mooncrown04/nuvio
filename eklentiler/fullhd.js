/**
 * FullHDFilmizlesene - v6.2 (API Direkt URL)
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://www.fullhdfilmizlesene.live";

var HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9",
    "Referer": BASE_URL + "/"
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[FullHD] getStreams: " + tmdbId);
    
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
                
                console.error("[FullHD] Aranacak: " + query);
                
                var searchUrl = BASE_URL + "/arama/" + encodeURIComponent(query);
                console.error("[FullHD] Search: " + searchUrl);
                
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res.ok) throw new Error("Arama: " + res.status);
                return res.text(); 
            })
            .then(function(html) {
                console.error("[FullHD] HTML: " + html.length);
                
                var $ = cheerio.load(html);
                var firstResult = $("a[href*=\"/film/\"]").first().attr("href");
                
                console.error("[FullHD] Link: " + firstResult);
                
                if (!firstResult) {
                    return resolve([]);
                }

                var parts = firstResult.split("/");
                var filmSlug = parts[parts.length - 1] || parts[parts.length - 2];
                filmSlug = filmSlug.replace(/\/$/, "");
                
                var filmUrl = BASE_URL + "/film/" + filmSlug + "/";
                console.error("[FullHD] Film: " + filmUrl);
                
                return fetch(filmUrl, { headers: HEADERS });
            })
            .then(function(res) {
                if (!res.ok) throw new Error("Film: " + res.status);
                return res.text();
            })
            .then(function(filmHtml) {
                var vididMatch = filmHtml.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
                if (!vididMatch) {
                    console.error("[FullHD] vidid yok");
                    return resolve([]);
                }
                
                var vidid = vididMatch[1];
                console.error("[FullHD] vidid: " + vidid);
                
                // Atom API
                var apiUrl = BASE_URL + "/player/api.php?id=" + vidid + 
                           "&type=t&name=atom&get=video&format=json";
                
                console.error("[FullHD] API: " + apiUrl);
                
                return fetch(apiUrl, { headers: HEADERS });
            })
            .then(function(res) {
                if (!res.ok) throw new Error("API: " + res.status);
                return res.text();
            })
            .then(function(apiResponse) {
                console.error("[FullHD] API RAW: " + apiResponse.substring(0, 200));
                
                var data;
                try {
                    data = JSON.parse(apiResponse);
                } catch(e) {
                    console.error("[FullHD] JSON HATASI: " + e.message);
                    return resolve([]);
                }
                
                var streams = [];
                
                // YENI: API direkt URL donduruyor
                if (data && data.html && data.html.length > 0) {
                    var videoUrl = data.html.replace(/\\/g, ""); // Backslash'leri temizle
                    
                    console.error("[FullHD] Video URL: " + videoUrl);
                    
                    // RapidVid URL'si mi kontrol et
                    if (videoUrl.indexOf("rapidvid.net") !== -1 || 
                        videoUrl.indexOf("http") === 0) {
                        
                        streams.push({
                            name: "FullHD RapidVid",
                            title: "FullHD",
                            url: videoUrl,
                            quality: "Auto",
                            headers: {
                                "User-Agent": HEADERS["User-Agent"],
                                "Referer": BASE_URL + "/"
                            },
                            provider: "fullhd"
                        });
                        
                        console.error("[FullHD] Stream eklendi");
                    }
                } else {
                    console.error("[FullHD] Bos API yanıtı");
                }
                
                console.error("[FullHD] Toplam: " + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error("[FullHD] HATA: " + err.message);
                resolve([]); 
            });
    });
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}

console.error("[FullHD] v6.2 yuklendi");
