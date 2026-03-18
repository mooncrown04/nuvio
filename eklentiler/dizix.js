/**
 * Dizixo Nuvio Local Scraper - v3.0
 * Kısıtlamalar: async/await YASAK, Promise zorunlu.
 */

var cheerio = require("cheerio-without-node-native");

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
                
                // Dizixo API Arama Parametresi (Tahmini: action=search)
                // Site React oldugu icin genellikle /api?action=search&q= sorgusu kullanir
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

                // API SONUCLARINI TARA (Dizixo JSON döner)
                if (searchResult.results && Array.isArray(searchResult.results)) {
                    for (var i = 0; i < searchResult.results.length; i++) {
                        var item = searchResult.results[i];
                        var itemTitle = (item.title || item.name || "").toLowerCase();
                        var itemYear = (item.year || item.release_date || "").toString();

                        if (itemTitle.includes(searchResult.title.toLowerCase()) && (itemYear.includes(searchResult.year) || searchResult.year === "")) {
                            targetId = item.id;
                            break;
                        }
                    }
                }

                if (!targetId) {
                    console.error("Dizixo Hata: Uygun icerik ID'si bulunamadi.");
                    return resolve([]);
                }

                // YAYIN LINKI ICIN API CAGRISI
                // Dizixo API yapisinda stream almak icin genellikle video_id veya content_id kullanilir
                var streamUrl = 'https://www.dizixo.com/api?action=getStream&id=' + targetId;
                if (!isMovie) {
                    streamUrl += '&season=' + seasonNum + '&episode=' + episodeNum;
                }

                return fetch(streamUrl, { headers: WORKING_HEADERS })
                    .then(function(res) { return res.json(); })
                    .then(function(streamData) {
                        
                        // Stream verisi genellikle 'url' veya 'link' icinde gelir
                        if (streamData && streamData.url) {
                            streams.push({
                                name: "Dizixo - " + (streamData.server || "HLS"),
                                title: searchResult.title + " (" + searchResult.year + ")",
                                url: streamData.url,
                                quality: streamData.quality || "1080p",
                                headers: WORKING_HEADERS,
                                provider: "DizixoScraper"
                            });
                        } else {
                            console.error("Dizixo Hata: Video adresi API'den donmedi.");
                        }

                        resolve(streams);
                    });
            })
            .catch(function(err) {
                console.error('Dizixo Scraper Kritik Hata:', err.message);
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
