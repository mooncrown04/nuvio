/**
 * FullHDFilmizlesene Nuvio Scraper - v28.5 (Strict Filtering & Error Logging)
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

async function getStreamsFromAPI(vidid, movieTitle) {
    const fetchAtom = async () => {
        try {
            let res = await fetch(API_BASE + '?id=' + vidid + '&type=t&name=atom&get=video&format=json', { headers: WORKING_HEADERS });
            let data = await res.json();
            if (data && data.html) {
                let playerRes = await fetch(data.html.replace(/\\/g, ''), { headers: WORKING_HEADERS });
                let playerHtml = await playerRes.text();
                let avMatch = playerHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    let url = decodeRapidVid(avMatch[1]);
                    if (url) return { 
                        name: movieTitle, 
                        title: "⌜ FULLHDFILM ⌟ | Atom | 🇹🇷 Dublaj", 
                        url: url, 
                        quality: "Auto", 
                        headers: WORKING_HEADERS, 
                        provider: "fullhd_scraper" 
                    };
                }
            }
        } catch (e) { console.error("Atom hatası:", e); }
        return null;
    };

    const fetchTurbo = async () => {
        try {
            let res = await fetch(API_BASE + '?id=' + vidid + '&type=t&name=advid&get=video&pno=tr&format=json', { headers: WORKING_HEADERS });
            let data = await res.json();
            if (data && data.html && data.html.includes('/watch/')) {
                let watchId = data.html.match(/\/watch\/(.*?)"/)[1];
                let playRes = await fetch('https://turbo.imgz.me/play/' + watchId + '?autoplay=true', { headers: Object.assign({}, WORKING_HEADERS, { 'Referer': BASE_URL }) });
                let playHtml = await playRes.text();
                let m3u8 = playHtml.match(/file:\s*"(.*?\.m3u8.*?)"/i);
                if (m3u8) return { 
                    name: movieTitle, 
                    title: "⌜ FULLHDFILM ⌟ | Turbo | 🇹🇷 Dublaj", 
                    url: m3u8[1], 
                    quality: "Auto", 
                    headers: Object.assign({}, WORKING_HEADERS, { 'Referer': 'https://turbo.imgz.me/' }), 
                    provider: "fullhd_scraper" 
                };
            }
        } catch (e) { console.error("Turbo hatası:", e); }
        return null;
    };

    let results = await Promise.all([fetchAtom(), fetchTurbo()]);
    return results.filter(r => r !== null);
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96')
            .then(res => res.json())
            .then(data => {
                const year = data.release_date ? data.release_date.split('-')[0] : "";
                const queryTitle = data.title || data.original_title;
                console.error(`[NUVIO] Aranan: ${queryTitle} (${year})`);

                const searchUrl = BASE_URL + '/arama/' + encodeURIComponent(queryTitle);
                return Promise.all([fetch(searchUrl, { headers: WORKING_HEADERS }), year, queryTitle]);
            })
            .then(async ([res, year, queryTitle]) => {
                let searchHtml = await res.text();
                let $ = cheerio.load(searchHtml);
                let filmLink = "";
                let foundTitle = "";

                $("ul.list li.film").each((i, el) => {
                    let link = $(el).find("a.tt").attr("href");
                    let siteTitle = $(el).find("span.film-title").text().trim();
                    let siteYear = $(el).find("span.film-yil").text().trim();
                    
                    // Sıkı eşleşme kontrolü: Yıl tutmalı ve isim birbirini içermeli
                    const isYearMatch = year === "" || siteYear.includes(year);
                    const isNameMatch = siteTitle.toLowerCase().includes(queryTitle.toLowerCase()) || 
                                      queryTitle.toLowerCase().includes(siteTitle.toLowerCase());

                    if (link && isYearMatch && isNameMatch) {
                        console.error(`[NUVIO] Eşleşti: ${siteTitle} [${siteYear}]`);
                        filmLink = link;
                        foundTitle = siteTitle;
                        return false; 
                    }
                });

                if (!filmLink) {
                    console.error("[NUVIO] Kriterlere uygun film bulunamadı.");
                    return resolve([]);
                }
                
                let finalUrl = filmLink.startsWith('http') ? filmLink : BASE_URL + filmLink;
                let filmRes = await fetch(finalUrl, { headers: WORKING_HEADERS });
                let filmHtml = await filmRes.text();
                
                let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                if (vidMatch) {
                    let streams = await getStreamsFromAPI(vidMatch[1], foundTitle);
                    resolve(streams);
                } else {
                    console.error("[NUVIO] Film sayfasında Video ID bulunamadı.");
                    resolve([]);
                }
            })
            .catch(err => { 
                console.error("[NUVIO] Kritik Hata:", err.message);
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) { 
    module.exports = { getStreams: getStreams }; 
} else { 
    globalThis.getStreams = getStreams; 
}
