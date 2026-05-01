/**
 * FullHDFilmizlesene Nuvio Scraper - v28.4 (Debug & Full HTML Log)
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

// ... (universalAtob ve decodeRapidVid fonksiyonları aynı kalıyor)

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
        } catch (e) {
            console.error("FullHD-API-Error (Atom): " + e.message);
        }
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
        } catch (e) {
            console.error("FullHD-API-Error (Turbo): " + e.message);
        }
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
                const movieTitle = data.title || data.original_title;
                // ttID varsa onunla arama yapmak her zaman daha garantidir
                const searchUrl = data.imdb_id ? `${BASE_URL}/search/${data.imdb_id}/` : `${BASE_URL}/arama/${encodeURIComponent(movieTitle)}`;
                return Promise.all([fetch(searchUrl, { headers: WORKING_HEADERS }), year, movieTitle]);
            })
            .then(async ([res, year, movieTitle]) => {
                let searchHtml = await res.text();
                
                // --- DEBUG: Arama sayfasından gelen ham veriyi logla ---
                console.error("FullHD-Debug: Arama Sayfası HTML Başlangıcı: " + searchHtml.substring(0, 1000));
                
                let $ = cheerio.load(searchHtml);
                let filmLink = "";
                
                // Mevcut seçicilerinle tarama yapılıyor[cite: 1]
                $("ul.list li, .film-listesi li").each((i, el) => {
                    let link = $(el).find("a").attr("href");
                    if (link && (year === "" || $(el).text().includes(year))) {
                        filmLink = link; return false;
                    }
                });

                if (!filmLink) {
                    filmLink = $("a[href*='/film/']").first().attr("href");
                }

                if (!filmLink) {
                    // --- HATA: Link bulunamazsa tüm sayfayı logla ---
                    console.error("FullHD-Fatal: Film Linki Bulunamadı! Gelen HTML: " + searchHtml);
                    throw new Error("Film bulunamadı");
                }
                
                let targetUrl = filmLink.startsWith('http') ? filmLink : BASE_URL + (filmLink.startsWith('/') ? '' : '/') + filmLink;
                let filmRes = await fetch(targetUrl, { headers: WORKING_HEADERS });
                let filmHtml = await filmRes.text();
                
                // --- DEBUG: Film sayfasının ham verisini logla ---
                console.error("FullHD-Debug: Film Sayfası (" + targetUrl + ") HTML Özeti: " + filmHtml.substring(0, 1000));
                
                let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                if (vidMatch) {
                    return getStreamsFromAPI(vidMatch[1], movieTitle);
                } else {
                    // --- HATA: vidid bulunamazsa film sayfasını logla ---
                    console.error("FullHD-Fatal: vidid Bulunamadı! Film Sayfası HTML: " + filmHtml);
                }
                
                return [];
            })
            .then(streams => resolve(streams))
            .catch(err => { 
                console.error("FullHD-Process-Error: " + err.message);
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
else { globalThis.getStreams = getStreams; }
