/**
 * Nuvio Local Scraper - VidSrc & Cloudnestra Hybrid
 * Stremio SDK mantığından Nuvio formatına dönüştürülmüştür.
 */

var cheerio = require("cheerio-without-node-native");

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://vidsrc.to/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var streams = [];
        var type = mediaType === 'movie' ? 'movie' : 'tv';
        
        // 1. URL İnşası
        var embedUrl = "https://vidsrc.to/embed/" + type + "/" + tmdbId;
        if (type === 'tv') {
            embedUrl += "/" + seasonNum + "/" + episodeNum;
        }

        console.log('[VidSrc-Adv] Başlatıldı. Hedef:', embedUrl);

        // 2. İlk Sayfayı Çek
        fetch(embedUrl, { headers: HEADERS })
            .then(function(res) {
                if (!res.ok) throw new Error('Vidsrc ana sayfa hatası: ' + res.status);
                return res.text();
            })
            .then(function(html) {
                // Stremio kodundaki Iframe yakalama mantığı
                var iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
                var iframeSrc = iframeMatch ? iframeMatch[1] : null;

                if (iframeSrc) {
                    if (iframeSrc.startsWith('//')) iframeSrc = 'https:' + iframeSrc;
                    console.log('[VidSrc-Adv] Iframe bulundu, yönleniliyor:', iframeSrc);
                    
                    // 3. Iframe içine gir (Cloudnestra vb. kontrolü)
                    return fetch(iframeSrc, { headers: { 'Referer': embedUrl, 'User-Agent': HEADERS['User-Agent'] } });
                } else {
                    // Iframe yoksa direkt sayfada m3u8 ara
                    return { text: function() { return html; }, direct: true };
                }
            })
            .then(function(res) {
                return typeof res.text === 'function' ? res.text() : res;
            })
            .then(function(pageContent) {
                // Cloudnestra API Token Kontrolü (Stremio kodundaki özel mantık)
                var tokenMatch = pageContent.match(/\/rcp\/([^\/"]+)/);
                
                if (tokenMatch) {
                    var token = tokenMatch[1];
                    console.log('[VidSrc-Adv] Cloudnestra Token Yakalandı:', token);
                    
                    // Bu kısım genellikle POST ister, Nuvio fetch ile deniyoruz
                    var apiUrl = "https://cloudnestra.com/api/source/" + token;
                    return fetch(apiUrl, { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                        .then(function(apiRes) { return apiRes.json(); })
                        .then(function(apiJson) {
                            if (apiJson.sources && apiJson.sources.length > 0) {
                                return apiJson.sources[0].file;
                            }
                            return null;
                        });
                }

                // API yoksa Regex ile m3u8 ara
                var patterns = [
                    /"file"\s*:\s*"(https?:[^"]+\.m3u8[^"]*)"/,
                    /file\s*:\s*"(https?:[^"]+\.m3u8[^"]*)"/,
                    /"(https?:[^"]+\.m3u8[^"]*)"/
                ];

                for (var i = 0; i < patterns.length; i++) {
                    var m = pageContent.match(patterns[i]);
                    if (m) return m[1];
                }
                return null;
            })
            .then(function(finalVideoUrl) {
                if (finalVideoUrl) {
                    console.log('[VidSrc-Adv] BAŞARILI. Final URL:', finalVideoUrl);
                    streams.push({
                        name: '⌜ VidSrc ⌟ | Cloudnestra',
                        url: finalVideoUrl,
                        quality: 'Auto',
                        headers: { 'Referer': 'https://vidsrc.to/' },
                        provider: 'vidsrc_to'
                    });
                } else {
                    console.error('[VidSrc-Adv] Video linki hiçbir desene uymadı.');
                }
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[VidSrc-Adv] Kritik Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
