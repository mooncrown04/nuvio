/**
 * RecTV_v18_Final_Fix
 * UI Standartlaştırması, Auto Kalite ve Gelişmiş Eşleşme Algoritması
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
    
    // Varsayılan olarak Altyazı ayarla
    let info = { icon: "🌐", text: "Altyazı" };

    // Türkçe Ses (Dublaj veya Yerli) tespiti için genişletilmiş liste
    const isTurkish = 
        lowLabel.includes("dublaj") || 
        lowLabel.includes("yerli") || 
        lowLabel.includes("tr dub") || 
        lowLabel.includes("türkçe") ||
        lowUrl.includes("dublaj") || 
        lowUrl.includes("/tr/") ||
        lowUrl.includes("-tr-"); // Bazı URL yapılarında dil bu şekilde belirtilir

    if (isTurkish) {
        // Dual (Çift Dil) kaynak kontrolü: 
        // Eğer etikette hem altyazı hem dublaj/yerli geçiyorsa ve bu 2. kaynaksa altyazı kabul et
        if ((lowLabel.includes("altyazı") || lowLabel.includes("sub")) && index === 1) {
            info.icon = "🌐";
            info.text = "Altyazı";
        } else {
            info.icon = "🇹🇷";
            info.text = "Dublaj"; // "Yerli" olsa bile kullanıcıya "Dublaj/TR" ikonu göstermek daha standarttır
        }
    } 
    // Sadece Altyazı ibaresi varsa (veya sub/altyazi geçiyorsa)
    else if (lowLabel.includes("altyazı") || lowLabel.includes("sub") || lowUrl.includes("altyazi")) {
        info.icon = "🌐";
        info.text = "Altyazı";
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
        
        // Temizleme fonksiyonu: Özel karakterleri boşluğa çevirir ve küçük harfe yapar
        const cleanStr = (str) => str.toLowerCase().replace(/[:\-()]/g, ' ').replace(/\s+/g, ' ').trim();

        const sTitleClean = cleanStr(trTitle);
        const oTitleClean = cleanStr(orgTitle);

        for (let target of allItems) {
            const tTitleClean = cleanStr(target.title);
            
            // --- GELİŞMİŞ EŞLEŞME FİLTRESİ ---
            let isMatch = false;

            // 1. Tam Eşleşme Kontrolü
            if (tTitleClean === sTitleClean || tTitleClean === oTitleClean) {
                isMatch = true;
            } 
            // 2. Kelime Bazlı Sınır Kontrolü (Regex \b kullanımı)
            else {
                const checkExactWord = (query, target) => {
                    if (!query || query.length === 0) return false;
                    // Kelimeyi tam bir öbek olarak arar (Örn: "Yol"u bulur, "Yolcu"yu bulmaz)
                    const regex = new RegExp(`(^|\\s)${query}(\\s|$)`, 'i');
                    return regex.test(target);
                };

                // Kısa kelimelerde (3 harf ve altı: "Yol", "Sis", "It") çok daha katı davran
                if (sTitleClean.length <= 3) {
                    isMatch = (tTitleClean === sTitleClean || tTitleClean === sTitleClean + " dizi");
                } else {
                    // Uzun kelimelerde hedef başlığın içinde tam öbek olarak geçiyor mu bak
                    isMatch = checkExactWord(sTitleClean, tTitleClean) || checkExactWord(oTitleClean, tTitleClean);
                }
            }

            if (!isMatch) continue;

            // Tür Kontrolü
            const isActuallySerie = target.type === "serie" || (target.label && target.label.toLowerCase().includes("dizi"));
            if (isMovie && isActuallySerie) continue;
            if (!isMovie && !isActuallySerie) continue;

            if (isActuallySerie) {
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

        // URL Tekilleştirme
        return finalResults.filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);

    } catch (err) { 
        return []; 
    }
}

module.exports = { getStreams };
