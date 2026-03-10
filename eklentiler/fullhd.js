/**
 * FullHDFilmizlesene - v6.1 (Debug API)
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://www.fullhdfilmizlesene.live";

var HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9",
    "Referer": BASE_URL + "/"
};

function decodeLink(encodedLink) {
    var reversed = encodedLink.split("").reverse().join("");
    try {
        var step1 = atob(reversed);
    } catch(e) {
        return null;
    }
    
    var key = "K9L";
    var output = "";
    
    for (var i = 0; i < step1.length; i++) {
        var r = key.charCodeAt(i % 3);
        var n = step1.charCodeAt(i) - (r % 5 + 1);
        output += String.fromCharCode(n);
    }
    
    try {
        return atob(output);
    } catch(e) {
        return null;
    }
}

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
                // DEBUG: API yanıtını göster
                console.error("[FullHD] API RAW: " + apiResponse.substring(0, 500));
                
                var cleanJson = apiResponse.replace(/\\/g, "");
                console.error("[FullHD] CLEAN: " + cleanJson.substring(0, 500));
                
                var data;
                try {
                    data = JSON.parse(cleanJson);
                } catch(e) {
                    console.error("[FullHD] JSON HATASI: " + e.message);
                    return resolve([]);
                }
                
                console.error("[FullHD] DATA: " + JSON.stringify(data).substring(0, 500));
                
                var streams = [];
                
                // Farklı patternler dene
                if (data && data.html) {
                    console.error("[FullHD] HTML var: " + data.html.substring(0, 200));
                    
                    // Pattern 1: av('...')
                    var atomMatch = data.html.match(/av\(['"]([^'"]+)['"]\)/);
                    if (atomMatch) {
                        console.error("[FullHD] Pattern 1 bulundu: " + atomMatch[1].substring(0, 50));
                        var decodedLink = decodeLink(atomMatch[1]);
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
                    } else {
                        console.error("[FullHD] Pattern 1 bulunamadi");
                    }
                    
                    // Pattern 2: file:"..."
                    var fileMatch = data.html.match(/file\s*:\s*["']([^"']+)["']/);
                    if (fileMatch && streams.length === 0) {
                        console.error("[FullHD] Pattern 2 bulundu: " + fileMatch[1]);
                        streams.push({
                            name: "FullHD Direct",
                            title: "FullHD",
                            url: fileMatch[1],
                            quality: "Auto",
                            headers: HEADERS,
                            provider: "fullhd"
                        });
                    }
                    
                    // Pattern 3: src="..."
                    var srcMatch = data.html.match(/src\s*=\s*["']([^"']+\.m3u8[^"']*)["']/);
                    if (srcMatch && streams.length === 0) {
                        console.error("[FullHD] Pattern 3 bulundu: " + srcMatch[1]);
                        streams.push({
                            name: "FullHD M3U8",
                            title: "FullHD",
                            url: srcMatch[1],
                            quality: "Auto",
                            headers: HEADERS,
                            provider: "fullhd"
                        });
                    }
                } else {
                    console.error("[FullHD] data.html yok");
                }
                
                console.error("[FullHD] Stream sayisi: " + streams.length);
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

console.error("[FullHD] v6.1 yuklendi");
