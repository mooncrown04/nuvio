var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://a.prectv67.lol";
var SW_KEY = "4F5A9C3D9A86FA54EACEDDD635185/c3c5bd17-e37b-4b94-a944-8a3688a30452";

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://twitter.com/',
    'Accept': 'application/json',
    'Connection': 'keep-alive'
};

// Yardımcı Fonksiyon: Link Analizi (İkonlar ve Kalite)
function analyzeStream(url, index) {
    const lowUrl = url.toLowerCase();
    let info = {
        langIcon: "🇹🇷", 
        langText: "Türkçe Dublaj",
        qualityText: "HD", 
        isYedek: index > 0 ? " [Yedek]" : ""
    };

    // Dil ve Bayrak Ayrımı
    if (lowUrl.includes("altyazi") || lowUrl.includes("sub") || lowUrl.includes("alt/")) {
        info.langIcon = "🌐"; 
        info.langText = "Orijinal / Altyazı";
    }

    // Kalite Etiketi Kontrolü
    if (lowUrl.includes("1080")) info.qualityText = "1080p";
    else if (lowUrl.includes("720")) info.qualityText = "720p";

    return info;
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        console.error("[RecTV] Başlatıldı ID: " + tmdbId);

        // 1. TMDB Verisi Al
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'movie' ? 'movie' : 'tv'}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.title || tmdbData.name;

        if (!query) throw new Error("TMDB isim bulunamadı");

        // 2. Token Al (Nonce)
        const authRes = await fetch(BASE_URL + "/api/attest/nonce", { headers: HEADERS });
        const authText = await authRes.text();
        let token = "";
        try {
            const authJson = JSON.parse(authText);
            token = authJson.accessToken || authText.trim();
        } catch (e) {
            token = authText.trim();
        }

        if (!token || token.length < 5) throw new Error("Token alınamadı");

        // 3. Arama Yap
        const searchHeaders = Object.assign({}, HEADERS, { 'Authorization': 'Bearer ' + token });
        const searchUrl = `${BASE_URL}/api/search/${encodeURIComponent(query)}/${SW_KEY}/`;
        const sRes = await fetch(searchUrl, { headers: searchHeaders });
        const sData = await sRes.json();

        // Tüm sonuçları birleştir (Poster, Seri, Kanal)
        const items = (sData.posters || []).concat(sData.channels || []).concat(sData.series || []);
        if (items.length === 0) throw new Error("İçerik bulunamadı");

        const target = items[0];
        let rawSources = [];

        // 4. Kaynakları Topla (Dizi/Film Ayrımı)
        if (mediaType === 'tv' || target.type === "serie") {
            const seasonRes = await fetch(`${BASE_URL}/api/season/by/serie/${target.id}/${SW_KEY}/`, { headers: searchHeaders });
            const seasons = await seasonRes.json();
            
            for (let s of seasons) {
                let sNum = parseInt(s.title.match(/\d+/) || 0);
                if (sNum == seasonNum) {
                    for (let ep of s.episodes) {
                        let eNum = parseInt(ep.title.match(/\d+/) || 0);
                        if (eNum == episodeNum) {
                            rawSources = ep.sources || [];
                            break;
                        }
                    }
                }
            }
        } else {
            // Film ise doğrudan veya detay sayfasından kaynak al
            rawSources = target.sources || [];
            if (rawSources.length === 0) {
                const detRes = await fetch(`${BASE_URL}/api/movie/${target.id}/${SW_KEY}/`, { headers: searchHeaders });
                const detData = await detRes.json();
                rawSources = detData.sources || [];
            }
        }

        if (rawSources.length === 0) throw new Error("Link listesi boş!");

        // 5. Final Link İşleme
        return rawSources.map((src, index) => {
            const analysis = analyzeStream(src.url, index);
            
            console.error(`[RecTV-Link] Bulundu: ${src.url}`);

            return {
                name: `RecTV [${analysis.langIcon} ${analysis.langText}]${analysis.isYedek}`,
                title: `${analysis.qualityText} - ${src.type.toUpperCase()}`,
                url: src.url,
                quality: analysis.qualityText === "1080p" ? 1080 : (analysis.qualityText === "720p" ? 720 : 0),
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://twitter.com/',
                    'Accept': '*/*',
                    'Origin': 'https://a.prectv67.lol'
                }
            };
        });

    } catch (err) {
        console.error("[RecTV-Hata] " + err.message);
        return []; // Hata anında boş liste döndürerek uygulamanın çökmesini engelle
    }
}

module.exports = { getStreams };
