/**
 * VidSrc TO - DNS & Memory Optimized (v6)
 * embed.su hatalarını ve DNS sorunlarını bypass etmeye odaklı.
 */

var cheerio = require("cheerio-without-node-native");

const TO_BASE = "https://vidsrc.to/embed";

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var type = mediaType === 'movie' ? 'movie' : 'tv';
        // vidsrc.to formatı: /movie/TMDB_ID veya /tv/TMDB_ID/S/E
        var url = TO_BASE + "/" + type + "/" + tmdbId;
        if (type === 'tv') url += "/" + seasonNum + "/" + episodeNum;

        var streams = [];
        console.error('[VidSrc-v6] TO BASLATILDI -> ' + url);

        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        };

        fetch(url, { headers: headers })
            .then(function(res) {
                console.error('[VidSrc-v6] CEVAP KODU: ' + res.status);
                if (res.status === 0) {
                    console.error('[VidSrc-v6] KRITIK: DNS veya Baglanti Hatasi! Cihaz domaini cozemiYor.');
                }
                return res.text();
            })
            .then(function(html) {
                if (html.length < 500) {
                    console.error('[VidSrc-v6] UYARI: Sayfa cok kisa, muhtemelen bos dondu.');
                }

                var $ = cheerio.load(html);
                // vidsrc.to genellikle kaynakları data-id ile saklar
                var servers = $('#sources .source');
                
                if (servers.length === 0) {
                    console.error('[VidSrc-v6] HATA: Kaynak listesi bulunamadi.');
                    // Yedek: Iframe ara
                    var frame = $('iframe').attr('src');
                    if (frame) {
                        console.error('[VidSrc-v6] YEDEK: Iframe bulundu.');
                        streams.push({
                            name: '⌜ VidSrc TO ⌟ | Player',
                            url: frame.startsWith('//') ? 'https:' + frame : frame,
                            quality: 'Auto',
                            headers: { "Referer": url },
                            provider: 'vidsrc_v6'
                        });
                    }
                }

                servers.each(function() {
                    var s = $(this);
                    var name = s.text().trim();
                    var id = s.attr('data-id');
                    if (id) {
                        console.error('[VidSrc-v6] KAYNAK: ' + name);
                        streams.push({
                            name: '⌜ VidSrc TO ⌟ | ' + name,
                            url: 'https://vidsrc.to/ajax/embed/source/' + id,
                            quality: 'Auto',
                            headers: { "Referer": url },
                            provider: 'vidsrc_v6'
                        });
                    }
                });

                resolve(streams);
            })
            .catch(function(err) {
                console.error('[VidSrc-v6] YAKALANAN HATA: ' + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
