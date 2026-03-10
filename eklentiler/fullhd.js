/**
 * FullHDFilmizlesene Nuvio Scraper - v6.0 (Çalışan Versiyon)
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
    try {
        var step1 = atob(reversed);
    } catch(e) {
        return null;
    }
    
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

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[FullHD] getStreams cagrildi: " + tmdbId);
    
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
                
                // Arama URL - path tabanli
                var searchUrl = BASE_URL + "/arama/" + encodeURIComponent(query);
                console.error("[FullHD] Search: " + searchUrl);
                
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res.ok) throw new Error("Arama: " + res.status);
                return res.text(); 
            })
            .then(function(html) {
                console.error("[FullHD] HTML uzunluk: " + html.length);
                
                var $ = cheerio.load(html);
                var firstResult = $("a[href*=\"/film/\"]").first().attr("href");
                
                console.error("[FullHD] Bulunan link: " + firstResult);
                
                if (!firstResult) {
                    return resolve([]);
                }

                // Slug'i çıkar
                var parts = firstResult.split("/");
                var filmSlug = parts[parts.length - 1] || parts[parts.length - 2];
                filmSlug = filmSlug.replace(/\/$/, "");
                
                var filmUrl = BASE_URL + "/film/" + filmSlug + "/";
                console.error("[FullHD] Film URL: " + filmUrl);
                
                return fetch(filmUrl, { headers: HEADERS });
            })
            .then(function(res) {
                if (!res.ok) throw new Error("Film: " + res.status);
                return res.text();
            })
            .then(function(filmHtml) {
                // vidid çek
                var vididMatch = filmHtml.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
                if (!vididMatch) {
                    console.error("[FullHD] vidid bulunamadi");
                    return resolve([]);
                }
                
                var vidid = vididMatch[1];
                console.error("[FullHD] vidid: " + vidid);
                
                // API'den video bilgisi çek
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
                // JSON parse et (backslash'leri temizle)
                var cleanJson = apiResponse.replace(/\\/g, "");
                var data = JSON.parse(cleanJson);
                
                console.error("[FullHD] API yaniti alindi");
                
                var streams = [];
                
                // Atom URL'si
                if (data && data.html) {
                    var atomMatch = data.html.match(/av\(['"]([^'"]+)['"]\)/);
                    if (atomMatch) {
                        var encodedLink = atomMatch[1];
                        var decodedLink = decodeLink(encodedLink);
                        
                        console.error("[FullHD] Atom decoded: " + (decodedLink ? "OK" : "FAIL"));
                        
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
                
                console.error("[FullHD] Toplam stream: " + streams.length);
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

console.error("[FullHD] Plugin yuklendi - v6.0");
