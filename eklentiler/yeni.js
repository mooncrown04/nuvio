/**
 * FullHDFilmizlesene Nuvio Scraper - v32.2 (Force Scx Search & Multi-Layer Debug)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

function superDecode(enc) {
    if (!enc) return null;
    try {
        // Kotlin: atob(rtt(enc))
        let decoded = Buffer.from(enc.split('').reverse().join(''), 'base64').toString('utf8');
        if (decoded && (decoded.startsWith('http') || decoded.startsWith('//'))) {
            return decoded.startsWith('//') ? 'https:' + decoded : decoded;
        }
    } catch (e) { }
    return null;
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        console.log(`[NUVIO] İşlem TMDB: ${tmdbId} için başlatıldı.`);

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
                    console.error("[NUVIO] Eşleşme bulunamadı.");
                    return resolve([]);
                }

                console.log(`[NUVIO] Film Sayfası Çekiliyor: ${bestMatch}`);
                let fRes = await fetch(bestMatch.startsWith('http') ? bestMatch : BASE_URL + (bestMatch.startsWith('/') ? '' : '/') + bestMatch, { headers: WORKING_HEADERS });
                let fHtml = await fRes.text();

                let results = [];

                // --- KATMAN 1: STANDART SCX TARAMASI ---
                let tMatches = fHtml.match(/"t"\s*:\s*"([^"]+)"/g);
                
                // --- KATMAN 2: DERİN TARAMA (Eğer ilk katman boşsa) ---
                if (!tMatches || tMatches.length === 0) {
                    console.log("[NUVIO] Katman 1 başarısız, derin tarama (regex search) başlıyor...");
                    // Bazen 't' değerleri t: "..." şeklinde veya farklı tırnaklarla gelebilir
                    tMatches = fHtml.match(/['"]?t['"]?\s*[:=]\s*['"]([^'"]+)['"]/g);
                }

                if (tMatches) {
                    console.log(`[NUVIO] ${tMatches.length} adet potansiyel veri bulundu.`);
                    tMatches.forEach((m) => {
                        // Regex ile sadece tırnak içindeki şifreli kısmı al
                        let parts = m.match(/[:=]\s*['"]([^'"]+)['"]/);
                        let enc = parts ? parts[1] : null;
                        
                        if (enc && enc.length > 20) { // Kısa stringleri (başlık vs) ele
                            let url = superDecode(enc);
                            if (url && (url.includes('m3u8') || url.includes('mp4') || url.includes('google'))) {
                                results.push({ 
                                    name: "FHD - Stream", 
                                    url: url, 
                                    quality: "Auto", 
                                    headers: { 'User-Agent': WORKING_HEADERS['User-Agent'], 'Referer': 'https://turbo.imgz.me/' } 
                                });
                            }
                        }
                    });
                }

                if (results.length === 0) {
                    console.error("[NUVIO] Tüm katmanlar başarısız. Sayfa yapısı değişmiş veya bot koruması aktif.");
                    // Son çare: iFrame taraması gerekebilir ama önce bunu görelim.
                } else {
                    console.log(`[NUVIO] Başarılı! ${results.length} link üretildi.`);
                }

                resolve(results);
            })
            .catch(err => {
                console.error(`[NUVIO] Kritik Hata: ${err.message}`);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams }; }
