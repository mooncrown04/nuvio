/**
 * FullHDFilmizlesene Nuvio Scraper - v31.0 (Clean Metadata)
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

// --- Yardımcı Fonksiyonlar (Aynı Kalıyor) ---
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

// --- API'den Link Çekme ve Kart Yapılandırma ---
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
                        name: "Atom", // Kartın sol/üst kısmında görünecek kısa isim
                        title: `${movieTitle} (TR Dublaj)`, // Detaylı açıklama
                        url: url, 
                        quality: "Auto", 
                        headers: WORKING_HEADERS, 
                        provider: "FullHD" 
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
                    name: "Turbo", 
                    title: `${movieTitle} (TR Dublaj)`, 
                    url: m3u8[1], 
                    quality: "Auto", 
                    headers: Object.assign({}, WORKING_HEADERS, { 'Referer': 'https://turbo.imgz.me/' }), 
                    provider: "FullHD" 
                };
            }
        } catch (e) { }
        return null;
    };

    let results = await Promise.all([fetchAtom(), fetchTurbo()]);
    return results.filter(r => r !== null);
}

// --- Ana Fonksiyon (ttID ve Dublaj Kontrollü) ---
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&append_to_response=external_ids&language=tr-TR`)
            .then(res => res.json())
            .then(data => {
                const ttId = data.external_ids ? data.external_ids.imdb_id : null;
                const movieTitle = data.title || data.original_title;
                if (!ttId) throw new Error("IMDb ID Yok");

                return Promise.all([fetch(`${BASE_URL}/arama/${ttId}`, { headers: WORKING_HEADERS }), movieTitle]);
            })
            .then(async ([res, movieTitle]) => {
                let searchHtml = await res.text();
                let $ = cheerio.load(searchHtml);
                let results = [];

                $(".film-listesi li").each((i, el) => {
                    let link = $(el).find("a").attr("href");
                    let text = $(el).text().toLowerCase();
                    if (link) results.push({ link: link, isDublaj: text.includes("dublaj") });
                });

                // Önce Dublajlıyı seç, yoksa ilk sonucu al
                let selected = results.find(r => r.isDublaj) || results[0];
                if (!selected) throw new Error("Film bulunamadı");

                let filmRes = await fetch(selected.link.startsWith('http') ? selected.link : BASE_URL + selected.link, { headers: WORKING_HEADERS });
                let filmHtml = await filmRes.text();
                let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);

                if (vidMatch) return getStreamsFromAPI(vidMatch[1], movieTitle);
                return [];
            })
            .then(streams => resolve(streams))
            .catch(err => { 
                console.error(`[NUVIO-ERROR] ${err.message}`);
                resolve([]); 
            });
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) { 
    module.exports = { getStreams: getStreams }; 
} else { 
    globalThis.getStreams = getStreams; 
}
