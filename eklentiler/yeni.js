/**
 * FullHDFilmizlesene Nuvio Scraper - v29.8 (SCX Data & RTT Decoder)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

// Kotlin'deki rtt() fonksiyonunun JS karşılığı (String'i ters çevirir)
function rtt(str) {
    return str.split('').reverse().join('');
}

// Kotlin'deki atob() karşılığı
function universalAtob(str) {
    try {
        if (typeof atob === 'function') return atob(str);
        return Buffer.from(str, 'base64').toString('binary');
    } catch (e) { return null; }
}

// Kotlin'deki çözme mantığı: atob(rtt(link))
function decodeFHDLink(encoded) {
    if (!encoded) return null;
    let decoded = universalAtob(rtt(encoded));
    if (decoded && decoded.startsWith('//')) decoded = 'https:' + decoded;
    return decoded;
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
                let bestMatch = null;
                let maxScore = -1;

                $("li.film").each((i, el) => {
                    let link = $(el).find("a").first().attr("href") || "";
                    let sTitle = $(el).find("span.film-title").text().trim();
                    let sYear = $(el).find("span.film-yil").text().trim();
                    
                    let score = 0;
                    if (sYear.includes(year)) score += 60;
                    if (sTitle.toLowerCase().includes(queryTitle.toLowerCase())) score += 40;

                    if (score > maxScore) {
                        maxScore = score;
                        bestMatch = link;
                    }
                });

                if (!bestMatch || maxScore < 60) return resolve([]);

                let finalUrl = bestMatch.startsWith('http') ? bestMatch : BASE_URL + (bestMatch.startsWith('/') ? '' : '/') + bestMatch;
                let fRes = await fetch(finalUrl, { headers: WORKING_HEADERS });
                let fHtml = await fRes.text();

                // Kotlin: Regex("scx = (.*?);")
                let scxMatch = fHtml.match(/scx\s*=\s*({.*?});/s);
                if (!scxMatch) return resolve([]);

                let scxData;
                try {
                    scxData = JSON.parse(scxMatch[1]);
                } catch (e) { return resolve([]); }

                let results = [];
                const keys = ["atom", "advid", "proton", "fastly", "tr", "en"];

                keys.forEach(key => {
                    // scxMap.key?.sx?.t yapısını takip ediyoruz
                    let tValue = scxData[key] && scxData[key].sx ? scxData[key].sx.t : null;
                    
                    if (tValue) {
                        // Eğer t bir liste ise (Kotlin is List)
                        if (Array.isArray(tValue)) {
                            tValue.forEach(encLink => {
                                let url = decodeFHDLink(encLink);
                                if (url) results.push({ name: `FHD - ${key.toUpperCase()}`, url: url, quality: "Auto", headers: WORKING_HEADERS });
                            });
                        } 
                        // Eğer t bir obje ise (Kotlin is Map)
                        else if (typeof tValue === 'object') {
                            Object.values(tValue).forEach(encLink => {
                                let url = decodeFHDLink(encLink);
                                if (url) results.push({ name: `FHD - ${key.toUpperCase()}`, url: url, quality: "Auto", headers: WORKING_HEADERS });
                            });
                        }
                    }
                });

                resolve(results);
            })
            .catch(() => resolve([]));
    });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams }; }
