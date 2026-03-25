/**
 * 666FilmIzle Nuvio Local Scraper - v3.6
 * 404 Hataları için URL yapısı ve Regex tamamen güncellendi.
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://666filmizle.site";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";

var WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var title = data.title || data.name || data.original_title;
                if (!title) return resolve([]);
                
                var searchUrl = BASE_URL + '/arama/?q=' + encodeURIComponent(title);
                return fetch(searchUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var targetUrl = "";

                $(".film-card").each(function() {
                    var cardLink = $(this).find("a.film-card__link").attr("href");
                    if (cardLink) {
                        targetUrl = cardLink.startsWith('http') ? cardLink : BASE_URL + cardLink;
                        return false; 
                    }
                });

                if (!targetUrl) return resolve([]);
                return fetch(targetUrl, { headers: WORKING_HEADERS });
            })
            .then(function(r) { return r.text(); })
            .then(function(pageHtml) {
                var streams = [];
                
                // 1. YENİ RAPIDPLAY ÇÖZÜCÜ (v3.6)
                // data-frame içindeki URL'den ID'yi daha agresif çeker
                var frameMatch = pageHtml.match(/data-frame="([^"]+)"/);
                if (frameMatch && frameMatch[1].includes("rapidplay")) {
                    var rawUrl = frameMatch[1];
                    // ID'yi ayıklayalım (embed/ID veya #ID formatı için)
                    var videoId = "";
                    if (rawUrl.includes("#")) {
                        videoId = rawUrl.split("#").pop();
                    } else if (rawUrl.includes("embed/")) {
                        videoId = rawUrl.split("embed/").pop().split(/[?#]/)[0];
                    }

                    if (videoId && videoId.length > 5) {
                        streams.push({
                            name: "666Film - Auto",
                            url: "https://p.rapidplay.website/videos/" + videoId + "/master.m3u8",
                            quality: "Auto",
                            isM3U8: true,
                            headers: { 
                                'Referer': 'https://p.rapidplay.website/',
                                'User-Agent': WORKING_HEADERS['User-Agent']
                            },
                            provider: "666film"
                        });
                    }
                }

                // 2. VİDMOLY KONTROLÜ (Alternatif olarak kalsın)
                var vidmolyRegex = /src="([^"]*vidmoly\.to\/embed\/([^".?# ]+)[^"]*)"/i;
                var vMatch = pageHtml.match(vidmolyRegex);
                if (vMatch && vMatch[1]) {
                    streams.push({
                        name: "666Film - VidMoly",
                        url: vMatch[1].startsWith("//") ? "https:" + vMatch[1] : vMatch[1],
                        quality: "HD",
                        provider: "666film"
                    });
                }

                resolve(streams);
            })
            .catch(function() {
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
