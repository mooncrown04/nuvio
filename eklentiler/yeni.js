/**
 * VidSrc PRO - CloudNestra API Resolver (v11)
 * rcp/ tokenını kullanarak doğrudan JSON kaynağına erişmeyi dener.
 */

var cheerio = require("cheerio-without-node-native");

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var url = "https://vidsrc.me/embed/" + tmdbId;
        if (mediaType !== 'movie') url += "/" + seasonNum + "/" + episodeNum;

        console.error('[VidSrc-v11] ANALIZ BASLADI: ' + url);

        fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var $ = cheerio.load(html);
            var rcpUrl = $('#player_iframe').attr('src') || $('iframe').attr('src');

            if (rcpUrl && rcpUrl.includes('rcp/')) {
                if (rcpUrl.startsWith('//')) rcpUrl = 'https:' + rcpUrl;
                
                // TOKEN AYIKLAMA: rcp/ kısmından sonraki uzun kodu alıyoruz
                var token = rcpUrl.split('rcp/')[1];
                console.error('[VidSrc-v11] TOKEN YAKALANDI: ' + token.substring(0, 20) + "...");

                // CloudNestra'nın gizli API ucuna istek atıyoruz
                var apiUrl = "https://cloudnestra.com/api/source/" + token;
                
                return fetch(apiUrl, {
                    method: 'POST', // Genellikle POST ile çalışır
                    headers: {
                        'Referer': rcpUrl,
                        'X-Requested-With': 'XMLHttpRequest',
                        'User-Agent': 'Mozilla/5.0'
                    }
                }).then(function(apiRes) { return apiRes.json(); });
            }
            throw new Error("RCP_NOT_FOUND");
        })
        .then(function(data) {
            var streams = [];
            // Eğer API bize 'data.url' veya 'data.sources' dönerse, o gerçek m3u8'dir!
            if (data && data.url) {
                console.error('[VidSrc-v11] GERCEK VIDEO BULUNDU!');
                streams.push({
                    name: '⌜ VidSrc ⌟ | HD AKIS',
                    url: data.url, // Bu sefer ExoPlayer'ın sevdiği format gelecek
                    quality: '1080p',
                    headers: { 'Referer': 'https://vidsrc.me/' }
                });
            } else {
                // API cevap vermezse en azından rcp linkini player'a pasla
                console.error('[VidSrc-v11] API BOS DONDU, RCP PASLANIYOR.');
            }
            resolve(streams);
        })
        .catch(function(e) {
            console.error('[VidSrc-v11] KRITIK HATA: ' + e.message);
            // Hata olsa bile listeyi boş döndürme, manuel linki ekle
            resolve([{
                name: '⌜ VidSrc ⌟ | Manuel Deneme',
                url: "https://vidsrc.me/embed/" + tmdbId + (mediaType === 'movie' ? "" : "/" + seasonNum + "/" + episodeNum),
                quality: 'Auto'
            }]);
        });
    });
}
