/**
 * VidSrc PRO - Bypass Edition (v5)
 * .xyz yerine .pro üzerinden deneme yapar.
 */

var cheerio = require("cheerio-without-node-native");

// .pro uzantısı genellikle bot korumasında daha esnektir
const PRO_BASE = "https://vidsrc.pro/embed";

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var type = mediaType === 'movie' ? 'movie' : 'tv';
        var url = PRO_BASE + "/" + type + "/" + tmdbId;
        if (type === 'tv') url += "/" + seasonNum + "/" + episodeNum;

        var streams = [];
        console.error('[VidSrc-v5] PRO DENEME BASLADI: ' + url);

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': 'https://vidsrc.pro/'
        };

        fetch(url, { headers: headers })
            .then(function(res) {
                console.error('[VidSrc-v5] ANA SAYFA DURUM: ' + res.status);
                return res.text();
            })
            .then(function(html) {
                // .pro sitesi bazen veriyi window.data içinde JSON olarak saklar
                var dataMatch = html.match(/window\.data\s*=\s*({.*?});/s);
                
                if (dataMatch) {
                    console.error('[VidSrc-v5] DATA JSON BULUNDU, AYRISTIRILIYOR...');
                    var jsonData = JSON.parse(dataMatch[1]);
                    // JSON içindeki stream linklerini ayıkla (vidsrc.pro yapısına göre)
                    if (jsonData.sources) {
                        jsonData.sources.forEach(function(s) {
                            streams.push({
                                name: '⌜ VidSrc PRO ⌟ | ' + (s.label || 'Auto'),
                                url: s.file,
                                quality: s.label || 'Auto',
                                headers: { "Referer": "https://vidsrc.pro/" },
                                provider: 'vidsrc_v5_pro'
                            });
                        });
                    }
                } else {
                    // JSON yoksa klasik iframe taraması yapalım
                    console.error('[VidSrc-v5] JSON BULUNAMADI, IFRAME TARANIYOR...');
                    var $ = cheerio.load(html);
                    var iframeSrc = $("iframe#player_iframe").attr("src");
                    
                    if (iframeSrc) {
                        if (iframeSrc.indexOf('//') === 0) iframeSrc = 'https:' + iframeSrc;
                        console.error('[VidSrc-v5] IFRAME URL: ' + iframeSrc.substring(0, 50));
                        streams.push({
                            name: '⌜ VidSrc PRO ⌟ | Iframe',
                            url: iframeSrc,
                            quality: 'Auto',
                            headers: { "Referer": url },
                            provider: 'vidsrc_v5_iframe'
                        });
                    }
                }

                if (streams.length === 0) {
                    console.error('[VidSrc-v5] KRITIK ENGEL: Hicbir veri ayiklanamadi.');
                }
                
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[VidSrc-v5] HATA: ' + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
