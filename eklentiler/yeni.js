/**
 * Nuvio / SineWix - VidSrc.xyz API v3 (Direct API Method)
 * HTML kazımak yerine doğrudan API üzerinden sunucuları çeker.
 */

var cheerio = require("cheerio-without-node-native");

const SOURCE_URL = "https://vidsrc.xyz/embed";
const API_BASE = "https://vidsrc.xyz/ajax/embed";

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var type = mediaType === 'movie' ? 'movie' : 'tv';
        // vidsrc.xyz formatı: /movie/ID veya /tv/ID/S-E
        var embedPath = "/" + type + "/" + tmdbId;
        if (type === 'tv') embedPath += "/" + seasonNum + "-" + episodeNum;

        var fullEmbedUrl = SOURCE_URL + embedPath;
        var streams = [];

        console.error('[VidSrc-v3] ISLEM BASLADI: ' + fullEmbedUrl);

        // ADIM 1: Önce ana sayfayı bir kez çek (Cookie ve Session için gerekebilir)
        fetch(fullEmbedUrl, { headers: { "Referer": "https://vidsrc.xyz/" } })
            .then(function(res) {
                console.error('[VidSrc-v3] ANA SAYFA DURUMU: ' + res.status);
                // ADIM 2: Doğrudan API'ye "Bana bu video için sunucuları ver" diyoruz
                // API formatı: /ajax/embed/episode/TMDB_ID/sources (vidsrc.xyz bazen tmdb'yi id olarak kullanır)
                return fetch(API_BASE + embedPath + "/sources", {
                    headers: { 
                        "X-Requested-With": "XMLHttpRequest",
                        "Referer": fullEmbedUrl 
                    }
                });
            })
            .then(function(res) { return res.json(); })
            .then(function(json) {
                if (!json.result || json.result.length === 0) {
                    console.error('[VidSrc-v3] HATA: API SUNUCU DÖNMEDİ (JSON boş veya geçersiz)');
                    // Eğer API boş dönerse eski usul HTML denemesi yapalım (Yedek)
                    throw new Error("API_EMPTY");
                }

                console.error('[VidSrc-v3] API ' + json.result.length + ' SUNUCU BULDU.');

                var serverPromises = json.result.map(function(s) {
                    return processServerV3(s.id, s.title, fullEmbedUrl);
                });

                return Promise.all(serverPromises);
            })
            .then(function(results) {
                results.forEach(function(res) {
                    if (res) streams = streams.concat(res);
                });
                console.error('[VidSrc-v3] BITTI: ' + streams.length + ' LINK HAZIR.');
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[VidSrc-v3] DURDURULDU: ' + err.message);
                resolve([]);
            });
    });
}

function processServerV3(sourceId, serverName, referer) {
    // API: /ajax/embed/source/SOURCE_ID
    var sourceApiUrl = API_BASE + "/source/" + sourceId;
    
    return fetch(sourceApiUrl, {
        headers: { "X-Requested-With": "XMLHttpRequest", "Referer": referer }
    })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data.result || !data.result.url) return null;

            // URL genellikle şifreli veya direkt olabilir
            var finalUrl = data.result.url;
            console.error('[VidSrc-v3] LINK ALINDI (' + serverName + '): ' + finalUrl.substring(0, 40) + '...');

            return [{
                name: '⌜ VidSrc ⌟ | ' + serverName,
                url: finalUrl,
                quality: 'Auto',
                headers: { "Referer": "https://vidsrc.xyz/", "User-Agent": "Mozilla/5.0" },
                provider: 'vidsrc_v3'
            }];
        })
        .catch(function() { return null; });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
