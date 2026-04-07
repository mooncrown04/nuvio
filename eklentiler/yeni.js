var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://a.prectv67.lol";
var SW_KEY = "4F5A9C3D9A86FA54EACEDDD635185/c3c5bd17-e37b-4b94-a944-8a3688a30452";

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Referer': 'https://twitter.com/',
    'Accept': 'application/json'
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        console.error("[RecTV-Sorgu] Başladı -> ID: " + tmdbId + " | Tip: " + mediaType);

        // 1. TMDB Bilgisi Çek
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'movie' ? 'movie' : 'tv'}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.title || tmdbData.name;

        if (!query) {
            console.error("[RecTV-Hata] TMDB'den isim gelmedi!");
            return [];
        }

        // 2. Token Al ve Logla
        const authRes = await fetch(BASE_URL + "/api/attest/nonce", { headers: HEADERS });
        const authText = await authRes.text();
        let token = "";
        try {
            const authJson = JSON.parse(authText);
            token = authJson.accessToken || authText.trim();
        } catch (e) {
            token = authText.trim();
        }
        
        console.error("[RecTV-Token] Gelen Token: " + token.substring(0, 15) + "...");

        // 3. Arama Yap
        const searchHeaders = Object.assign({}, HEADERS, { 'Authorization': 'Bearer ' + token });
        const searchUrl = `${BASE_URL}/api/search/${encodeURIComponent(query)}/${SW_KEY}/`;
        const sRes = await fetch(searchUrl, { headers: searchHeaders });
        const sData = await sRes.json();

        console.error("[RecTV-Arama] Ham Arama Verisi: " + JSON.stringify(sData).substring(0, 300));

        const items = (sData.posters || []).concat(sData.channels || []).concat(sData.series || []);
        if (items.length === 0) {
            console.error("[RecTV-Hata] Arama sonucu boş döndü!");
            return [];
        }

        const target = items[0];
        let rawSources = [];

        // 4. İçerik Kaynaklarını Topla
        if (mediaType === 'tv' || target.type === "serie") {
            console.error("[RecTV-Dizi] Sezon/Bölüm aranıyor: S" + seasonNum + " E" + episodeNum);
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
            rawSources = target.sources || [];
            if (rawSources.length === 0) {
                const detRes = await fetch(`${BASE_URL}/api/movie/${target.id}/${SW_KEY}/`, { headers: searchHeaders });
                const detData = await detRes.json();
                rawSources = detData.sources || [];
            }
        }

        // 5. LİNK ANALİZİ VE CONSOLE.ERROR ÇIKTILARI
        if (rawSources.length === 0) {
            console.error("[RecTV-Hata] LİNK LİSTESİ BOŞ!");
            return [];
        }

        return rawSources.map((src, index) => {
            // BURASI KRİTİK: Her linki tek tek analiz ediyoruz
            console.error("--- LİNK #" + (index + 1) + " ANALİZİ ---");
            console.error("TİP: " + src.type);
            console.error("HAM LİNK: " + src.url);
            
            const isTR = src.url.toLowerCase().includes("tr") || src.url.toLowerCase().includes("dublaj");
            const quality = src.url.includes("1080") ? "1080p" : (src.url.includes("720") ? "720p" : "HD");

            return {
                name: `RecTV [${isTR ? 'TR' : 'EN'}]`,
                title: `${quality} - ${src.type.toUpperCase()}`,
                url: src.url,
                quality: quality,
                headers: {
                    'User-Agent': 'googleusercontent',
                    'Referer': 'https://twitter.com/'
                }
            };
        });

    } catch (err) {
        console.error("[RecTV-Fatal] KRİTİK HATA: " + err.message);
        console.error("[RecTV-Stack] " + err.stack);
        return [{ name: "⚠️ Hata Oluştu", title: err.message, url: "", quality: "" }];
    }
}

module.exports = { getStreams };
