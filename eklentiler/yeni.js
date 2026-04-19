/**
 * SineWix_v25_Precision_Matcher
 * Arama motoru için düşük harf ve temiz sorgu optimizasyonu.
 */

var API_BASE = 'https://ydfvfdizipanel.ru/public/api';
var API_KEY = '9iQNC5HQwPlaFuJDkhncJ5XTJ8feGXOJatAA';

var API_HEADERS = {
    'hash256': '711bff4afeb47f07ab08a0b07e85d3835e739295e8a6361db77eebd93d96306b',
    'User-Agent': 'EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)',
    'Accept': 'application/json'
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[SineWix DEBUG] Başlatıldı. ID: ${tmdbId} | Tip: ${mediaType}`);
    
    try {
        const tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;

        const tmdbRes = await fetch(tmdbUrl);
        const data = await tmdbRes.json();
        
        let title = (data.title || data.name || '').trim();
        let originalTitle = (data.original_title || data.original_name || '').trim();
        let releaseYear = (data.release_date || data.first_air_date || '').substring(0, 4);
        
        if (!title) return [];

        // Arama stratejileri: 1. Küçük harf isim, 2. Orijinal isim
        let searchQueries = [title.toLowerCase()];
        if (originalTitle && originalTitle.toLowerCase() !== title.toLowerCase()) {
            searchQueries.push(originalTitle.toLowerCase());
        }

        let finalResults = [];

        for (let query of searchQueries) {
            console.error(`[SineWix DEBUG] Arama deneniyor: ${query}`);
            const searchUrl = `${API_BASE}/search/${encodeURIComponent(query)}/${API_KEY}`;
            
            const sRes = await fetch(searchUrl, { headers: API_HEADERS });
            const sData = await sRes.json();
            
            // API bazen 'search' key'ini boş veya null dönebilir
            const results = sData.search || [];
            console.error(`[SineWix DEBUG] API yanıt verdi. Sonuç sayısı: ${results.length}`);

            if (results.length > 0) {
                // TMDB ID veya isim benzerliği kontrolü yaparak en yakın sonucu seç
                let bestMatch = results[0]; 

                const genre = (mediaType === 'movie') ? 'media' : 'series';
                const endpoint = (mediaType === 'movie') ? 'detail' : 'show';
                const detailUrl = `${API_BASE}/${genre}/${endpoint}/${bestMatch.id}/${API_KEY}`;

                console.error(`[SineWix DEBUG] Detaylar çekiliyor: ${bestMatch.title}`);
                const dRes = await fetch(detailUrl, { headers: API_HEADERS });
                const item = await dRes.json();

                let videoLinks = [];
                if (mediaType === 'movie') {
                    videoLinks = (item.videos || []).map(v => v.link).filter(Boolean);
                } else {
                    const targetSeason = (item.seasons || []).find(s => parseInt(s.season_number) === parseInt(seasonNum));
                    if (targetSeason) {
                        const targetEp = (targetSeason.episodes || []).find(e => parseInt(e.episode_number) === parseInt(episodeNum));
                        if (targetEp) {
                            videoLinks = (targetEp.videos || []).map(v => v.link).filter(Boolean);
                        }
                    }
                }

                videoLinks.forEach((link, idx) => {
                    finalResults.push({
                        name: title,
                        title: `⌜ SINEWIX ⌟ | Kaynak ${idx + 1} | 🇹🇷 Dublaj`,
                        url: link,
                        quality: 'HD',
                        headers: { 'Referer': 'https://ydfvfdizipanel.ru/' }
                    });
                });

                if (finalResults.length > 0) break; // Sonuç bulunduysa döngüden çık
            }
        }

        console.error(`[SineWix DEBUG] İşlem tamamlandı. Bulunan kaynak: ${finalResults.length}`);
        return finalResults;

    } catch (err) {
        console.error(`[SineWix DEBUG] KRİTİK HATA: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
