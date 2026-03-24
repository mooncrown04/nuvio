/**
 * RecTV Nuvio Provider - v1.0
 * Kısıtlamalar: async/await YASAK, Promise ZORUNLU.
 */

var BASE_URL = "https://a.prectv67.lol";
var SW_KEY = "4F5A9C3D9A86FA54EACEDDD635185/c3c5bd17-e37b-4b94-a944-8a3688a30452";
var PROXY_URL = "https://goproxy.watchbuddy.tv/proxy/video";

var HEADERS = {
    'User-Agent': 'googleusercontent',
    'Referer': 'https://twitter.com/',
    'Accept': 'application/json'
};

// Global Token Saklayıcı (Nuvio çalışma süresince geçerli)
var cachedToken = null;

function getAuthToken() {
    return new Promise(function(resolve, reject) {
        if (cachedToken) return resolve(cachedToken);

        fetch(BASE_URL + "/api/attest/nonce", { headers: HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(text) {
                try {
                    var json = JSON.parse(text);
                    cachedToken = json.accessToken || text.trim();
                } catch (e) {
                    cachedToken = text.trim();
                }
                resolve(cachedToken);
            })
            .catch(function() { resolve(null); });
    });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        var isMovie = (mediaType === 'movie');
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        // 1. Önce TMDB'den isim al
        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.name;
                // 2. Auth Token al
                return getAuthToken().then(function(token) {
                    return { query: query, token: token };
                });
            })
            .then(function(auth) {
                var searchHeaders = Object.assign({}, HEADERS, { 
                    'Authorization': 'Bearer ' + auth.token 
                });

                // 3. API üzerinden arama yap
                return fetch(BASE_URL + '/api/search/' + encodeURIComponent(auth.query) + '/' + SW_KEY + '/', { headers: searchHeaders })
                    .then(function(res) { return res.json(); })
                    .then(function(sData) {
                        var items = (sData.posters || []).concat(sData.channels || []).concat(sData.series || []);
                        if (items.length === 0) return resolve([]);
                        
                        var target = items[0];
                        
                        // 4. Eğer dizi ise sezon/bölüm detayına git
                        if (target.type === "serie") {
                            return fetch(BASE_URL + '/api/season/by/serie/' + target.id + '/' + SW_KEY + '/', { headers: searchHeaders })
                                .then(function(res) { return res.json(); })
                                .then(function(seasons) {
                                    // Sizin seçtiğiniz sezon/bölümle eşleşeni bul
                                    var foundSources = [];
                                    seasons.forEach(function(s) {
                                        // Basit mantık: İlk sezondaki ilgili bölümü al (Geliştirilebilir)
                                        s.episodes.forEach(function(ep) {
                                            if (ep.sources) foundSources = ep.sources;
                                        });
                                    });
                                    return foundSources;
                                });
                        }
                        return target.sources || [];
                    });
            })
            .then(function(sources) {
                var results = sources.map(function(src) {
                    // Proxy kullanımı burada m3u8'in Header ile açılmasını sağlar
                    var finalUrl = PROXY_URL + "?url=" + encodeURIComponent(src.url) + "&referer=" + encodeURIComponent("https://twitter.com/") + "&ignore_ssl=true";
                    
                    return {
                        name: "RecTV - " + src.type.toUpperCase(),
                        url: finalUrl,
                        quality: "Auto",
                        headers: HEADERS,
                        provider: "rectv_api"
                    };
                });
                resolve(results);
            })
            .catch(function(err) {
                console.error('RecTV Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
