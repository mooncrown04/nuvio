var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";
const API_BASE = "https://www.fullhdfilmizlesene.live/player/api.php";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// Android TV / Nuvio için güvenli decode fonksiyonu
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

async function getStreamsFromAPI(vidid, movieTitle) {
    const fetchSource = async (name, title) => {
        try {
            let res = await fetch(`${API_BASE}?id=${vidid}&type=t&name=${name}&get=video&format=json`, { headers: WORKING_HEADERS });
            let data = await res.json();
            if (data && data.html) {
                let pRes = await fetch(data.html.replace(/\\/g, ''), { headers: WORKING_HEADERS });
                let pHtml = await pRes.text();
                let avMatch = pHtml.match(/av\(['"]([^'"]+)['"]\)/);
                let m3u8Match = pHtml.match(/file:\s*"(.*?\.m3u8.*?)"/i);

                let streamUrl = avMatch ? decodeRapidVid(avMatch[1]) : (m3u8Match ? m3u8Match[1] : null);
                if (streamUrl) return { name: movieTitle, title: `⌜ FULLHDFILM ⌟ | ${title}`, url: streamUrl, quality: "Auto", headers: WORKING_HEADERS };
            }
        } catch (e) { }
        return null;
    };

    let results = await Promise.all([fetchSource('atom', 'Atom'), fetchSource('advid', 'Turbo')]);
    return results.filter(r => r !== null);
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96&append_to_response=alternative_titles`)
            .then(res => res.json())
            .then(data => {
                const year = data.release_date ? data.release_date.split('-')[0] : "";
                const trTitle = data.title.toLowerCase();
                const enTitle = data.original_title.toLowerCase();
                
                console.error(`[NUVIO] Hedef: ${trTitle} / ${enTitle} (${year})`);

                const searchUrl = `${BASE_URL}/arama/${encodeURIComponent(data.title)}`;
                return Promise.all([fetch(searchUrl, { headers: WORKING_HEADERS }), year, trTitle, enTitle]);
            })
            .then(async ([res, targetYear, trTitle, enTitle]) => {
                let $ = cheerio.load(await res.text());
                let candidates = [];

                $("li.film").each((i, el) => {
                    let link = $(el).find("a").attr("href");
                    let siteTitle = $(el).find(".film-title").text().trim().toLowerCase();
                    let siteYear = $(el).find(".film-yil").text().trim();

                    // 1. KRİTİK KONTROL: YIL TUTMUYORSA ELE GİTSİN
                    if (!siteYear.includes(targetYear)) return;

                    // 2. PUANLAMA MANTIĞI
                    let score = 0;
                    if (siteTitle.includes(trTitle)) score += 50;
                    if (siteTitle.includes(enTitle)) score += 50;
                    
                    // Kelime bazlı ekstra puan
                    let words = trTitle.split(" ");
                    words.forEach(word => { if(word.length > 2 && siteTitle.includes(word)) score += 10; });

                    candidates.push({ link, score, title: siteTitle });
                });

                // En yüksek puanlı olanı seç
                candidates.sort((a, b) => b.score - a.score);
                let bestMatch = candidates[0];

                if (bestMatch && bestMatch.link) {
                    console.error(`[NUVIO] EN İYİ EŞLEŞME: ${bestMatch.title} (Puan: ${bestMatch.score})`);
                    let fRes = await fetch(bestMatch.link.startsWith('http') ? bestMatch.link : BASE_URL + bestMatch.link, { headers: WORKING_HEADERS });
                    let vidMatch = (await fRes.text()).match(/vidid\s*=\s*['"](\d+)['"]/);
                    if (vidMatch) return resolve(await getStreamsFromAPI(vidMatch[1], bestMatch.title.toUpperCase()));
                }

                console.error("[NUVIO] Uygun sonuç bulunamadı.");
                resolve([]);
            })
            .catch(() => resolve([]));
    });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams }; } 
else { globalThis.getStreams = getStreams; }
