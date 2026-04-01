/**
 * VidSrc TO - API v7 (Final Fix)
 * ExoPlayer format hatasını gidermek için doğrudan kaynak linkine odaklanır.
 */

var cheerio = require("cheerio-without-node-native");

const TO_BASE = "https://vidsrc.to/embed";
const TO_AJAX = "https://vidsrc.to/ajax/embed";

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var type = mediaType === 'movie' ? 'movie' : 'tv';
        var url = TO_BASE + "/" + type + "/" + tmdbId;
        if (type === 'tv') url += "/" + seasonNum + "/" + episodeNum;

        var streams = [];
        console.error('[VidSrc-v7] ISLEM BASLATILDI: ' + url);

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Referer': 'https://vidsrc.to/'
        };

        fetch(url, { headers: headers })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                
                // 1. ADIM: data-id içeren sunucuları bul
                var servers = $('.source'); 
                if (servers.length === 0) {
                    console.error('[VidSrc-v7] HATA: Sunucu listesi bos.');
                    throw new Error("NO_SERVERS");
                }

                var serverPromises = [];
                servers.each(function() {
                    var id = $(this).attr('data-id');
                    var name = $(this).text().trim();
                    if (id) {
                        console.error('[VidSrc-v7] KAYNAK BULUNDU: ' + name);
                        serverPromises.push(resolveSource(id, name, url));
                    }
                });

                return Promise.all(serverPromises);
            })
            .then(function(results) {
                results.forEach(function(res) { if (res) streams = streams.concat(res); });
                console.error('[VidSrc-v7] TAMAMLANDI: ' + streams.length + ' adet link.');
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[VidSrc-v7] DURDURULDU: ' + err.message);
                resolve([]);
            });
    });
}

function resolveSource(id, serverName, referer) {
    // vidsrc.to/ajax/embed/source/ID adresine istek atarak gerçek linki çözüyoruz
    return fetch(TO_AJAX + "/source/" + id, {
        headers: { 'Referer': referer, 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.status === 200 && data.result && data.result.url) {
            // VidSrc.to linkleri şifreli (Base64 + RC4 vb.) olabilir
            // Ama genellikle player linkidir. Nuvio player bunu açabilmeli.
            var finalUrl = data.result.url;
            console.error('[VidSrc-v7] LINK COZULDU (' + serverName + ')');

            return [{
                name: '⌜ VidSrc ⌟ | ' + serverName,
                url: finalUrl,
                quality: 'Auto',
                headers: { "Referer": "https://vidsrc.to/" },
                provider: 'vidsrc_v7'
            }];
        }
        return null;
    })
    .catch(function() { return null; });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
