// NOT: RecTV_v5_Smart_Link_Type_Detection_Fix
var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://a.prectv67.lol";
var SW_KEY = "4F5A9C3D9A86FA54EACEDDD635185/c3c5bd17-e37b-4b94-a944-8a3688a30452";

var HEADERS = {
    'User-Agent': 'googleusercontent',
    'Referer': 'https://twitter.com/',
    'Accept': 'application/json'
};

function analyzeStream(url, index, itemLabel) {
    const lowUrl = url.toLowerCase();
    const lowLabel = (itemLabel || "").toLowerCase();
    
    // Varsayılan değerler
    let info = {
        icon: "🇹🇷", 
        text: "Türkçe Dublaj",
        quality: "HD"
    };

    // 1. ÖNCE URL VE LABEL İÇİNDEKİ NET İPUÇLARI
    if (lowUrl.includes("altyazi") || lowUrl.includes("sub") || lowUrl.includes("alt/") || lowUrl.includes("original")) {
        info.icon = "🌐"; 
        info.text = "Orijinal / Altyazı";
    } 
    else if (lowUrl.includes("dublaj") || lowUrl.includes("/tr/")) {
        info.icon = "🇹🇷";
        info.text = "Türkçe Dublaj";
    }
    // 2. EĞER HİÇBİR İPUCU YOKSA VE LABEL "DUBLAJ & ALTYAZI" İSE SIRALAMAYA BAK
    else if (lowLabel.includes("altyazı") && lowLabel.includes("dublaj")) {
        // Genelde: 0. index Dublaj, 1. index Altyazılıdır
        if (index === 1) {
            info.icon = "🌐";
            info.text = "Orijinal / Altyazı";
        } else {
            info.icon = "🇹🇷";
            info.text = "Türkçe Dublaj";
        }
    }
    // 3. ÇOK ÖZEL DURUM: Eğer 2 link var ve hiçbir ibare yoksa, 2. linki altyazı varsayalım
    else if (index === 1 && !lowUrl.includes("dublaj")) {
        info.icon = "🌐";
        info.text = "Orijinal / Altyazı";
    }

    // Kalite Kontrolü
    if (lowUrl.includes("1080")) info.quality = "1080p";
    else if (lowUrl.includes("720")) info.quality = "720p";

    return info;
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'movie' ? 'movie' : 'tv'}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.title || tmdbData.name;

        const authRes = await fetch(BASE_URL + "/api/attest/nonce", { headers: HEADERS });
        const authText = await authRes.text();
        let token = "";
        try {
            const authJson = JSON.parse(authText);
            token = authJson.accessToken || authText.trim();
        } catch (e) { token = authText.trim(); }

        const searchHeaders = Object.assign({}, HEADERS, { 'Authorization': 'Bearer ' + token });
        const searchUrl = `${BASE_URL}/api/search/${encodeURIComponent(query)}/${SW_KEY}/`;
        const sRes = await fetch(searchUrl, { headers: searchHeaders });
        const sData = await sRes.json();

        const items = (sData.posters || []).concat(sData.series || []);
        if (items.length === 0) return [];

        const target = items[0];
        let rawSources = [];
        let itemLabel = target.label || ""; 

        if (mediaType === 'tv' || target.type === "serie") {
            const seasonRes = await fetch(`${BASE_URL}/api/season/by/serie/${target.id}/${SW_KEY}/`, { headers: searchHeaders });
            const seasons = await seasonRes.json();
            for (let s of seasons) {
                if (parseInt(s.title.match(/\d+/) || 0) == seasonNum) {
                    for (let ep of s.episodes) {
                        if (parseInt(ep.title.match(/\d+/) || 0) == episodeNum) {
                            rawSources = ep.sources || [];
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
                title: `${res.quality} - ${src.type.toUpperCase()}`,
                url: src.url,
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
