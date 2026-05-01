/**
 * FullHDFilmizlesene Nuvio Scraper - v28.1 (Search & Log Update)
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
            console.error("FullHD-Error: Atom API Hatası - VidID: " + vidid, e.message); 
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
            console.error("FullHD-Error: Turbo API Hatası - VidID: " + vidid, e.message);
        }
        return null;
    };

    let results = await Promise.all([fetchAtom(), fetchTurbo()]);
    return results.filter(r => r !== null);
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        // TMDB'den veri çekme
        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96')
            .then(res => res.json())
            .then(data => {
                if (!data.id) {
                    console.error("FullHD-Error: TMDB Verisi Alınamadı - ID: " + tmdbId);
                    throw new Error("TMDB verisi yok");
                }
                const year = data.release_date ? data.release_date.split('-')[0] : "";
                const movieTitle = data.title || data.original_title;
                // FullHDFilm sitesinde TMDB ID (ttID) ile arama yapmak en sağlıklısıdır
                const ttId = data.imdb_id; 
                const searchUrl = ttId ? `${BASE_URL}/search/${ttId}/` : `${BASE_URL}/arama/${encodeURIComponent(movieTitle)}`;
                
                return Promise.all([fetch(searchUrl, { headers: WORKING_HEADERS }), year, movieTitle]);
            })
            .then(async ([res, year, movieTitle]) => {
                let searchHtml = await res.text();
                let $ = cheerio.load(searchHtml);
                let filmLink = "";
                
                // Güncellenen Seçici: .list altındaki li.film öğeleri
                $("ul.list li.film").each((i, el) => {
                    let link = $(el).find("a.tt").attr("href");
                    let titleText = $(el).find(".film-title").text();
                    
                    // Yıl filtresi: Eğer site yıl bilgisini span.film-yil içinde veriyorsa kontrol et
                    if (link && (year === "" || $(el).text().includes(year))) {
                        filmLink = link; 
                        return false; // Döngüden çık
                    }
                });

                // Eğer li.film bulunamazsa fallback (yedek) link bulma
                if (!filmLink) {
                    filmLink = $("a[href*='/film/']").first().attr("href");
                }

                if (!filmLink) {
                    console.error("FullHD-Error: Film Sayfası Linki Bulunamadı - Başlık: " + movieTitle);
                    throw new Error("Film bulunamadı");
                }
                
                // Film sayfasına git
                let finalFilmUrl = filmLink.startsWith('http') ? filmLink : BASE_URL + filmLink;
                let filmRes = await fetch(finalFilmUrl, { headers: WORKING_HEADERS });
                let filmHtml = await filmRes.text();
                
                // vidid yakalama
                let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                if (vidMatch) {
                    return getStreamsFromAPI(vidMatch[1], movieTitle);
                } else {
                    console.error("FullHD-Error: Film Sayfasında vidid Bulunamadı: " + finalFilmUrl);
                }
                
                return [];
            })
            .then(streams => resolve(streams))
            .catch(err => { 
                console.error("FullHD-Error: Ana İşlem Hatası", err.message);
                resolve([]); 
            });
    });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
else { globalThis.getStreams = getStreams; }
