/**
 * FullHDFilmizlesene Nuvio Scraper - v29.5 (Cross-Title & URL Deep Link Fix)
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
        var finalUrl = universalAtob(adjusted);
        return (finalUrl && finalUrl.startsWith('http')) ? finalUrl.replace(/\\/g, "").trim() : null;
    } catch (e) { return null; }
}

function slugify(text) {
    const trMap = { 'ç':'c','ğ':'g','ş':'s','ü':'u','ı':'i','ö':'o' };
    return text.toLowerCase()
        .replace(/[çğşüıö]/g, m => trMap[m])
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

async function getStreamsFromAPI(vidid, movieTitle) {
    const fetchSource = async (name, type, pno = 'tr') => {
        try {
            let url = `${API_BASE}?id=${vidid}&type=t&name=${name}&get=video${pno ? '&pno='+pno : ''}&format=json`;
            let res = await fetch(url, { headers: WORKING_HEADERS });
            let data = await res.json();
            if (data && data.html) {
                let pUrl = data.html.replace(/\\/g, '');
                if (pUrl.startsWith('//')) pUrl = 'https:' + pUrl;
                
                if (name === 'atom') {
                    let pRes = await fetch(pUrl, { headers: WORKING_HEADERS });
                    let pHtml = await pRes.text();
                    let avMatch = pHtml.match(/av\(['"]([^'"]+)['"]\)/);
                    if (avMatch) {
                        let streamUrl = decodeRapidVid(avMatch[1]);
                        if (streamUrl) return { name: movieTitle, title: `⌜ FULLHDFILM ⌟ | Atom | 🇹🇷 Dublaj`, url: streamUrl, quality: "Auto", headers: WORKING_HEADERS, provider: "fullhd_scraper" };
                    }
                } else {
                    let wMatch = data.html.match(/\/watch\/(.*?)"/);
                    if (wMatch) {
                        let tRes = await fetch('https://turbo.imgz.me/play/' + wMatch[1] + '?autoplay=true', { headers: Object.assign({}, WORKING_HEADERS, { 'Referer': BASE_URL }) });
                        let tHtml = await tRes.text();
                        let m3u8 = tHtml.match(/file:\s*"(.*?\.m3u8.*?)"/i);
                        if (m3u8) return { name: movieTitle, title: `⌜ FULLHDFILM ⌟ | Turbo | 🇹🇷 Dublaj`, url: m3u8[1], quality: "Auto", headers: Object.assign({}, WORKING_HEADERS, { 'Referer': 'https://turbo.imgz.me/' }), provider: "fullhd_scraper" };
                    }
                }
            }
        } catch (e) {}
        return null;
    };

    let results = await Promise.all([fetchSource('atom', 't', null), fetchSource('advid', 't', 'tr')]);
    return results.filter(r => r !== null);
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96')
            .then(res => res.json())
            .then(data => {
                const year = data.release_date ? data.release_date.split('-')[0] : "";
                const queryTitle = (data.title || data.original_title).split('(')[0].trim();
                console.error(`[NUVIO] Aranan: ${queryTitle} (${year})`);
                return Promise.all([fetch(BASE_URL + '/arama/' + encodeURIComponent(queryTitle), { headers: WORKING_HEADERS }), year, queryTitle]);
            })
            .then(async ([res, year, queryTitle]) => {
                let $ = cheerio.load(await res.text());
                let candidates = [];

                $("ul.list li.film").each((i, el) => {
                    let link = $(el).find("a.tt").attr("href") || "";
                    let sTitle = $(el).find("span.film-title").text().trim();
                    let sYear = $(el).find("span.film-yil").text().trim();
                    let score = 0;

                    const qSlug = slugify(queryTitle);
                    const lSlug = link.toLowerCase();

                    // Yıl Uyumu (En büyük öncelik)
                    if (sYear.includes(year)) score += 60; 
                    
                    // İsim Parçacığı Kontrolü (Örn: "Ölümcül Deney" araması "olumcul-deney-lanetli-ulus" içinde geçiyor mu?)
                    if (lSlug.includes(qSlug) || qSlug.includes(lSlug.split('/').pop())) score += 30;
                    if (sTitle.toLowerCase().includes(queryTitle.toLowerCase())) score += 20;

                    candidates.push({ link, title: sTitle, score });
                });

                candidates.sort((a, b) => b.score - a.score);
                let best = candidates[0];

                // Yıl tutuyorsa (60 puan) başlık farklı olsa bile devam et
                if (!best || best.score < 55) return resolve([]);

                console.error(`[NUVIO] EŞLEŞTİ: ${best.title} (Puan: ${best.score})`);
                
                let fRes = await fetch(best.link.startsWith('http') ? best.link : BASE_URL + best.link, { headers: WORKING_HEADERS });
                let fHtml = await fRes.text();
                
                // Farklı ID tanımlamalarını yakalayan geliştirilmiş regex
                let vidMatch = fHtml.match(/(?:vidid|videoId|data-id)\s*[:=]\s*['"]?(\d+)['"]?/i);
                
                if (vidMatch) {
                    let streams = await getStreamsFromAPI(vidMatch[1], best.title);
                    resolve(streams);
                } else {
                    console.error("[NUVIO] Video ID bulunamadı.");
                    resolve([]);
                }
            })
            .catch(err => { resolve([]); });
    });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams }; } else { globalThis.getStreams = getStreams; }
