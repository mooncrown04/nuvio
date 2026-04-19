/**
 * SineWix_v26_Header_Strict
 * Arama motoru bot korumasını geçmek için Header iyileştirmesi.
 */

var API_BASE = 'https://ydfvfdizipanel.ru/public/api';
var API_KEY = '9iQNC5HQwPlaFuJDkhncJ5XTJ8feGXOJatAA';

// Headerları zenginleştirdik (Gerçek uygulama gibi görünmesi için)
var API_HEADERS = {
    'hash256': '711bff4afeb47f07ab08a0b07e85d3835e739295e8a6361db77eebd93d96306b',
    'User-Agent': 'EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)',
    'Accept': 'application/json',
    'Connection': 'Keep-Alive',
    'Accept-Language': 'tr-TR',
    'X-Requested-With': 'com.easyplex.official' // Kritik: Uygulama kimliği
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[SineWix DEBUG] İşlem Başladı: ID ${tmdbId}`);
    
    try {
        const tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;

        const tmdbRes = await fetch(tmdbUrl);
        const data = await tmdbRes.json();
        
        // Sadece ana ismi al (Örn: "The Matrix Resurrections" yerine sadece "Matrix")
        let title = (data.title || data.name || '').trim();
        let originalTitle = (data.original_title || data.original_name || '').trim();

        if (!title) return [];

        // Arama dizisi (En basit halleriyle)
        let searchList = [title];
        if (originalTitle && originalTitle !== title) searchList.push(originalTitle);

        let finalResults = [];

        for (let query of searchList) {
            // Sorguyu temizle: Sadece harf ve rakam kalsın (Boşlukları %20 yerine + yapmayı deneyebiliriz)
            let safeQuery = encodeURIComponent(query);
            const searchUrl = `${API_BASE}/search/${safeQuery}/${API_KEY}`;
            
            console.error(`[SineWix DEBUG] İstek: ${searchUrl}`);

            const sRes = await fetch(searchUrl, { headers: API_HEADERS });
            const sData = await sRes.json();
            
            const results = sData.search || [];
            console.error(`[SineWix DEBUG] Sorgu: ${query} | Sonuç: ${results.length}`);

            if (results.length > 0) {
                // Eşleşme bulundu, detayları çek
                let bestMatch = results[0];
                const genre = (mediaType === 'movie') ? 'media' : 'series';
                const endpoint = (mediaType === 'movie') ? 'detail' : 'show';
                const detailUrl = `${API_BASE}/${genre}/${endpoint}/${bestMatch.id}/${API_KEY}`;

                const dRes = await fetch(detailUrl, { headers: API_HEADERS });
                const item = await dRes.json();

                let links = [];
                if (mediaType === 'movie') {
                    links = (item.videos || []).map(v => v.link).filter(Boolean);
                } else {
                    const sNo = parseInt(seasonNum);
                    const eNo = parseInt(episodeNum);
                    const season = (item.seasons || []).find(s => parseInt(s.season_number) === sNo);
                    if (season) {
                        const episode = (season.episodes || []).find(e => parseInt(e.episode_number) === eNo);
                        if (episode) links = (episode.videos || []).map(v => v.link).filter(Boolean);
                    }
                }

                links.forEach((link, idx) => {
                    finalResults.push({
                        name: title,
                        title: `⌜ SINEWIX ⌟ | Kaynak ${idx + 1} | 🇹🇷 Dublaj`,
                        url: link,
                        quality: 'HD',
                        headers: { 'Referer': 'https://ydfvfdizipanel.ru/' }
                    });
                });

                if (finalResults.length > 0) break;
            }
        }

        console.error(`[SineWix DEBUG] Bitti. Kaynak: ${finalResults.length}`);
        return finalResults;

    } catch (err) {
        console.error(`[SineWix DEBUG] Hata: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
