/**
 * Nuvio Local Scraper - İzle.plus & FilmciBaba (Ultra Hybrid)
 * 1. Strateji: WatchBuddy Aracı Sitesi
 * 2. Strateji: Doğrudan Site Erişimi (Regex & Iframe)
 * 3. Strateji: Yedek Arama URL'leri
 */

var cheerio = require("cheerio-without-node-native");

const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
const WATCHBUDDY_BASE = "https://stream.watchbuddy.tv/icerik/FilmciBaba";
const DIRECT_BASE = "https://izle.plus";

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': DIRECT_BASE + '/'
};

function getStreams(inputData) {
    return new Promise(function(resolve) {
        console.error("[Hibrit] === SÜREÇ BAŞLATILDI ===");
        
        var id = (typeof inputData === 'object' ? (inputData.imdbId || inputData.tmdbId) : inputData).toString();

        // TMDB'den film ismini al
        fetch('https://api.themoviedb.org/3/movie/' + id + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
            .then(r => r.json())
            .then(movie => {
                var slug = movie.title.toLowerCase()
                    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                    .replace(/ /g, '-').replace(/[^\w-]+/g, '');
                
                var izleUrl = DIRECT_BASE + "/" + slug + "/";
                var buddyUrl = WATCHBUDDY_BASE + "?url=" + encodeURIComponent(izleUrl);
                
                console.error("[Hibrit] Deneme 1: WatchBuddy Proxy");
                console.error("[Hibrit] Deneme 2: Doğrudan Site (" + izleUrl + ")");

                // İki yöntemi aynı anda (paralel) başlat
                return Promise.all([
                    fetch(buddyUrl, { headers: HEADERS }).then(r => r.text()).catch(() => ""),
                    fetch(izleUrl, { headers: HEADERS }).then(r => r.text()).catch(() => "")
                ]);
            })
            .then(function(contents) {
                var streams = [];
                
                contents.forEach((html, index) => {
                    if (!html || html.length < 500) return; // Boş veya hata sayfasıysa atla

                    var method = index === 0 ? "Buddy" : "Direct";
                    var $ = cheerio.load(html);

                    // A) Iframe ve Data-Src taraması
                    $('iframe, [data-src]').each((i, el) => {
                        var src = $(el).attr('src') || $(el).attr('data-src');
                        if (src && src.includes('http') && !src.includes('google')) {
                            streams.push({
                                name: "İzlePlus (" + method + " " + (i+1) + ")",
                                url: src,
                                quality: "1080p",
                                headers: { 'Referer': DIRECT_BASE + '/' }
                            });
                        }
                    });

                    // B) Regex ile m3u8/mp4 taraması
                    var mMatches = html.match(/https?:\/\/[^\s'"]+\.(?:m3u8|mp4)[^\s'"]*/gi);
                    if (mMatches) {
                        mMatches.forEach(link => {
                            streams.push({
                                name: "İzlePlus (" + method + " Auto)",
                                url: link,
                                quality: "Auto",
                                isM3u8: link.includes('m3u8'),
                                headers: { 'Referer': DIRECT_BASE + '/' }
                            });
                        });
                    }
                });

                // C) Kaynakları Tekilleştir
                var unique = streams.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);

                console.error("[Hibrit] Bitti. Toplam: " + unique.length);
                resolve(unique);
            })
            .catch(err => {
                console.error("[Hibrit] Hata: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
