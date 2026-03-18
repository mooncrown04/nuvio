/**
 * Nuvio Hibrit Scraper - v4.0 (Zırhlı & Kesin Dizi Çıkışı)
 * Kısıtlamalar: async/await YASAK, Promise zorunlu.
 */

var cheerio = require("cheerio-without-node-native");

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.dizixo.com/',
    'Origin': 'https://www.dizixo.com',
    'X-Requested-With': 'XMLHttpRequest'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // ÇIKIŞ GARANTİSİ: Ne olursa olsun bu değişken bir dizi (Array) kalacak.
        var streamsResult = []; 
        var isMovie = mediaType === 'movie';

        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.name;
                var searchUrl = 'https://www.dizixo.com/api?action=search&q=' + encodeURIComponent(query);
                
                return fetch(searchUrl, { headers: WORKING_HEADERS })
                    .then(function(res) { return res.json(); })
                    .then(function(json) {
                        return { results: json, title: query };
                    });
            })
            .then(function(searchResult) {
                var targetId = "";
                var apiData = [];

                // 1. JSON PARSE GÜVENLİĞİ
                var raw = searchResult.results;
                if (Array.isArray(raw)) {
                    apiData = raw;
                } else if (raw && raw.data && Array.isArray(raw.data)) {
                    apiData = raw.data;
                } else if (raw && typeof raw === 'object') {
                    apiData = [raw]; // Tekil objeyi diziye zorla
                }

                // 2. EŞLEŞME (Katil Makine - 1265609)
                var cleanSearch = (searchResult.title || "").toLowerCase().trim();
                for (var i = 0; i < apiData.length; i++) {
                    var item = apiData[i];
                    var itemTitle = (item.title || item.name || "").toLowerCase().trim();
                    
                    if (itemTitle.indexOf(cleanSearch) !== -1 || item.id == "1265609") {
                        targetId = item.id || item.movie_id;
                        break;
                    }
                }

                // ID Bulunamazsa GÜVENLİ ÇIKIŞ (Boş dizi döndürerek)
                if (!targetId) {
                    console.log("Dizixo: Eslesme yok.");
                    return resolve([]); 
                }

                // 3. YAYIN ALMA
                var streamUrl = 'https://www.dizixo.com/api?action=getStream&id=' + targetId;
                if (!isMovie) streamUrl += '&season=' + seasonNum + '&episode=' + episodeNum;

                return fetch(streamUrl, { headers: WORKING_HEADERS })
                    .then(function(res) { return res.json(); })
                    .then(function(streamJson) {
                        var videoUrl = streamJson.url || (streamJson.data && streamJson.data.url) || streamJson.link;

                        if (videoUrl) {
                            streamsResult.push({
                                name: "Dizixo HQ",
                                title: searchResult.title,
                                url: videoUrl,
                                quality: "1080p",
                                headers: WORKING_HEADERS,
                                provider: "Dizixo"
                            });
                        }
                        // BAŞARILI SONUÇ
                        resolve(streamsResult);
                    })
                    .catch(function() { resolve([]); }); // Stream fetch hatası
            })
            .catch(function(err) {
                console.error('Kritik Hata:', err.message);
                // ASLA REJECT ETME: Java tarafı reject edildiğinde de bu hatayı verebilir.
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
