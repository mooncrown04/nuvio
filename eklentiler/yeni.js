// NOT: RecTV_v10_Dizi_Coklu_Link_ve_Kesin_Dil_Kurali
var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://a.prectv67.lol";
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
    
    let info = {
        icon: "🌐", 
        text: "Orijinal / Altyazı"
    };

    // KESİN KURAL: Dublaj kelimesi geçiyorsa Türkçedir.
    // Eğer "Dublaj & Altyazı" ise; 1. link (0) Dublaj, 2. link (1) Altyazıdır.
    if (lowLabel.includes("dublaj") || lowUrl.includes("dublaj")) {
        if (lowLabel.includes("altyazı") && index === 1) {
            info.icon = "🌐";
            info.text = "Orijinal / Altyazı";
        } else {
            info.icon = "🇹🇷";
            info.text = "Türkçe Dublaj";
        }
    }
    return info;
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        const isMovie = (mediaType === 'movie');
        const tmdbUrl = `https://api.themoviedb.org/3/${isMovie ? 'movie' : 'tv'}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
        const tmdbRes = await fetch(tmdbUrl);
        const data = await tmdbRes.json();
        const query = data.title || data.name;
        if (!query) return [];

        const token = await getAuthToken();
        const searchHeaders = Object.assign({}, HEADERS, { 'Authorization': 'Bearer ' + token });
        const searchUrl = `${BASE_URL}/api/search/${encodeURIComponent(query)}/${SW_KEY}/`;
        
        const sRes = await fetch(searchUrl, { headers: searchHeaders });
        const sData = await sRes.json();
        const items = (sData.series || []).concat(sData.posters || []);
        if (items.length === 0) return [];

        const target = items[0];
        let rawSources = [];
        let itemLabel = target.label || "";

        if (target.type === "serie" || (!isMovie && target.label && target.label.toLowerCase().includes("dizi"))) {
            const seasonRes = await fetch(`${BASE_URL}/api/season/by/serie/${target.id}/${SW_KEY}/`, { headers: searchHeaders });
            const seasons = await seasonRes.json();
            
            for (let s of seasons) {
                let sNumber = parseInt(s.title.match(/\d+/) || 0);
                if (sNumber == seasonNum) {
                    for (let ep of s.episodes) {
                        let epNumber = parseInt(ep.title.match(/\d+/) || 0);
                        if (epNumber == episodeNum) {
                            // Kotlin kodundaki .first() hatasını yapmıyoruz, TÜM kaynakları alıyoruz
                            rawSources = ep.sources || [];
                            if (ep.label) itemLabel = ep.label;
                            break;
                        }
                    }
                }
            }
        } else {
            rawSources = target.sources || [];
            if (rawSources.length === 0) {
                const detRes = await fetch(`${BASE_URL}/api/movie/${target.id}/${SW_KEY}/`, { headers: searchHeaders });
                const detData = await detRes.json();
                rawSources = detData.sources || [];
                itemLabel = detData.label || itemLabel;
            }
        }

        return rawSources.map((src, index) => {
            const res = analyzeStream(src.url, index, itemLabel);
            return {
                name: `RecTV [${res.icon} ${res.text}]`,
                url: src.url,
                quality: "Auto",
                headers: {
                    'User-Agent': 'googleusercontent',
                    'Referer': 'https://twitter.com/',
                    'Accept-Encoding': 'identity'
                }
            };
        });

    } catch (err) { return []; }
}

module.exports = { getStreams };
