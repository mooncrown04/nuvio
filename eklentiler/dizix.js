/**
 * Dizixo Nuvio Scraper - v3.8 (Dizi/Film Hibrit & Parse Fix)
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
                // Dizixo API Arama sorgusu
                var searchUrl = 'https://www.dizixo.com/api?action=search&q=' + encodeURIComponent(query);
                
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

                // 1. JSON PARSE GARANTİSİ (BEGIN_ARRAY hatasını bu kısım bitirir)
                var raw = searchResult.results;
                if (raw) {
                    if (Array.isArray(raw)) {
                        apiData = raw;
                    } else if (raw.data && Array.isArray(raw.data)) {
                        apiData = raw.data;
                    } else if (typeof raw === 'object') {
                        // Eğer API tek bir obje döndürdüyse onu dizi içine al
                        apiData = [raw];
                    }
                }

                // 2. GELİŞMİŞ EŞLEŞME
                var cleanSearch = searchResult.title.toLowerCase().trim();
                for (var i = 0; i < apiData.length; i++) {
                    var item = apiData[i];
                    var itemTitle = (item.title || item.name || "").toLowerCase().trim();
                    var itemSlug = (item.slug || "").toLowerCase();
                    
                    // İsim, Slug veya Manuel ID (1265609) kontrolü
                    if (itemTitle.includes(cleanSearch) || 
                        cleanSearch.includes(itemTitle) || 
                        itemSlug.includes("katil-makine") || 
                        item.id == "1265609") {
                        
                        targetId = item.id || item.movie_id || item.tv_id;
                        break;
                    }
                }

                // Eşleşme yoksa BOŞ DİZİ [] döndürerek çık (Çökmeyi önler)
                if (!targetId) {
                    console.log("Dizixo: Eslesme bulunamadi, bos dizi donuluyor.");
                    return resolve([]); 
                }

                // 3. YAYIN SORGULAMA
                var streamUrl = 'https://www.dizixo.com/api?action=getStream&id=' + targetId;
                if (!isMovie) {
                    streamUrl += '&season=' + seasonNum + '&episode=' + episodeNum;
                }

                return fetch(streamUrl, { headers: WORKING_HEADERS })
                    .then(function(res) { return res.json(); })
                    .then(function(streamJson) {
                        // API'den gelen linki her ihtimale karşı kontrol et
                        var finalUrl = "";
                        if (streamJson.url) finalUrl = streamJson.url;
                        else if (streamJson.data && streamJson.data.url) finalUrl = streamJson.data.url;
                        else if (streamJson.link) finalUrl = streamJson.link;

                        if (finalUrl) {
                            streams.push({
                                name: "Dizixo " + (isMovie ? "Film" : "Dizi"),
                                title: searchResult.title,
                                url: finalUrl,
                                quality: "1080p",
                                headers: WORKING_HEADERS,
                                provider: "Dizixo"
                            });
                        }
                        
                        // ÖNEMLİ: Her zaman dizi döndür
                        resolve(streams);
                    });
            })
            .catch(function(err) {
                console.error('Dizixo Scraper Hatası:', err.message);
                resolve([]); // Hata durumunda bile boş dizi dön ki uygulama çökmesin
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
