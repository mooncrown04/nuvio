/**
 * Nuvio Scraper v5.0 - Final Array Shield
 * [HATA]: java.lang.IllegalStateException: Expected BEGIN_ARRAY
 */

var cheerio = require("cheerio-without-node-native");

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        // KRİTİK GÜVENLİK: Java motoruna sadece temiz dizi gitmesini sağlar
        function finalOutput(data) {
            if (data && Array.isArray(data)) {
                resolve(data);
            } else {
                // Eğer data dizi değilse (hata objesiyse vb.) boş dizi dönerek çökmeyi engelle
                resolve([]);
            }
        }

        try {
            var isMovie = mediaType === 'movie';
            var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

            fetch(tmdbUrl)
                .then(function(r) { return r.json(); })
                .then(function(tmdb) {
                    var query = tmdb.title || tmdb.name;
                    var searchUrl = 'https://www.dizixo.com/api?action=search&q=' + encodeURIComponent(query);
                    
                    return fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
                        .then(function(r) { return r.json(); })
                        .then(function(searchRes) {
                            return { list: searchRes, title: query };
                        });
                })
                .then(function(context) {
                    var items = [];
                    // API formatını standardize et (Dizixo için)
                    var raw = context.list;
                    if (Array.isArray(raw)) items = raw;
                    else if (raw && raw.data && Array.isArray(raw.data)) items = raw.data;
                    else if (raw && typeof raw === 'object') items = [raw];

                    var targetId = "";
                    for (var i = 0; i < items.length; i++) {
                        var it = items[i];
                        var itTitle = (it.title || it.name || "").toLowerCase();
                        // 1265609 (Katil Makine) ID kontrolü
                        if (itTitle.indexOf(context.title.toLowerCase()) !== -1 || it.id == "1265609") {
                            targetId = it.id;
                            break;
                        }
                    }

                    if (!targetId) return finalOutput([]);

                    var streamUrl = 'https://www.dizixo.com/api?action=getStream&id=' + targetId;
                    if (!isMovie) streamUrl += '&season=' + seasonNum + '&episode=' + episodeNum;

                    return fetch(streamUrl)
                        .then(function(r) { return r.json(); })
                        .then(function(sJson) {
                            var link = sJson.url || (sJson.data && sJson.data.url) || sJson.link;
                            var results = [];
                            if (link) {
                                results.push({
                                    name: "Dizixo",
                                    title: context.title,
                                    url: link,
                                    quality: "1080p",
                                    provider: "Dizixo"
                                });
                            }
                            finalOutput(results);
                        });
                })
                .catch(function(err) {
                    console.error("Fetch Hatasi:", err.message);
                    finalOutput([]); // Hata anında boş dizi
                });

        } catch (globalErr) {
            finalOutput([]); // Global çökmede boş dizi
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
