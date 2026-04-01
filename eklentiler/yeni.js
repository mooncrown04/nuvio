/**
 * VidSrc PRO - Direct Stream Resolver (v10)
 * Iframe engellerini aşmak için vidsrc.me altyapısını manipüle eder.
 */

var cheerio = require("cheerio-without-node-native");

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        // vidsrc.me altyapısı daha kararlı video akışları sağlar
        var url = "https://vidsrc.me/embed/" + tmdbId;
        if (mediaType !== 'movie') {
            url += "/" + seasonNum + "/" + episodeNum;
        }

        console.error('[VidSrc-v10] KAYNAK TARANIYOR: ' + url);

        fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var $ = cheerio.load(html);
            var streams = [];

            // 1. ADIM: Sayfa içindeki gizli "src" veya "data-video" elementlerini bul
            // Bu genellikle player'ın gerçek adresidir
            var playerUrl = $('#player_iframe').attr('src') || $('iframe').attr('src');
            
            if (playerUrl) {
                if (playerUrl.startsWith('//')) playerUrl = 'https:' + playerUrl;
                
                console.error('[VidSrc-v10] PLAYER BULUNDU: ' + playerUrl);
                
                streams.push({
                    name: '⌜ VidSrc ⌟ | Akış 1',
                    url: playerUrl,
                    quality: 'Auto',
                    // KRİTİK: ExoPlayer'ın HTML değil, veri çekmesini sağlamak için
                    headers: { 
                        'Referer': 'https://vidsrc.me/',
                        'User-Agent': 'Mozilla/5.0' 
                    }
                });
            }

            // 2. ADIM: Eğer yukarıdaki başarısız olursa, doğrudan vidsrc.in (Yedek) linki üret
            var backupUrl = "https://vidsrc.in/embed/" + (mediaType === 'movie' ? 'movie/' : 'tv/') + tmdbId;
            if (mediaType !== 'movie') backupUrl += "/" + seasonNum + "/" + episodeNum;

            streams.push({
                name: '⌜ VidSrc ⌟ | Akış 2 (Yedek)',
                url: backupUrl,
                quality: 'Auto',
                headers: { 'Referer': 'https://vidsrc.in/' }
            });

            resolve(streams);
        })
        .catch(function(e) {
            console.error('[VidSrc-v10] HATA: ' + e.message);
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
