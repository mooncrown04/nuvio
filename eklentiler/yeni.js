/**
 * FullHDFilmizlesene Nuvio Scraper - v30.0 (Final API Debug)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";
const API_BASE = "https://www.fullhdfilmizlesene.live/ajax/sources"; // Güncel AJAX yolu

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

async function getStreamsFromAPI(vidid, movieTitle) {
    try {
        const params = new URLSearchParams();
        params.append('id', vidid);

        // API'den gelen ham veriyi çekiyoruz
        let response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                ...WORKING_HEADERS,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: params.toString()
        });

        let rawJson = await response.text();
        
        // --- DEBUG: API'DEN GELEN HAM VERİ ---
        console.error("--- RAW API RESPONSE START ---");
        console.error("VidID: " + vidid);
        console.error("JSON Data: " + rawJson);
        console.error("--- RAW API RESPONSE END ---");

        let data = JSON.parse(rawJson);
        let streams = [];

        if (data && data.sources) {
            data.sources.forEach(source => {
                streams.push({
                    name: movieTitle,
                    title: `⌜ FULLHD ⌟ | ${source.label || 'Video'} | 🇹🇷 Dublaj`,
                    url: source.file,
                    quality: source.label || "Auto",
                    headers: { 'Referer': BASE_URL + '/', 'User-Agent': WORKING_HEADERS['User-Agent'] },
                    isDirect: true
                });
            });
        }
        return streams;
    } catch (e) {
        console.error("FullHD-API-Error: " + e.message);
        return [];
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96')
            .then(res => res.json())
            .then(async (data) => {
                const movieTitle = data.title || data.original_title;
                const searchUrl = BASE_URL + '/arama/' + encodeURIComponent(movieTitle);
                
                let res = await fetch(searchUrl, { headers: WORKING_HEADERS });
                let searchHtml = await res.text();
                let $ = cheerio.load(searchHtml);
                let filmLink = "";
                
                // Link yakalama (Senin çalışan mantığın)
                $("a[href*='/film/']").each((i, el) => {
                    let href = $(el).attr("href");
                    if (href && !href.includes('/kategori/') && !href.includes('/arama/')) {
                        filmLink = href; return false;
                    }
                });

                if (!filmLink) throw new Error("Arama sonucunda link bulunamadı");
                
                let targetUrl = filmLink.startsWith('http') ? filmLink : BASE_URL + (filmLink.startsWith('/') ? '' : '/') + filmLink;
                let filmRes = await fetch(targetUrl, { headers: WORKING_HEADERS });
                let filmHtml = await filmRes.text();
                
                let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                if (vidMatch) {
                    console.error("DEBUG: Bulunan vidid -> " + vidMatch[1]);
                    return getStreamsFromAPI(vidMatch[1], movieTitle);
                }
                
                return [];
            })
            .then(streams => resolve(streams))
            .catch(err => { 
                console.error("FullHD-Main-Error: " + err.message);
                resolve([]); 
            });
    });
}

module.exports = { getStreams: getStreams };
