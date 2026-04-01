/**
 * Nuvio Local Scraper - VidSrc (v2.0)
 * Sinewix ve DiziYou mimarisine uygun hale getirilmiştir.
 */

var cheerio = require("cheerio-without-node-native");

var PROVIDERS = [
    "https://vidsrc.xyz",
    "https://vidsrc.in",
    "https://vidsrc.pm",
    "https://vidsrc.net"
];

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
};

/**
 * @param {string} tmdbId
 * @param {string} mediaType - 'movie' veya 'tv'
 * @param {number} seasonNum
 * @param {number} episodeNum
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var streams = [];
        var type = mediaType === 'movie' ? 'movie' : 'tv';
        
        console.log('[VidSrc] İşlem Başladı. ID:', tmdbId, 'Tip:', type);

        // Nuvio'da birden fazla domaini taramak için ilk çalışan sonucu alma mantığı
        var primaryProvider = PROVIDERS[0];
        var targetUrl = primaryProvider + "/embed/" + type + "?tmdb=" + tmdbId;
        
        if (type === 'tv') {
            targetUrl += "&season=" + seasonNum + "&episode=" + episodeNum;
        }

        console.log('[VidSrc] Hedef URL:', targetUrl);

        fetch(targetUrl, { headers: HEADERS })
            .then(function(res) {
                if (!res.ok) throw new Error('HTTP Hatası: ' + res.status);
                return res.text();
            })
            .then(function(html) {
                // Playwright kodundaki "m3u8 bulma" mantığı (Regex ile)
                // Not: Embed sayfaları genellikle linkleri şifreli script içinde tutar.
                var hlsRegex = /file\s*:\s*"(https?.*?\.m3u8.*?)"/;
                var match = html.match(hlsRegex);

                if (match && match[1]) {
                    var finalUrl = match[1];
                    console.log('[VidSrc] Başarılı! HLS bulundu:', finalUrl);

                    streams.push({
                        name: '⌜ VidSrc ⌟ | Multi-Res',
                        url: finalUrl,
                        quality: 'Auto',
                        headers: { 
                            'Referer': primaryProvider + '/',
                            'User-Agent': HEADERS['User-Agent']
                        },
                        provider: 'VidSrc_Scraper'
                    });
                } else {
                    console.warn('[VidSrc] Sayfa yüklendi ama HLS URL bulunamadı. Regex eşleşmedi.');
                }

                // Altyazı mantığı (Oyuncularda genellikle iframe içinde gelir)
                // Eğer ek altyazı API'si kullanacaksan buraya ekleme yapılabilir.

                resolve(streams);
            })
            .catch(function(err) {
                console.error('[VidSrc] Kritik Hata (Target: ' + targetUrl + '):', err.message);
                // Önemli: Uygulamanın çökmemesi için hata durumunda boş dizi dönüyoruz.
                resolve([]); 
            });
    });
}

// Nuvio/SineWix uyumlu export yapısı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
