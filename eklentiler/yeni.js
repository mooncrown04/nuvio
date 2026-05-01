/**
 * FullHDFilmizlesene Nuvio Scraper - v33.0 (KekikStream Logic)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// KekikStream StringCodec.decode mantığı (RTT + Base64)
function superDecode(enc) {
    if (!enc) return null;
    try {
        // Python'daki decode: string[::-1] (ters çevir) ve b64decode
        let decoded = Buffer.from(enc.split('').reverse().join(''), 'base64').toString('utf8');
        if (decoded && (decoded.startsWith('http') || decoded.startsWith('//'))) {
            return decoded.startsWith('//') ? 'https:' + decoded : decoded;
        }
    } catch (e) {
        // console.error("[DECODE-ERROR]", e.message);
    }
    return null;
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        console.log(`[NUVIO] İstek: ${tmdbId}`);

        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`)
            .then(res => res.json())
            .then(data => {
                const year = data.release_date ? data.release_date.split('-')[0] : "";
                const queryTitle = (data.title || data.original_title).split('(')[0].trim();
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
                    if (score > maxScore) { maxScore = score; bestMatch = link; }
                });

                if (!bestMatch || maxScore < 50) {
                    console.error("[NUVIO-ERROR] Film bulunamadı.");
                    return resolve([]);
                }

                console.log(`[NUVIO-LOG] Sayfa: ${bestMatch}`);
                let fRes = await fetch(bestMatch.startsWith('http') ? bestMatch : BASE_URL + (bestMatch.startsWith('/') ? '' : '/') + bestMatch, { headers: WORKING_HEADERS });
                let fHtml = await fRes.text();
                let fDoc = cheerio.load(fHtml);

                let results = [];

                // --- KRİTİK NOKTA: Python kodundaki gibi İLK script'i hedef alıyoruz ---
                let firstScript = fDoc("script").first().html() || "";
                console.log("[NUVIO-LOG] İlk script bloğu analiz ediliyor...");

                // scx = { ... }; yapısını yakala
                let scxMatch = firstScript.match(/scx\s*=\s*({.*?});/s);
                
                if (scxMatch) {
                    try {
                        let scxData = JSON.parse(scxMatch[1]);
                        console.log(`[NUVIO-LOG] SCX Objesi yakalandı. Key sayısı: ${Object.keys(scxData).length}`);

                        Object.keys(scxData).forEach(key => {
                            let t = scxData[key]?.sx?.t;
                            if (t) {
                                // Eğer liste (Array) ise veya obje (Dict) ise içindekileri çöz
                                let encList = Array.isArray(t) ? t : Object.values(t);
                                encList.forEach(enc => {
                                    let url = superDecode(enc);
                                    if (url) {
                                        results.push({ 
                                            name: `FHD - ${key.toUpperCase()}`, 
                                            url: url, 
                                            quality: "Auto", 
                                            headers: { 'User-Agent': WORKING_HEADERS['User-Agent'], 'Referer': 'https://turbo.imgz.me/' } 
                                        });
                                    }
                                });
                            }
                        });
                    } catch (e) {
                        console.error("[NUVIO-ERROR] JSON Ayrıştırma hatası:", e.message);
                    }
                } else {
                    console.error("[NUVIO-ERROR] İlk script içinde 'scx' bulunamadı, fallback (tüm sayfa taraması) deneniyor.");
                    // Fallback: Tüm sayfa içinde "t":"..." taraması (Önceki kodun yaptığı)
                    let tMatches = fHtml.match(/"t"\s*:\s*"([^"]+)"/g);
                    if (tMatches) {
                        tMatches.forEach(m => {
                            let enc = m.match(/"t"\s*:\s*"([^"]+)"/)[1];
                            let url = superDecode(enc);
                            if (url && url.length > 20) results.push({ name: "FHD - ALT", url: url, quality: "Auto", headers: WORKING_HEADERS });
                        });
                    }
                }

                if (results.length === 0) console.error("[NUVIO-ERROR] Hiçbir sonuç üretilemedi.");
                resolve(results);
            })
            .catch(err => {
                console.error("[NUVIO-CRITICAL]", err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams }; }
