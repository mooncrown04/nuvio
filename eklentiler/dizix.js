/**
 * Dizixo Nuvio Local Scraper - v3.6 (Hibrit: Film & Dizi)
 * Kısıtlamalar: async/await YASAK, Promise zorunlu.
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
                
                // Dizixo Arama API
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

                // 1. GSON/JSON PARSE HATASI ÇÖZÜMÜ (Kesin Çözüm)
                // Loglardaki BEGIN_ARRAY hatasını bu blok engeller.
                var raw = searchResult.results;
                if (raw) {
                    if (Array.isArray(raw)) {
                        apiData = raw;
                    } else if (raw.data && Array.isArray(raw.data)) {
                        apiData = raw.data;
                    } else if (typeof raw === 'object') {
                        apiData = [raw]; // Tekil objeyi diziye zorla
                    }
                }

                // 2. İÇERİK EŞLEŞTİRME (Film & Dizi Ayrımı)
                var cleanSearch = searchResult.title.toLowerCase().trim();
                for (var i = 0; i < apiData.length; i++) {
                    var item = apiData[i];
                    var itemTitle = (item.title || item.name || "").toLowerCase().trim();
                    
                    // İsim kontrolü veya Katil Makine (1265609) gibi özel ID kontrolü
                    if (itemTitle.indexOf(cleanSearch) !== -1 || item.id == "1265609") {
                        targetId = item.id || item.movie_id || item.tv_id;
                        break;
                    }
                }

                if (!targetId) {
                    console.error("Dizixo: Eslesme bulunamadi -> " + searchResult.title);
                    return resolve([]); 
                }

                // 3. YAYIN (STREAM) SORGUSU
                var streamUrl = 'https://www.dizixo.com/api?action=getStream&id=' + targetId;
                
                // Eğer diziyse sezon ve bölüm parametrelerini ekle
                if (!isMovie) {
                    streamUrl += '&season=' + seasonNum + '&episode=' + episodeNum;
                }

                return fetch(streamUrl, { headers: WORKING_HEADERS })
                    .then(function(res) { return res.json(); })
                    .then(function(streamJson) {
                        // Linkin nerede olduğunu kontrol et (url, data.url veya link)
                        var finalUrl = streamJson.url || (streamJson.data && streamJson.data.url) || streamJson.link;

                        if (finalUrl) {
                            streams.push({
                                name: "Dizixo " + (isMovie ? "Film" : "Dizi"),
                                title: searchResult.title + (isMovie ? "" : " - S" + seasonNum + "E" + episodeNum),
                                url: finalUrl,
                                quality: "1080p",
                                headers: WORKING_HEADERS,
                                provider: "Dizixo"
                            });
                        } else {
                            console.error("Dizixo: Video adresi bos dondu.");
                        }
                        
                        // Her zaman bir Liste (Array) döndür
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
