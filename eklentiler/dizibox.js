/**
 * Nuvio Local Scraper - DiziBox v3 (Gelişmiş & Kütüphanesiz)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.dizibox.live';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Cookie': 'LockUser=true; isTrustedUser=true; dbxu=1743289650198'
};

/**
 * DiziBox şifreli linklerini çözmek için basitleştirilmiş yardımcı fonksiyon.
 * king.php ve moly.php sayfalarındaki veriyi ayıklar.
 */
function extractStreamFromJS(html) {
    // 1. Standart m3u8 arama
    var m3u8Match = html.match(/file\s*:\s*["'](.*?\.m3u8.*?)["']/i);
    if (m3u8Match) return m3u8Match[1];

    // 2. Base64 veya unescape edilmiş veri arama
    var unescapeMatch = html.match(/unescape\("(.*?)"\)/);
    if (unescapeMatch) {
        try {
            var decoded = decodeURIComponent(unescapeMatch[1]);
            var fileMatch = decoded.match(/file\s*:\s*['"](.*?)['"]/);
            if (fileMatch) return fileMatch[1];
        } catch (e) {}
    }
    return null;
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        // Sadece TV dizilerini destekler (Kaynak koduna göre)
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB'den isim al
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || '';
                // DiziBox arama motoruna istek at
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                // İlk sonucu al (Dizipal örneğindeki gibi)
                var firstLink = $('article.detailed-article a, article.article-series-poster a').first().attr('href');

                if (!firstLink) throw new Error("Dizi bulunamadı");

                // 2. Bölüm URL'sini oluştur (DiziBox formatı)
                // Örnek: /dizi/loki/ + 1-sezon-1-bolum-izle
                var cleanPath = firstLink.replace(/\/$/, "");
                var epUrl = cleanPath + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                
                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(epHtml) {
                var $ = cheerio.load(epHtml);
                var streams = [];
                var iframePromises = [];

                // Ana player ve alternatifleri topla
                var mainIframe = $('#video-area iframe').attr('src');
                var options = $('.video-toolbar option[value]');

                var allSources = [];
                if (mainIframe) allSources.push(mainIframe);
                
                options.each(function() {
                    var val = $(this).attr('value');
                    if (val && val.startsWith('http')) allSources.push(val);
                });

                // Her bir kaynağı fetch et
                allSources.forEach(function(src) {
                    var p = fetch(src, { headers: { 'Referer': BASE_URL + '/' } })
                        .then(function(r) { return r.text(); })
                        .then(function(innerHtml) {
                            var $$ = cheerio.load(innerHtml);
                            var finalIframe = $$('#Player iframe').attr('src') || $$('iframe').attr('src');
                            
                            if (finalIframe) {
                                return fetch(finalIframe, { headers: { 'Referer': BASE_URL + '/' } })
                                    .then(function(r) { return r.text(); })
                                    .then(function(jsText) {
                                        var fileUrl = extractStreamFromJS(jsText);
                                        if (fileUrl) {
                                            return {
                                                name: "⌜ DiziBox ⌟ | Hızlı Sunucu",
                                                url: fileUrl,
                                                quality: "HD",
                                                headers: { 'Referer': BASE_URL + '/', 'User-Agent': HEADERS['User-Agent'] },
                                                provider: "dizibox"
                                            };
                                        }
                                    });
                            }
                        }).catch(function() { return null; });
                    iframePromises.push(p);
                });

                return Promise.all(iframePromises);
            })
            .then(function(results) {
                // Boş olmayan sonuçları filtrele
                var validStreams = (results || []).filter(function(s) { return s && s.url; });
                resolve(validStreams);
            })
            .catch(function(err) {
                console.error('[DiziBox] Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
