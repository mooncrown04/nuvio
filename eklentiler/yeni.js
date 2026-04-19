/**
 * SineWix_v28_Nuvio_Diagnostic
 * Nuvio standartlarına göre veri zinciri analizi ve tam loglama.
 */

var API_BASE = 'https://ydfvfdizipanel.ru/public/api';
var API_KEY = '9iQNC5HQwPlaFuJDkhncJ5XTJ8feGXOJatAA';

var API_HEADERS = {
    'hash256': '711bff4afeb47f07ab08a0b07e85d3835e739295e8a6361db77eebd93d96306b',
    'User-Agent': 'EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)',
    'Accept': 'application/json',
    'X-Requested-With': 'com.easyplex.official'
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    // Nuvio Standardı: Başlangıç logu
    console.error("[SineWix ANALIZ] İşlem tetiklendi. TMDB_ID: " + tmdbId);

    try {
        const tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        const tmdbUrl = "https://api.themoviedb.org/3/" + tmdbType + "/" + tmdbId + "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96";
        
        const tmdbRes = await fetch(tmdbUrl);
        const data = await tmdbRes.json();
        
        // Veri Zinciri Kontrolü
        let title = (data.title || data.name || "").trim();
        let originalTitle = (data.original_title || data.original_name || "").trim();
        
        console.error("[SineWix ANALIZ] TMDB'den gelen başlık: " + title);

        let queries = [title, originalTitle].filter(Boolean);
        let finalResults = [];

        for (let i = 0; i < queries.length; i++) {
            let currentQuery = queries[i];
            let searchUrl = API_BASE + "/search/" + encodeURIComponent(currentQuery) + "/" + API_KEY;
            
            console.error("[SineWix ANALIZ] API İsteği: " + searchUrl);

            const sRes = await fetch(searchUrl, { headers: API_HEADERS });
            
            // GELEN TÜM VERİYİ İNCELEME (RAW LOG)
            const rawText = await sRes.text(); 
            console.error("[SineWix ANALIZ] Sunucudan Gelen Ham Veri: " + rawText);

            let sData;
            try {
                sData = JSON.parse(rawText);
            } catch (e) {
                console.error("[SineWix ANALIZ] JSON Çözümleme Hatası: " + e.message);
                continue;
            }

            const results = sData.search || [];
            if (results.length > 0) {
                console.error("[SineWix ANALIZ] Başarılı Eşleşme: " + results[0].title);
                
                // Detay aşamasına geçiş...
                let endpoint = (mediaType === 'movie') ? 'media/detail' : 'series/show';
                let detailUrl = API_BASE + "/" + endpoint + "/" + results[0].id + "/" + API_KEY;

                const dRes = await fetch(detailUrl, { headers: API_HEADERS });
                const item = await dRes.json();

                // Nuvio Görsel Vitrin Standartlarına Göre Link Paketleme
                let links = [];
                if (mediaType === 'movie') {
                    links = (item.videos || []).map(v => v.link);
                } else {
                    let targetS = (item.seasons || []).find(s => s.season_number == seasonNum);
                    if (targetS) {
                        let targetE = (targetS.episodes || []).find(e => e.episode_number == episodeNum);
                        if (targetE) links = (targetE.videos || []).map(v => v.link);
                    }
                }

                links.filter(Boolean).forEach((link, index) => {
                    finalResults.push({
                        name: title,
                        title: "SINEWIX | " + (index + 1) + " | 🇹🇷 Dublaj",
                        url: link,
                        headers: { 'Referer': 'https://ydfvfdizipanel.ru/' }
                    });
                });

                if (finalResults.length > 0) break;
            }
        }

        console.error("[SineWix ANALIZ] İşlem bitti. Toplam kaynak: " + finalResults.length);
        return finalResults;

    } catch (err) {
        console.error("[SineWix ANALIZ] Kritik Hata: " + err.message);
        return [];
    }
}

module.exports = { getStreams };
