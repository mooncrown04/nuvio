/**
 * Nuvio Local Scraper - VidSrc (Düzeltilmiş Versiyon)
 */

var cheerio = require("cheerio-without-node-native");

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var streams = [];
        var type = mediaType === 'movie' ? 'movie' : 'tv';
        var embedUrl = "https://vidsrc.to/embed/" + type + "/" + tmdbId;
        if (type === 'tv') embedUrl += "/" + seasonNum + "/" + episodeNum;

        console.log('[VidSrc-Adv] Başlatıldı:', embedUrl);

        fetch(embedUrl, { headers: { 'User-Agent': HEADERS['User-Agent'] } })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
                var iframeSrc = iframeMatch ? iframeMatch[1] : null;

                if (iframeSrc) {
                    if (iframeSrc.startsWith('//')) iframeSrc = 'https:' + iframeSrc;
                    console.log('[VidSrc-Adv] Iframe bulundu:', iframeSrc);
                    return fetch(iframeSrc, { headers: { 'Referer': embedUrl, 'User-Agent': HEADERS['User-Agent'] } });
                }
                return { text: function() { return html; } };
            })
            .then(function(res) { return res.text(); })
            .then(function(pageContent) {
                var tokenMatch = pageContent.match(/\/rcp\/([^\/"]+)/);
                
                if (tokenMatch) {
                    var token = tokenMatch[1];
                    var apiUrl = "https://cloudnestra.com/api/source/" + token;
                    console.log('[VidSrc-Adv] API Sorgulanıyor:', apiUrl);

                    // --- KRİTİK DÜZELTME BAŞLANGICI ---
                    return fetch(apiUrl, { 
                        method: 'POST', 
                        headers: HEADERS 
                    })
                    .then(function(apiRes) {
                        // Cevabın JSON olup olmadığını kontrol et
                        var contentType = apiRes.headers.get("content-type");
                        if (contentType && contentType.indexOf("application/json") !== -1) {
                            return apiRes.json();
                        } else {
                            console.error('[VidSrc-Adv] API JSON dönmedi, Content-Type:', contentType);
                            return null;
                        }
                    })
                    .then(function(apiJson) {
                        // null kontrolü (logdaki hatayı engelleyen kısım)
                        if (apiJson && apiJson.sources && apiJson.sources.length > 0) {
                            return apiJson.sources[0].file;
                        }
                        return null;
                    });
                    // --- KRİTİK DÜZELTME BİTİŞİ ---
                }

                // API yoksa m3u8 regex fallback
                var match = pageContent.match(/file\s*:\s*["'](https?.*?\.m3u8.*?)["']/);
                return match ? match[1] : null;
            })
            .then(function(finalUrl) {
                if (finalUrl) {
                    console.log('[VidSrc-Adv] Başarılı:', finalUrl);
                    streams.push({
                        name: '⌜ VidSrc ⌟',
                        url: finalUrl,
                        quality: 'Auto',
                        headers: { 'Referer': 'https://vidsrc.to/' },
                        provider: 'vidsrc_to'
                    });
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
