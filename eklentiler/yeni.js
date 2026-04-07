// NOT: RecTV_v3_Ham_Veri_Oncelikli_Analiz_Sistemi
var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://a.prectv67.lol";
var SW_KEY = "4F5A9C3D9A86FA54EACEDDD635185/c3c5bd17-e37b-4b94-a944-8a3688a30452";

var HEADERS = {
    'User-Agent': 'googleusercontent',
    'Referer': 'https://twitter.com/',
    'Accept': 'application/json'
};

function analyzeStream(url, index, label) {
    const lowUrl = url.toLowerCase();
    const lowLabel = (label || "").toLowerCase();
    
    let info = {
        icon: "🌐", // Varsayılanı 'Orijinal' yaptık ki hata payı azalsın
        text: "Orijinal / Altyazı",
        quality: "HD", 
        extra: index > 0 ? " [Yedek]" : ""
    };

    // 1. ÖNCE ETİKETE (LABEL) BAK: "Dublaj & Altyazı" veya "Türkçe Dublaj" yazıyor mu?
    if (lowLabel.includes("dublaj") || lowLabel.includes("tr")) {
        info.icon = "🇹🇷";
        info.text = "Türkçe Dublaj";
    }

    // 2. URL İÇİNDEKİ GİZLİ İPUÇLARINI KONTROL ET
    if (lowUrl.includes("dublaj") || lowUrl.includes("/tr/")) {
        info.icon = "🇹🇷";
        info.text = "Türkçe Dublaj";
    } else if (lowUrl.includes("altyazi") || lowUrl.includes("sub") || lowUrl.includes("alt/")) {
        info.icon = "🌐"; 
        info.text = "Orijinal / Altyazı";
    }

    // 3. KALİTE ANALİZİ (Loglardaki cdn1611 gibi yüksek sayılar genelde kaliteyi temsil eder)
    if (lowUrl.includes("1080") || lowUrl.includes("cdn1080")) info.quality = "1080p";
    else if (lowUrl.includes("720") || lowUrl.includes("cdn720")) info.quality = "720p";

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
        let sourceLabel = target.label || ""; // API'den gelen ana etiket

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
                sourceLabel = detData.label || sourceLabel;
            }
        }

        return rawSources.map((src, index) => {
            const res = analyzeStream(src.url, index, sourceLabel);
            return {
                name: `RecTV [${res.icon} ${res.text}]${res.extra}`,
                title: `${res.quality} - ${src.type.toUpperCase()}`,
                url: src.url,
                headers: {
                    'User-Agent': 'googleusercontent',
                    'Referer': 'https://twitter.com/'
                }
            };
        });

    } catch (err) { return []; }
}

module.exports = { getStreams };
