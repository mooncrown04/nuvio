/**
 * Dizixo Nuvio Local Scraper - v3.3 (URL & ID Fix)
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
            .then(function(res) { 
                if(!res.ok) throw new Error("TMDB hatasi: " + res.status);
                return res.json(); 
            })
            .then(function(data) {
                var query = data.title || data.name;
                // Dizixo araması için URL oluşturma
                var searchUrl = 'https://www.dizixo.com/api?action=search&q=' + encodeURIComponent(query);

                console.log("Dizixo Arama Başlatıldı: " + query);

                return fetch(searchUrl, { headers: WORKING_HEADERS })
                    .then(function(res) { return res.json(); })
                    .then(function(json) {
                        return { results: json, title: query };
                    });
            })
            .then(function(searchResult) {
                var streams = [];
                var targetId = "";
                var apiData = [];

                // 1. JSON Yapısını Çözme (BEGIN_OBJECT hatası için)
                if (Array.isArray(searchResult.results)) {
                    apiData = searchResult.results;
                } else if (searchResult.results && Array.isArray(searchResult.results.data)) {
                    apiData = searchResult.results.data;
                } else if (searchResult.results && typeof searchResult.results === 'object') {
                    apiData = [searchResult.results];
                }

                // 2. ID Bulma (Esnek Arama)
                for (var i = 0; i < apiData.length; i++) {
                    var item = apiData[i];
                    var itemTitle = (item.title || item.name || "").toLowerCase();
                    var searchTitle = searchResult.title.toLowerCase();

                    // Senin verdiğin linkteki 1265609 gibi ID'leri yakalamak için
                    if (itemTitle.includes(searchTitle) || searchTitle.includes(itemTitle)) {
                        targetId = item.id || item.movie_id || item.slug;
                        break;
                    }
                }

                // Eğer arama sonuç vermediyse alternatif olarak slug denemesi
                if (!targetId) {
                    console.error("Dizixo Hata: '" + searchResult.title + "' için ID eşleşmedi.");
                    return resolve([]);
                }

                // 3. Stream Alırken /details/movie/ mantığını kullanma
                // Dizixo API'de stream almak için genellikle 'getMovie' veya 'getVideo' kullanılır
                var streamUrl = 'https://www.dizixo.com/api?action=getStream&id=' + targetId;
                if (!isMovie) {
                    streamUrl += '&season=' + seasonNum + '&episode=' + episodeNum;
                }

                return fetch(streamUrl, { headers: WORKING_HEADERS })
                    .then(function(res) { return res.json(); })
                    .then(function(streamJson) {
                        // API'den dönen farklı link formatlarını kontrol et
                        var finalUrl = streamJson.url || (streamJson.data && streamJson.data.url) || streamJson.link;

                        if (finalUrl) {
                            streams.push({
                                name: "Dizixo - 1080p",
                                title: searchResult.title,
                                url: finalUrl,
                                quality: "1080p",
                                headers: WORKING_HEADERS,
                                provider: "Dizixo"
                            });
                            console.log("Dizixo: Yayın bulundu.");
                        } else {
                            console.error("Dizixo Hata: Stream linki boş döndü.");
                        }
                        resolve(streams);
                    });
            })
            .catch(function(err) {
                console.error('Dizixo Kritik Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
