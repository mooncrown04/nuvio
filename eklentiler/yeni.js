/**
 * FullHDFilmizlesene Nuvio Scraper - v32.0
 * Her adım console.error ile loglanmıştır.
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

// --- Yardımcı Fonksiyonlar ---
function universalAtob(str) {
    try {
        if (typeof atob === 'function') return atob(str);
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var out = ''; str = String(str).replace(/[=]+$/, '');
        for (var bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? out += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
            buffer = chars.indexOf(buffer);
        }
        return out;
    } catch (e) { 
        console.error("[ATOB-HATA] Decode başarısız: " + e.message);
        return null; 
    }
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
    } catch (e) { 
        console.error("[DECODE-HATA] RapidVid çözülemedi: " + e.message);
        return null; 
    }
}

// --- Kaynak Çekme ---
async function getStreamsFromAPI(vidid, movieTitle) {
    console.error(`[API-DEBUG] Kaynaklar aranıyor ID: ${vidid}`);
    
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
                    if (url) return { name: "Atom", title: `${movieTitle} (TR Dublaj)`, url: url, quality: "Auto", headers: WORKING_HEADERS, provider: "FullHD" };
                }
            }
        } catch (e) { console.error("[ATOM-HATA] " + e.message); }
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
                if (m3u8) return { name: "Turbo", title: `${movieTitle} (TR Dublaj)`, url: m3u8[1], quality: "Auto", headers: Object.assign({}, WORKING_HEADERS, { 'Referer': 'https://turbo.imgz.me/' }), provider: "FullHD" };
            }
        } catch (e) { console.error("[TURBO-HATA] " + e.message); }
        return null;
    };

    let results = await Promise.all([fetchAtom(), fetchTurbo()]);
    let filtered = results.filter(r => r !== null);
    console.error(`[API-DEBUG] Bulunan kaynak sayısı: ${filtered.length}`);
    return filtered;
}

// --- Ana Fonksiyon ---
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        console.error(`[GIRIS] TMDB: ${tmdbId} | Tip: ${mediaType}`);
        
        if (mediaType !== 'movie') {
            console.error("[HATA] Sadece film desteği var.");
            return resolve([]);
        }

        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&append_to_response=external_ids&language=tr-TR`)
            .then(res => res.json())
            .then(data => {
                const ttId = data.external_ids ? data.external_ids.imdb_id : null;
                const movieTitle = data.title || data.original_title;
                if (!ttId) throw new Error("TMDB'den IMDb ID alınamadı!");

                console.error(`[TMDB-OK] ttID: ${ttId} | Baslik: ${movieTitle}`);
                const searchUrl = `${BASE_URL}/arama/${ttId}`;
                return Promise.all([fetch(searchUrl, { headers: WORKING_HEADERS }), movieTitle]);
            })
            .then(async ([res, movieTitle]) => {
                console.error(`[SITE-ARAMA] Status: ${res.status}`);
                let searchHtml = await res.text();
                let $ = cheerio.load(searchHtml);
                let results = [];

                $(".film-listesi li").each((i, el) => {
                    let link = $(el).find("a").attr("href");
                    let text = $(el).text().toLowerCase();
                    if (link) {
                        console.error(`[SONUC-${i}] Metin: ${text.substring(0,30)} | Link: ${link}`);
                        results.push({ link: link, isDublaj: text.includes("dublaj") });
                    }
                });

                if (results.length === 0) throw new Error("Sitede arama sonucu BOS dondu!");

                let selected = results.find(r => r.isDublaj) || results[0];
                console.error(`[SECIM] Dublaj mi: ${selected.isDublaj} | Link: ${selected.link}`);

                let filmRes = await fetch(selected.link.startsWith('http') ? selected.link : BASE_URL + selected.link, { headers: WORKING_HEADERS });
                let filmHtml = await filmRes.text();
                let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);

                if (!vidMatch) throw new Error("Film sayfasinda vidid bulunamadi!");
                
                console.error(`[VIDID-OK] ID: ${vidMatch[1]}`);
                return getStreamsFromAPI(vidMatch[1], movieTitle);
            })
            .then(streams => resolve(streams))
            .catch(err => { 
                console.error(`[KRITIK-HATA] ${err.message}`); 
                resolve([]); 
            });
    });
}

// Nuvio Export
if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
else { globalThis.getStreams = getStreams; }
