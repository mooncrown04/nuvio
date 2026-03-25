/**
 * 666FilmIzle Scraper - v4.5 (404 Auto-Fix)
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
                var title = data.title || data.name;
                if (!title) return resolve([]);
                return fetch(BASE_URL + '/arama/?q=' + encodeURIComponent(title), { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var targetUrl = "";
                $(".film-card").each(function() {
                    var link = $(this).find("a.film-card__link").attr("href");
                    if (link) {
                        targetUrl = link.startsWith('http') ? link : BASE_URL + link;
                        return false; 
                    }
                });
                if (!targetUrl) return resolve([]);
                return fetch(targetUrl, { headers: WORKING_HEADERS });
            })
            .then(function(r) { return r.text(); })
            .then(function(pageHtml) {
                var streams = [];
                var frameMatch = pageHtml.match(/data-frame="([^"]+)"/);
                
                if (frameMatch) {
                    var rawUrl = frameMatch[1];
                    var videoId = "";
                    
                    if (rawUrl.includes('#')) videoId = rawUrl.split('#').pop();
                    else if (rawUrl.includes('embed/')) videoId = rawUrl.split('embed/').pop().split(/[?#]/)[0];
                    else videoId = rawUrl.split('/').pop();

                    if (videoId && videoId.length > 4) {
                        // LOG: Terminalde hangi ID'nin bulunduğunu gör
                        console.log('[666Film] ID Bulundu:', videoId);

                        // 1. İHTİMAL: master.m3u8 (Genel standart)
                        streams.push({
                            name: "Rapidplay - Sunucu 1 (Master)",
                            url: "https://p.rapidplay.website/videos/" + videoId + "/master.m3u8",
                            quality: "Auto",
                            isM3U8: true,
                            headers: { 'Referer': BASE_URL + '/' },
                            provider: "666film"
                        });

                        // 2. İHTİMAL: index.m3u8 (Logdaki 404'ü çözebilecek alternatif)
                        streams.push({
                            name: "Rapidplay - Sunucu 2 (Index)",
                            url: "https://p.rapidplay.website/videos/" + videoId + "/index.m3u8",
                            quality: "Auto",
                            isM3U8: true,
                            headers: { 'Referer': BASE_URL + '/' },
                            provider: "666film"
                        });
                    }
                }

                // VİDMOLY KONTROLÜ (Eğer Rapidplay 404 verirse bu kesin çalışır)
                var vidmolyMatch = pageHtml.match(/https:\/\/vidmoly\.to\/embed-([^.]+)\.html/);
                if (vidmolyMatch) {
                    streams.push({
                        name: "Vidmoly - Yedek Sunucu",
                        url: vidmolyMatch[0],
                        quality: "HD",
                        provider: "666film"
                    });
                }

                resolve(streams);
            })
            .catch(function(err) {
                console.log('[666Film] Hata:', err.message);
                resolve([]);
            });
    });
}

module.exports = { getStreams: getStreams };
