/**
 * VidSrc TO - Universal Data Scraper (v8)
 * Sınıf isimlerine (class) bakmaksızın tüm data-id'leri toplar.
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
        console.error('[VidSrc-v8] BASLATILDI: ' + url);

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Referer': 'https://vidsrc.to/'
        };

        fetch(url, { headers: headers })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var serverPromises = [];
                
                // ESNEK SEÇİCİ: İçinde 'data-id' olan tüm elementleri tara
                // Bu sayede class ismi değişse bile ID'yi yakalarız.
                $('[data-id]').each(function(i, elem) {
                    var id = $(elem).attr('data-id');
                    var name = $(elem).text().trim() || ("Sunucu " + (i + 1));
                    
                    // Sadece sayısal/hash benzeri ID'leri al (gereksiz verileri ele)
                    if (id && id.length > 3) {
                        console.error('[VidSrc-v8] ID YAKALANDI: ' + name + ' -> ' + id);
                        serverPromises.push(resolveSourceV8(id, name, url));
                    }
                });

                if (serverPromises.length === 0) {
                    console.error('[VidSrc-v8] HATA: Sayfada hicbir data-id bulunamadı.');
                    // YEDEK: Regex ile HTML içinde arama yap
                    var matches = html.match(/data-id="([^"]+)"/g);
                    if (matches) {
                        console.error('[VidSrc-v8] YEDEK: Regex ile ' + matches.length + ' ID bulundu.');
                        matches.forEach(function(m) {
                            var id = m.split('"')[1];
                            serverPromises.push(resolveSourceV8(id, "Server", url));
                        });
                    }
                }

                return Promise.all(serverPromises);
            })
            .then(function(results) {
                results.forEach(function(res) { if (res) streams = streams.concat(res); });
                console.error('[VidSrc-v8] SONUC: ' + streams.length + ' adet link eklendi.');
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[VidSrc-v8] DURDURULDU: ' + err.message);
                resolve([]);
            });
    });
}

function resolveSourceV8(id, serverName, referer) {
    return fetch(TO_AJAX + "/source/" + id, {
        headers: { 
            'Referer': referer, 
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.status === 200 && data.result && data.result.url) {
            console.error('[VidSrc-v8] BASARILI: ' + serverName);
            return [{
                name: '⌜ VidSrc ⌟ | ' + serverName,
                url: data.result.url,
                quality: 'Auto',
                headers: { "Referer": "https://vidsrc.to/" },
                provider: 'vidsrc_v8'
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
