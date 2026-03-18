/**
 * Nuvio Scraper - v4.1 (Minimalist & Array Fix)
 */

var cheerio = require("cheerio-without-node-native");

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // Çıkış değişkenini en başta boş dizi yapıyoruz
        var results = []; 
        var isMovie = mediaType === 'movie';

        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.name;
                // Dizixo API
                var searchUrl = 'https://www.dizixo.com/api?action=search&q=' + encodeURIComponent(query);
                
                return fetch(searchUrl, { 
                    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } 
                })
                .then(function(res) { return res.json(); })
                .then(function(json) {
                    return { results: json, title: query };
                });
            })
            .then(function(searchObj) {
                var targetId = "";
                var items = [];

                // 1. JSON Listesi Kontrolü
                if (Array.isArray(searchObj.results)) items = searchObj.results;
                else if (searchObj.results && searchObj.results.data) items = searchObj.results.data;
                else if (typeof searchObj.results === 'object') items = [searchObj.results];

                // 2. ID Bulma (Katil Makine: 1265609)
                for (var i = 0; i < items.length; i++) {
                    var it = items[i];
                    var title = (it.title || it.name || "").toLowerCase();
                    if (title.indexOf(searchObj.title.toLowerCase()) !== -1 || it.id == "1265609") {
                        targetId = it.id;
                        break;
                    }
                }

                if (!targetId) return resolve([]); 

                // 3. Yayın Alma
                var streamUrl = 'https://www.dizixo.com/api?action=getStream&id=' + targetId;
                if (!isMovie) streamUrl += '&season=' + seasonNum + '&episode=' + episodeNum;

                return fetch(streamUrl)
                    .then(function(res) { return res.json(); })
                    .then(function(sJson) {
                        var link = sJson.url || (sJson.data && sJson.data.url) || sJson.link;

                        if (link) {
                            // En sade obje yapısı (Java'nın anlaması için en güvenlisi)
                            results.push({
                                name: "Dizixo",
                                title: searchObj.title,
                                url: link,
                                quality: "1080p"
                            });
                        }
                        resolve(results);
                    });
            })
            .catch(function() {
                // Hata olsa dahi boş dizi [] döndür, asla obje {} döndürme!
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
