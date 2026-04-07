var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://a.prectv67.lol";
var SW_KEY = "4F5A9C3D9A86FA54EACEDDD635185/c3c5bd17-e37b-4b94-a944-8a3688a30452";

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://twitter.com/',
    'Accept': 'application/json'
};

var cachedToken = null;

/**
 * URL'den Kalite ve Dil Analizi Yapan Yardımcı Fonksiyon
 */
function analyzeLink(url, type) {
    const lowUrl = (url || "").toLowerCase();
    const lowType = (type || "").toLowerCase();
    
    let info = { lang: "Orijinal 🌐", quality: "HD" };

    // Dil Analizi
    if (lowUrl.includes("tr") || lowUrl.includes("dublaj") || lowUrl.includes("turkce") || lowType.includes("tr")) {
        info.lang = "Türkçe 🇹🇷";
    } else if (lowUrl.includes("en") || lowUrl.includes("english") || lowUrl.includes("sub")) {
        info.lang = "English 🇺🇸";
    }

    // Kalite Analizi
    if (lowUrl.includes("1080")) info.quality = "1080p";
    else if (lowUrl.includes("720")) info.quality = "720p";
    else if (lowUrl.includes("480")) info.quality = "480p";
    else if (lowUrl.includes("m3u8")) info.quality = "Auto";

    return info;
}

async function getAuthToken() {
    if (cachedToken) return cachedToken;
    try {
        const res = await fetch(BASE_URL + "/api/attest/nonce", { headers: HEADERS });
        if (!res.ok) throw new Error("Auth sunucusu yanıt vermedi");
        const text = await res.text();
        try {
            const json = JSON.parse(text);
            cachedToken = json.accessToken || text.trim();
        } catch (e) {
            cachedToken = text.trim();
        }
        return cachedToken;
    } catch (e) {
        console.error("[RecTV Error] Token Hatası:", e.message);
        return null;
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        const isMovie = (mediaType === 'movie');
        const tmdbUrl = `https://api.themoviedb.org/3/${isMovie ? 'movie' : 'tv'}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;

        // 1. TMDB Bilgisi Al (Hata Kontrollü)
        const tmdbRes = await fetch(tmdbUrl);
        if (!tmdbRes.ok) throw new Error("TMDB verisi alınamadı");
        const data = await tmdbRes.json();
        const query = data.title || data.name;
        if (!query) return [];

        // 2. Token Al
        const token = await getAuthToken();
        if (!token) return [];

        const searchHeaders = Object.assign({}, HEADERS, { 'Authorization': 'Bearer ' + token });
        const searchUrl = `${BASE_URL}/api/search/${encodeURIComponent(query)}/${SW_KEY}/`;
        
        // 3. Arama Yap
        const sRes = await fetch(searchUrl, { headers: searchHeaders });
        const sData = await sRes.json();
        const items = (sData.posters || []).concat(sData.channels || []).concat(sData.series || []);
        
        if (items.length === 0) {
            console.log("[RecTV] Sonuç bulunamadı.");
            return [];
        }

        const target = items[0];
        let rawSources = [];

        // 4. Dizi/Film Ayrımı ve Kaynak Çekimi
        if (target.type === "serie" || (target.label && target.label.toLowerCase().includes("dizi"))) {
            const seasonRes = await fetch(`${BASE_URL}/api/season/by/serie/${target.id}/${SW_KEY}/`, { headers: searchHeaders });
            const seasons = await seasonRes.json();
            
            for (let s of seasons) {
                let sMatch = s.title.match(/\d+/);
                if (sMatch && parseInt(sMatch[0]) == seasonNum) {
                    for (let ep of s.episodes) {
                        let eMatch = ep.title.match(/\d+/);
                        if (eMatch && parseInt(eMatch[0]) == episodeNum) {
                            rawSources = ep.sources || [];
                            break;
                        }
                    }
                }
            }
        } else {
            rawSources = target.sources || [];
        }

        // 5. Veri Analizi ve Link Oluşturma
        return rawSources.map(src => {
            const analysis = analyzeLink(src.url, src.type);
            return {
                name: `RecTV [${analysis.lang}]`,
                title: `${query} - ${analysis.quality} (${src.type.toUpperCase()})`,
                url: src.url,
                quality: analysis.quality,
                headers: {
                    'User-Agent': 'googleusercontent',
                    'Referer': 'https://twitter.com/'
                }
            };
        });

    } catch (err) {
        console.error("[RecTV Kritik Hata]:", err.message);
        return []; // Hata durumunda boş dön, uygulama kapanmasın
    }
}

module.exports = { getStreams };
