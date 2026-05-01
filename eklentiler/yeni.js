/**
 * FullHDFilmizlesene Nuvio Scraper - v29.0 (Smart Scoring & Year Priority)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";
const API_BASE = "https://www.fullhdfilmizlesene.live/player/api.php";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// ... (universalAtob, decodeRapidVid ve getStreamsFromAPI fonksiyonlarını buraya aynen ekle, değişiklik yok)

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96')
            .then(res => res.json())
            .then(data => {
                const year = data.release_date ? data.release_date.split('-')[0] : "";
                const movieTitleTr = data.title || "";
                const movieTitleEn = data.original_title || "";
                const query = movieTitleTr || movieTitleEn;
                const searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
                
                return Promise.all([
                    fetch(searchUrl, { headers: WORKING_HEADERS }), 
                    year, 
                    movieTitleTr, 
                    movieTitleEn
                ]);
            })
            .then(async ([res, year, movieTitleTr, movieTitleEn]) => {
                let searchHtml = await res.text();
                let $ = cheerio.load(searchHtml);
                let candidates = [];

                $(".film-listesi li").each((i, el) => {
                    let link = $(el).find("a").attr("href");
                    let itemText = $(el).text().toLowerCase();
                    let score = 0;

                    if (!link) return;

                    // 1. Yıl Puanlaması (En yüksek ağırlık)
                    if (year && itemText.includes(year)) {
                        score += 50;
                    }

                    // 2. İsim Puanlaması (Türkçe ve İngilizce)
                    let cleanTitleTr = movieTitleTr.toLowerCase();
                    let cleanTitleEn = movieTitleEn.toLowerCase();

                    if (itemText.includes(cleanTitleTr)) score += 30;
                    if (itemText.includes(cleanTitleEn)) score += 30;

                    candidates.push({ link, score });
                });

                // Puanı en yüksek olanı en başa getir
                candidates.sort((a, b) => b.score - a.score);
                
                let filmLink = candidates.length > 0 ? candidates[0].link : "";

                if (!filmLink) filmLink = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!filmLink) throw new Error("Film bulunamadı");
                
                let filmRes = await fetch(filmLink.startsWith('http') ? filmLink : BASE_URL + filmLink, { headers: WORKING_HEADERS });
                let filmHtml = await filmRes.text();
                
                let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                if (vidMatch) return getStreamsFromAPI(vidMatch[1], movieTitleTr || movieTitleEn);
                
                return [];
            })
            .then(streams => resolve(streams))
            .catch(err => { resolve([]); });
    });
}
