/**
 * RecTV_v19_Final_Fix
 * Dizi mantığı korundu, Film eşleşmesi ve Yerli etiketi eklendi.
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://a.prectv70.lol";
var SW_KEY = "4F5A9C3D9A86FA54EACEDDD635185/c3c5bd17-e37b-4b94-a944-8a3688a30452";

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Referer': 'https://twitter.com/',
    'Accept': 'application/json'
};

var cachedToken = null;

async function getAuthToken() {
    if (cachedToken) return cachedToken;
    try {
        const res = await fetch(BASE_URL + "/api/attest/nonce", { headers: HEADERS });
        const text = await res.text();
        try {
            const json = JSON.parse(text);
            cachedToken = json.accessToken || text.trim();
        } catch (e) { cachedToken = text.trim(); }
        return cachedToken;
    } catch (e) { return null; }
}

function analyzeStream(url, index, itemLabel) {
    const lowUrl = url.toLowerCase();
    const lowLabel = (itemLabel || "").toLowerCase();
    let info = { icon: "🌐", text: "Altyazı" };

    // Yerli ve Dublaj desteği
    const isTurkish = 
        lowLabel.includes("dublaj") || 
        lowLabel.includes("yerli") || 
        lowLabel.includes("tr dub") || 
        lowLabel.includes("türkçe") ||
        lowUrl.includes("dublaj") || 
        lowUrl.includes("/tr/");

    if (isTurkish) {
        if (lowLabel.includes("altyazı") && index === 1) {
            info.icon = "🌐";
            info.text = "Altyazı";
        } else {
            info.icon = "🇹🇷";
            info.text = "Dublaj";
        }
    }
    return info;
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        const isMovie = (mediaType === 'movie');
        const tmdbUrl = `https://api.themoviedb.org/3/${isMovie ? 'movie' : 'tv'}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        
        const trTitle = (tmdbData.title || tmdbData.name || "").trim();
        const orgTitle = (tmdbData.original_title || tmdbData.original_name || "").trim();
        
        if (!trTitle) return [];

        const token = await getAuthToken();
        const searchHeaders = Object.assign({}, HEADERS, { 'Authorization': 'Bearer ' + token });
        
        let searchQueries = [trTitle];
        if (isMovie && orgTitle && orgTitle !== trTitle) searchQueries.push(orgTitle);

        let allItems = [];
        for (let q of searchQueries) {
            const searchUrl = `${BASE_URL}/api/search/${encodeURIComponent(q)}/${SW_KEY}/`;
            const sRes = await fetch(searchUrl, { headers: searchHeaders });
            const sData = await sRes.json();
            const found = (sData.series || []).concat(sData.posters || []);
            if (found.length > 0) {
                allItems = allItems.concat(found);
                if (isMovie) break; 
            }
        }

        let finalResults = [];
        const searchTitleLower = trTitle.toLowerCase().trim();
        const orgTitleLower = orgTitle.toLowerCase().trim();

        for (let target of allItems) {
            const targetTitleLower = target.title.toLowerCase().trim();
            
            // --- FİLTRE MANTIKLARI ---
            let isMatch = false;

            if (isMovie) {
                // Film ise: Tam eşleşme veya kelime bazlı kontrol (Yol/Uzay Yolu ayrımı için)
                if (targetTitleLower === searchTitleLower || targetTitleLower === orgTitleLower) {
                    isMatch = true;
                } else if (searchTitleLower.length > 3) {
                    isMatch = targetTitleLower.includes(searchTitleLower) || targetTitleLower.includes(orgTitleLower);
                }
            } else {
                // Dizi ise: Eskisi gibi esnek bırakıldı (From vb. için)
                if (searchTitleLower === "from") {
                    isMatch = (targetTitleLower === "from" || targetTitleLower === "from dizi");
                } else {
                    isMatch = targetTitleLower.includes(searchTitleLower) || targetTitleLower.includes(orgTitleLower);
                }
            }

            if (!isMatch) continue;

            const isActuallySerie = target.type === "serie" || (target.label && target.label.toLowerCase().includes("dizi"));
            if (isMovie && isActuallySerie) continue;
            if (!isMovie && !isActuallySerie) continue;

            if (isActuallySerie) {
                // Dizi Mantığı (Eskisi gibi)
                const seasonRes = await fetch(`${BASE_URL}/api/season/by/serie/${target.id}/${SW_KEY}/`, { headers: searchHeaders });
                const seasons = await seasonRes.json();
                for (let s of seasons) {
                    let sNumber = parseInt(s.title.match(/\d+/) || 0);
                    if (sNumber == seasonNum) {
                        for (let ep of s.episodes) {
                            let epNumber = parseInt(ep.title.match(/\d+/) || 0);
                            if (epNumber == episodeNum) {
                                (ep.sources || []).forEach((src, idx) => {
                                    const streamInfo = analyzeStream(src.url, idx, ep.label || s.title || target.label);
                                    finalResults.push({
                                        name: trTitle, 
                                        title: `⌜ RECTV ⌟ | Kaynak ${idx + 1} | ${streamInfo.icon} ${streamInfo.text}`,
                                        url: src.url,
                                        quality: "Auto",
                                        headers: { 'User-Agent': 'googleusercontent', 'Referer': 'https://twitter.com/', 'Accept-Encoding': 'identity' }
                                    });
                                });
                            }
                        }
                    }
                }
            } else {
                // Film Mantığı
                let movieSources = target.sources || [];
                if (!movieSources || movieSources.length === 0) {
                    const detRes = await fetch(`${BASE_URL}/api/movie/${target.id}/${SW_KEY}/`, { headers: searchHeaders });
                    const detData = await detRes.json();
                    movieSources = detData.sources || [];
                }
                
                movieSources.forEach((src, idx) => {
                    const streamInfo = analyzeStream(src.url, idx, target.label);
                    finalResults.push({
                        name: trTitle,
                        title: `⌜ RECTV ⌟ | Kaynak ${idx + 1} | ${streamInfo.icon} ${streamInfo.text}`,
                        url: src.url,
                        quality: "Auto",
                        headers: { 'User-Agent': 'googleusercontent', 'Referer': 'https://twitter.com/', 'Accept-Encoding': 'identity' }
                    });
                });
            }
        }

        return finalResults.filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);

    } catch (err) { 
        return []; 
    }
}

module.exports = { getStreams };
