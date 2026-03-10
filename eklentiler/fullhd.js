/**
 * FullHDFilmizlesene Nuvio Scraper - v5.1 (Syntax Fix)
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://fullhdfilmizlesene.live";

var HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9",
    "Referer": BASE_URL + "/"
};

function log(msg) {
    console.log("[FullHD] " + msg);
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        log("Starting: " + tmdbId + " type: " + mediaType);

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
                
                // Arama URL - Kotlin ile ayni
                var searchUrl = BASE_URL + "/arama?q=" + encodeURIComponent(query).replace(/%20/g, "+");
                log("Search: " + searchUrl);
                
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res.ok) throw new Error("Arama: " + res.status);
                return res.text(); 
            })
            .then(function(html) {
                log("HTML uzunluk: " + html.length);
                
                var $ = cheerio.load(html);
                
                // Link bul
                var firstResult = null;
                
                // Once film ara
                if (mediaType === "movie") {
                    $("a[href*=\"/film/\"]").each(function(i, el) {
                        if (!firstResult) {
                            firstResult = $(el).attr("href");
                        }
                    });
                } else {
                    // Dizi ara
                    $("a[href*=\"/dizi/\"]").each(function(i, el) {
                        if (!firstResult) {
                            firstResult = $(el).attr("href");
                        }
                    });
                }
                
                // Genel ara
                if (!firstResult) {
                    $("a[href*=\"/film/\"], a[href*=\"/dizi/\"]").each(function(i, el) {
                        if (!firstResult) {
                            firstResult = $(el).attr("href");
                        }
                    });
                }
                
                log("Bulunan link: " + firstResult);
                
                if (!firstResult) {
                    log("Link bulunamadi");
                    return resolve([]);
                }

                // URL olustur
                var targetUrl;
                if (firstResult.indexOf("http") === 0) {
                    targetUrl = firstResult;
                } else {
                    targetUrl = BASE_URL + firstResult;
                }
                
                log("Hedef: " + targetUrl);
                
                // Dizi icin sezon/episode ekle
                if (mediaType === "tv" && seasonNum && episodeNum) {
                    if (targetUrl.indexOf("?") === -1) {
                        targetUrl = targetUrl + "?season=" + seasonNum + "&episode=" + episodeNum;
                    } else {
                        targetUrl = targetUrl + "&season=" + seasonNum + "&episode=" + episodeNum;
                    }
                    log("Dizi URL: " + targetUrl);
                }
                
                return fetch(targetUrl, { headers: HEADERS });
            })
            .then(function(res) {
                log("Icerik status: " + res.status);
                if (!res.ok) throw new Error("Icerik: " + res.status);
                return res.text();
            })
            .then(function(pageHtml) {
                var $ = cheerio.load(pageHtml);
                var streams = [];

                $("iframe").each(function(i, elem) {
                    var src = $(elem).attr("src") || $(elem).attr("data-src");
                    if (src) {
                        var url = src;
                        if (url.indexOf("//") === 0) {
                            url = "https:" + url;
                        } else if (url.indexOf("http") !== 0) {
                            url = "https:" + url;
                        }
                        
                        log("Iframe " + i + ": " + url.substring(0, 80));
                        
                        streams.push({
                            name: "FullHD Kaynak " + (i + 1),
                            title: "FullHD",
                            url: url,
                            quality: "Auto",
                            headers: HEADERS,
                            provider: "fullhd"
                        });
                    }
                });

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
