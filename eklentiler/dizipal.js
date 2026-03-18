/**
 * DiziPal 1543 - JSON Structure Fix
 */

var BASE_URL = 'https://dizipal1543.com';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[DiziPal] Sorgu: ${tmdbId}`);

    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        const query = (tmdbData.name || tmdbData.title || "").replace(/[^a-zA-Z0-9 ]/g, "").trim();

        const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: `searchterm=${encodeURIComponent(query)}`
        });

        const json = await searchRes.json();
        
        // LOGLARA GORE YENI YAPI: json.data.result
        const results = json.data && json.data.result ? json.data.result : [];

        if (results.length === 0) {
            console.error("[DiziPal] Sonuc bulunamadi (result bos).");
            return [];
        }

        // En iyi eslesmeyi al (object_type kontrolü ile)
        const item = results[0];
        console.error(`[DiziPal] Eslesme: ${item.title || 'Bilinmiyor'} (ID: ${item.object_id})`);

        // DiziPal link yapısı genellikle slug veya object_id üzerinden yürür
        // Eğer url gelmiyorsa slug oluşturuyoruz
        let path = item.url || item.path || (item.slug ? `/${mediaType === 'tv' ? 'dizi' : 'film'}/${item.slug}` : "");
        
        if (!path && item.object_id) {
             // Fallback: ID üzerinden git
             path = `/${mediaType === 'tv' ? 'series' : 'movie'}/${item.object_id}`;
        }

        let targetUrl = BASE_URL + path;
        if (mediaType === 'tv') {
            const cleanSlug = path.split('/').filter(p => p && p !== 'series' && p !== 'dizi' && p !== 'bolum').pop();
            targetUrl = `${BASE_URL}/bolum/${cleanSlug}-${seasonNum}x${episodeNum}`;
        }

        console.error(`[DiziPal] Hedef URL: ${targetUrl}`);

        // Sayfaya git ve şifreli veriyi al
        const pageRes = await fetch(targetUrl);
        const pageHtml = await pageRes.text();
        const encryptedMatch = pageHtml.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);

        if (!encryptedMatch) {
            console.error("[DiziPal] data-rm-k bulunamadi! Sayfa yapisi farkli.");
            return [];
        }

        // Decrypt ve Stream (Önceki AES logic buraya gelecek)
        console.error("[DiziPal] Sifreli veri bulundu, cozülüyor...");
        
        // ... (Decrypt ve playlist çekme adımları)
        
        return []; // Test için

    } catch (err) {
        console.error(`[DiziPal] HATA: ${err.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
