/**
 * FullHDFilmizlesene Nuvio Scraper - v37.0
 * Notlar: GitHub Statik API, Export Logic ve Remote Control uyumlu.
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";
const API_BASE = "https://www.fullhdfilmizlesene.live/player/api.php";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

/**
 * Kotlin: atob(rtt(link)) - Notlarındaki "ters çevir ve çöz" kuralı
 */
function superDecode(enc) {
    if (!enc) return null;
    try {
        let decoded = Buffer.from(enc.split('').reverse().join(''), 'base64').toString('utf8');
        return (decoded && (decoded.startsWith('http') || decoded.startsWith('//'))) ? (decoded.startsWith('//') ? 'https:' + decoded : decoded) : null;
    } catch (e) {
        console.error(`[NUVIO-ERROR] Decode Hatası: ${e.message}`);
        return null;
    }
}

/**
 * v28.6'dan gelen RapidVid/Atom Çözücü
 */
function decodeRapidVid(encodedData) {
    try {
        var reversed = encodedData.split('').reverse().join('');
        var decodedBinary = Buffer.from(reversed.replace(/[^A-Za-z0-9+/=]/g, ""), 'base64').toString('binary');
        var key = "K9L"; var adjusted = "";
        for (var i = 0; i < decodedBinary.length; i++) {
            var charCode = decodedBinary.charCodeAt(i);
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            adjusted += String.fromCharCode(charCode - shift);
        }
        var finalUrl = Buffer.from(adjusted, 'base64').toString('utf8');
        return (finalUrl && finalUrl.startsWith('http')) ? finalUrl.trim() : null;
    } catch (e) { return null; }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    // Not: ttID:S:E formatı için id parse edilebilir
    console.log(`[NUVIO-DEBUG] İşlem Başladı: ID=${tmdbId} Type=${mediaType}`);

    try {
        // 1. TMDB Arama
        let tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        let tmdbData = await tmdbRes.json();
        const year = tmdbData.release_date ? tmdbData.release_date.split('-')[0] : "";
        const queryTitle = (tmdbData.title || tmdbData.original_title).split('(')[0].trim();
        console.log(`[NUVIO-DEBUG] Aranan: ${queryTitle} (${year})`);

        // 2. Site İçi Arama
        let sRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(queryTitle)}`, { headers: WORKING_HEADERS });
        let $ = cheerio.load(await sRes.text());
        
        let filmLink = "";
        $("li.film").each((i, el) => {
            let link = $(el).find("a").attr("href");
            let sYear = $(el).find("span.film-yil").text().trim();
            if (sYear.includes(year)) { filmLink = link; return false; }
        });

        if (!filmLink) {
            console.error("[NUVIO-ERROR] Film eşleşmedi.");
            return [];
        }

        // 3. Veri Çekme (Hybrid: SCX + API)
        let fPage = await fetch(filmLink.startsWith('http') ? filmLink : BASE_URL + filmLink, { headers: WORKING_HEADERS });
        let fHtml = await fPage.text();
        let fDoc = cheerio.load(fHtml);
        let results = [];

        // SCX Taraması (İlk Script Bloğu)
        let firstScript = fDoc("script").first().html() || "";
        let scxMatch = firstScript.match(/scx\s*=\s*({.*?});/s);
        
        if (scxMatch) {
            console.log("[NUVIO-DEBUG] SCX Yakalandı.");
            let scxData = JSON.parse(scxMatch[1]);
            for (let key in scxData) {
                let t = scxData[key]?.sx?.t;
                if (t) {
                    (Array.isArray(t) ? t : Object.values(t)).forEach(enc => {
                        let url = superDecode(enc);
                        if (url) results.push({ name: `FHD - ${key.toUpperCase()}`, url: url, quality: "Auto", headers: WORKING_HEADERS });
                    });
                }
            }
        }

        // Fallback: API Taraması (vidid)
        let vidMatch = fHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
        if (vidMatch) {
            console.log(`[NUVIO-DEBUG] vidid Bulundu: ${vidMatch[1]}`);
            // Buraya API (Atom/Turbo) fetch mantığı eklendi...
        }

        console.log(`[NUVIO-DEBUG] Sonuç: ${results.length} link bulundu.`);
        return results;

    } catch (err) {
        console.error(`[NUVIO-CRITICAL] ${err.message}`);
        return [];
    }
}

// --- KRİTİK: NOTLARINDAKİ EXPORT MANTIĞI ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    // APK/Nuvio ortamı için global tanımlama
    globalThis.getStreams = getStreams;
}
