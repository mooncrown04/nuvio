/**
 * FullHDFilmizlesene Nuvio Scraper - v6.0 (API Tabanlı)
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://www.fullhdfilmizlesene.live";

var HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9",
    "Referer": BASE_URL + "/"
};

// PHP'deki decodeLink fonksiyonunun JS versiyonu
function decodeLink(encodedLink) {
    // 1. Ters çevir
    var reversed = encodedLink.split("").reverse().join("");
    
    // 2. Base64 decode
    var step1 = atob(reversed);
    
    // 3. XOR/Shift decode
    var key = "K9L";
    var output = "";
    
    for (var i = 0; i < step1.length; i++) {
        var r = key.charCodeAt(i % 3);
        var n = step1.charCodeAt(i) - (r % 5 + 1);
        output += String.fromCharCode(n);
    }
    
    // 4. Son base64 decode
    try {
        return atob(output);
    } catch(e) {
        return null;
    }
}

function log(msg) {
    console.log("[FullHD] " + msg);
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        log("Starting: " + tmdbId);

        var tmdbType = mediaType === "movie" ? "movie" : "tv";
        var tmdbUrl = "https://api.themoviedb.org/3/" + tmdbType + "/" + tmdbId + 
                      "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96";

        var filmSlug = null; // Film slug'ini sakla

        fetch(tmdbUrl)
            .then(function(res) { 
                if (!res.ok) throw new Error("TMDB: " + res.status);
                return res.json(); 
            })
            .then(function(data) {
                var query = data ? (data.title || data.name || data.original_title || data.original_name) : "";
                if (!query) throw new Error("Isim bulunamadi");
                
                log("Aranacak: " + query);
                
                // Arama yap
                var searchUrl = BASE_URL + "/arama/" + encodeURIComponent(query);
                log("Search: " + searchUrl);
                
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res.ok) throw new Error("Arama: " + res.status);
                return res.text(); 
            })
            .then(function(html) {
                var $ = cheerio.load(html);
                var firstResult = $("a[href*=\"/film/\"]").first().attr("href");
                
                log("Bulunan: " + firstResult);
                
                if (!firstResult) {
                    return resolve([]);
                }

                // Slug'i çıkar (/film/film-adi-izle/ -> film-adi-izle)
                var parts = firstResult.split("/");
                filmSlug = parts[parts.length - 1] || parts[parts.length - 2];
                filmSlug = filmSlug.replace(/\/$/, "");
                
                var filmUrl = BASE_URL + "/film/" + filmSlug + "/";
                log("Film URL: " + filmUrl);
                
                return fetch(filmUrl, { headers: HEADERS });
            })
            .then(function(res) {
                if (!res.ok) throw new Error("Film sayfasi: " + res.status);
                return res.text();
            })
            .then(function(filmHtml) {
                // vidid çek - PHP'deki gibi
                var vididMatch = filmHtml.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
                if (!vididMatch) {
                    log("vidid bulunamadi");
                    return resolve([]);
                }
                
                var vidid = vididMatch[1];
                log("vidid: " + vidid);
                
                // API'den video bilgisi çek
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
                // JSON parse et (backslash'leri temizle)
                var cleanJson = apiResponse.replace(/\\/g, "");
                var data = JSON.parse(cleanJson);
                
                log("API yaniti alindi");
                
                var streams = [];
                
                // Atom URL'si
                if (data && data.html) {
                    var atomMatch = data.html.match(/av\(['"]([^'"]+)['"]\)/);
                    if (atomMatch) {
                        var encodedLink = atomMatch[1];
                        var decodedLink = decodeLink(encodedLink);
                        
                        log("Atom decoded: " + (decodedLink ? "basarili" : "basarisiz"));
                        
                        if (decodedLink) {
                            streams.push({
                                name: "FullHD Atom",
                                title: "FullHD",
                                url: decodedLink,
                                quality: "Auto",
                                headers: {
                                    "User-Agent": HEADERS["User-Agent"],
                                    "Referer": BASE_URL + "/"
                                },
                                provider: "fullhd"
                            });
                        }
                    }
                }
                
                // Turbo URL'si için ikinci API çağrısı
                // (Opsiyonel - istersen eklenebilir)
                
                log("Toplam stream: " + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                log("HATA: " + err.message);
                resolve([]); 
            });
    });
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}

log("Plugin yuklendi - v6.0 API Tabanli");
