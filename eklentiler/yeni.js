/**
 * FullHDFilmizlesene Nuvio Scraper - v28.5 (Robust Search Fix)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// ... (getStreamsFromAPI, decodeRapidVid vb. fonksiyonlar aynı kalıyor)

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        // 1. TMDB'den detayları al (Özellikle IMDb ID için)
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`)
            .then(res => res.json())
            .then(data => {
                const year = data.release_date ? data.release_date.split('-')[0] : "";
                const movieTitle = data.title || data.original_title;
                const imdbId = data.imdb_id;

                // IMDb ID varsa direkt onunla ara, yoksa isimle
                let searchUrl = imdbId 
                    ? `${BASE_URL}/search/${imdbId}/` 
                    : `${BASE_URL}/arama/${encodeURIComponent(movieTitle)}`;

                return Promise.all([fetch(searchUrl, { headers: WORKING_HEADERS }), year, movieTitle]);
            })
            .then(async ([res, year, movieTitle]) => {
                let searchHtml = await res.text();
                let $ = cheerio.load(searchHtml);
                let filmLink = "";

                // SEÇİCİ GÜNCELLEMESİ: Daha geniş bir tarama yapıyoruz
                // Sitedeki tüm a etiketlerini kontrol et, içinde 'film' geçen ve başlığa benzeyen ilk linki al
                $("a").each((i, el) => {
                    let href = $(el).attr("href");
                    let text = $(el).text().toLowerCase();
                    
                    if (href && href.includes('/film/') && !href.includes('/kategori/')) {
                        // Eğer yıl verisi varsa ve sayfada bu yıl geçiyorsa veya başlık eşleşiyorsa
                        if (text.includes(movieTitle.toLowerCase()) || (year && searchHtml.includes(year))) {
                            filmLink = href;
                            return false; 
                        }
                    }
                });

                // Eğer hala bulunamadıysa ilk film linkine güven
                if (!filmLink) {
                    filmLink = $("a[href*='/film/']").first().attr("href");
                }

                if (!filmLink) {
                    console.error("FullHD-Error: Film Linki Bulunamadı - " + movieTitle);
                    throw new Error("Film bulunamadı");
                }

                let targetUrl = filmLink.startsWith('http') ? filmLink : BASE_URL + (filmLink.startsWith('/') ? '' : '/') + filmLink;
                let filmRes = await fetch(targetUrl, { headers: WORKING_HEADERS });
                let filmHtml = await filmRes.text();

                let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                if (vidMatch) {
                    return getStreamsFromAPI(vidMatch[1], movieTitle);
                }
                return [];
            })
            .then(streams => resolve(streams))
            .catch(err => {
                console.error("FullHD-Error: Ana İşlem Hatası -> " + err.message);
                resolve([]);
            });
    });
}
