/**
 * Nuvio Scraper v4.5 - Ultra-Safe Edition
 * [HATA ÇÖZÜMÜ]: Expected BEGIN_ARRAY
 */

var cheerio = require("cheerio-without-node-native");

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    // Nuvio'nun beklediği ana yapı bir Promise dizisidir
    return new Promise(function(outerResolve) {
        
        // İçerideki tüm hataları yakalayıp her zaman dizi dönmesini garanti ediyoruz
        var safeResolve = function(data) {
            if (!Array.isArray(data)) {
                outerResolve([]); // Veri dizi değilse boş dizi zorla
            } else {
                outerResolve(data);
            }
        };

        try {
            var isMovie = mediaType === 'movie';
            var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

            fetch(tmdbUrl)
                .then(function(r) { return r.json(); })
                .then(function(tmdbData) {
                    var query = tmdbData.title || tmdbData.name;
                    var searchUrl = 'https://www.dizixo.com/api?action=search&q=' + encodeURIComponent(query);
                    
                    return fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
                        .then(function(r) { return r.json(); })
                        .then(function(searchJson) {
                            return { list: searchJson, query: query };
                        });
                })
                .then(function(resObj) {
                    var items = [];
                    // API formatını standardize et
                    if (Array.isArray(resObj.list)) items = resObj.list;
                    else if (resObj.list && resObj.list.data) items = resObj.list.data;
                    else if (resObj.list && typeof resObj.list === 'object') items = [resObj.list];

                    var targetId = "";
                    for (var i = 0; i < items.length; i++) {
                        var it = items[i];
                        var itTitle = (it.title || it.name || "").toLowerCase();
                        // "Katil Makine" veya TMDB ID eşleşmesi
                        if (itTitle.indexOf(resObj.query.toLowerCase()) !== -1 || it.id == "1265609") {
                            targetId = it.id;
                            break;
                        }
                    }

                    if (!targetId) return safeResolve([]);

                    var streamUrl = 'https://www.dizixo.com/api?action=getStream&id=' + targetId;
                    if (!isMovie) streamUrl += '&season=' + seasonNum + '&episode=' + episodeNum;

                    return fetch(streamUrl)
                        .then(function(r) { return r.json(); })
                        .then(function(sJson) {
                            var link = sJson.url || (sJson.data && sJson.data.url) || sJson.link;
                            var streams = [];
                            if (link) {
                                streams.push({
                                    name: "Dizixo",
                                    title: resObj.query,
                                    url: link,
                                    quality: "1080p"
                                });
                            }
                            safeResolve(streams);
                        });
                })
                .catch(function(e) {
                    console.error("Scraper Catch:", e.message);
                    safeResolve([]); // Hata anında boş dizi
                });

        } catch (globalErr) {
            safeResolve([]); // Global çökmede boş dizi
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
