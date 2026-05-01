/**
 * FullHDFilmizlesene - Ham Veri Analiz Modülü (Debug v1.0)
 * Bu kod sadece gelen veriyi kontrol etmek içindir.
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr,en-US;q=0.7,en;q=0.3',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        // Analiz için TMDB'den sadece film adını alıyoruz
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`)
            .then(res => res.json())
            .then(async (data) => {
                const movieTitle = data.title || data.original_title;
                const searchUrl = `${BASE_URL}/arama/${encodeURIComponent(movieTitle)}`;

                console.log("--- DEBUG BAŞLADI ---");
                console.log("Hedef Film: " + movieTitle);
                console.log("Aranan URL: " + searchUrl);

                const response = await fetch(searchUrl, { headers: HEADERS });
                console.log("HTTP Durumu: " + response.status);

                const html = await response.text();
                
                // 1. HAM VERİ KONTROLÜ: Sayfa boş mu geliyor?
                if (!html || html.length < 500) {
                    console.log("KRİTİK: Sayfa içeriği çok kısa veya boş! Uzunluk: " + (html ? html.length : 0));
                    console.log("Gelen Ham Metin: " + html);
                } else {
                    console.log("Sayfa Başarıyla Alındı. Karakter Sayısı: " + html.length);
                    
                    // 2. LİNK KONTROLÜ: Sayfada hangi linkler var?
                    const $ = cheerio.load(html);
                    const allLinks = [];
                    $("a").each((i, el) => {
                        const href = $(el).attr("href");
                        if (href && href.includes("/film/")) {
                            allLinks.push({
                                text: $(el).text().trim(),
                                url: href
                            });
                        }
                    });

                    console.log("Bulunan Olası Film Linkleri (" + allLinks.length + " adet):");
                    console.log(JSON.stringify(allLinks.slice(0, 5), null, 2)); // İlk 5 linki dök
                }

                console.log("--- DEBUG BİTTİ ---");
                resolve([]); // Analiz aşamasında stream döndürmüyoruz
            })
            .catch(err => {
                console.error("ANALİZ HATASI: " + err.message);
                resolve([]);
            });
    });
}

module.exports = {
    getStreams: getStreams
};
