/**
 * DiziPal 1543 - Search Diagnostics
 */

var BASE_URL = 'https://dizipal1543.com';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[DiziPal] Sorgu: ${tmdbId} | Hafiza Sorunu Olabilir!`);

    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        const query = (tmdbData.name || tmdbData.title || "").replace(/[^a-zA-Z0-9 ]/g, "").trim();
        
        console.error(`[DiziPal] Arama Gonderiliyor: ${query}`);

        // Arama isteği
        const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: `searchterm=${encodeURIComponent(query)}`
        });

        // Yanıtın durumunu kontrol et
        console.error(`[DiziPal] HTTP Durum: ${searchRes.status}`);
        
        const searchRaw = await searchRes.text();
        console.error(`[DiziPal] Ham Yanit: ${searchRaw.substring(0, 100)}...`);

        let searchData;
        try {
            searchData = JSON.parse(searchRaw);
        } catch(e) {
            console.error(`[DiziPal] JSON Parse Hatasi: Site HTML dondu veya korumaya takildi!`);
            return [];
        }

        const results = Object.values(searchData);
        if (!results || results.length === 0) {
            console.error("[DiziPal] Site 'Bulunamadi' dedi.");
            return [];
        }

        // URL yakalama
        let resObj = results[0];
        let path = resObj.url || resObj.path || "";
        console.error(`[DiziPal] Path Yakalandi: ${path}`);

        // ... (Bundan sonrasi v3.0.0 ile ayni)
        return []; // Test icin simdilik bos donuyoruz

    } catch (err) {
        console.error(`[DiziPal] KRITIK HATA: ${err.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
