/**
 * FullHDFilmizlesene Nuvio Scraper - v36.0 (Eksiksiz Arama & Puanlama)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";
const API_BASE = "https://www.fullhdfilmizlesene.live/player/api.php";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

function universalAtob(str) {
    try {
        if (typeof atob === 'function') return atob(str);
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var out = ''; str = String(str).replace(/[=]+$/, '');
        for (var bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? out += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
            buffer = chars.indexOf(buffer);
        }
        return out;
    } catch (e) { return null; }
}

function decodeRapidVid(encodedData) {
    try {
        if (!encodedData) return null;
        var reversed = encodedData.split('').reverse().join('');
        var decodedBinary = universalAtob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
        var key = "K9L"; var adjusted = "";
        for (var i = 0; i < decodedBinary.length; i++) {
            var charCode = decodedBinary.charCodeAt(i);
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            adjusted += String.fromCharCode(charCode - shift);
        }
        return universalAtob(adjusted).replace(/\\/g, "").trim();
    } catch (e) { return null; }
}

async function getStreamsFromAPI(vidid, movieTitle) {
    console.error("Scraper: API Sorgusu VIDID:", vidid);
    const fetchSource = async (name) => {
        try {
            let res = await fetch(`${API_BASE}?id=${vidid}&type=t&name=${name}&get=video&format=json`, { headers: WORKING_HEADERS });
            let data = await res.json();
            if (data && data.html) {
                let pRes = await fetch(data.html.replace(/\\/g, ''), { headers: WORKING_HEADERS });
                let pHtml = await pRes.text();
                
                // Atom (Rapid) Kontrolü
                let avMatch = pHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    let url = decodeRapidVid(avMatch[1]);
                    if (url) return { name: movieTitle, title: `⌜ FULLHDFILM ⌟ | ${name}`, url: url, quality: "Auto", headers: WORKING_HEADERS, provider: "fullhd_scraper" };
                }
                
                // Turbo (M3U8) Kontrolü
                let m3u8Match = pHtml.match(/file:\s*"(.*?\.m3u8.*?)"/i);
                if (m3u8Match) return { name: movieTitle, title: `⌜ FULLHDFILM ⌟ | ${name}`, url: m3u8Match[1], quality: "Auto", headers: WORKING_HEADERS, provider: "fullhd_scraper" };
            }
        } catch (e) { console.error(`Scraper: ${name} hatası:`, e.message); }
        return null;
    };

    let sources = await Promise.all([fetchSource('atom'), fetchSource('advid')]);
    return sources.filter(s => s !== null);
}

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        console.error("Scraper: İşlem Başladı ID:", tmdbId);

        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`)
            .then(res => res.json())
            .then(async (data) => {
                const year = data.release_date ? data.release_date.split('-')[0] : "";
                const titleTr = data.title || "";
                const titleEn = data.original_title || "";
                
                console.error(`Scraper: Aranan - ${titleTr} (${year})`);

                const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(titleTr || titleEn)}`, { headers: WORKING_HEADERS });
                const searchHtml = await searchRes.text();
                const $ = cheerio.load(searchHtml);
                let candidates = [];

                $(".film-listesi li").each((i, el) => {
                    const link = $(el).find("a").attr("href");
                    const text = $(el).text().toLowerCase();
                    let score = 0;

                    if (!link) return;

                    // Gelişmiş Arama Mantığı:
                    // 1. Yıl tam eşleşiyorsa en yüksek puanı ver (Yanlış film ihtimalini bitirir)
                    if (year && text.includes(year)) score += 500;

                    // 2. İsimlerin içinde geçme durumuna göre ek puan
                    if (titleTr && text.includes(titleTr.toLowerCase())) score += 100;
                    if (titleEn && text.includes(titleEn.toLowerCase())) score += 100;

                    // 3. Kelime bazlı tam eşleşme bonusu (Daha temiz sonuç için)
                    if (text.includes(titleTr.toLowerCase() + " izle")) score += 50;

                    console.error(`Scraper: Aday Bulundu -> Skor: ${score} | ${text.trim().substring(0, 40)}`);
                    candidates.push({ link, score });
                });

                // En yüksek skoru olanı başa al[cite: 1]
                candidates.sort((a, b) => b.score - a.score);
                
                if (candidates.length === 0 || candidates[0].score < 100) {
                    console.error("Scraper: Eşleşen sonuç bulunamadı.");
                    return resolve([]);
                }

                const bestLink = candidates[0].link;
                console.error("Scraper: Seçilen Link:", bestLink);

                const filmRes = await fetch(bestLink.startsWith('http') ? bestLink : BASE_URL + bestLink, { headers: WORKING_HEADERS });
                const filmHtml = await filmRes.text();
                
                const vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                if (vidMatch) {
                    const streams = await getStreamsFromAPI(vidMatch[1], titleTr);
                    return resolve(streams);
                }
                
                console.error("Scraper: Sayfada vidid bulunamadı.");
                resolve([]);
            })
            .catch(err => {
                console.error("Scraper: Kritik Hata:", err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) { 
    module.exports = { getStreams: getStreams }; 
} else { 
    globalThis.getStreams = getStreams; 
}
