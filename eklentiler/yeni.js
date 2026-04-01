/**
 * Nuvio / SineWix Uyumlulaştırılmış VidSrc v2 Extractor
 */
var cheerio = require("cheerio-without-node-native");

const SOURCE_URL = "https://vidsrc.xyz/embed";
let BASEDOM = "https://cloudnestra.com"; 

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var type = mediaType === 'movie' ? 'movie' : 'tv';
        var url = SOURCE_URL + "/" + type + "/" + tmdbId;
        if (type === 'tv') url += "/" + seasonNum + "-" + episodeNum;

        var streams = [];

        console.log('[VidSrc-v2] Başlatılıyor:', url);

        fetch(url, { headers: { "Referer": SOURCE_URL } })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                
                // Iframe'den BASEDOM güncelleme mantığı
                var baseFrameSrc = $("iframe").attr("src") || "";
                if (baseFrameSrc) {
                    var match = baseFrameSrc.match(/^(https?:\/\/[^/]+)/);
                    if (match) BASEDOM = match[1];
                }

                var serverPromises = [];
                $(".serversList .server").each(function() {
                    var server = $(this);
                    var dataHash = server.attr("data-hash");
                    var serverName = server.text().trim();

                    if (dataHash) {
                        serverPromises.push(processServer(dataHash, serverName, url));
                    }
                });

                return Promise.all(serverPromises);
            })
            .then(function(results) {
                results.forEach(function(res) {
                    if (res) streams = streams.concat(res);
                });
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[VidSrc-v2] Hata:', err.message);
                resolve([]);
            });
    });
}

// Server işleme (RCP mantığı)
function processServer(hash, name, referer) {
    var rcpUrl = BASEDOM + "/rcp/" + hash;
    return fetch(rcpUrl, { headers: { "Referer": referer } })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // Regex ile file: '...' veya src: '...' yakalama
            var match = html.match(/src:\s*'([^']*)'/) || html.match(/file:\s*'([^']*)'/);
            if (!match) return null;

            var streamUrl = match[1];
            
            // Nuvio formatında stream objesi dön
            return [{
                name: '⌜ VidSrc ⌟ | ' + name,
                url: streamUrl,
                quality: 'Auto',
                headers: { "Referer": BASEDOM + "/" },
                provider: 'vidsrc_v2'
            }];
        })
        .catch(function() { return null; });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
