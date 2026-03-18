/**
 * Dizixo Nuvio Local Scraper - v3.2 (Esnek Eşleşme)
 */

var cheerio = require("cheerio-without-node-native");

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.dizixo.com/',
    'Origin': 'https://www.dizixo.com'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.name;
                var year = (data.release_date || data.first_air_date || "").split('-')[0];
                
                // Arama URL'si
                var searchUrl = 'https://www.dizixo.com/api?action=search&q=' + encodeURIComponent(query);

                return fetch(searchUrl, { headers: WORKING_HEADERS })
                    .then(function(res) { return res.json(); })
                    .then(function(json) {
                        return { results: json, year: year, title: query };
                    });
            })
            .then(function(searchResult) {
                var streams = [];
                var targetId = "";
                var apiData = [];

                // JSON Parse Hatası Önleyici
                if (Array.isArray(searchResult.results)) apiData = searchResult.results;
                else if (searchResult.results && Array.isArray(searchResult.results.data)) apiData = searchResult.results.data;
                else if (searchResult.results && typeof searchResult.results === 'object') apiData = [searchResult.results];

                // ESNEK EŞLEŞME MANTIĞI (Katil Makine gibi sorunlar için)
                for (var i = 0; i < apiData.length; i++) {
                    var item = apiData[i];
                    var itemTitle = (item.title || item.name || "").toLowerCase();
                    var searchTitle = searchResult.title.toLowerCase();

                    // 1. Yöntem: Tam içerme
                    var match = itemTitle.includes(searchTitle) || searchTitle.includes(itemTitle);
                    
                    // 2. Yöntem: Kelime bazlı (Eğer ilk yöntem başarısızsa)
                    if (!match) {
                        var searchWords = searchTitle.split(" ");
                        if (searchWords.length > 0 && itemTitle.includes(searchWords[0])) match = true;
                    }

                    if (match) {
                        targetId = item.id || item.slug;
                        break;
                    }
                }

                if (!targetId) {
                    console.error("Dizixo Hata: '" + searchResult.title + "' bulunamadi.");
                    return resolve([]); 
                }

                // Video Linki Alma
                var streamUrl = 'https://www.dizixo.com/api?action=getStream&id=' + targetId;
                if (!isMovie) streamUrl += '&season=' + seasonNum + '&episode=' + episodeNum;

                return fetch(streamUrl, { headers: WORKING_HEADERS })
                    .then(function(res) { return res.json(); })
                    .then(function(streamJson) {
                        var videoUrl = streamJson.url || (streamJson.data && streamJson.data.url) || streamJson.link;

                        if (videoUrl) {
                            streams.push({
                                name: "Dizixo HQ",
                                title: searchResult.title,
                                url: videoUrl,
                                quality: "1080p",
                                headers: WORKING_HEADERS,
                                provider: "Dizixo"
                            });
                        }
                        resolve(streams);
                    });
            })
            .catch(function(err) {
                console.error('Kritik Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
