/**
 * Dizixo Nuvio Local Scraper - v3.1 (Hata Onarılmış Versiyon)
 * Kısıtlamalar: async/await YASAK, Promise zorunlu.
 */

var cheerio = require("cheerio-without-node-native");

// 1. DAHA GÜÇLÜ HEADER YAPISI
const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Origin': 'https://www.dizixo.com',
    'Referer': 'https://www.dizixo.com/',
    'Connection': 'keep-alive'
};

function universalAtob(str) {
    try {
        if (typeof atob === 'function') return atob(str);
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var out = ''; str = String(str).replace(/[=]+$/, '');
        for (var bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? out += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
            buffer = chars.indexOf(buffer);
        }
        return out;
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { 
                if(!res.ok) throw new Error("TMDB baglantisi basarisiz: " + res.status);
                return res.json(); 
            })
            .then(function(data) {
                var year = (data.release_date || data.first_air_date || "").split('-')[0];
                var query = data.title || data.name;
                
                // Dizixo Arama API - Genellikle ?action=search veya benzeri bir endpoint kullanır
                var searchUrl = 'https://www.dizixo.com/api?action=search&q=' + encodeURIComponent(query);

                console.log("Dizixo: Arama yapiliyor -> " + query);

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

                // LOG HATASI ÇÖZÜMÜ: Gelen veri Obje mi Liste mi kontrol et
                // "Expected BEGIN_ARRAY but was BEGIN_OBJECT" hatasını önler.
                if (Array.isArray(searchResult.results)) {
                    apiData = searchResult.results;
                } else if (searchResult.results && Array.isArray(searchResult.results.data)) {
                    apiData = searchResult.results.data;
                } else if (searchResult.results && typeof searchResult.results === 'object') {
                    // Tek bir sonuç geldiyse diziye çevir
                    apiData = [searchResult.results];
                }

                // İÇERİK EŞLEŞTİRME (ID BULMA)
                for (var i = 0; i < apiData.length; i++) {
                    var item = apiData[i];
                    var itemTitle = (item.title || item.name || "").toLowerCase();
                    var searchTitle = searchResult.title.toLowerCase();
                    
                    // İsim veya slug üzerinden eşleşme kontrolü
                    if (itemTitle.includes(searchTitle) || searchTitle.includes(itemTitle)) {
                        targetId = item.id || item.slug;
                        console.log("Dizixo: Eslesme bulundu -> ID: " + targetId);
                        break;
                    }
                }

                if (!targetId) {
                    console.error("Dizixo Hata: '" + searchResult.title + "' icin uygun ID bulunamadi.");
                    return resolve([]); 
                }

                // STREAM (YAYIN) ALMA
                var streamUrl = 'https://www.dizixo.com/api?action=getStream&id=' + targetId;
                if (!isMovie) {
                    streamUrl += '&season=' + seasonNum + '&episode=' + episodeNum;
                }

                return fetch(streamUrl, { headers: WORKING_HEADERS })
                    .then(function(res) { return res.json(); })
                    .then(function(streamJson) {
                        // Dizixo API genellikle 'url', 'link' veya 'data.url' döner
                        var videoUrl = "";
                        if (streamJson.url) videoUrl = streamJson.url;
                        else if (streamJson.data && streamJson.data.url) videoUrl = streamJson.data.url;
                        else if (streamJson.link) videoUrl = streamJson.link;

                        if (videoUrl) {
                            streams.push({
                                name: "Dizixo HQ",
                                title: searchResult.title + " (S" + seasonNum + " E" + episodeNum + ")",
                                url: videoUrl,
                                quality: "1080p",
                                headers: WORKING_HEADERS,
                                provider: "DizixoScraper"
                            });
                            console.log("Dizixo: Yayın başarıyla eklendi.");
                        } else {
                            console.error("Dizixo Hata: API'den video linki donmedi.");
                        }

                        resolve(streams);
                    });
            })
            .catch(function(err) {
                console.error('Dizixo Scraper Kritik Hata:', err.message);
                resolve([]); // Hata anında uygulamanın çökmemesi için boş dizi dön
            });
    });
}

// Export işlemleri
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
