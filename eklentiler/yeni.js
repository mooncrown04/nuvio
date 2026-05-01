/**
 * FullHDFilmizlesene Nuvio Scraper - v32.1 (Full Logging & Nuvio Logic)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// Kotlin: atob(rtt(link)) mantığı
function superDecode(enc) {
    if (!enc) return null;
    try {
        let decoded = Buffer.from(enc.split('').reverse().join(''), 'base64').toString('utf8');
        if (decoded && (decoded.startsWith('http') || decoded.startsWith('//'))) {
            return decoded.startsWith('//') ? 'https:' + decoded : decoded;
        }
    } catch (e) {
        console.error(`[NUVIO-ERROR] Decode Başarısız: ${e.message}`);
    }
    return null;
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        console.log(`[NUVIO-LOG] İşlem Başladı -> TMDB ID: ${tmdbId}`);

        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`)
            .then(res => res.json())
            .then(data => {
                const year = data.release_date ? data.release_date.split('-')[0] : "";
                const queryTitle = (data.title || data.original_title).split('(')[0].trim();
                console.log(`[NUVIO-LOG] Aranan Film: ${queryTitle} (${year})`);
                return Promise.all([fetch(`${BASE_URL}/arama/${encodeURIComponent(queryTitle)}`, { headers: WORKING_HEADERS }), year, queryTitle]);
            })
            .then(async ([res, year, queryTitle]) => {
                let html = await res.text();
                let $ = cheerio.load(html);
                let bestMatch = null;
                let maxScore = -1;

                $("li.film").each((i, el) => {
                    let link = $(el).find("a").first().attr("href") || "";
                    let sTitle = $(el).find("span.film-title").text().trim();
                    let sYear = $(el).find("span.film-yil").text().trim();
                    
                    let score = (sYear.includes(year) ? 60 : 0) + (sTitle.toLowerCase().includes(queryTitle.toLowerCase()) ? 40 : 0);
                    
                    if (score > maxScore) {
                        maxScore = score;
                        bestMatch = link;
                    }
                });

                if (!bestMatch || maxScore < 50) {
                    console.error("[NUVIO-ERROR] Uygun eşleşme bulunamadı!");
                    return resolve([]);
                }

                console.log(`[NUVIO-LOG] Eşleşme Başarılı: ${bestMatch} (Puan: ${maxScore})`);

                let fRes = await fetch(bestMatch.startsWith('http') ? bestMatch : BASE_URL + (bestMatch.startsWith('/') ? '' : '/') + bestMatch, { headers: WORKING_HEADERS });
                let fHtml = await fRes.text();

                let results = [];
                // Nuvio Kuralları: "t" parametreli gizli linkleri yakala
                let tMatches = fHtml.match(/"t"\s*:\s*"([^"]+)"/g);
                
                if (!tMatches) {
                    console.error("[NUVIO-ERROR] Sayfa içerisinde 't' parametreli link bulunamadı.");
                } else {
                    console.log(`[NUVIO-LOG] Bulunan şifreli 't' bloğu sayısı: ${tMatches.length}`);
                    tMatches.forEach((m, index) => {
                        let enc = m.match(/"t"\s*:\s*"([^"]+)"/)[1];
                        let decodedUrl = superDecode(enc);
                        
                        if (decodedUrl && (decodedUrl.includes('m3u8') || decodedUrl.includes('mp4'))) {
                            console.log(`[NUVIO-SUCCESS] Link Çözüldü [${index}]: ${decodedUrl.substring(0, 50)}...`);
                            results.push({ 
                                name: "FHD - Kaynak " + (index + 1), 
                                url: decodedUrl, 
                                quality: "Auto", 
                                headers: { 
                                    'User-Agent': WORKING_HEADERS['User-Agent'], 
                                    'Referer': 'https://turbo.imgz.me/' 
                                } 
                            });
                        }
                    });
                }

                if (results.length === 0) console.error("[NUVIO-ERROR] Hiçbir stream linki üretilemedi.");
                resolve(results);
            })
            .catch(err => {
                console.error(`[NUVIO-CRITICAL] Genel Hata: ${err.message}`);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams }; }
