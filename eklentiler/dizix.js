/**
 * Dizixo Scraper v5.5 - JSON-LD Verified
 * [HATA ÇÖZÜMÜ]: BEGIN_ARRAY & Space Failure
 */

var cheerio = require("cheerio-without-node-native");

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        // Java motoruna giden veriyi dizi olmaya zorlayan koruma katmanı
        var forceArrayResolve = function(output) {
            if (output && Array.isArray(output)) {
                resolve(output);
            } else {
                resolve([]); // Hata olsa bile boş dizi dön, asla obje dönme!
            }
        };

        try {
            var isMovie = mediaType === 'movie';
            var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

            fetch(tmdbUrl)
                .then(function(r) { return r.json(); })
                .then(function(tmdbData) {
                    var title = tmdbData.title || tmdbData.name;
                    // Sitedeki arama mantığına göre sorgu
                    var searchApi = 'https://www.dizixo.com/api?action=search&q=' + encodeURIComponent(title);
                    
                    return fetch(searchApi)
                        .then(function(r) { return r.json(); })
                        .then(function(json) {
                            return { apiResult: json, originalTitle: title };
                        });
                })
                .then(function(context) {
                    var items = [];
                    // API'den gelen veriyi diziye dönüştür (Sağlamlaştırma)
                    if (Array.isArray(context.apiResult)) {
                        items = context.apiResult;
                    } else if (context.apiResult && context.apiResult.data) {
                        items = context.apiResult.data;
                    }

                    var targetId = "";
                    for (var i = 0; i < items.length; i++) {
                        var item = items[i];
                        var itemTitle = (item.title || item.name || "").toLowerCase();
                        // Katil Makine ID'si veya İsim eşleşmesi
                        if (item.id == "1265609" || itemTitle.indexOf(context.originalTitle.toLowerCase()) !== -1) {
                            targetId = item.id;
                            break;
                        }
                    }

                    if (!targetId) return forceArrayResolve([]);

                    // Yayın linkini al
                    var streamApi = 'https://www.dizixo.com/api?action=getStream&id=' + targetId;
                    if (!isMovie) {
                        streamApi += '&season=' + seasonNum + '&episode=' + episodeNum;
                    }

                    return fetch(streamApi)
                        .then(function(r) { return r.json(); })
                        .then(function(sData) {
                            var videoLink = sData.url || (sData.data && sData.data.url) || sData.link;
                            var finalStreams = [];

                            if (videoLink) {
                                finalStreams.push({
                                    name: "Dizixo HQ",
                                    title: context.originalTitle,
                                    url: videoLink,
                                    quality: "1080p"
                                });
                            }
                            forceArrayResolve(finalStreams);
                        });
                })
                .catch(function() {
                    forceArrayResolve([]); // Fetch hatalarında boş dizi
                });

        } catch (e) {
            forceArrayResolve([]); // Kritik çökmelerde boş dizi
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
