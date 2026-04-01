/**
 * VidSrc CC - Direct Resolver (v9)
 * Sayfa tarama hatasını (No data-id) aşmak için doğrudan CC API'sini kullanır.
 */

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        // vidsrc.cc API yapısı:
        // Movie: https://vidsrc.cc/v2/embed/movie/TMDB_ID
        // TV: https://vidsrc.cc/v2/embed/tv/TMDB_ID/S/E
        
        var baseUrl = "https://vidsrc.cc/v2/embed";
        var type = mediaType === 'movie' ? 'movie' : 'tv';
        var finalPath = "/" + type + "/" + tmdbId;
        
        if (type === 'tv') {
            finalPath += "/" + seasonNum + "/" + episodeNum;
        }

        var fullUrl = baseUrl + finalPath;
        console.error('[VidSrc-v9] CC DENEMESI: ' + fullUrl);

        var streams = [];

        // Bu API genellikle doğrudan iframe döner veya bir sunucu listesine yönlendirir
        // Biz burada Nuvio'nun player'ının bunu çözmesini sağlayacağız
        streams.push({
            name: '⌜ VidSrc ⌟ | PRO 1',
            url: fullUrl,
            quality: 'Auto',
            headers: { 
                'Referer': 'https://vidsrc.cc/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            provider: 'vidsrc_v9_cc'
        });

        // Alternatif olarak meşhur vidsrc.to'nun doğrudan player URL'sini ekleyelim
        // Bazı playerlar bunu (eğer IP engeli yoksa) otomatik çözer.
        var toUrl = "https://vidsrc.to/embed/" + type + "/" + tmdbId;
        if (type === 'tv') toUrl += "/" + seasonNum + "/" + episodeNum;

        streams.push({
            name: '⌜ VidSrc ⌟ | PRO 2',
            url: toUrl,
            quality: 'Auto',
            headers: { 'Referer': 'https://vidsrc.to/' },
            provider: 'vidsrc_v9_to'
        });

        // Bir de vip.vidsrc.me (Eski ama stabil)
        var meUrl = "https://vidsrc.me/embed/" + tmdbId;
        if (type === 'tv') meUrl += "-" + seasonNum + "-" + episodeNum;

        streams.push({
            name: '⌜ VidSrc ⌟ | PRO 3',
            url: meUrl,
            quality: 'Auto',
            headers: { 'Referer': 'https://vidsrc.me/' },
            provider: 'vidsrc_v9_me'
        });

        resolve(streams);
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
