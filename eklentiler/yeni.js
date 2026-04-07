var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://a.prectv67.lol";
var SW_KEY = "4F5A9C3D9A86FA54EACEDDD635185/c3c5bd17-e37b-4b94-a944-8a3688a30452";

var HEADERS = {
    'User-Agent': 'googleusercontent',
    'Referer': 'https://twitter.com/',
    'Accept': 'application/json'
};

function analyzeStream(url, index) {
    const lowUrl = url.toLowerCase();
    let info = {
        icon: "🇹🇷", 
        text: "Türkçe Dublaj",
        quality: "HD", 
        extra: index > 0 ? " [Yedek]" : ""
    };

    // ÖNCE ALTYAZI KONTROLÜ (Senin dediğin "Türkçe Altyazılı" durumunu yakalamak için)
    // Eğer içinde altyazı veya orijinal ibaresi varsa, ne olursa olsun Orijinal Dil sayılır
    if (lowUrl.includes("altyazi") || lowUrl.includes("sub") || lowUrl.includes("original") || lowUrl.includes("altyazili")) {
        info.icon = "🌐"; 
        info.text = "Orijinal / Altyazı";
    } 
    // EĞER DİREKT DUBLAJ YAZIYORSA (Garanti Türkçe)
    else if (lowUrl.includes("dublaj")) {
        info.icon = "🇹🇷";
        info.text = "Türkçe Dublaj";
    }

    // Kalite Ayıklama
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
        } catch (e) {
            token = authText.trim();
        }

        const searchHeaders = Object.assign({}, HEADERS, { 'Authorization': 'Bearer ' + token });
        const searchUrl = `${BASE_URL}/api/search/${encodeURIComponent(query)}/${SW_KEY}/`;
        const sRes = await fetch(searchUrl, { headers: searchHeaders });
        const sData = await sRes.json();

        const items = (sData.posters || []).concat(sData.series || []);
        if (items.length === 0) return [];

        const target = items[0];
        let rawSources = [];

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
            }
        }

        return rawSources.map((src, index) => {
            const res = analyzeStream(src.url, index);
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

    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
