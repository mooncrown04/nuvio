/**
 * VidSrc-v4 (Bypass Attempt)
 * JSON parse hatasını önlemek için text tabanlı kontrol ve referer değişikliği.
 */

var cheerio = require("cheerio-without-node-native");

// Alternatif giriş noktası
const SOURCE_URL = "https://vidsrc.xyz/embed";
const API_BASE = "https://vidsrc.xyz/ajax/embed";

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var type = mediaType === 'movie' ? 'movie' : 'tv';
        var embedPath = "/" + type + "/" + tmdbId;
        if (type === 'tv') embedPath += "/" + seasonNum + "-" + episodeNum;

        var fullEmbedUrl = SOURCE_URL + embedPath;
        var streams = [];

        console.error('[VidSrc-v4] DENEME BASLADI: ' + fullEmbedUrl);

        // Header'ları güçlendiriyoruz
        var commonHeaders = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": fullEmbedUrl
        };

        fetch(fullEmbedUrl, { headers: { "Referer": "https://google.com" } })
            .then(function(res) {
                console.error('[VidSrc-v4] ANA SAYFA: ' + res.status);
                // API İsteği
                return fetch(API_BASE + embedPath + "/sources", { headers: commonHeaders });
            })
            .then(function(res) { return res.text(); }) // json() yerine text() alıp kontrol ediyoruz
            .then(function(text) {
                // Eğer HTML döndüyse (JSON değilse)
                if (text.trim().startsWith('<')) {
                    console.error('[VidSrc-v4] ENGEL: API JSON yerine HTML dondu. Bot koruması aktif.');
                    throw new Error("BOT_DETECTED");
                }

                var json = JSON.parse(text);
                if (!json.result) throw new Error("NO_RESULT");

                console.error('[VidSrc-v4] SUNUCULAR ALINDI: ' + json.result.length + ' adet');

                var serverPromises = json.result.map(function(s) {
                    return processServerV4(s.id, s.title, fullEmbedUrl, commonHeaders);
                });

                return Promise.all(serverPromises);
            })
            .then(function(results) {
                results.forEach(function(res) { if (res) streams = streams.concat(res); });
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[VidSrc-v4] DURUM: ' + err.message);
                resolve([]);
            });
    });
}

function processServerV4(sourceId, name, referer, headers) {
    var url = API_BASE + "/source/" + sourceId;
    return fetch(url, { headers: headers })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data.result || !data.result.url) return null;
            
            // Linki Nuvio'ya uygun formatta ekle
            return [{
                name: '⌜ VidSrc ⌟ | ' + name,
                url: data.result.url, // Burası genellikle bir player linkidir
                quality: 'Auto',
                headers: { "Referer": "https://vidsrc.xyz/" },
                provider: 'vidsrc_v4'
            }];
        })
        .catch(function() { return null; });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
