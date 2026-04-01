/**
 * Nuvio / SineWix - VidSrc.xyz Extractor (Error Log Optimized)
 * Tüm çıktılar console.error olarak ayarlanmıştır.
 */

var cheerio = require("cheerio-without-node-native");

const SOURCE_URL = "https://vidsrc.xyz/embed";
var BASEDOM = "https://cloudnestra.com"; 

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var type = mediaType === 'movie' ? 'movie' : 'tv';
        var url = SOURCE_URL + "/" + type + "/" + tmdbId;
        if (type === 'tv') url += "/" + seasonNum + "-" + episodeNum;

        var streams = [];

        // Cihazın logları görmesi için console.error kullanıyoruz
        console.error('[VidSrc-v2] ISLEM BASLATILDI -> ' + url);

        fetch(url, { headers: { "Referer": SOURCE_URL } })
            .then(function(res) { 
                if(!res.ok) console.error('[VidSrc-v2] EMBED SAYFASI HATASI: ' + res.status);
                return res.text(); 
            })
            .then(function(html) {
                var $ = cheerio.load(html);
                
                // Iframe'den BASEDOM güncelleme
                var baseFrameSrc = $("iframe").attr("src") || "";
                if (baseFrameSrc) {
                    var match = baseFrameSrc.match(/^(https?:\/\/[^/]+)/);
                    if (match) {
                        BASEDOM = match[1];
                        console.error('[VidSrc-v2] NEW BASEDOM: ' + BASEDOM);
                    }
                }

                var serverPromises = [];
                var servers = $(".serversList .server");
                
                if (servers.length === 0) {
                    console.error('[VidSrc-v2] KRITIK: SUNUCU LISTESI BULUNAMADI (HTML BOŞ OLABILIR)');
                }

                servers.each(function() {
                    var server = $(this);
                    var dataHash = server.attr("data-hash");
                    var serverName = server.text().trim();

                    if (dataHash) {
                        console.error('[VidSrc-v2] SUNUCU BULUNDU: ' + serverName + ' [HASH: ' + dataHash + ']');
                        serverPromises.push(processServer(dataHash, serverName, url));
                    }
                });

                return Promise.all(serverPromises);
            })
            .then(function(results) {
                results.forEach(function(res) {
                    if (res) streams = streams.concat(res);
                });
                
                if (streams.length === 0) console.error('[VidSrc-v2] SONUC: HIC STREAM BULUNAMADI');
                else console.error('[VidSrc-v2] BASARILI: ' + streams.length + ' LINK EKLENDI');
                
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[VidSrc-v2] KRITIK HATA YAKALANDI: ' + err.message);
                resolve([]);
            });
    });
}

function processServer(hash, name, referer) {
    var rcpUrl = BASEDOM + "/rcp/" + hash;
    return fetch(rcpUrl, { headers: { "Referer": referer } })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // file: '...' veya src: '...' içindeki linki yakala
            var match = html.match(/src:\s*'([^']*)'/) || html.match(/file:\s*'([^']*)'/);
            
            if (!match) {
                console.error('[VidSrc-v2] SERVER HATASI (' + name + '): Link regex ile bulunamadi.');
                return null;
            }

            var streamUrl = match[1];
            if (streamUrl.indexOf('//') === 0) streamUrl = 'https:' + streamUrl;

            console.error('[VidSrc-v2] LINK COZULDU (' + name + '): ' + streamUrl.substring(0, 50) + '...');

            return [{
                name: '⌜ VidSrc ⌟ | ' + name,
                url: streamUrl,
                quality: 'Auto',
                headers: { "Referer": BASEDOM + "/", "User-Agent": "Mozilla/5.0" },
                provider: 'vidsrc_v2'
            }];
        })
        .catch(function(e) { 
            console.error('[VidSrc-v2] SERVER FETCH HATASI (' + name + '): ' + e.message);
            return null; 
        });
}

// Dışa aktarma
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
