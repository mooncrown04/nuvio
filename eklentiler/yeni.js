/**
 * Nuvio Local Scraper - İzle.plus & FilmciBaba (Ultra Hybrid V5)
 */

var cheerio = require("cheerio-without-node-native");

const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
const DIRECT_BASE = "https://izle.plus";
const PROXY_BASE = "https://stream.watchbuddy.tv/icerik/FilmciBaba";

const COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
};

function getStreams(inputData) {
    return new Promise(function(resolve) {
        console.error("[Eklenti] === HİBRİT V5 BAŞLATILDI ===");
        
        var id = (typeof inputData === 'object' ? (inputData.imdbId || inputData.tmdbId) : inputData).toString();

        fetch('https://api.themoviedb.org/3/movie/' + id + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
            .then(r => r.json())
            .then(movie => {
                var slug = movie.title.toLowerCase()
                    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                    .replace(/ /g, '-').replace(/[^\w-]+/g, '');
                
                var targetUrl = DIRECT_BASE + "/" + slug + "/";
                var proxyUrl = PROXY_BASE + "?url=" + encodeURIComponent(targetUrl);
                
                console.error("[Eklenti] Hedefler: " + targetUrl + " | " + proxyUrl);

                // İki koldan saldır: Hem proxy hem doğrudan site
                return Promise.all([
                    fetch(proxyUrl, { headers: COMMON_HEADERS }).then(r => r.text()).catch(() => ""),
                    fetch(targetUrl, { headers: COMMON_HEADERS }).then(r => r.text()).catch(() => "")
                ]);
            })
            .then(function(contents) {
                var streamCandidates = [];
                
                contents.forEach(html => {
                    if (!html || html.length < 500) return;

                    var $ = cheerio.load(html);
                    
                    // 1. Iframe tarama
                    $('iframe, [data-src]').each((i, el) => {
                        var src = $(el).attr('src') || $(el).attr('data-src');
                        if (src && src.startsWith('http') && !src.includes('google')) {
                            streamCandidates.push({ url: src, type: 'iframe' });
                        }
                    });

                    // 2. Sayfa içine gömülü m3u8/mp4 regex avı
                    var regex = /https?:\/\/[^\s'"]+\.(?:m3u8|mp4)[^\s'"]*/gi;
                    var matches = html.match(regex);
                    if (matches) {
                        matches.forEach(m => streamCandidates.push({ url: m, type: 'direct' }));
                    }
                });

                // 3. Bulunan her linkin içine girip asıl videoyu sökme (Deep Scan)
                var finalPromises = streamCandidates.map(item => {
                    if (item.type === 'direct') return Promise.resolve(item.url);
                    
                    return fetch(item.url, { headers: { 'Referer': DIRECT_BASE + '/' } })
                        .then(r => r.text())
                        .then(innerHtml => {
                            var innerMatch = innerHtml.match(/https?:\/\/[^\s'"]+\.(?:m3u8|mp4)[^\s'"]*/gi);
                            return innerMatch ? innerMatch[0] : item.url;
                        }).catch(() => item.url);
                });

                return Promise.all(finalPromises);
            })
            .then(urls => {
                var finalResults = [];
                // Tekilleştir ve formatla
                [...new Set(urls)].forEach((finalUrl, index) => {
                    if (finalUrl && finalUrl.includes('http')) {
                        finalResults.push({
                            name: "İzlePlus Kaynak #" + (index + 1),
                            url: finalUrl,
                            quality: "1080p",
                            isM3u8: finalUrl.includes('m3u8'),
                            headers: { 'Referer': DIRECT_BASE + '/', 'Origin': DIRECT_BASE }
                        });
                    }
                });

                console.error("[Eklenti] Tamamlandı. Bulunan: " + finalResults.length);
                resolve(finalResults);
            })
            .catch(err => {
                console.error("[Eklenti] Hata: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
