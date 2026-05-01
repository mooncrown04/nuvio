/**
 * FullHDFilmizlesene Nuvio Scraper - v33.0 (No-Log Debugging)
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

async function getStreamsFromAPI(vidid, movieTitle, debugMsg) {
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
                        title: `⌜ FULLHDFILM ⌟ | Atom | ${debugMsg}`, 
                        url: url, 
                        quality: "Auto", 
                        headers: WORKING_HEADERS, 
                        provider: "fullhd_scraper" 
                    };
                }
            }
        } catch (e) { }
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
                    title: `⌜ FULLHDFILM ⌟ | Turbo | ${debugMsg}`, 
                    url: m3u8[1], 
                    quality: "Auto", 
                    headers: Object.assign({}, WORKING_HEADERS, { 'Referer': 'https://turbo.imgz.me/' }), 
                    provider: "fullhd_scraper" 
                };
            }
        } catch (e) { }
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
                const movieTitleTr = data.title || "";
                const movieTitleEn = data.original_title || "";
                const query = movieTitleTr || movieTitleEn;
                const searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
                
                return Promise.all([fetch(searchUrl, { headers: WORKING_HEADERS }), year, movieTitleTr, movieTitleEn]);
            })
            .then(async ([res, year, movieTitleTr, movieTitleEn]) => {
                let searchHtml = await res.text();
                let $ = cheerio.load(searchHtml);
                let candidates = [];

                $(".film-listesi li").each((i, el) => {
                    let link = $(el).find("a").attr("href");
                    let itemText = $(el).text().toLowerCase();
                    let score = 0;

                    if (!link) return;

                    // Yıl ve isim kontrolü
                    if (year && itemText.includes(year)) score += 150;
                    if (movieTitleTr && itemText.includes(movieTitleTr.toLowerCase())) score += 50;
                    if (movieTitleEn && itemText.includes(movieTitleEn.toLowerCase())) score += 50;

                    candidates.push({ link, score, title: itemText });
                });

                candidates.sort((a, b) => b.score - a.score);
                
                let best = candidates[0];
                if (!best || best.score < 50) {
                   // Hiç uygun eşleşme yoksa hatayı title olarak döndür
                   return resolve([{ name: movieTitleTr, title: "HATA: Uygun film bulunamadı", url: "", provider: "error" }]);
                }

                // Debug bilgisini title'a ekle[cite: 1]
                let debugLabel = `Puan:${best.score} | Yıl:${year}`;
                
                let filmRes = await fetch(best.link.startsWith('http') ? best.link : BASE_URL + best.link, { headers: WORKING_HEADERS });
                let filmHtml = await filmRes.text();
                
                let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                if (vidMatch) return getStreamsFromAPI(vidMatch[1], movieTitleTr || movieTitleEn, debugLabel);
                
                return resolve([{ name: movieTitleTr, title: "HATA: Sayfada Video ID Yok", url: "", provider: "error" }]);
            })
            .then(streams => resolve(streams))
            .catch(err => { 
                resolve([{ name: "Sistem Hatası", title: err.message, url: "", provider: "error" }]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) { 
    module.exports = { getStreams: getStreams }; 
} else { 
    globalThis.getStreams = getStreams; 
}
