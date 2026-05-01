/**
 * FullHDFilmizlesene Nuvio Scraper - v38.0 (Esnek Kelime Eşleştirme)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";
const API_BASE = "https://www.fullhdfilmizlesene.live/player/api.php";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// ... (atob ve decodeRapidVid fonksiyonları aynı kalıyor) ...
function universalAtob(str) { try { if (typeof atob === 'function') return atob(str); var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='; var out = ''; str = String(str).replace(/[=]+$/, ''); for (var bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? out += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) { buffer = chars.indexOf(buffer); } return out; } catch (e) { return null; } }
function decodeRapidVid(encodedData) { try { if (!encodedData) return null; var reversed = encodedData.split('').reverse().join(''); var decodedBinary = universalAtob(reversed.replace(/[^A-Za-z0-9+/=]/g, "")); var key = "K9L"; var adjusted = ""; for (var i = 0; i < decodedBinary.length; i++) { var charCode = decodedBinary.charCodeAt(i); var shift = (key.charCodeAt(i % key.length) % 5) + 1; adjusted += String.fromCharCode(charCode - shift); } return universalAtob(adjusted).replace(/\\/g, "").trim(); } catch (e) { return null; } }

async function getStreamsFromAPI(vidid, movieTitle) {
    const fetchSource = async (name) => {
        try {
            let res = await fetch(`${API_BASE}?id=${vidid}&type=t&name=${name}&get=video&format=json`, { headers: WORKING_HEADERS });
            let data = await res.json();
            if (data && data.html) {
                let pRes = await fetch(data.html.replace(/\\/g, ''), { headers: WORKING_HEADERS });
                let pHtml = await pRes.text();
                let avMatch = pHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    let url = decodeRapidVid(avMatch[1]);
                    if (url) return { name: movieTitle, title: `⌜ FULLHDFILM ⌟ | ${name}`, url: url, quality: "Auto", headers: WORKING_HEADERS, provider: "fullhd_scraper" };
                }
            }
        } catch (e) { console.error(`Scraper: API Hatası ->`, e.message); }
        return null;
    };
    let sources = await Promise.all([fetchSource('atom'), fetchSource('advid')]);
    return sources.filter(s => s !== null);
}

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`)
            .then(res => res.json())
            .then(async (data) => {
                const year = data.release_date ? data.release_date.split('-')[0] : "";
                const titleTr = data.title || "";
                const titleEn = data.original_title || "";
                
                // Aramayı TMDB'den gelen ana isimle yapıyoruz
                const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(titleTr)}`, { headers: WORKING_HEADERS });
                const searchHtml = await searchRes.text();
                const $ = cheerio.load(searchHtml);
                
                let candidates = [];
                const searchTerms = titleTr.toLowerCase().split(' ').filter(t => t.length > 2); // "Ajan", "Zeta" gibi kelimeler

                $("a[href*='/film/']").each((i, el) => {
                    let href = $(el).attr("href");
                    let text = $(el).text().toLowerCase();
                    if (!href || href.includes("/kategori/")) return;

                    let score = 0;
                    // Kelime bazlı kontrol: Aranan kelimelerden herhangi biri geçiyor mu?
                    searchTerms.forEach(term => {
                        if (text.includes(term) || href.includes(term)) score += 100;
                    });

                    // Yıl eşleşirse büyük bonus (Senin için en sağlam ayraç)
                    if (year && text.includes(year)) score += 300;

                    if (score > 0) {
                        candidates.push({ href, score, text });
                    }
                });

                candidates.sort((a, b) => b.score - a.score);

                if (candidates.length === 0) {
                    console.error("Scraper: Hiçbir aday bulunamadı.");
                    return resolve([]);
                }

                const finalLink = candidates[0].href;
                console.error(`Scraper: Seçilen -> ${candidates[0].text} (${finalLink})`);

                const filmRes = await fetch(finalLink.startsWith('http') ? finalLink : BASE_URL + finalLink, { headers: WORKING_HEADERS });
                const filmHtml = await filmRes.text();
                const vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                
                if (vidMatch) {
                    return resolve(await getStreamsFromAPI(vidMatch[1], titleTr));
                }
                resolve([]);
            })
            .catch(err => {
                console.error("Scraper: Hata ->", err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; } else { globalThis.getStreams = getStreams; }
