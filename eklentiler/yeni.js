/**
 * FullHDFilmizlesene Nuvio Scraper - IMDb ID (ttID) Uyumlu v28 Modifikasyonu
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

// --- UniversalAtob ve DecodeRapidVid Fonksiyonları (Dokunulmadı) ---
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

// --- Kaynak Çekme Mantığı (v28 ile aynı, sadece isimlendirme güncellendi) ---
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
        } catch (e) { console.error("[DEBUG] Atom Hatası: " + e.message); }
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
        } catch (e) { console.error("[DEBUG] Turbo Hatası: " + e.message); }
        return null;
    };

    let results = await Promise.all([fetchAtom(), fetchTurbo()]);
    return results.filter(r => r !== null);
}

// --- Arama ve Eşleşme Mantığı ---
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        // TMDB'den external_ids ile IMDb ID'yi (ttID) çekiyoruz
        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&append_to_response=external_ids&language=tr-TR')
            .then(res => res.json())
            .then(async (data) => {
                const movieTitle = data.title || data.original_title;
                const ttId = data.external_ids ? data.external_ids.imdb_id : null;
                
                // Arama sorgusu önceliği: ttID (yoksa film ismi)
                const query = ttId ? ttId : movieTitle;
                const searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
                
                console.error(`[BASLADI] Film: ${movieTitle} | ID: ${query}`);
                console.error(`[SITE-ARAMA] URL: ${searchUrl}`);

                let res = await fetch(searchUrl, { headers: WORKING_HEADERS });
                let searchHtml = await res.text();
                let $ = cheerio.load(searchHtml);
                
                let filmLink = "";
                // Sitenin arama sonuç listesini tara
                $(".film-listesi li").each((i, el) => {
                    let link = $(el).find("a").attr("href");
                    if (link) {
                        filmLink = link;
                        return false; // ttID araması nokta atışı olduğu için ilk sonucu alıyoruz
                    }
                });

                if (!filmLink) {
                   console.error("[KRITIK-HATA] Sitede hicbir sonuc bulunamadi.");
                   throw new Error("Film bulunamadı");
                }

                console.error(`[BULUNDU] Sayfa: ${filmLink}`);
                
                let filmRes = await fetch(filmLink.startsWith('http') ? filmLink : BASE_URL + filmLink, { headers: WORKING_HEADERS });
                let filmHtml = await filmRes.text();
                
                let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                if (vidMatch) {
                    console.error(`[VIDEO-ID] ID: ${vidMatch[1]}`);
                    return getStreamsFromAPI(vidMatch[1], movieTitle);
                }
                
                return [];
            })
            .then(streams => resolve(streams))
            .catch(err => { 
                console.error("[HATA] " + err.message);
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
else { globalThis.getStreams = getStreams; }
