/**
 * FullHDFilmizlesene Nuvio Scraper - v34.0 (Hybrid: SCX + API Fallback)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";
const API_BASE = "https://www.fullhdfilmizlesene.live/player/api.php";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// --- YENİ NESİL DECODE (KekikStream Mantığı) ---
function superDecode(enc) {
    if (!enc) return null;
    try {
        let decoded = Buffer.from(enc.split('').reverse().join(''), 'base64').toString('utf8');
        if (decoded && (decoded.startsWith('http') || decoded.startsWith('//'))) {
            return decoded.startsWith('//') ? 'https:' + decoded : decoded;
        }
    } catch (e) {}
    return null;
}

// --- ESKİ NESİL DECODE (v28.6'dan gelen RapidVid) ---
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
    if (mediaType !== 'movie') return [];

    try {
        // 1. TMDB Bilgisi Al
        let tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        let tmdbData = await tmdbRes.json();
        const year = tmdbData.release_date ? tmdbData.release_date.split('-')[0] : "";
        const queryTitle = (tmdbData.title || tmdbData.original_title).split('(')[0].trim();

        // 2. Sitede Ara
        let searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(queryTitle)}`, { headers: WORKING_HEADERS });
        let searchHtml = await searchRes.text();
        let $ = cheerio.load(searchHtml);
        
        let filmLink = "";
        $("li.film").each((i, el) => {
            let link = $(el).find("a").attr("href");
            let sYear = $(el).find("span.film-yil").text().trim();
            if (sYear.includes(year)) { filmLink = link; return false; }
        });

        if (!filmLink) return [];

        // 3. Film Sayfasını Çek
        let fPage = await fetch(filmLink.startsWith('http') ? filmLink : BASE_URL + filmLink, { headers: WORKING_HEADERS });
        let fHtml = await fPage.text();
        let fDoc = cheerio.load(fHtml);
        let results = [];

        // --- YÖNTEM A: SCX (KekikStream) ---
        let firstScript = fDoc("script").first().html() || "";
        let scxMatch = firstScript.match(/scx\s*=\s*({.*?});/s);
        
        if (scxMatch) {
            let scxData = JSON.parse(scxMatch[1]);
            Object.keys(scxData).forEach(key => {
                let t = scxData[key]?.sx?.t;
                if (t) {
                    let encList = Array.isArray(t) ? t : Object.values(t);
                    encList.forEach(enc => {
                        let url = superDecode(enc);
                        if (url) results.push({ name: `FHD - ${key.toUpperCase()}`, url: url, quality: "Auto", headers: WORKING_HEADERS });
                    });
                }
            });
        }

        // --- YÖNTEM B: ESKİ API (v28.6 Fallback) ---
        // Eğer SCX'ten sonuç gelmediyse veya ek kaynak istiyorsak
        let vidMatch = fHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
        if (vidMatch) {
            const vidid = vidMatch[1];
            // Atom Sorgusu
            try {
                let aRes = await fetch(`${API_BASE}?id=${vidid}&type=t&name=atom&get=video&format=json`, { headers: WORKING_HEADERS });
                let aData = await aRes.json();
                if (aData.html) {
                    let pRes = await fetch(aData.html.replace(/\\/g, ''), { headers: WORKING_HEADERS });
                    let pHtml = await pRes.text();
                    let av = pHtml.match(/av\(['"]([^'"]+)['"]\)/);
                    if (av) {
                        let url = decodeRapidVid(av[1]);
                        if (url) results.push({ name: "FHD - ATOM", url: url, quality: "Auto", headers: WORKING_HEADERS });
                    }
                }
            } catch (e) {}

            // Turbo Sorgusu
            try {
                let tRes = await fetch(`${API_BASE}?id=${vidid}&type=t&name=advid&get=video&pno=tr&format=json`, { headers: WORKING_HEADERS });
                let tData = await tRes.json();
                if (tData.html && tData.html.includes('/watch/')) {
                    let wId = tData.html.match(/\/watch\/(.*?)"/)[1];
                    let pRes = await fetch('https://turbo.imgz.me/play/' + wId + '?autoplay=true', { headers: WORKING_HEADERS });
                    let pHtml = await pRes.text();
                    let m3u8 = pHtml.match(/file:\s*"(.*?\.m3u8.*?)"/i);
                    if (m3u8) results.push({ name: "FHD - TURBO", url: m3u8[1], quality: "Auto", headers: { ...WORKING_HEADERS, 'Referer': 'https://turbo.imgz.me/' } });
                }
            } catch (e) {}
        }

        return results;
    } catch (err) {
        console.error("[NUVIO-FATAL]", err.message);
        return [];
    }
}

module.exports = { getStreams };
