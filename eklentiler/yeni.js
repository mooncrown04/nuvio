// NOT: RecTV_v8_Kesin_Dil_Kurali_Guncellemesi
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
    
    // Temel kural: Dublaj geçmiyorsa Orijinaldir
    let info = {
        icon: "🌐", 
        text: "Orijinal / Altyazı",
        quality: "HD"
    };

    // EĞER "Dublaj" kelimesi etiketlerde veya URL'de varsa TÜRKÇE yap
    if (lowLabel.includes("dublaj") || lowUrl.includes("dublaj")) {
        // Ama aynı anda "Altyazı" da geçiyorsa ve bu 2. linkse (index 1), o Altyazılıdır
        if (lowLabel.includes("altyazı") && index === 1) {
            info.icon = "🌐";
            info.text = "Orijinal / Altyazı";
        } else {
            info.icon = "🇹🇷";
            info.text = "Türkçe Dublaj";
        }
    }

    if (lowUrl.includes("1080")) info.quality = "1080p";
    else if (lowUrl.includes("720")) info.quality = "720p";

    return info;
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'movie' ? 'movie' : 'tv'}/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.title || tmdbData.name;

        const authRes = await fetch(BASE_URL + "/api/attest/nonce", { headers: HEADERS });
        const token = (await authRes.text()).trim().replace(/"/g, '');

        const searchHeaders = Object.assign({}, HEADERS, { 'Authorization': 'Bearer ' + token });
        const searchUrl = `${BASE_URL}/api/search/${encodeURIComponent(query)}/${SW_KEY}/`;
        const sRes = await fetch(searchUrl, { headers: searchHeaders });
        const sData = await sRes.json();

        const items = (sData.series || []).concat(sData.posters || []);
        if (items.length === 0) return [];

        const target = items[0];
        let rawSources = [];
        let itemLabel = target.label || ""; 

        if (mediaType === 'tv') {
            const seasonRes = await fetch(`${BASE_URL}/api/season/by/serie/${target.id}/${SW_KEY}/`, { headers: searchHeaders });
            const seasons = await seasonRes.json();
            for (let s of seasons) {
                const sMatch = s.title.match(/\d+/);
                if (sMatch && parseInt(sMatch[0]) == seasonNum) {
                    for (let ep of s.episodes) {
                        const eMatch = ep.title.match(/\d+/);
                        if (eMatch && parseInt(eMatch[0]) == episodeNum) {
                            rawSources = ep.sources || [];
                            if (ep.label) itemLabel = ep.label;
                            break;
                        }
                    }
                }
            }
        } else {
            const detRes = await fetch(`${BASE_URL}/api/movie/${target.id}/${SW_KEY}/`, { headers: searchHeaders });
            const detData = await detRes.json();
            rawSources = detData.sources || [];
            itemLabel = detData.label || itemLabel;
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
