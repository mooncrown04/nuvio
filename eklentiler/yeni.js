/**
 * FullHDFilmizlesene Nuvio Scraper - v30.0 (Hex Decoding & Subtitle Support)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// Kotlin'deki rtt() - String Ters Çevirme
function rtt(str) { return str ? str.split('').reverse().join('') : ""; }

// Kotlin'deki Hex decoding mantığı (\x hex kodlarını çözer)
function hexDecode(str) {
    try {
        if (!str) return null;
        // Eğer \x içeriyorsa hex decode uygula
        if (str.includes('\\x')) {
            return str.replace(/\\x([0-9A-Fa-f]{2})/g, (match, p1) => {
                return String.fromCharCode(parseInt(p1, 16));
            });
        }
        return str;
    } catch (e) { return str; }
}

function universalAtob(str) {
    try {
        if (typeof atob === 'function') return atob(str);
        return Buffer.from(str, 'base64').toString('binary');
    } catch (e) { return null; }
}

// Hibrit Çözücü: Önce RTT, sonra Base64, sonra Hex
function superDecode(encoded) {
    if (!encoded) return null;
    let text = encoded;
    
    // 1. Eğer doğrudan URL ise temizle dön
    if (text.startsWith('http') || text.startsWith('//')) {
        return text.startsWith('//') ? 'https:' + text : text;
    }

    // 2. RTT + Base64 Çözümü (Kotlin: atob(rtt(link)))
    try {
        let b64 = universalAtob(rtt(text));
        if (b64 && (b64.startsWith('http') || b64.startsWith('//'))) {
            return b64.startsWith('//') ? 'https:' + b64 : b64;
        }
    } catch (e) {}

    // 3. Hex Çözümü (Kotlin'deki \x filtreleme)
    let hexed = hexDecode(text);
    if (hexed && (hexed.startsWith('http') || hexed.startsWith('//'))) {
        return hexed.startsWith('//') ? 'https:' + hexed : hexed;
    }

    return null;
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`)
            .then(res => res.json())
            .then(data => {
                const year = data.release_date ? data.release_date.split('-')[0] : "";
                const queryTitle = (data.title || data.original_title).split('(')[0].trim();
                return Promise.all([fetch(`${BASE_URL}/arama/${encodeURIComponent(queryTitle)}`, { headers: WORKING_HEADERS }), year, queryTitle]);
            })
            .then(async ([res, year, queryTitle]) => {
                let $ = cheerio.load(await res.text());
                let bestLink = null;
                let maxScore = -1;

                $("li.film").each((i, el) => {
                    let link = $(el).find("a").first().attr("href") || "";
                    let sTitle = $(el).find("span.film-title").text().trim();
                    let sYear = $(el).find("span.film-yil").text().trim();
                    let score = (sYear.includes(year) ? 60 : 0) + (sTitle.toLowerCase().includes(queryTitle.toLowerCase()) ? 40 : 0);
                    if (score > maxScore) { maxScore = score; bestLink = link; }
                });

                if (!bestLink || maxScore < 55) return resolve([]);

                let fUrl = bestLink.startsWith('http') ? bestLink : BASE_URL + (bestLink.startsWith('/') ? '' : '/') + bestLink;
                let fRes = await fetch(fUrl, { headers: WORKING_HEADERS });
                let fHtml = await fRes.text();

                let results = [];
                
                // --- SCX Katmanı ---
                let scxMatch = fHtml.match(/scx\s*=\s*({.*?});/s);
                if (scxMatch) {
                    try {
                        let scx = JSON.parse(scxMatch[1]);
                        ["atom", "advid", "proton", "fastly", "tr", "en"].forEach(key => {
                            let t = scx[key] && scx[key].sx ? scx[key].sx.t : null;
                            if (t) {
                                (Array.isArray(t) ? t : Object.values(t)).forEach(enc => {
                                    let url = superDecode(enc);
                                    if (url) results.push({ name: `FHD - ${key.toUpperCase()}`, url: url, quality: "Auto", headers: WORKING_HEADERS });
                                });
                            }
                        });
                    } catch (e) {}
                }

                // --- Altyazı Katmanı (Kotlin VidMoxy Mantığı) ---
                let subMatches = fHtml.matchAll(/"captions","file":"([^"]+)","label":"([^"]+)"/g);
                for (const match of subMatches) {
                    let subUrl = superDecode(match[1].replace(/\\/g, ""));
                    if (subUrl) {
                        console.error(`[NUVIO] Altyazı Bulundu: ${match[2]}`);
                        // Nuvio altyazı objesi buraya eklenebilir
                    }
                }

                resolve(results);
            })
            .catch(() => resolve([]));
    });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams }; }
