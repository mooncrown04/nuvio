/**
 * Nuvio Local Scraper - İzle.plus (Multi-Strategy Version)
 * Tüm denemeleri (Direct, Recursive, Regex) tek dosyada birleştirir.
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://izle.plus";
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

function getStreams(inputData) {
    return new Promise(function(resolve) {
        console.error("[İzlePlus] === HİBRİT SÜREÇ BAŞLATILDI ===");
        
        // 1. TMDB ID ve Bilgi Çözme
        var id = (typeof inputData === 'object' ? (inputData.imdbId || inputData.tmdbId) : inputData).toString();

        fetch('https://api.themoviedb.org/3/movie/' + id + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
            .then(r => r.json())
            .then(movie => {
                var slug = movie.title.toLowerCase()
                    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                    .replace(/ /g, '-').replace(/[^\w-]+/g, '');
                
                var targetUrl = BASE_URL + "/" + slug + "/";
                console.error("[İzlePlus] Hedef: " + targetUrl);
                return fetch(targetUrl, { headers: HEADERS });
            })
            .then(res => res.text())
            .then(function(html) {
                var $ = cheerio.load(html);
                var allCandidates = [];

                // --- DENEME 1: Standart Iframe ve Data-Src Taraması ---
                $('iframe, [data-src], .video-embed iframe').each(function(i, elem) {
                    var src = $(elem).attr('src') || $(elem).attr('data-src');
                    if (src && src.includes('http') && !src.includes('google')) {
                        allCandidates.push(src);
                    }
                });

                // --- DENEME 2: Regex ile Sayfa İçindeki Gizli m3u8/mp4 Taraması ---
                var rawMatches = html.match(/https?:\/\/[^\s'"]+\.(?:m3u8|mp4)[^\s'"]*/gi);
                var directStreams = [];
                if (rawMatches) {
                    rawMatches.forEach(function(link) {
                        directStreams.push({
                            name: "İzlePlus (Direct Link)",
                            url: link,
                            quality: "Auto",
                            isM3u8: link.includes('m3u8'),
                            headers: { 'Referer': BASE_URL + '/' }
                        });
                    });
                }

                // --- DENEME 3: Yakalanan Iframe'lerin İçine Girip Gerçek Videoyu Bulma ---
                var deepPromises = allCandidates.map(function(link) {
                    return fetch(link, { headers: { 'Referer': BASE_URL + '/' } })
                        .then(r => r.text())
                        .then(innerHtml => {
                            var mMatch = innerHtml.match(/https?:\/\/[^\s'"]+\.(?:m3u8|mp4)[^\s'"]*/gi);
                            if (mMatch) {
                                return {
                                    name: "İzlePlus (Deep Scan)",
                                    url: mMatch[0],
                                    quality: "1080p",
                                    isM3u8: mMatch[0].includes('m3u8'),
                                    headers: { 'Referer': link }
                                };
                            }
                            return null;
                        }).catch(() => null);
                });

                return Promise.all([Promise.resolve(directStreams), Promise.all(deepPromises)]);
            })
            .then(function(results) {
                var finalStreams = [];
                
                // Regex sonuçlarını ekle
                if (results[0]) finalStreams = finalStreams.concat(results[0]);
                
                // Derin tarama sonuçlarını ekle
                if (results[1]) {
                    results[1].forEach(function(s) { if (s) finalStreams.push(s); });
                }

                // Tekrarları temizle (URL bazlı)
                var uniqueResults = finalStreams.filter(function(v, i, a) {
                    return a.findIndex(function(t) { return t.url === v.url; }) === i;
                });

                console.error("[İzlePlus] SÜREÇ BİTTİ. Bulunan Toplam Kaynak: " + uniqueResults.length);
                resolve(uniqueResults);
            })
            .catch(function(err) {
                console.error("[İzlePlus] Kritik Hata: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
