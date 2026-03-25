/**
 * 666FilmIzle Nuvio Local Scraper - v3.5
 * Dangal ve benzeri filmlerdeki 404 (Rapidplay) hatası düzeltildi.
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://666filmizle.site";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";

var WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
                
                // 1. GELİŞTİRİLMİŞ RAPIDPLAY YAKALAYICI (404 FIX)
                // Dangal gibi filmlerde # işaretinden sonraki ID'yi daha garanti yakalar
                var rapidRegex = /data-frame="([^"]*rapidplay\.website[^"]*(?:#|\/embed\/)([^"#?]+))"/g;
                var m;
                while ((m = rapidRegex.exec(pageHtml)) !== null) {
                    var videoId = m[2];
                    if (videoId) {
                        // Bazı videolarda master.m3u8 404 verirken index.m3u8 çalışır.
                        streams.push({
                            name: "666Film - Auto",
                            url: "https://p.rapidplay.website/videos/" + videoId + "/index.m3u8",
                            quality: "Auto",
                            isM3U8: true,
                            headers: { 'Referer': 'https://p.rapidplay.website/' },
                            provider: "666film"
                        });
                    }
                }

                // 2. VİDMOLY KONTROLÜ
                var vidmolyMatch = pageHtml.match(/src="([^"]*vidmoly[^"]+)"/i);
                if (vidmolyMatch && vidmolyMatch[1]) {
                    streams.push({
                        name: "666Film - VidMoly",
                        url: vidmolyMatch[1].startsWith("//") ? "https:" + vidmolyMatch[1] : vidmolyMatch[1],
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
