/**
 * Nuvio Local Scraper - İzle.plus (Advanced Debug & Deep Scan)
 */

var cheerio = require("cheerio-without-node-native");

const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
const DIRECT_BASE = "https://izle.plus";

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': DIRECT_BASE + '/'
};

function getStreams(inputData) {
    return new Promise(function(resolve) {
        console.error("[İzlePlus] === ANALİZ BAŞLATILDI ===");
        
        var id = (typeof inputData === 'object' ? (inputData.imdbId || inputData.tmdbId) : inputData).toString();

        fetch('https://api.themoviedb.org/3/movie/' + id + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
            .then(r => r.json())
            .then(movie => {
                var slug = movie.title.toLowerCase()
                    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                    .replace(/ /g, '-').replace(/[^\w-]+/g, '');
                
                var targetUrl = DIRECT_BASE + "/" + slug + "/";
                console.error("[İzlePlus] 1. AŞAMA: Ana Sayfa İstendi -> " + targetUrl);
                return fetch(targetUrl, { headers: HEADERS });
            })
            .then(res => res.text())
            .then(function(html) {
                if (!html || html.length < 500) {
                    console.error("[İzlePlus] HATA: Ana sayfa boş döndü veya engellendi! Uzunluk: " + (html ? html.length : 0));
                    return resolve([]);
                }

                var $ = cheerio.load(html);
                var pagesToScan = [];

                // Iframe ve Player linklerini ayıkla
                $('iframe, [data-src]').each((i, el) => {
                    var src = $(el).attr('src') || $(el).attr('data-src');
                    if (src && src.includes('http') && !src.includes('google')) {
                        pagesToScan.push(src);
                    }
                });

                console.error("[İzlePlus] 2. AŞAMA: Bulunan Potansiyel Iframe Sayısı: " + pagesToScan.length);
                if (pagesToScan.length === 0) {
                    console.error("[İzlePlus] HATA: Sayfada hiç player/iframe bulunamadı. HTML yapısı değişmiş olabilir.");
                }

                // Her yakalanan sayfanın içine girip GERÇEK video dosyasını ara
                return Promise.all(pagesToScan.map(url => {
                    console.error("[İzlePlus] 3. AŞAMA: Alt Sayfa Taranıyor -> " + url);
                    return fetch(url, { headers: { 'Referer': DIRECT_BASE + '/' } })
                        .then(r => r.text())
                        .then(pageContent => {
                            // Regex ile m3u8 veya mp4 ara
                            var videoMatch = pageContent.match(/https?:\/\/[^\s'"]+\.(?:m3u8|mp4|ts)[^\s'"]*/gi);
                            
                            if (videoMatch) {
                                console.error("[İzlePlus] BAŞARI: Video Linki Yakalandı: " + videoMatch[0]);
                                return {
                                    name: "İzlePlus (Video)",
                                    url: videoMatch[0],
                                    quality: "1080p",
                                    isM3u8: videoMatch[0].includes('m3u8'),
                                    headers: { 'Referer': url, 'Origin': DIRECT_BASE }
                                };
                            } else {
                                console.error("[İzlePlus] UYARI: Alt sayfada m3u8 bulunamadı. İçerik uzunluğu: " + pageContent.length);
                                return null;
                            }
                        }).catch(e => {
                            console.error("[İzlePlus] HATA: Alt sayfa fetch edilemedi: " + url + " | " + e.message);
                            return null;
                        });
                }));
            })
            .then(results => {
                var finalResults = results.filter(s => s !== null);
                console.error("[İzlePlus] ANALİZ BİTTİ. Toplam Oynatılabilir: " + finalResults.length);
                resolve(finalResults);
            })
            .catch(err => {
                console.error("[İzlePlus] KRİTİK HATA: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
