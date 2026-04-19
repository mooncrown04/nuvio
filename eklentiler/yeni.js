/**
 * Nuvio Local Scraper - SinemaCX (V34 - Veri Yakalama Sürümü)
 */

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "SinemaCX";
const BASE_URL = "https://www.sinema.news";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    // TMDB'den gelen temiz bilgiyi logla
    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
        
        fetch(tmdbUrl)
            .then(res => res.json())
            .then(data => {
                var trTitle = (data.title || data.name || "").toLowerCase().trim();
                console.error(`\n--- [${PROVIDER_NAME} ANALİZ BAŞLADI] ---`);
                console.error(`TMDB Aranan Kelime: ${trTitle}`);
                
                // Sitenin arama sonuç sayfasına git
                var searchUrl = `${BASE_URL}/?s=` + encodeURIComponent(trTitle);
                return fetch(searchUrl, { headers: WORKING_HEADERS });
            })
            .then(res => res.text())
            .then(html => {
                var $ = cheerio.load(html);
                
                console.error(`\n--- [SİTEDEN GELEN TÜM VERİLER] ---`);
                
                // Sayfadaki bütün linkleri ve içlerindeki metinleri döküyoruz
                $("a").each(function(i, elem) {
                    var linkText = $(this).text().replace(/\s+/g, ' ').trim();
                    var href = $(this).attr("href") || "";

                    // Sadece içi dolu olan ve ana menü linki olmayanları bas ki kirlilik olmasın
                    if (linkText.length > 2 && href.startsWith("http") && !href.includes("/category/") && !href.includes("/tag/")) {
                        console.error(`Link No ${i}: [${linkText}] -> URL: ${href}`);
                    }
                });

                console.error(`\n--- [ANALİZ BİTTİ] ---`);
                console.error(`Lütfen yukarıdaki listeyi buraya yapıştır.\n`);
                
                resolve([]); // Bu aşamada video açmıyoruz, sadece veri topluyoruz.
            })
            .catch(err => {
                console.error(`[HATA]: ${err.message}`);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
